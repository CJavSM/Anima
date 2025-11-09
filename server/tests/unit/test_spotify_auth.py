import importlib
import sys
import types
import pytest

# Tests for spotify_auth_service.py import-time validation and token refresh logic.
def test_import_raises_when_env_missing(monkeypatch):
    # Ensure env vars and dotenv loading do not provide credentials
    monkeypatch.delenv('SPOTIFY_CLIENT_ID', raising=False)
    monkeypatch.delenv('SPOTIFY_CLIENT_SECRET', raising=False)
    monkeypatch.delenv('SPOTIFY_REDIRECT_URI', raising=False)

    # Prevent dotenv from loading a .env file during import
    fake_dotenv = types.SimpleNamespace(load_dotenv=lambda *a, **k: False)
    monkeypatch.setitem(sys.modules, 'dotenv', fake_dotenv)

    # reload module and expect ValueError because credentials are missing
    sys.modules.pop('app.services.spotify_auth_service', None)
    with pytest.raises(ValueError):
        importlib.import_module('app.services.spotify_auth_service')


def test_token_refresh_success(monkeypatch):
    # Provide env vars to allow module import
    monkeypatch.setenv('SPOTIFY_CLIENT_ID', 'id')
    monkeypatch.setenv('SPOTIFY_CLIENT_SECRET', 'secret')
    # Stub requests.post to return a fake successful token response
    import requests as _requests

    class FakeResponse:
        def raise_for_status(self):
            return None
        def json(self):
            return {'access_token': 'new-token', 'refresh_token': 'new-refresh', 'expires_in': 3600}

    def fake_post(url, data=None, timeout=None):
        return FakeResponse()

    monkeypatch.setattr('requests.post', fake_post)

    # reload module fresh
    sys.modules.pop('app.services.spotify_auth_service', None)
    mod = importlib.import_module('app.services.spotify_auth_service')
    SpotifyAuthService = getattr(mod, 'SpotifyAuthService', None)
    assert SpotifyAuthService is not None
    svc = SpotifyAuthService()
    res = svc.refresh_access_token('old-refresh')
    assert res.get('access_token') == 'new-token'
    assert 'expires_in' in res


def test_token_refresh_handles_exceptions(monkeypatch):
    monkeypatch.setenv('SPOTIFY_CLIENT_ID', 'id')
    monkeypatch.setenv('SPOTIFY_CLIENT_SECRET', 'secret')
    # Simulate requests.post throwing a RequestException
    import requests as _requests
    from requests.exceptions import RequestException

    def fake_post_fail(url, data=None, timeout=None):
        raise RequestException('network error')

    monkeypatch.setattr('requests.post', fake_post_fail)

    sys.modules.pop('app.services.spotify_auth_service', None)
    mod = importlib.import_module('app.services.spotify_auth_service')
    SpotifyAuthService = getattr(mod, 'SpotifyAuthService', None)
    svc = SpotifyAuthService()
    with pytest.raises(Exception):
        # refresh_access_token raises HTTPException on failure; assert that behavior
        svc.refresh_access_token('bad-refresh')
