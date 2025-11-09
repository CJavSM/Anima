import importlib
import types

import pytest
import requests


def setup_env(monkeypatch):
    monkeypatch.setenv('SPOTIFY_CLIENT_ID', 'id')
    monkeypatch.setenv('SPOTIFY_CLIENT_SECRET', 'secret')
    monkeypatch.setenv('SPOTIFY_REDIRECT_URI', 'https://localhost/callback')


def test_sanitize_username_and_generate_unique(monkeypatch):
    setup_env(monkeypatch)
    # prevent SQLAlchemy mapper initialization by inserting a fake app.models.user module
    class SimpleUser:
        # class-level attributes used in query expressions
        spotify_id = 'spotify_id'
        email = 'email'
        id = 'id'
        username = 'username'

        def __init__(self, **kw):
            for k, v in kw.items():
                setattr(self, k, v)
            if not getattr(self, 'id', None):
                self.id = kw.get('id', 'generated')

    import sys
    fake_user_module = types.SimpleNamespace(User=SimpleUser)
    monkeypatch.setitem(sys.modules, 'app.models.user', fake_user_module)

    mod = importlib.reload(importlib.import_module('app.services.spotify_auth_service'))
    svc = mod.spotify_auth_service

    # sanitize
    s = svc._sanitize_username('Bob! @#')
    assert ' ' not in s and '!' not in s

    # generate unique: create fake db that reports collisions for base and base1
    class Q:
        def __init__(self, existing):
            self.existing = existing

        def filter(self, *a, **k):
            # capture the username being checked from the filter call closure
            self._args = a
            return self

        def first(self):
            # inspect what username is being requested by reading the closure in filter
            # Fallback: simulate two collisions then free
            if not hasattr(self, 'calls'):
                self.calls = 0
            self.calls += 1
            if self.calls <= 2:
                return types.SimpleNamespace()  # truthy -> collision
            return None

    class FakeDB:
        def __init__(self):
            # keep a single Q instance so .first() call count persists across loop iterations
            self._q = Q(existing=True)

        def query(self, model):
            return self._q

    db = FakeDB()
    username = svc._generate_unique_username('baseuser', db)
    assert username.startswith('baseuser')


def test_create_user_token_uses_security(monkeypatch):
    setup_env(monkeypatch)
    mod = importlib.reload(importlib.import_module('app.services.spotify_auth_service'))
    svc = mod.spotify_auth_service

    # monkeypatch create_access_token
    monkeypatch.setattr('app.services.spotify_auth_service.create_access_token', lambda data: 'JWT123')

    user = types.SimpleNamespace(id='uid', username='u', email='e')
    token = svc.create_user_token(user)
    assert token == 'JWT123'


def test_create_or_update_user_no_email_generates_temp(monkeypatch):
    setup_env(monkeypatch)
    mod = importlib.reload(importlib.import_module('app.services.spotify_auth_service'))
    svc = mod.spotify_auth_service

    # db with no existing user
    class FakeDB:
        def __init__(self):
            self.added = None
            self.committed = False

        def query(self, model):
            class Q:
                def filter(self, *a, **k):
                    return self

                def first(self):
                    return None

            return Q()

        def add(self, obj):
            self.added = obj

        def commit(self):
            self.committed = True

        def refresh(self, obj):
            pass

    db = FakeDB()
    spotify_data = {'id': 'noemail', 'display_name': 'NoEmail', 'images': []}
    token_data = {'access_token': 'a', 'refresh_token': 'r', 'expires_in': 10}

    newu = svc.create_or_update_user_from_spotify(spotify_data, token_data, db)
    assert '@spotify.temp' in newu.email

