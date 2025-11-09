import types
from datetime import datetime, timedelta, timezone

import pytest
import requests

from fastapi import HTTPException


def make_fake_db():
    class FakeDB:
        def __init__(self):
            self.committed = False
            self.refreshed = False

        def commit(self):
            self.committed = True

        def refresh(self, obj):
            self.refreshed = True

    return FakeDB()


def make_user(**kwargs):
    # Create a lightweight user-like object with attributes used by the service
    u = types.SimpleNamespace()
    # defaults
    u.spotify_connected = kwargs.get('spotify_connected', True)
    u.spotify_access_token = kwargs.get('spotify_access_token', 'old-token')
    u.spotify_refresh_token = kwargs.get('spotify_refresh_token', 'refresh')
    u.spotify_token_expires_at = kwargs.get('spotify_token_expires_at', None)
    u.spotify_id = kwargs.get('spotify_id', 'spid')
    u.username = kwargs.get('username', 'tester')
    return u


def test_ensure_valid_token_raises_if_not_connected(monkeypatch):
    # import the service module fresh
    from importlib import reload
    import app.services.spotify_user_service as sus_mod
    reload(sus_mod)

    svc = sus_mod.SpotifyUserService()
    user = make_user(spotify_connected=False)
    db = make_fake_db()

    with pytest.raises(HTTPException) as exc:
        svc._ensure_valid_token(user, db)

    assert exc.value.status_code == 400


def test_ensure_valid_token_refreshes_when_expired(monkeypatch):
    # Arrange: expired token
    from importlib import reload
    import app.services.spotify_user_service as sus_mod
    reload(sus_mod)

    svc = sus_mod.SpotifyUserService()
    past = datetime.now(timezone.utc) - timedelta(hours=2)
    user = make_user(spotify_token_expires_at=past, spotify_access_token='old', spotify_refresh_token='r')
    db = make_fake_db()

    # Monkeypatch spotify_auth_service.refresh_access_token
    fake_auth = types.SimpleNamespace(refresh_access_token=lambda rt: {'access_token': 'new-token', 'expires_in': 3600})
    monkeypatch.setattr('app.services.spotify_user_service.spotify_auth_service', fake_auth)

    token = svc._ensure_valid_token(user, db)

    assert token == 'new-token'
    assert db.committed is True


def test_create_playlist_success(monkeypatch):
    from importlib import reload
    import app.services.spotify_user_service as sus_mod
    reload(sus_mod)

    svc = sus_mod.SpotifyUserService()
    user = make_user(spotify_access_token='ok-token', spotify_id='spid123')
    db = make_fake_db()

    # Avoid token refresh path
    monkeypatch.setattr(sus_mod.SpotifyUserService, '_ensure_valid_token', lambda self, u, db=None: 'ok-token')

    # fake responses for create playlist and add tracks
    class FakeResp:
        def __init__(self, json_data, status=200):
            self._json = json_data
            self.status_code = status

        def raise_for_status(self):
            if self.status_code >= 400:
                raise Exception('http error')

        def json(self):
            return self._json

    def fake_post(url, json=None, headers=None, timeout=None):
        if url.endswith('/playlists'):
            return FakeResp({'id': 'pl123', 'name': json.get('name'), 'description': json.get('description'), 'external_urls': {'spotify': 'https://spotify/playlist/pl123'}, 'uri': 'spotify:playlist:pl123', 'public': json.get('public'), 'collaborative': False, 'images': []})
        elif '/tracks' in url:
            return FakeResp({'snapshot_id': 's1'})
        raise RuntimeError('unexpected url')

    monkeypatch.setattr('requests.post', fake_post)

    result = svc.create_playlist(user, name='X', description='desc', tracks=['1', '2'], public=False, db=db)

    assert result['id'] == 'pl123'
    assert result['tracks_total'] == 2


