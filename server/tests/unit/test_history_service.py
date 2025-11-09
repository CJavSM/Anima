import pytest
from datetime import datetime, timedelta
from fastapi import HTTPException


class FakeQuery:
    def __init__(self, parent, first_result=None, all_results=None, scalar_results=None, count_result=None):
        self._parent = parent
        self._first = first_result
        self._all_queue = list(all_results or [])
        self._scalar_queue = list(scalar_results or [])
        self._count = count_result

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def group_by(self, *args, **kwargs):
        return self

    def offset(self, n):
        return self

    def limit(self, n):
        return self

    def first(self):
        return self._first

    def all(self):
        if self._all_queue:
            return self._all_queue.pop(0)
        return []

    def count(self):
        if self._count is not None:
            return self._count
        # fallback: length of first all element if provided
        if self._all_queue:
            return len(self._all_queue[0])
        return 0

    def scalar(self):
        # delegate scalar consumption to parent DB to keep global order
        try:
            return self._parent._pop_scalar()
        except Exception:
            return None


class FakeDB:
    def __init__(self, *, first=None, all_results=None, scalar_results=None, count=None):
        self._first = first
        # store queues as lists we consume across multiple query() calls
        self._all_results = list(all_results or [])
        self._scalar_results = list(scalar_results or [])
        self._count = count
        self.add_called = False
        self.commit_called = False
        self.refresh_called = False
        self.deleted = None
        self.rollback_called = False

    def query(self, *models):
        # accept arbitrary query args like SQLAlchemy: query(*entities)
        # For each call, pop next prepared all_result (if any) so different queries get different prepared data
        next_all = None
        if self._all_results:
            next_all = self._all_results.pop(0)

        return FakeQuery(self, first_result=self._first, all_results=[next_all] if next_all is not None else [], scalar_results=[], count_result=self._count)

    def _pop_scalar(self):
        if self._scalar_results:
            return self._scalar_results.pop(0)
        return None

    def add(self, obj):
        self.add_called = True
        self._last_added = obj

    def commit(self):
        if hasattr(self, 'commit_raises') and self.commit_raises:
            raise Exception('db commit failed')
        self.commit_called = True

    def refresh(self, obj):
        self.refresh_called = True
        # simulate DB assigned id
        if not getattr(obj, 'id', None):
            obj.id = 'generated-id'

    def rollback(self):
        self.rollback_called = True

    def delete(self, obj):
        self.deleted = obj


def make_analysis(**kw):
    a = type('A', (), {})()
    a.id = kw.get('id', 'a1')
    a.user_id = kw.get('user_id', 'u1')
    a.dominant_emotion = kw.get('dominant_emotion', 'HAPPY')
    a.confidence = kw.get('confidence', 95)
    a.created_at = kw.get('created_at', datetime.now())
    return a


def make_playlist(**kw):
    p = type('P', (), {})()
    p.id = kw.get('id', 'p1')
    p.user_id = kw.get('user_id', 'u1')
    p.playlist_name = kw.get('playlist_name', 'My List')
    p.emotion = kw.get('emotion', 'HAPPY')
    p.is_favorite = kw.get('is_favorite', False)
    p.created_at = kw.get('created_at', datetime.now())
    return p


def test_create_emotion_analysis_success(monkeypatch):
    from app.services.history_service import HistoryService
    from app.schemas.history_schemas import EmotionAnalysisCreate

    fake_db = FakeDB()

    payload = EmotionAnalysisCreate(
        dominant_emotion='HAPPY',
        confidence=98.5,
        emotion_details={'HAPPY': 98.5},
        photo_metadata={'filename': 'x.jpg'}
    )

    res = HistoryService.create_emotion_analysis('u1', payload, fake_db)

    assert res is not None
    assert fake_db.add_called is True
    assert fake_db.commit_called is True
    assert fake_db.refresh_called is True


def test_create_emotion_analysis_db_error(monkeypatch):
    from app.services.history_service import HistoryService
    from app.schemas.history_schemas import EmotionAnalysisCreate

    fake_db = FakeDB()
    fake_db.commit_raises = True

    payload = EmotionAnalysisCreate(
        dominant_emotion='SAD',
        confidence=45.0,
        emotion_details={'SAD': 45.0},
        photo_metadata={'filename': 'y.jpg'}
    )

    with pytest.raises(HTTPException):
        HistoryService.create_emotion_analysis('u1', payload, fake_db)

    assert fake_db.rollback_called is True


