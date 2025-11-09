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


class Col:
    """Lightweight placeholder for SQLAlchemy column attributes used in expressions
    Provides __eq__ and in_ to avoid attribute access errors in tests where
    expressions like Model.id == value are evaluated at call time.
    """
    def __init__(self, name):
        self.name = name

    def __eq__(self, other):
        return (self.name, '==', other)

    def in_(self, seq):
        return (self.name, 'in', tuple(seq))

    def __ge__(self, other):
        return (self.name, '>=', other)

    def __le__(self, other):
        return (self.name, '<=', other)

    def label(self, _):
        return self


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

    # Avoid SQLAlchemy mapper issues by replacing the ORM class with a simple container
    class SimpleAnalysis:
        def __init__(self, **kw):
            for k, v in kw.items():
                setattr(self, k, v)
            self.id = kw.get('id', None)

    monkeypatch.setattr('app.services.history_service.EmotionAnalysis', SimpleAnalysis)

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

    # Replace SavedPlaylist ORM class to avoid mapper init
    class SimplePlaylist:
        def __init__(self, **kw):
            for k, v in kw.items():
                setattr(self, k, v)
            self.id = kw.get('id', 'pnew')

    # provide class-level column placeholders used in query expressions
    SimplePlaylist.id = Col('id')
    SimplePlaylist.user_id = Col('user_id')
    SimplePlaylist.created_at = Col('created_at')
    SimplePlaylist.is_favorite = Col('is_favorite')
    SimplePlaylist.emotion = Col('emotion')
    SimplePlaylist.playlist_name = Col('playlist_name')

    import app.services.history_service as hs_mod
    setattr(hs_mod, 'SavedPlaylist', SimplePlaylist)

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


def test_get_user_analyses_with_filters():
    from app.services.history_service import HistoryService

    a1 = make_analysis(id='a1')
    fake_db = FakeDB(all_results=[[a1]], count=1)

    # apply a filter object-like with emotion
    class F:
        emotion = 'HAPPY'
        start_date = None
        end_date = None

    res = HistoryService.get_user_analyses('u1', fake_db, filters=F(), page=1, page_size=10)
    assert res['total'] == 1
    assert res['items'][0].id == 'a1'


def test_get_user_playlists_filters_and_pagination():
    from app.services.history_service import HistoryService

    # monkeypatch the module-level desc to a no-op so our Col placeholders don't raise
    import app.services.history_service as hs_mod
    hs_mod.desc = lambda x: x

    p1 = make_playlist(id='p1', is_favorite=True)
    p2 = make_playlist(id='p2', is_favorite=False)

    fake_db = FakeDB(all_results=[[p1, p2]], count=2)

    res = HistoryService.get_user_playlists('u1', fake_db, emotion='HAPPY', is_favorite=True, page=1, page_size=10)
    assert res['total'] == 2
    assert isinstance(res['items'], list)


def test_get_playlist_by_id_success():
    from app.services.history_service import HistoryService

    p = make_playlist(id='pX')
    fake_db = FakeDB(first=p)

    got = HistoryService.get_playlist_by_id('pX', 'u1', fake_db)
    assert got is p


def test_update_playlist_db_failure_triggers_rollback(monkeypatch):
    from app.services.history_service import HistoryService

    p = make_playlist(id='pU')
    # monkeypatch to return p
    monkeypatch.setattr(HistoryService, 'get_playlist_by_id', lambda pid, uid, db: p)

    fake_db = FakeDB()
    fake_db.commit_raises = True

    from app.schemas.history_schemas import UpdatePlaylistRequest
    upd = UpdatePlaylistRequest(playlist_name='X')

    with pytest.raises(HTTPException):
        HistoryService.update_playlist('pU', 'u1', upd, fake_db)

    assert fake_db.rollback_called is True


def test_delete_playlist_db_failure_triggers_rollback(monkeypatch):
    from app.services.history_service import HistoryService

    p = make_playlist(id='pD')
    monkeypatch.setattr(HistoryService, 'get_playlist_by_id', lambda pid, uid, db: p)

    fake_db = FakeDB()
    fake_db.commit_raises = True

    with pytest.raises(HTTPException):
        HistoryService.delete_playlist('pD', 'u1', fake_db)

    assert fake_db.rollback_called is True


def test_save_playlist_without_analysis():
    from app.services.history_service import HistoryService
    from app.schemas.history_schemas import SavePlaylistRequest

    fake_db = FakeDB(first=None)

    payload = SavePlaylistRequest(
        analysis_id=None,
        playlist_name='NoAnalysis',
        emotion='CALM',
        description='d',
        tracks=[{'id': 't1'}],
        music_params={},
        is_favorite=False
    )

    # Replace SavedPlaylist ORM class to avoid mapper init
    class SimplePlaylist2:
        def __init__(self, **kw):
            for k, v in kw.items():
                setattr(self, k, v)
            self.id = kw.get('id', 'pnew')

    import app.services.history_service as hs_mod2
    setattr(hs_mod2, 'SavedPlaylist', SimplePlaylist2)

    # attach class-level columns so service expressions don't fail
    SimplePlaylist2.id = Col('id')
    SimplePlaylist2.user_id = Col('user_id')
    SimplePlaylist2.created_at = Col('created_at')
    SimplePlaylist2.is_favorite = Col('is_favorite')
    SimplePlaylist2.emotion = Col('emotion')
    SimplePlaylist2.playlist_name = Col('playlist_name')

    res = HistoryService.save_playlist('u1', payload, fake_db)
    assert res is not None
    assert fake_db.add_called is True


def test_get_user_stats_empty_results():
    from app.services.history_service import HistoryService

    # Simulate all scalar results as None and all() returning empty lists
    fake_db = FakeDB(all_results=[[], [], [], [], []], scalar_results=[None, None, None, None, None], count=0)

    stats = HistoryService.get_user_stats('u1', fake_db)
    assert stats['total_analyses'] == 0
    assert stats['total_saved_playlists'] == 0
    assert stats['most_common_emotion'] is None