def test_create_playlist_api_error_includes_spotify_message(monkeypatch):
    from importlib import reload
    import app.services.spotify_user_service as sus_mod
    reload(sus_mod)

    svc = sus_mod.SpotifyUserService()
    user = make_user(spotify_access_token='ok-token', spotify_id='spid123')
    db = make_fake_db()

    monkeypatch.setattr(sus_mod.SpotifyUserService, '_ensure_valid_token', lambda self, u, db=None: 'ok-token')

    class FakeRespErr:
        def __init__(self, text, status=400):
            self.text = text
            self.status_code = status

        def raise_for_status(self):
            raise requests.exceptions.HTTPError()

        def json(self):
            return {'error': {'message': 'Spotify says no'}}

    import requests

    def fake_post_err(url, json=None, headers=None, timeout=None):
        # Simulate create playlist failing with a response that has JSON error
        resp = FakeRespErr('bad', status=400)
        # attach response attribute like requests does
        e = requests.exceptions.RequestException('fail')
        e.response = resp
        raise e

    monkeypatch.setattr('requests.post', fake_post_err)

    with pytest.raises(HTTPException) as exc:
        svc.create_playlist(user, name='X', description='desc', tracks=['1'], public=False, db=db)

    assert 'Spotify' in str(exc.value.detail) or 'Spotify says no' in str(exc.value.detail)


def test_add_tracks_to_playlist_batching_and_error(monkeypatch):
    from importlib import reload
    import app.services.spotify_user_service as sus_mod
    reload(sus_mod)

    svc = sus_mod.SpotifyUserService()
    user = make_user(spotify_access_token='ok-token')
    db = make_fake_db()

    post_calls = []

    def fake_post(url, json=None, headers=None, timeout=None):
        post_calls.append((url, json))
        # Successful add
        return types.SimpleNamespace(status_code=201, text='ok', _json={}, raise_for_status=lambda: None, json=lambda: {})

    monkeypatch.setattr('requests.post', fake_post)
    monkeypatch.setattr('app.services.spotify_user_service.spotify_auth_service', types.SimpleNamespace(refresh_access_token=lambda r: {'access_token': 'ok', 'expires_in': 3600}))

    ids = [str(i) for i in range(205)]
    resp = svc.add_tracks_to_playlist(user, 'plx', ids, db=db)

    assert resp['success'] is True
    assert resp['tracks_added'] == 205
    # 3 batches expected (100,100,5)
    assert len(post_calls) == 3


def test_get_user_playlists_and_check_ownership(monkeypatch):
    from importlib import reload
    import app.services.spotify_user_service as sus_mod
    reload(sus_mod)

    svc = sus_mod.SpotifyUserService()
    user = make_user(spotify_id='owner1')
    db = make_fake_db()

    playlists_payload = {
        'items': [
            {
                'id': 'p1',
                'name': 'A',
                'description': 'd',
                'external_urls': {'spotify': 'u'},
                'images': [],
                'tracks': {'total': 2},
                'public': True,
                'collaborative': False
            }
        ]
    }

    def fake_get(url, headers=None, params=None, timeout=None):
        if url.endswith('/me/playlists'):
            return types.SimpleNamespace(status_code=200, text='ok', _json=playlists_payload, raise_for_status=lambda: None, json=lambda: playlists_payload)
        else:
            payload = {'owner': {'id': 'owner1'}}
            return types.SimpleNamespace(status_code=200, text='ok', _json=payload, raise_for_status=lambda: None, json=lambda: payload)

    monkeypatch.setattr('requests.get', fake_get)
    monkeypatch.setattr('app.services.spotify_user_service.spotify_auth_service', types.SimpleNamespace(refresh_access_token=lambda r: {'access_token': 'ok', 'expires_in': 3600}))

    pls = svc.get_user_playlists(user, db, limit=10)
    assert isinstance(pls, list)
    assert pls[0]['id'] == 'p1'

    owns = svc.check_playlist_ownership(user, 'p1', db)
    assert owns is True


def test_check_playlist_ownership_api_error_returns_false(monkeypatch):
    from importlib import reload
    import app.services.spotify_user_service as sus_mod
    reload(sus_mod)

    svc = sus_mod.SpotifyUserService()
    user = make_user(spotify_id='owner1')
    db = make_fake_db()

    def fake_get(url, headers=None, timeout=None):
        raise requests.exceptions.RequestException('boom')

    monkeypatch.setattr('requests.get', fake_get)
    monkeypatch.setattr('app.services.spotify_user_service.spotify_auth_service', types.SimpleNamespace(refresh_access_token=lambda r: {'access_token': 'ok', 'expires_in': 3600}))

    assert svc.check_playlist_ownership(user, 'pX', db) is False
