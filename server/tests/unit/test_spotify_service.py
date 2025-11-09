import importlib
import os
import types
import pytest


class FakeSpotify:
    def __init__(self, *args, **kwargs):
        self._calls = []

    def search(self, q, type='track', limit=1, market=None):
        self._calls.append(('search', q))
        return {'tracks': {'items': []}}

    def audio_features(self, ids):
        # return a feature for each id
        return [{'id': i, 'valence': 0.8, 'energy': 0.7, 'tempo': 120, 'mode': 1} for i in ids]

    def playlist_items(self, playlist_id, limit=30, market=None):
        return {'items': []}

    def artist_top_tracks(self, artist_id, country='US'):
        return {'tracks': []}


class FakeCredentials:
    def __init__(self, *args, **kwargs):
        pass


def test_init_raises_without_env(monkeypatch):
    # Ensure env vars are empty for this test
    monkeypatch.setenv('SPOTIFY_CLIENT_ID', '')
    monkeypatch.setenv('SPOTIFY_CLIENT_SECRET', '')
    # Importing the module will attempt to construct the global instance and should raise
    import importlib
    with pytest.raises(ValueError):
        importlib.reload(importlib.import_module('app.services.spotify_service'))


def test_init_success_with_mocked_spotify(monkeypatch):
    # Set env vars
    monkeypatch.setenv('SPOTIFY_CLIENT_ID', 'testid')
    monkeypatch.setenv('SPOTIFY_CLIENT_SECRET', 'testsecret')

    # Patch spotipy classes before importing module
    fake_spotipy = types.SimpleNamespace(Spotify=FakeSpotify, oauth2=types.SimpleNamespace(SpotifyClientCredentials=FakeCredentials))
    sys_modules = __import__('sys').modules
    # Provide a fake exceptions module so imports like `from spotipy.exceptions import SpotifyException` work
    class SpotifyException(Exception):
        def __init__(self, http_status, code, msg):
            super().__init__(msg)
            self.http_status = http_status
            self.code = code

    fake_exceptions = types.SimpleNamespace(SpotifyException=SpotifyException)
    monkeypatch.setitem(sys_modules, 'spotipy', fake_spotipy)
    monkeypatch.setitem(sys_modules, 'spotipy.oauth2', fake_spotipy.oauth2)
    monkeypatch.setitem(sys_modules, 'spotipy.exceptions', fake_exceptions)

    import importlib, sys
    sys.modules.pop('app.services.spotify_service', None)
    mod = importlib.import_module('app.services.spotify_service')
    SpotifyService = mod.SpotifyService

    svc = SpotifyService()
    assert svc is not None
    # get_recommendations should raise for invalid emotion
    with pytest.raises(ValueError):
        svc.get_recommendations('UNKNOWN_EMOTION')


def test_filter_tracks_by_features_handles_403(monkeypatch):
    # Set env vars
    monkeypatch.setenv('SPOTIFY_CLIENT_ID', 'testid')
    monkeypatch.setenv('SPOTIFY_CLIENT_SECRET', 'testsecret')

    # Create fake spotify that raises on audio_features
    class FakeSpotify403(FakeSpotify):
        def audio_features(self, ids):
            from spotipy.exceptions import SpotifyException
            raise SpotifyException(403, -1, 'Forbidden')

    fake_spotipy = types.SimpleNamespace(Spotify=FakeSpotify403, oauth2=types.SimpleNamespace(SpotifyClientCredentials=FakeCredentials))
    import sys
    sys_modules = sys.modules
    class SpotifyException(Exception):
        def __init__(self, http_status, code, msg):
            super().__init__(msg)
            self.http_status = http_status
            self.code = code

    fake_exceptions = types.SimpleNamespace(SpotifyException=SpotifyException)
    monkeypatch.setitem(sys_modules, 'spotipy', fake_spotipy)
    monkeypatch.setitem(sys_modules, 'spotipy.oauth2', fake_spotipy.oauth2)
    monkeypatch.setitem(sys_modules, 'spotipy.exceptions', fake_exceptions)

    import importlib, sys
    # Ensure fresh import so our patched spotipy is used
    sys.modules.pop('app.services.spotify_service', None)
    mod = importlib.import_module('app.services.spotify_service')
    SpotifyService = mod.SpotifyService

    svc = SpotifyService()
    svc._audio_features_available = True
    tracks = [{'id': 't1'}, {'id': 't2'}]
    # Should return original tracks and set _audio_features_available False
    res = svc._filter_tracks_by_features(tracks, {'min_valence': 0.5})
    assert res == tracks
    assert svc._audio_features_available is False
