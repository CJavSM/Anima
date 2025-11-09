import importlib
import types
import random

import pytest


def make_fake_spotipy(audio_features_return=None, search_return=None, playlist_items_return=None, artist_top_tracks_return=None):
    class FakeSpotify:
        def __init__(self, *a, **k):
            pass

        def search(self, q=None, type=None, limit=10, market=None):
            if search_return is not None:
                return search_return
            # default empty
            if type == 'track':
                return {'tracks': {'items': []}}
            if type == 'playlist':
                return {'playlists': {'items': []}}
            if type == 'artist':
                return {'artists': {'items': []}}
            return {}

        def audio_features(self, batch):
            if callable(audio_features_return):
                return audio_features_return(batch)
            return audio_features_return

        def playlist_items(self, playlist_id, limit=30, market=None):
            return playlist_items_return or {'items': []}

        def artist_top_tracks(self, artist_id, country=None):
            return artist_top_tracks_return or {'tracks': []}

    return FakeSpotify


def make_service(monkeypatch, fake_sp=None):
    # Ensure envs don't block
    monkeypatch.setenv('SPOTIFY_CLIENT_ID', 'id')
    monkeypatch.setenv('SPOTIFY_CLIENT_SECRET', 'secret')

    # Monkeypatch credentials and spotipy.Spotify used by the module
    monkeypatch.setattr('app.services.spotify_service.SpotifyClientCredentials', lambda *a, **k: None)
    if fake_sp is None:
        fake_sp = make_fake_spotipy()
    monkeypatch.setattr('app.services.spotify_service.spotipy.Spotify', fake_sp)

    mod = importlib.reload(importlib.import_module('app.services.spotify_service'))
    # Create a fresh SpotifyService instance (module already creates a global instance we won't use)
    svc = mod.SpotifyService()
    return svc


def test_create_playlist_description():
    mod = importlib.import_module('app.services.spotify_service')
    desc = mod.create_playlist_description('HAPPY')
    assert 'alegre' in desc or 'alegre' in desc.lower()
    default = mod.create_playlist_description('UNKNOWN')
    assert 'Música personalizada' in default


def test_process_track_and_none(monkeypatch):
    svc = make_service(monkeypatch)
    assert svc._process_track(None) is None

    track = {
        'id': 't1',
        'name': 'N',
        'artists': [{'name': 'A'}],
        'album': {'name': 'Alb', 'images': [{'url': 'img'}]},
        'preview_url': 'p',
        'external_urls': {'spotify': 'u'},
        'duration_ms': 123,
        'popularity': 10
    }
    out = svc._process_track(track)
    assert out['id'] == 't1' and out['album_image'] == 'img'


@pytest.mark.parametrize('features,filters,expected', [
    ({'valence': 0.1}, {'min_valence': 0.5}, False),
    ({'valence': 0.9}, {'max_valence': 0.5}, False),
    ({'energy': 0.1}, {'min_energy': 0.5}, False),
    ({'energy': 0.9}, {'max_energy': 0.5}, False),
    ({'danceability': 0.1}, {'min_danceability': 0.5}, False),
    ({'acousticness': 0.9}, {'max_acousticness': 0.5}, False),
    ({'acousticness': 0.1}, {'min_acousticness': 0.5}, False),
    ({'tempo': 30}, {'tempo_range': (60, 100)}, False),
    ({'tempo': 200}, {'max_tempo': 150}, False),
    ({'valence': 0.5, 'energy': 0.5, 'danceability': 0.6, 'acousticness': 0.1, 'tempo': 120}, {}, True),
])
def test_passes_filters(features, filters, expected, monkeypatch):
    svc = make_service(monkeypatch)
    assert svc._passes_filters(features, filters) is expected


