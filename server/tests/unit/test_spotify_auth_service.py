import types
import importlib
from datetime import datetime, timezone, timedelta

import pytest
import requests

from fastapi import HTTPException


def setup_env(monkeypatch):
    # Ensure constructor won't raise on import
    monkeypatch.setenv('SPOTIFY_CLIENT_ID', 'id')
    monkeypatch.setenv('SPOTIFY_CLIENT_SECRET', 'secret')
    monkeypatch.setenv('SPOTIFY_REDIRECT_URI', 'https://localhost/callback')


def make_fake_db(existing_user=None):
    class Q:
        def __init__(self, obj):
            self.obj = obj

        def filter(self, *a, **k):
            return self

        def first(self):
            return self.obj

    class FakeDB:
        def __init__(self, obj=None):
            self._obj = obj
            self.added = None
            self.committed = False
            self.refreshed = False

        def query(self, model):
            return Q(self._obj)

        def add(self, obj):
            self.added = obj

        def commit(self):
            self.committed = True

        def refresh(self, obj):
            self.refreshed = True

    return FakeDB(existing_user)


def test_get_authorization_url_and_state(monkeypatch):
    setup_env(monkeypatch)
    # import fresh
    mod = importlib.reload(importlib.import_module('app.services.spotify_auth_service'))
    svc = mod.spotify_auth_service

    url, state = svc.get_authorization_url()
    assert 'accounts.spotify.com' in url
    assert isinstance(state, str) and len(state) > 10


def test_exchange_code_for_token_success(monkeypatch):
    setup_env(monkeypatch)
    # stub requests.post
    def fake_post(url, data=None, timeout=None):
        class R:
            def raise_for_status(self):
                return None

            def json(self):
                return {'access_token': 'a', 'refresh_token': 'r', 'expires_in': 3600}

        return R()

    monkeypatch.setattr('requests.post', fake_post)

    mod = importlib.reload(importlib.import_module('app.services.spotify_auth_service'))
    svc = mod.spotify_auth_service
    res = svc.exchange_code_for_token('code123')
    assert res['access_token'] == 'a'


def test_exchange_code_for_token_failure_raises(monkeypatch):
    setup_env(monkeypatch)

    def fake_post_fail(url, data=None, timeout=None):
        # Raise the same exception type the service catches
        raise requests.exceptions.RequestException('net')

    monkeypatch.setattr('requests.post', fake_post_fail)
    mod = importlib.reload(importlib.import_module('app.services.spotify_auth_service'))
    svc = mod.spotify_auth_service

    with pytest.raises(HTTPException):
        svc.exchange_code_for_token('code')


def test_refresh_access_token_success(monkeypatch):
    setup_env(monkeypatch)

    def fake_post(url, data=None, timeout=None):
        class R:
            def raise_for_status(self):
                return None

            def json(self):
                return {'access_token': 'new', 'expires_in': 3600}

        return R()

    monkeypatch.setattr('requests.post', fake_post)
    mod = importlib.reload(importlib.import_module('app.services.spotify_auth_service'))
    svc = mod.spotify_auth_service

    res = svc.refresh_access_token('rtoken')
    assert res['access_token'] == 'new'


def test_refresh_access_token_failure_raises(monkeypatch):
    setup_env(monkeypatch)

    def fake_post_fail(url, data=None, timeout=None):
        # Simulate a requests exception that the service will catch
        raise requests.exceptions.RequestException('boom')

    monkeypatch.setattr('requests.post', fake_post_fail)
    mod = importlib.reload(importlib.import_module('app.services.spotify_auth_service'))
    svc = mod.spotify_auth_service

    with pytest.raises(HTTPException):
        svc.refresh_access_token('bad')


def test_get_spotify_user_info_success_and_failure(monkeypatch):
    setup_env(monkeypatch)

    def fake_get(url, headers=None, timeout=None):
        class R:
            def raise_for_status(self):
                return None

            def json(self):
                return {'id': 'u1', 'email': 'e@e.com'}

        return R()

    monkeypatch.setattr('requests.get', fake_get)
    mod = importlib.reload(importlib.import_module('app.services.spotify_auth_service'))
    svc = mod.spotify_auth_service

    info = svc.get_spotify_user_info('token')
    assert info['id'] == 'u1'

    def fake_get_fail(url, headers=None, timeout=None):
        # Simulate requests failure
        raise requests.exceptions.RequestException('net')

    monkeypatch.setattr('requests.get', fake_get_fail)
    with pytest.raises(HTTPException):
        svc.get_spotify_user_info('t')


