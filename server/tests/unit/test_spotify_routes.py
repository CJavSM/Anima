import pytest
from fastapi import HTTPException

from app.routes import spotify_routes


class DummyUser:
    def __init__(self, id="user-1"):
        self.id = id


class DummyDB:
    pass


def test_get_spotify_playlists_success(monkeypatch):
    fake_return = [{"id": "pl1", "name": "My SP"}]

    def fake_get_user_playlists(user, db, limit=50):
        assert user.id == "user-1"
        return fake_return

    monkeypatch.setattr(spotify_routes, "spotify_user_service", type("S", (), {"get_user_playlists": staticmethod(fake_get_user_playlists)}))

    res = spotify_routes.get_spotify_playlists(current_user=DummyUser(), db=DummyDB(), limit=10)
    assert res == fake_return


def test_create_spotify_playlist_success(monkeypatch):
    payload = {"name": "La Playlist", "tracks": ["t1", "t2"], "public": False}

    def fake_create_playlist(user, name, description, tracks, public, db):
        assert user.id == "user-1"
        return {"id": "created", "name": name, "tracks": tracks}

    monkeypatch.setattr(spotify_routes, "spotify_user_service", type("S", (), {"create_playlist": staticmethod(fake_create_playlist)}))

    res = spotify_routes.create_spotify_playlist(payload=payload, current_user=DummyUser(), db=DummyDB())
    assert res["id"] == "created"


def test_create_spotify_playlist_missing_name():
    payload = {"tracks": ["t1"]}
    with pytest.raises(HTTPException) as exc:
        spotify_routes.create_spotify_playlist(payload=payload, current_user=DummyUser(), db=DummyDB())

    assert exc.value.status_code == 400


def test_create_spotify_playlist_tracks_not_list():
    payload = {"name": "X", "tracks": "not-a-list"}
    with pytest.raises(HTTPException) as exc:
        spotify_routes.create_spotify_playlist(payload=payload, current_user=DummyUser(), db=DummyDB())
    assert exc.value.status_code == 400


def test_create_spotify_playlist_tracks_not_strings():
    payload = {"name": "X", "tracks": [1, 2, 3]}
    with pytest.raises(HTTPException) as exc:
        spotify_routes.create_spotify_playlist(payload=payload, current_user=DummyUser(), db=DummyDB())
    assert exc.value.status_code == 400


def test_create_spotify_playlist_service_raises(monkeypatch):
    payload = {"name": "X", "tracks": ["t1"]}

    def raise_err(*args, **kwargs):
        raise Exception("spotify down")

    monkeypatch.setattr(spotify_routes, "spotify_user_service", type("S", (), {"create_playlist": staticmethod(raise_err)}))

    with pytest.raises(Exception):
        spotify_routes.create_spotify_playlist(payload=payload, current_user=DummyUser(), db=DummyDB())
