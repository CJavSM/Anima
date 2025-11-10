import importlib
import sys
import types
import math

import pytest


def import_spotify_module(monkeypatch):
    """Import the spotify_service module safely by patching spotipy and env vars."""
    # Ensure clean import
    if 'app.services.spotify_service' in sys.modules:
        del sys.modules['app.services.spotify_service']

    # Minimal dummy SpotifyClientCredentials and Spotify classes
    class DummyCreds:
        def __init__(self, client_id=None, client_secret=None):
            self.client_id = client_id
            self.client_secret = client_secret

    class DummySpotify:
        def __init__(self, *args, **kwargs):
            pass

        def search(self, *args, **kwargs):
            return {'tracks': {'items': []}, 'playlists': {'items': []}, 'artists': {'items': []}}

        def audio_features(self, ids):
            # return a list of features for each id
            return [{'id': i, 'valence': 0.6, 'energy': 0.7, 'tempo': 120.0, 'mode': 1} for i in ids]

        def playlist_items(self, playlist_id, limit=30, market=None):
            return {'items': []}

        def artist_top_tracks(self, artist_id, country=None):
            return {'tracks': []}

    # Monkeypatch environment and spotipy objects before import
    monkeypatch.setenv('SPOTIFY_CLIENT_ID', 'dummy')
    monkeypatch.setenv('SPOTIFY_CLIENT_SECRET', 'dummy')

    import spotipy
    # Patch in place
    monkeypatch.setattr(spotipy.oauth2, 'SpotifyClientCredentials', DummyCreds, raising=False)
    monkeypatch.setattr(spotipy, 'Spotify', DummySpotify, raising=False)

    mod = importlib.import_module('app.services.spotify_service')
    importlib.reload(mod)
    return mod


def test_create_playlist_description(monkeypatch):
    mod = import_spotify_module(monkeypatch)
    desc = mod.create_playlist_description('HAPPY')
    assert 'alegre' in desc or 'alegre' in desc.lower()
    default = mod.create_playlist_description('UNKNOWN_EMO')
    assert 'Música personalizada' in default or 'personalizada' in default


def test_passes_filters_basic():
    # create features and filter
    from app.services.spotify_service import SpotifyService

    svc = object.__new__(SpotifyService)
    # Test valence min
    features = {'valence': 0.7, 'energy': 0.5, 'danceability': 0.5, 'acousticness': 0.1, 'tempo': 120}
    filters = {'min_valence': 0.6}
    assert svc._passes_filters(features, filters) is True

    filters = {'max_valence': 0.6}
    assert svc._passes_filters(features, filters) is False

    # tempo range failure
    filters = {'tempo_range': (10, 50)}
    assert svc._passes_filters(features, filters) is False


def test_process_track_and_diversify(monkeypatch):
    mod = import_spotify_module(monkeypatch)
    SpotifyService = mod.SpotifyService
    svc = object.__new__(SpotifyService)

    # Build tracks with varying artists and popularity
    tracks = []
    for i in range(20):
        tracks.append({
            'id': f't{i}',
            'name': f'Track {i}',
            'artists': [{'name': f'Artist{ i%5 }'}],
            'album': {'name': f'Album{ i%3 }', 'release_date': f'{2000 + (i%20)}-01-01', 'images': []},
            'popularity': i * 3,
            'duration_ms': 1000 + i
        })

    # Diversify to limit 8
    selected = svc._diversify_tracks(tracks.copy(), limit=8)
    assert len(selected) == 8
    # Ensure some diversity: not all tracks from same artist and counts are reasonable
    artist_counts = {}
    for t in selected:
        name = t.get('artists', [{}])[0].get('name')
        artist_counts[name] = artist_counts.get(name, 0) + 1
    # Allow up to 3 in pathological cases but require at least 3 distinct artists
    assert max(artist_counts.values()) <= 3
    assert len(artist_counts.keys()) >= 3

    # Process a track
    proc = svc._process_track(tracks[0])
    assert proc['id'] == 't0'
    assert proc['name'] == 'Track 0'


def test_analyze_track_features(monkeypatch):
    mod = import_spotify_module(monkeypatch)
    SpotifyService = mod.SpotifyService
    svc = object.__new__(SpotifyService)
    # audio features unavailable -> default
    svc._audio_features_available = False
    res = svc._analyze_track_features(['t1', 't2'])
    assert math.isclose(res['valence'], 0.5)

    # now enable and set sp
    svc._audio_features_available = True
    class FakeSp:
        def audio_features(self, ids):
            return [{'id': ids[0], 'valence': 0.2, 'energy': 0.8, 'tempo': 100, 'mode': 1}]

    svc.sp = FakeSp()
    res = svc._analyze_track_features(['t1'])
    assert 'valence' in res and 'energy' in res and 'tempo' in res
    assert res['mode_text'] in ('Mayor (alegre)', 'Menor (triste)', 'Mixto')


def test_filter_tracks_by_features_short_circuit(monkeypatch):
    mod = import_spotify_module(monkeypatch)
    SpotifyService = mod.SpotifyService
    svc = object.__new__(SpotifyService)
    svc._audio_features_available = False
    tracks = [{'id': 'a1'}, {'id': 'a2'}]
    filtered = svc._filter_tracks_by_features(tracks, {'min_valence': 0.4})
    # since audio features not available, should return original list
    assert filtered == tracks
