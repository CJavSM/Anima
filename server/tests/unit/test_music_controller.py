import importlib
from types import SimpleNamespace
import pytest


def make_user(spotify_connected=True, username='u1', spotify_id='s1'):
    return SimpleNamespace(spotify_connected=spotify_connected, username=username, spotify_id=spotify_id)


def test_get_recommendations_invalid_emotion():
    mod = importlib.reload(importlib.import_module('app.controllers.music_controller'))
    with pytest.raises(Exception) as exc:
        mod.MusicController.get_recommendations('NOT_AN_EMOTION', limit=10)
    # Expect HTTPException with status_code 400
    assert getattr(exc.value, 'status_code', None) == 400


def test_get_recommendations_invalid_limit():
    mod = importlib.reload(importlib.import_module('app.controllers.music_controller'))
    with pytest.raises(Exception) as exc:
        mod.MusicController.get_recommendations('HAPPY', limit=0)
    assert getattr(exc.value, 'status_code', None) == 400


def test_get_recommendations_spotify_failure(monkeypatch):
    mod = importlib.reload(importlib.import_module('app.controllers.music_controller'))

    # Simulate spotify_service.get_recommendations returning failure
    fake = SimpleNamespace(get_recommendations=lambda e, l: {'success': False, 'error': 'nope'}, create_playlist_description=lambda e: 'desc')
    monkeypatch.setattr('app.controllers.music_controller.spotify_service', fake)

    with pytest.raises(Exception) as exc:
        mod.MusicController.get_recommendations('HAPPY', limit=5)
    assert getattr(exc.value, 'status_code', None) == 500


def test_get_recommendations_success(monkeypatch):
    mod = importlib.reload(importlib.import_module('app.controllers.music_controller'))

    payload = {
        'success': True,
        'emotion': 'HAPPY',
        'tracks': [
            {
                'id': 't1',
                'name': 'Track 1',
                'artists': ['Artist A'],
                'album': 'Album A',
                'album_image': None,
                'preview_url': None,
                'external_url': 'https://open.spotify/track/t1',
                'duration_ms': 200000,
                'popularity': 50
            }
        ],
        'total': 1,
        'genres_used': ['pop'],
        'music_params': {'valence': '0.8', 'energy': '0.7', 'tempo': '120', 'mode': 'major'}
    }
    fake = SimpleNamespace(get_recommendations=lambda e, l: payload, create_playlist_description=lambda e: 'desc')
    monkeypatch.setattr('app.controllers.music_controller.spotify_service', fake)

    res = mod.MusicController.get_recommendations('HAPPY', limit=2)
    # pydantic model: check fields
    assert res.tracks[0].id == 't1'
    assert res.playlist_description == 'desc'


def test_create_spotify_playlist_not_connected():
    mod = importlib.reload(importlib.import_module('app.controllers.music_controller'))
    user = make_user(spotify_connected=False)
    with pytest.raises(Exception) as exc:
        mod.MusicController.create_spotify_playlist(user, 'name', 'desc', ['1'], False, db=None)
    assert getattr(exc.value, 'status_code', None) == 400


def test_create_spotify_playlist_no_tracks():
    mod = importlib.reload(importlib.import_module('app.controllers.music_controller'))
    user = make_user(spotify_connected=True)
    with pytest.raises(Exception) as exc:
        mod.MusicController.create_spotify_playlist(user, 'n', 'd', [], False, db=None)
    assert getattr(exc.value, 'status_code', None) == 400


def test_create_spotify_playlist_success(monkeypatch):
    mod = importlib.reload(importlib.import_module('app.controllers.music_controller'))
    user = make_user(spotify_connected=True, username='bob')

    fake_user_svc = SimpleNamespace(create_playlist=lambda **k: {'id': 'pl1', 'name': k.get('name')})
    monkeypatch.setattr('app.controllers.music_controller.spotify_user_service', fake_user_svc)

    res = mod.MusicController.create_spotify_playlist(user, 'My', 'D', ['t1'], False, db=SimpleNamespace())
    assert res['success'] is True
    assert res['playlist']['id'] == 'pl1'


def test_get_user_spotify_playlists_not_connected():
    mod = importlib.reload(importlib.import_module('app.controllers.music_controller'))
    user = make_user(spotify_connected=False)
    with pytest.raises(Exception) as exc:
        mod.MusicController.get_user_spotify_playlists(user, db=None, limit=10)
    assert getattr(exc.value, 'status_code', None) == 400


def test_get_user_spotify_playlists_success(monkeypatch):
    mod = importlib.reload(importlib.import_module('app.controllers.music_controller'))
    user = make_user(spotify_connected=True)
    fake_user_svc = SimpleNamespace(get_user_playlists=lambda u, db, limit: [{'id': 'p1'}])
    monkeypatch.setattr('app.controllers.music_controller.spotify_user_service', fake_user_svc)

    res = mod.MusicController.get_user_spotify_playlists(user, db=SimpleNamespace(), limit=5)
    assert res['success'] is True
    assert res['total'] == 1