def test_get_user_analyses_pagination_and_filters():
    from app.services.history_service import HistoryService

    # prepare two analyses
    a1 = make_analysis(id='a1')
    a2 = make_analysis(id='a2')
    a3 = make_analysis(id='a3')

    fake_db = FakeDB(all_results=[[a1, a2, a3]], count=3)

    res = HistoryService.get_user_analyses('u1', fake_db, page=1, page_size=2)

    assert res['total'] == 3
    assert res['total_pages'] == 2
    assert isinstance(res['items'], list)


def test_save_playlist_with_missing_analysis_raises():
    from app.services.history_service import HistoryService
    from app.schemas.history_schemas import SavePlaylistRequest

    # simulate no analysis found
    fake_db = FakeDB(first=None)

    payload = SavePlaylistRequest(
        analysis_id='nope',
        playlist_name='P',
        emotion='HAPPY',
        description='d',
        tracks=[{"id": "t1"}],
        music_params={},
        is_favorite=False
    )

    with pytest.raises(HTTPException):
        HistoryService.save_playlist('u1', payload, fake_db)


def test_save_playlist_success():
    from app.services.history_service import HistoryService
    from app.schemas.history_schemas import SavePlaylistRequest

    fake_db = FakeDB(first=make_analysis(id='a1'))

    payload = SavePlaylistRequest(
        analysis_id='a1',
        playlist_name='P',
        emotion='HAPPY',
        description='d',
        tracks=[{"id": "t1"}],
        music_params={},
        is_favorite=True
    )

    res = HistoryService.save_playlist('u1', payload, fake_db)

    assert res is not None
    assert fake_db.add_called is True
    assert fake_db.commit_called is True


def test_get_playlist_by_id_not_found():
    from app.services.history_service import HistoryService

    fake_db = FakeDB(first=None)

    with pytest.raises(HTTPException):
        HistoryService.get_playlist_by_id('p1', 'u1', fake_db)


def test_update_and_delete_playlist(monkeypatch):
    from app.services.history_service import HistoryService
    # simulate playlist
    p = make_playlist(id='p1')

    # monkeypatch get_playlist_by_id to return p
    monkeypatch.setattr(HistoryService, 'get_playlist_by_id', lambda pid, uid, db: p)

    fake_db = FakeDB()

    from app.schemas.history_schemas import UpdatePlaylistRequest
    upd = UpdatePlaylistRequest(playlist_name='New', description='Desc', is_favorite=True)

    updated = HistoryService.update_playlist('p1', 'u1', upd, fake_db)
    assert updated.playlist_name == 'New'
    assert updated.description == 'Desc'
    assert updated.is_favorite is True

    # delete
    HistoryService.delete_playlist('p1', 'u1', fake_db)
    assert fake_db.deleted is p


def test_get_user_stats_basic():
    from app.services.history_service import HistoryService

    # Prepare expected returns for scalar and all queues
    # scalars: total_analyses, total_playlists, favorite_count, positive_count, negative_count
    scalar_queue = [5, 2, 1, 3, 2]

    # all() queue: emotion_counts, recent_analyses, weekly_emotions, daily_analyses, daily_sentiment
    emotion_counts = [('HAPPY', 3), ('SAD', 2)]
    recent_analyses = [make_analysis(id='a1'), make_analysis(id='a2')]
    weekly_emotions = [('HAPPY', 2)]
    daily_analyses = [(datetime.now().date(), 2)]
    daily_sentiment = [(datetime.now().date(), 2, 0)]

    all_queue = [emotion_counts, recent_analyses, weekly_emotions, daily_analyses, daily_sentiment]

    fake_db = FakeDB(all_results=all_queue, scalar_results=scalar_queue)

    stats = HistoryService.get_user_stats('u1', fake_db)

    assert stats['total_analyses'] == 5
    assert stats['total_saved_playlists'] == 2
    assert stats['favorite_playlists_count'] == 1
    assert 'weekly_emotions' in stats
