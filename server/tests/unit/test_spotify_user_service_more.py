import importlib
import types
from datetime import datetime, timedelta, timezone

import pytest
import requests


def make_fake_db(existing=None):
    class Q:
        def __init__(self, obj):
            self.obj = obj

        def filter(self, *a, **k):
            return self

        def first(self):
            return self.obj

    class DB:
        def __init__(self, obj=None):
            self._obj = obj

        def query(self, model):
            return Q(self._obj)

        def commit(self):
            pass

        def refresh(self, obj):
            pass

    return DB(existing)


def make_user(**kwargs):
    u = types.SimpleNamespace()
    u.spotify_connected = kwargs.get('spotify_connected', True)
    u.spotify_access_token = kwargs.get('spotify_access_token', 'tkn')
    u.spotify_refresh_token = kwargs.get('spotify_refresh_token', 'r')
    u.spotify_token_expires_at = kwargs.get('spotify_token_expires_at', None)
    u.spotify_id = kwargs.get('spotify_id', 'sid')
    u.username = kwargs.get('username', 'u')
    return u


def test_get_user_spotify_profile_success_and_failure(monkeypatch):
    mod = importlib.reload(importlib.import_module('app.services.spotify_user_service'))
    svc = mod.spotify_user_service

    # success
    class R:
        def raise_for_status(self):
            return None

        def json(self):
            return {'id': 'u1'}

    monkeypatch.setattr('requests.get', lambda url, headers=None, timeout=None: R())
    user = make_user()
    db = make_fake_db()
    res = svc.get_user_spotify_profile(user, db)
    assert res['id'] == 'u1'

    # failure
    def fake_get_fail(url, headers=None, timeout=None):
        raise requests.exceptions.RequestException('fail')

    monkeypatch.setattr('requests.get', fake_get_fail)
    with pytest.raises(Exception):
        svc.get_user_spotify_profile(user, db)


def test_add_tracks_to_playlist_batches(monkeypatch):
    mod = importlib.reload(importlib.import_module('app.services.spotify_user_service'))
    svc = mod.spotify_user_service

    user = make_user()
    db = make_fake_db()

    monkeypatch.setattr(mod.SpotifyUserService, '_ensure_valid_token', lambda self, u, db=None: 't')

    calls = []

    class FakeResp:
        def raise_for_status(self):
            return None

    def fake_post(url, json=None, headers=None, timeout=None):
        calls.append(url)
        return FakeResp()

    monkeypatch.setattr('requests.post', fake_post)

    # 250 tracks -> 3 calls (100,100,50)
    track_ids = [str(i) for i in range(250)]
    out = svc.add_tracks_to_playlist(user, 'pl', track_ids, db=db)
    assert out['tracks_added'] == 250
    assert len(calls) == 3


def test_get_user_playlists_parsing_and_error(monkeypatch):
    mod = importlib.reload(importlib.import_module('app.services.spotify_user_service'))
    svc = mod.spotify_user_service
    user = make_user()
    db = make_fake_db()

    class R:
        def raise_for_status(self):
            return None

        def json(self):
            return {'items': [{'id': 'p1', 'name': 'P1', 'description': '', 'external_urls': {'spotify': 'u'}, 'images': [], 'tracks': {'total': 3}, 'public': False, 'collaborative': False}]}

    monkeypatch.setattr('requests.get', lambda url, headers=None, params=None, timeout=None: R())
    res = svc.get_user_playlists(user, db)
    assert isinstance(res, list) and res[0]['id'] == 'p1'

    # error path with response.json available
    class ErrResp:
        status_code = 400

        def json(self):
            return {'error': {'message': 'bad'}}

    def fake_get_err(url, headers=None, params=None, timeout=None):
        e = requests.exceptions.RequestException('fail')
        e.response = ErrResp()
        raise e

    monkeypatch.setattr('requests.get', fake_get_err)
    with pytest.raises(Exception):
        svc.get_user_playlists(user, db)


def test_check_playlist_ownership_true_false_and_failure(monkeypatch):
    mod = importlib.reload(importlib.import_module('app.services.spotify_user_service'))
    svc = mod.spotify_user_service
    user = make_user(spotify_id='owner1')
    db = make_fake_db()

    class R:
        def raise_for_status(self):
            return None

        def json(self):
            return {'owner': {'id': 'owner1'}}

    monkeypatch.setattr('requests.get', lambda url, headers=None, timeout=None: R())
    assert svc.check_playlist_ownership(user, 'pl', db) is True

    class R2:
        def raise_for_status(self):
            return None

        def json(self):
            return {'owner': {'id': 'someone_else'}}

    monkeypatch.setattr('requests.get', lambda url, headers=None, timeout=None: R2())
    assert svc.check_playlist_ownership(user, 'pl', db) is False

    def fake_get_fail(url, headers=None, timeout=None):
        raise requests.exceptions.RequestException('fail')

    monkeypatch.setattr('requests.get', fake_get_fail)
    assert svc.check_playlist_ownership(user, 'pl', db) is False
