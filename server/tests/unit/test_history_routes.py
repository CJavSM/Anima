from datetime import datetime

from fastapi.testclient import TestClient

from main import app
from app import routes


class DummyUser:
    def __init__(self, id="user-1"):
        self.id = id


class FakeDBQueryResult:
    def __init__(self, first_value=None):
        self._first = first_value

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self._first


class FakeDB:
    def __init__(self, first_value=None):
        self._first = first_value

    def query(self, _model):
        return FakeDBQueryResult(first_value=self._first)


class SimpleAnalysis:
    def __init__(self, id="a1", emotion="happy"):
        self.id = id
        self.dominant_emotion = emotion
        self.confidence = 0.95
        self.emotion_details = {emotion: 0.95}
        self.created_at = datetime.utcnow().isoformat()
        self.photo_metadata = {"w": 100}


class SimplePlaylist:
    def __init__(self, id="p1", user_id="user-1", analysis_id=None):
        self.id = id
        self.user_id = user_id
        self.analysis_id = analysis_id
        self.playlist_name = "My Playlist"
        self.emotion = "happy"
        self.description = "desc"
        self.tracks = []
        self.music_params = {}
        self.is_favorite = False
        self.created_at = datetime.utcnow().isoformat()
        self.updated_at = datetime.utcnow().isoformat()


def override_user():
    return DummyUser()


def override_db_none_saved():
    return FakeDB(first_value=None)


def override_db_with_saved():
    return FakeDB(first_value=SimplePlaylist())


def test_get_user_analyses_no_saved(monkeypatch):
    # Mock service
    def fake_get_user_analyses(user_id, db, filters, page, page_size):
        return {
            "total": 1,
            "page": page,
            "page_size": page_size,
            "total_pages": 1,
            "items": [SimpleAnalysis(id="a1")]
        }

    monkeypatch.setattr(routes.history_routes.HistoryService, "get_user_analyses", staticmethod(fake_get_user_analyses))
    body = routes.history_routes.get_user_analyses(page=1, page_size=20, emotion=None, current_user=override_user(), db=override_db_none_saved())
    assert body["total"] == 1
    assert body["items"][0]["has_saved_playlist"] is False


def test_get_user_analyses_with_saved(monkeypatch):
    def fake_get_user_analyses(user_id, db, filters, page, page_size):
        return {
            "total": 1,
            "page": page,
            "page_size": page_size,
            "total_pages": 1,
            "items": [SimpleAnalysis(id="a2")]
        }

    monkeypatch.setattr(routes.history_routes.HistoryService, "get_user_analyses", staticmethod(fake_get_user_analyses))
    body = routes.history_routes.get_user_analyses(page=1, page_size=20, emotion=None, current_user=override_user(), db=override_db_with_saved())
    assert body["items"][0]["has_saved_playlist"] is True


def test_get_user_stats(monkeypatch):
    def fake_get_user_stats(user_id, db):
        return {
            "total_analyses": 2,
            "total_saved_playlists": 1,
            "favorite_playlists_count": 0,
            "most_common_emotion": "happy",
            "emotions_breakdown": {"happy": 2},
            "recent_activity": [SimpleAnalysis(id="r1")],
            "weekly_emotions": {},
            "daily_analyses": {},
            "positive_count": 1,
            "negative_count": 0,
            "sentiment_by_day": []
        }

    monkeypatch.setattr(routes.history_routes.HistoryService, "get_user_stats", staticmethod(fake_get_user_stats))
    body = routes.history_routes.get_user_stats(current_user=override_user(), db=override_db_none_saved())
    assert body["total_analyses"] == 2
    assert isinstance(body["recent_activity"], list)


def test_playlists_crud(monkeypatch):
    # save_playlist
    def fake_save_playlist(user_id, playlist_data, db):
        return SimplePlaylist(id="p123", user_id=user_id, analysis_id=playlist_data.get("analysis_id"))

    monkeypatch.setattr(routes.history_routes.HistoryService, "save_playlist", staticmethod(fake_save_playlist))
    payload = {
        "analysis_id": None,
        "playlist_name": "My List",
        "emotion": "happy",
        "description": "desc",
        "tracks": [],
        "music_params": {},
        "is_favorite": False
    }

    body = routes.history_routes.save_playlist(playlist_data=payload, current_user=override_user(), db=override_db_none_saved())
    assert getattr(body, "id", None) == "p123"

    # get_user_playlists
    def fake_get_user_playlists(user_id, db, emotion, is_favorite, page, page_size):
        return {"total": 1, "page": page, "page_size": page_size, "total_pages": 1, "items": [SimplePlaylist(id="p123")]}

    monkeypatch.setattr(routes.history_routes.HistoryService, "get_user_playlists", staticmethod(fake_get_user_playlists))
    body = routes.history_routes.get_saved_playlists(current_user=override_user(), db=override_db_none_saved())
    assert body["total"] == 1

    # get_playlist_by_id
    def fake_get_playlist_by_id(playlist_id, user_id, db):
        return SimplePlaylist(id=playlist_id)

    monkeypatch.setattr(routes.history_routes.HistoryService, "get_playlist_by_id", staticmethod(fake_get_playlist_by_id))
    p = routes.history_routes.get_playlist(playlist_id="p123", current_user=override_user(), db=override_db_none_saved())
    assert getattr(p, "id", None) == "p123"

    # update_playlist
    def fake_update_playlist(playlist_id, user_id, update_data, db):
        p = SimplePlaylist(id=playlist_id)
        if update_data.get("playlist_name"):
            p.playlist_name = update_data.get("playlist_name")
        return p

    monkeypatch.setattr(routes.history_routes.HistoryService, "update_playlist", staticmethod(fake_update_playlist))
    updated = routes.history_routes.update_playlist(playlist_id="p123", update_data={"playlist_name": "Renamed"}, current_user=override_user(), db=override_db_none_saved())
    assert getattr(updated, "playlist_name", None) == "Renamed"

    # delete_playlist
    def fake_delete_playlist(playlist_id, user_id, db):
        return None

    monkeypatch.setattr(routes.history_routes.HistoryService, "delete_playlist", staticmethod(fake_delete_playlist))
    msg = routes.history_routes.delete_playlist(playlist_id="p123", current_user=override_user(), db=override_db_none_saved())
    assert "Playlist eliminada" in getattr(msg, "message", str(msg))