def test_create_or_update_user_from_spotify_creates_and_updates(monkeypatch):
    setup_env(monkeypatch)
    mod = importlib.reload(importlib.import_module('app.services.spotify_auth_service'))
    svc = mod.spotify_auth_service

    # Case 1: existing user -> update
    existing = types.SimpleNamespace()
    existing.spotify_id = 'u1'
    existing.username = 'bob'
    existing.profile_picture = None
    existing.spotify_connected = False

    db = make_fake_db(existing_user=existing)

    spotify_data = {'id': 'u1', 'email': 'e@e.com', 'display_name': 'Bob', 'images': [{'url': 'http://img'}]}
    token_data = {'access_token': 'a', 'refresh_token': 'r', 'expires_in': 1000}

    updated = svc.create_or_update_user_from_spotify(spotify_data, token_data, db)
    assert updated.spotify_connected is True
    assert updated.profile_picture == 'http://img'

    # Case 2: new user -> created
    db2 = make_fake_db(existing_user=None)
    spotify_data2 = {'id': 'u2', 'email': 'e2@e.com', 'display_name': 'New', 'images': []}
    token2 = {'access_token': 'aa', 'refresh_token': 'rr', 'expires_in': 10}

    # Monkeypatch the ORM User class inside the service so we don't trigger SQLAlchemy mapper setup
    class FakeUser:
        # provide class attrs used in comparisons to avoid AttributeError
        spotify_id = None
        username = None

        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

    monkeypatch.setattr('app.services.spotify_auth_service.User', FakeUser)

    newu = svc.create_or_update_user_from_spotify(spotify_data2, token2, db2)
    assert getattr(newu, 'spotify_id') == 'u2'
    assert db2.added is not None


def test_link_spotify_to_existing_user_conflict_and_success(monkeypatch):
    setup_env(monkeypatch)
    mod = importlib.reload(importlib.import_module('app.services.spotify_auth_service'))
    svc = mod.spotify_auth_service

    # conflict
    other = types.SimpleNamespace()
    db_conflict = make_fake_db(existing_user=other)

    user = types.SimpleNamespace()
    user.id = 'u3'
    user.username = 'u3'
    user.profile_picture = None

    with pytest.raises(HTTPException):
        svc.link_spotify_to_existing_user(user, {'id': 'u1'}, {'access_token': 'a', 'refresh_token': 'r', 'expires_in': 1}, db_conflict)

    # success
    db_ok = make_fake_db(existing_user=None)
    user2 = types.SimpleNamespace()
    user2.id = 'u4'
    user2.username = 'u4'
    user2.profile_picture = None
    res = svc.link_spotify_to_existing_user(user2, {'id': 'u5', 'email': 'e'}, {'access_token': 'a', 'refresh_token': 'r', 'expires_in': 1}, db_ok)
    assert res.spotify_connected is True


def test_disconnect_spotify_errors_and_success(monkeypatch):
    setup_env(monkeypatch)
    mod = importlib.reload(importlib.import_module('app.services.spotify_auth_service'))
    svc = mod.spotify_auth_service

    user = types.SimpleNamespace()
    user.spotify_connected = False
    user.username = 'u'
    db = make_fake_db()

    with pytest.raises(HTTPException):
        svc.disconnect_spotify(user, db)

    user2 = types.SimpleNamespace()
    user2.spotify_connected = True
    user2.password_hash = ''
    user2.username = 'u2'

    with pytest.raises(HTTPException):
        svc.disconnect_spotify(user2, db)

    user3 = types.SimpleNamespace()
    user3.spotify_connected = True
    user3.password_hash = 'hash'
    user3.username = 'u3'

    res = svc.disconnect_spotify(user3, db)
    assert res.spotify_connected is False
