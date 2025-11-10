import importlib
import sys
from types import SimpleNamespace
from datetime import datetime, timezone
import pytest


def make_user_stub(**kw):
    u = SimpleNamespace()
    u.id = kw.get('id', 'u1')
    u.email = kw.get('email', 'u@x.com')
    u.username = kw.get('username', 'user')
    u.first_name = kw.get('first_name', '')
    u.last_name = kw.get('last_name', '')
    u.profile_picture = kw.get('profile_picture', None)
    u.is_active = kw.get('is_active', True)
    u.is_verified = kw.get('is_verified', True)
    u.created_at = kw.get('created_at', datetime.now(timezone.utc))
    u.spotify_connected = kw.get('spotify_connected', False)
    u.spotify_display_name = kw.get('spotify_display_name', None)
    u.spotify_email = kw.get('spotify_email', None)
    return u


def test_authcontroller_register_and_login(monkeypatch):
    mod = importlib.import_module('app.controllers.auth_controller')
    AuthController = mod.AuthController

    # patch AuthService.register_user to return a user
    user = make_user_stub(username='newuser')
    svc_mod = importlib.import_module('app.services.auth_service')
    monkeypatch.setattr(svc_mod.AuthService, 'register_user', lambda data, db: user)

    # call controller.register
    resp = AuthController.register(SimpleNamespace(username='x'), None)
    assert 'Usuario registrado' in resp.message or 'registrado' in resp.message

    # patch authenticate_user and create_user_token
    monkeypatch.setattr(svc_mod.AuthService, 'authenticate_user', lambda u, p, db: user)
    monkeypatch.setattr(svc_mod.AuthService, 'create_user_token', lambda u: 'tkn')

    token_resp = AuthController.login(SimpleNamespace(username_or_email='u', password='p'), None)
    assert token_resp.access_token == 'tkn'
    assert token_resp.user.username == 'newuser' or token_resp.user.username == 'user'


def test_spotify_login_url_and_callback_routes(monkeypatch):
    routes = importlib.import_module('app.routes.auth_routes')
    ctrl = importlib.import_module('app.controllers.auth_controller')

    # spotify login url uses spotify_auth_service
    spotify_mod = importlib.import_module('app.services.spotify_auth_service')
    # patch the instantiated service object created at module import
    monkeypatch.setattr(spotify_mod.spotify_auth_service, 'get_authorization_url', lambda state=None, redirect_uri=None: ('http://auth', 'st'))

    res = ctrl.AuthController.spotify_login_url()
    assert 'authorization_url' in res and res['authorization_url'].startswith('http')

    # spotify_callback route: error param should redirect with error
    rr = routes.spotify_callback(code=None, state=None, error='access_denied', db=None)
    assert rr.status_code == 307
    assert 'error=access_denied' in rr.headers['location'] or 'access_denied' in rr.headers.get('location', '')

    # no code => redirect access_denied
    rr2 = routes.spotify_callback(code=None, state=None, error=None, db=None)
    assert rr2.status_code == 307
    assert 'access_denied' in rr2.headers['location']

    # state starting with link: returns code and state
    rr3 = routes.spotify_callback(code='abc123', state='link:xyz', error=None, db=None)
    assert rr3.status_code == 307
    assert 'code=abc123' in rr3.headers['location']
    assert 'state=link:xyz' in rr3.headers['location']

    # success: monkeypatch AuthController.spotify_callback to return TokenResponse-like object
    tr = SimpleNamespace(access_token='tok-1')
    monkeypatch.setattr(ctrl.AuthController, 'spotify_callback', lambda code, db: tr)
    rr4 = routes.spotify_callback(code='ok', state=None, error=None, db=None)
    assert rr4.status_code == 307
    assert 'token=' in rr4.headers['location']


def test_spotify_link_url(monkeypatch):
    routes = importlib.import_module('app.routes.auth_routes')
    spotify_mod = importlib.import_module('app.services.spotify_auth_service')

    # user already linked
    user = make_user_stub(spotify_connected=True, spotify_email='s@x.com')
    res = routes.spotify_link_url(current_user=user)
    assert 'error' in res and 'Ya tienes una cuenta' in res['error']

    # user not linked: should call spotify_auth_service.get_authorization_url
    monkeypatch.setattr(spotify_mod.spotify_auth_service, 'get_authorization_url', lambda state=None: ('http://auth', 'st'))
    user2 = make_user_stub(spotify_connected=False)
    res2 = routes.spotify_link_url(current_user=user2)
    assert 'authorization_url' in res2 and res2['authorization_url'].startswith('http')


def test_forgot_and_reset_password_routes(monkeypatch):
    routes = importlib.import_module('app.routes.auth_routes')
    ctrl = importlib.import_module('app.controllers.auth_controller')

    # patch controller request_password_reset and reset_password_with_code
    monkeypatch.setattr(ctrl.AuthController, 'request_password_reset', lambda email, db: SimpleNamespace(message='ok', detail='d'))
    r = SimpleNamespace(email='a@b.com')
    resp = routes.forgot_password(request=r, db=None)
    assert resp.message == 'ok' or 'ok' in resp.message

    monkeypatch.setattr(ctrl.AuthController, 'reset_password_with_code', lambda email, code, new_pass, db: SimpleNamespace(message='ok', detail='d'))
    req = SimpleNamespace(email='a@b.com', code='111111', new_password='P@ssw0rd')
    resp2 = routes.reset_password(request=req, db=None)
    assert resp2.message == 'ok'
