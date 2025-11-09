import importlib
import sys
import types
import pytest

# Helpers to inject a fake spotipy module before importing the service
def inject_fake_spotipy(monkeypatch, spotify_cls, exceptions_cls=None):
    fake_spotipy = types.SimpleNamespace(Spotify=spotify_cls, oauth2=types.SimpleNamespace(SpotifyClientCredentials=lambda *a, **k: None))
    monkeypatch.setitem(sys.modules, 'spotipy', fake_spotipy)
    monkeypatch.setitem(sys.modules, 'spotipy.oauth2', fake_spotipy.oauth2)
    if exceptions_cls is None:
        class SpotifyException(Exception):
            def __init__(self, http_status, code, msg):
                super().__init__(msg)
                self.http_status = http_status
                self.code = code
        fake_excs = types.SimpleNamespace(SpotifyException=SpotifyException)
    else:
        fake_excs = exceptions_cls
    monkeypatch.setitem(sys.modules, 'spotipy.exceptions', fake_excs)


class FakeSpotifyHappy:
    def __init__(self, *args, **kwargs):
        pass

    def recommendations(self, seed_tracks=None, seed_artists=None, seed_genres=None, limit=20, **kwargs):
        # return track dicts; service expects 'id' and 'artists' and 'album'
        return {'tracks': [
            {'id': f't{i}', 'artists': [{'name': f'Artist{i%3}'}], 'album': {'name': f'Album{i%5}', 'release_date': '2020-01-01'}, 'popularity': i}
            for i in range(30)
        ]}

    def audio_features(self, ids):
        # return features with valence/energy that alternate
        out = []
        for i, tid in enumerate(ids):
            if i % 2 == 0:
                out.append({'id': tid, 'valence': 0.9, 'energy': 0.8, 'tempo': 120, 'danceability': 0.5, 'acousticness': 0.1})
            else:
                out.append({'id': tid, 'valence': 0.1, 'energy': 0.2, 'tempo': 40, 'danceability': 0.3, 'acousticness': 0.9})
        return out

    def search(self, q=None, type=None, limit=20, market=None):
        # Provide minimal shapes used by spotify_service
        if type == 'track':
            return {'tracks': {'items': []}}
        if type == 'playlist':
            return {'playlists': {'items': []}}
        if type == 'artist':
            return {'artists': {'items': []}}
        return {}

    def playlist_items(self, playlist_id, limit=30, market=None):
        return {'items': []}

    def artist_top_tracks(self, artist_id, country='US'):
        return {'tracks': []}


def test_passes_filters_and_diversify_methods():
    # Import SpotifyService directly (no spotipy needed for pure helpers)
    mod = importlib.import_module('app.services.spotify_service')
    SpotifyService = mod.SpotifyService
    svc = SpotifyService.__new__(SpotifyService)

    # _passes_filters
    good = {'valence': 0.7, 'energy': 0.7, 'tempo': 100}
    filt = {'min_valence': 0.5, 'min_energy': 0.5, 'tempo_range': (80, 140)}
    assert svc._passes_filters(good, filt) is True

    bad = {'valence': 0.2, 'energy': 0.1, 'tempo': 50}
    assert svc._passes_filters(bad, filt) is False

    # _diversify_tracks: create many tracks with repeated artists
    tracks = []
    for i in range(30):
        artist = f'Artist{i % 3}'
        album = f'Album{i % 5}'
        tracks.append({'id': f't{i}', 'artists': [{'name': artist}], 'album': {'name': album}, 'popularity': i})
    sel = svc._diversify_tracks(tracks, limit=10)
    assert isinstance(sel, list)
    assert len(sel) == 10
    artist_counts = {}
    for t in sel:
        name = t.get('artists', [{}])[0].get('name')
        artist_counts[name] = artist_counts.get(name, 0) + 1
    # Ensure we returned `limit` tracks and at least some artist diversity
    assert sum(artist_counts.values()) == 10
    assert len(artist_counts) >= 2


def test_filter_tracks_by_features_and_get_recommendations_happy(monkeypatch):
    # inject fake spotipy that returns candidates and audio_features
    inject_fake_spotipy(monkeypatch, FakeSpotifyHappy)
    # ensure env vars exist so module import doesn't raise
    monkeypatch.setenv('SPOTIFY_CLIENT_ID', 'x')
    monkeypatch.setenv('SPOTIFY_CLIENT_SECRET', 'y')

    # import fresh
    sys.modules.pop('app.services.spotify_service', None)
    mod = importlib.import_module('app.services.spotify_service')
    SpotifyService = mod.SpotifyService

    svc = SpotifyService()
    # call public method that uses spotipy (use emotion-based API)
    res = svc.get_recommendations('HAPPY', limit=10)
    assert isinstance(res, dict)
    assert res.get('success') is True
    assert isinstance(res.get('tracks'), list)


def test_get_recommendations_handles_spotify_403(monkeypatch):
    # simulate spotipy.audio_features raising SpotifyException (403)
    class FakeSpotify403(FakeSpotifyHappy):
        def audio_features(self, ids):
            from spotipy.exceptions import SpotifyException
            raise SpotifyException(403, -1, 'Forbidden')

    inject_fake_spotipy(monkeypatch, FakeSpotify403)
    monkeypatch.setenv('SPOTIFY_CLIENT_ID', 'x')
    monkeypatch.setenv('SPOTIFY_CLIENT_SECRET', 'y')

    sys.modules.pop('app.services.spotify_service', None)
    mod = importlib.import_module('app.services.spotify_service')
    SpotifyService = mod.SpotifyService
    svc = SpotifyService()
    # When audio_features fails, the service should fall back gracefully and return a response dict
    res = svc.get_recommendations('HAPPY', limit=5)
    assert isinstance(res, dict)
    assert res.get('success') is True
    assert isinstance(res.get('tracks'), list)


def test_create_playlist_description_formatting():
    mod = importlib.import_module('app.services.spotify_service')
    create_playlist_description = getattr(mod, 'create_playlist_description', None)
    assert callable(create_playlist_description)
    desc = create_playlist_description('HAPPY')
    assert isinstance(desc, str)
    assert 'alegre' in desc or 'Música' in desc
