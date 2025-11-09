import importlib
import types
import pytest


class FakeSpotifyFull:
    def __init__(self, *args, **kwargs):
        pass

    def search(self, q, type='track', limit=50, market=None):
        # return one track for any track search and some playlists for playlist searches
        if type == 'track':
            return {'tracks': {'items': [
                {
                    'id': 'track1',
                    'name': 'Test Song',
                    'artists': [{'name': 'Artist A'}],
                    'album': {'name': 'Test Album', 'images': [{'url': 'http://img'}], 'release_date': '2020-01-01'},
                    'preview_url': 'http://preview',
                    'external_urls': {'spotify': 'http://open'},
                    'duration_ms': 210000,
                    'popularity': 50
                }
            ]}}
        elif type == 'playlist':
            return {'playlists': {'items': [{'id': 'pl1'}]}}
        elif type == 'artist':
            return {'artists': {'items': [{'id': 'artist1'}]}}

    def playlist_items(self, playlist_id, limit=30, market=None):
        return {'items': [{'track': {'id': 'track_pl1', 'name': 'PL Song', 'artists': [{'name': 'Artist P'}], 'album': {'images': []}}}]}

    def artist_top_tracks(self, artist_id, country='US'):
        return {'tracks': [{'id': 'artist_track1', 'name': 'Top 1', 'artists': [{'name': 'Artist A'}], 'album': {'images': []}}]}

    def audio_features(self, ids):
        return [{'id': i, 'valence': 0.7, 'energy': 0.6, 'tempo': 120, 'mode': 1} for i in ids]


class FakeCredentials:
    def __init__(self, *args, **kwargs):
        pass


def _patch_spotipy(monkeypatch, spotify_impl):
    fake_spotipy = types.SimpleNamespace(Spotify=spotify_impl, oauth2=types.SimpleNamespace(SpotifyClientCredentials=FakeCredentials))
    import sys
    sys.modules['spotipy'] = fake_spotipy
    sys.modules['spotipy.oauth2'] = fake_spotipy.oauth2
    # provide exceptions module
    class SpotifyException(Exception):
        def __init__(self, http_status, code, msg):
            super().__init__(msg)
            self.http_status = http_status
            self.code = code

    sys.modules['spotipy.exceptions'] = types.SimpleNamespace(SpotifyException=SpotifyException)


def test_get_recommendations_returns_tracks(monkeypatch):
    monkeypatch.setenv('SPOTIFY_CLIENT_ID', 'x')
    monkeypatch.setenv('SPOTIFY_CLIENT_SECRET', 'y')

    _patch_spotipy(monkeypatch, FakeSpotifyFull)

    # import fresh
    importlib.reload(importlib.import_module('app.services.spotify_service'))
    mod = importlib.import_module('app.services.spotify_service')
    SpotifyService = mod.SpotifyService

    svc = SpotifyService()
    # allow audio features path
    svc._audio_features_available = True

    res = svc.get_recommendations('HAPPY', limit=3)
    assert res['success'] is True
    assert isinstance(res['tracks'], list)
    # tracks processed should have expected keys
    if res['tracks']:
        t = res['tracks'][0]
        assert 'id' in t and 'name' in t and 'artists' in t


def test_create_playlist_description():
    from app.services.spotify_service import create_playlist_description
    desc = create_playlist_description('HAPPY')
    assert isinstance(desc, str)