def test_analyze_track_features_modes(monkeypatch):
    # audio_features not available -> default
    svc = make_service(monkeypatch)
    svc._audio_features_available = False
    d = svc._analyze_track_features(['a', 'b'])
    assert d['mode_text'] == 'N/A'

    # audio features available and produce mode_avg >0.6 -> Mayor
    def af_ok(batch):
        return [{'id': 'a', 'valence': 0.8, 'energy': 0.8, 'tempo': 130, 'mode': 1}, {'id': 'b', 'valence': 0.7, 'energy': 0.7, 'tempo': 110, 'mode': 1}]

    svc2 = make_service(monkeypatch, fake_sp=make_fake_spotipy(audio_features_return=af_ok))
    svc2._audio_features_available = True
    res = svc2._analyze_track_features(['a', 'b'])
    assert 'valence' in res and res['mode_text'].startswith('Mayor')

    # mode_avg <0.4 -> Menor
    def af_minor(batch):
        return [{'id': 'x', 'valence': 0.2, 'energy': 0.2, 'tempo': 100, 'mode': 0}, {'id': 'y', 'valence': 0.3, 'energy': 0.3, 'tempo': 90, 'mode': 0}]

    svc3 = make_service(monkeypatch, fake_sp=make_fake_spotipy(audio_features_return=af_minor))
    svc3._audio_features_available = True
    res2 = svc3._analyze_track_features(['x', 'y'])
    assert res2['mode_text'].startswith('Menor')


def test_diversify_tracks_limits_and_artist_counts(monkeypatch):
    svc = make_service(monkeypatch)
    # build 30 tracks from 10 artists, 3 tracks per artist
    tracks = []
    for i in range(10):
        for j in range(3):
            tracks.append({'id': f'{i}-{j}', 'artists': [{'name': f'Artist{i}'}], 'album': {'name': f'Alb{i}', 'release_date': '2000-01-01'}, 'popularity': random.randint(0, 100)})

    out = svc._diversify_tracks(tracks, limit=10)
    assert len(out) == 10
    # ensure no more than 2 tracks per artist
    counts = {}
    for t in out:
        name = t.get('artists', [{}])[0].get('name')
        counts[name] = counts.get(name, 0) + 1
    assert max(counts.values()) <= 2


def test_filter_tracks_by_features_resp_403(monkeypatch):
    # Simulate audio_features raising SpotifyException with http_status 403
    class FakeEx(Exception):
        def __init__(self, http_status):
            self.http_status = http_status

    def af_raise(batch):
        raise FakeEx(403)

    svc = make_service(monkeypatch, fake_sp=make_fake_spotipy(audio_features_return=af_raise))
    svc._audio_features_available = True
    tracks = [{'id': 't1'}, {'id': 't2'}]
    res = svc._filter_tracks_by_features(tracks, {'min_valence': 0.1})
    # should return original tracks because 403 disables filtering
    assert res == tracks


def test__test_audio_features_various(monkeypatch):
    # success case: audio_features returns a list with an item
    def af_ok(batch):
        return [{'id': '0VjIjW4GlUZAMYd2vXMi3b'}]

    svc = make_service(monkeypatch, fake_sp=make_fake_spotipy(audio_features_return=af_ok))
    svc._audio_features_available = False
    svc._test_audio_features()
    assert svc._audio_features_available is True

    # empty list or [None] -> sets False
    svc2 = make_service(monkeypatch, fake_sp=make_fake_spotipy(audio_features_return=lambda b: [None]))
    svc2._audio_features_available = True
    svc2._test_audio_features()
    assert svc2._audio_features_available is False

    # SpotifyException 403 -> sets False and handled
    class FakeSpotifyEx(Exception):
        def __init__(self, http_status):
            self.http_status = http_status

    monkeypatch.setattr('app.services.spotify_service.SpotifyException', FakeSpotifyEx)

    def af_raise_403(batch):
        raise FakeSpotifyEx(403)

    svc3 = make_service(monkeypatch, fake_sp=make_fake_spotipy(audio_features_return=af_raise_403))
    svc3._audio_features_available = True
    svc3._test_audio_features()
    assert svc3._audio_features_available is False

    # SpotifyException other status
    def af_raise_500(batch):
        raise FakeSpotifyEx(500)

    svc4 = make_service(monkeypatch, fake_sp=make_fake_spotipy(audio_features_return=af_raise_500))
    svc4._audio_features_available = True
    svc4._test_audio_features()
    assert svc4._audio_features_available is False

    # generic exception
    def af_raise(batch):
        raise Exception('boom')

    svc5 = make_service(monkeypatch, fake_sp=make_fake_spotipy(audio_features_return=af_raise))
    svc5._audio_features_available = True
    svc5._test_audio_features()
    assert svc5._audio_features_available is False
