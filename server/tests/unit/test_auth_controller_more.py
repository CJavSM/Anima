import pytest
from fastapi import HTTPException


def make_user(**kw):
    class U:
        pass

    u = U()
    u.id = kw.get('id', 'uid')
    u.email = kw.get('email', 'a@b.com')
    u.username = kw.get('username', 'bob')
    u.first_name = kw.get('first_name', 'B')
    u.last_name = kw.get('last_name', 'O')
    u.profile_picture = kw.get('profile_picture')
    u.is_active = kw.get('is_active', True)
    u.is_verified = kw.get('is_verified', False)
    u.created_at = kw.get('created_at')
    u.spotify_connected = kw.get('spotify_connected', False)
    u.spotify_display_name = kw.get('spotify_display_name')
    u.spotify_email = kw.get('spotify_email')
    return u


def test_register_raises_generic(monkeypatch):
    import app.controllers.auth_controller as ctrl

    def boom(user_data, db):
        raise Exception('boom')

    monkeypatch.setattr(ctrl.AuthService, 'register_user', boom)

    from app.schemas.auth_schemas import UserRegister
    payload = UserRegister(email='x@y.com', username='newuser', password='Aa1!strong')

    with pytest.raises(HTTPException) as exc:
        ctrl.AuthController.register(payload, db=None)

    assert exc.value.status_code == 500
    assert 'Error al registrar usuario' in str(exc.value.detail)
    assert 'boom' in str(exc.value.detail)


def test_login_raises_generic(monkeypatch):
    import app.controllers.auth_controller as ctrl

    def boom(u, p, db):
        raise Exception('login fail')

    monkeypatch.setattr(ctrl.AuthService, 'authenticate_user', boom)

    from app.schemas.auth_schemas import UserLogin
    payload = UserLogin(username_or_email='u', password='p')

    with pytest.raises(HTTPException) as exc:
        ctrl.AuthController.login(payload, db=None)

    assert exc.value.status_code == 500
    assert 'Error interno al iniciar sesión' in str(exc.value.detail)


def test_get_current_user_info_raises_generic(monkeypatch):
    import app.controllers.auth_controller as ctrl

    def boom(uid, db):
        raise Exception('nope')

    monkeypatch.setattr(ctrl.AuthService, 'get_user_by_id', boom)

    with pytest.raises(HTTPException) as exc:
        ctrl.AuthController.get_current_user_info('u1', db=None)

    assert exc.value.status_code == 500
    assert 'Error al obtener información del usuario' in str(exc.value.detail)
    assert 'nope' in str(exc.value.detail)


def test_spotify_login_url_raises(monkeypatch):
    import app.controllers.auth_controller as ctrl

    def boom():
        raise Exception('uhoh')

    monkeypatch.setattr(ctrl.spotify_auth_service, 'get_authorization_url', boom)

    with pytest.raises(HTTPException) as exc:
        ctrl.AuthController.spotify_login_url()

    assert exc.value.status_code == 500
    assert 'Error al generar URL de Spotify' in str(exc.value.detail)


def test_spotify_callback_propagates_http(monkeypatch):
    import app.controllers.auth_controller as ctrl

    def httperr(code):
        raise HTTPException(status_code=400, detail='bad')

    monkeypatch.setattr(ctrl.spotify_auth_service, 'exchange_code_for_token', httperr)

    with pytest.raises(HTTPException) as exc:
        ctrl.AuthController.spotify_callback('c', db=None)

    assert exc.value.status_code == 400


def test_spotify_callback_generic_exception(monkeypatch):
    import app.controllers.auth_controller as ctrl

    def boom(code):
        raise Exception('spotify boom')

    monkeypatch.setattr(ctrl.spotify_auth_service, 'exchange_code_for_token', boom)

    with pytest.raises(HTTPException) as exc:
        ctrl.AuthController.spotify_callback('c', db=None)

    assert exc.value.status_code == 500
    assert 'Error en callback de Spotify' in str(exc.value.detail)


def test_link_spotify_raises_http_and_generic(monkeypatch):
    import app.controllers.auth_controller as ctrl
    cur = make_user()

    # HTTPException path
    def httperr(code):
        raise HTTPException(status_code=401)

    monkeypatch.setattr(ctrl.spotify_auth_service, 'exchange_code_for_token', httperr)

    with pytest.raises(HTTPException) as exc:
        ctrl.AuthController.link_spotify('c', current_user=cur, db=None)
    assert exc.value.status_code == 401

    # Generic exception path
    def boom(code):
        raise Exception('link fail')

    monkeypatch.setattr(ctrl.spotify_auth_service, 'exchange_code_for_token', boom)

    with pytest.raises(HTTPException) as exc2:
        ctrl.AuthController.link_spotify('c', current_user=cur, db=None)
    assert exc2.value.status_code == 500
    assert 'Error al vincular Spotify' in str(exc2.value.detail)


def test_disconnect_spotify_raises(monkeypatch):
    import app.controllers.auth_controller as ctrl
    cur = make_user()

    # HTTPException
    def httperr(user, db):
        raise HTTPException(status_code=403)

    monkeypatch.setattr(ctrl.spotify_auth_service, 'disconnect_spotify', httperr)

    with pytest.raises(HTTPException) as exc:
        ctrl.AuthController.disconnect_spotify(cur, db=None)
    assert exc.value.status_code == 403

    # Generic
    def boom(user, db):
        raise Exception('dfail')

    monkeypatch.setattr(ctrl.spotify_auth_service, 'disconnect_spotify', boom)

    with pytest.raises(HTTPException) as exc2:
        ctrl.AuthController.disconnect_spotify(cur, db=None)
    assert exc2.value.status_code == 500
    assert 'Error al desvincular Spotify' in str(exc2.value.detail)


def test_update_current_user_raises(monkeypatch):
    import app.controllers.auth_controller as ctrl
    cur = make_user()

    def boom(user, update, db):
        raise Exception('uerr')

    monkeypatch.setattr(ctrl.AuthService, 'update_user', boom)

    with pytest.raises(HTTPException) as exc:
        ctrl.AuthController.update_current_user(current_user=cur, update_data={'first_name': 'X'}, db=None)

    assert exc.value.status_code == 500
    assert 'Error al actualizar usuario' in str(exc.value.detail)


def test_request_and_reset_password_raise_generic(monkeypatch):
    import app.controllers.auth_controller as ctrl

    def boom_req(email, db):
        raise Exception('req')

    monkeypatch.setattr(ctrl.AuthService, 'request_password_reset', boom_req)

    with pytest.raises(HTTPException) as exc:
        ctrl.AuthController.request_password_reset('a@b.com', db=None)
    assert exc.value.status_code == 500
    assert 'Error interno' in str(exc.value.detail)

    def boom_reset(email, code, pw, db):
        raise Exception('rerr')

    monkeypatch.setattr(ctrl.AuthService, 'reset_password_with_code', boom_reset)

    with pytest.raises(HTTPException) as exc2:
        ctrl.AuthController.reset_password_with_code('a@b.com', 'c', 'pw', db=None)
    assert exc2.value.status_code == 500
    assert 'Error interno' in str(exc2.value.detail)
import importlib
from types import SimpleNamespace
from datetime import datetime, timezone
import pytest


def make_user(id='u1'):
    u = SimpleNamespace()
    u.id = id
    u.email = f'{id}@x.com'
    u.username = f'user_{id}'
    u.first_name = 'First'
    u.last_name = 'Last'
    u.profile_picture = None
    u.is_active = True
    u.is_verified = True
    u.created_at = datetime.now(timezone.utc)
    u.spotify_connected = False
    u.spotify_display_name = None
    u.spotify_email = None
    u.password_hash = 'hash'
    return u


def test_get_current_user_info_success(monkeypatch):
    ctrl_mod = importlib.import_module('app.controllers.auth_controller')
    svc_mod = importlib.import_module('app.services.auth_service')

    u = make_user('u10')
    monkeypatch.setattr(svc_mod.AuthService, 'get_user_by_id', lambda uid, db: u)

    res = ctrl_mod.AuthController.get_current_user_info('u10', None)
    assert res.email == 'u10@x.com'
    assert res.username == 'user_u10'


def test_get_current_user_info_user_not_found(monkeypatch):
    ctrl_mod = importlib.import_module('app.controllers.auth_controller')
    svc_mod = importlib.import_module('app.services.auth_service')

    def raise_not_found(uid, db):
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='not found')

    monkeypatch.setattr(svc_mod.AuthService, 'get_user_by_id', raise_not_found)

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as excinfo:
        ctrl_mod.AuthController.get_current_user_info('no', None)
    assert excinfo.value.status_code == 404
    assert 'not found' in str(excinfo.value.detail)


def test_spotify_callback_tokens_error(monkeypatch):
    ctrl_mod = importlib.import_module('app.controllers.auth_controller')
    spotify_mod = importlib.import_module('app.services.spotify_auth_service')

    # simulate exchange_code_for_token raising
    monkeypatch.setattr(spotify_mod.spotify_auth_service, 'exchange_code_for_token', lambda code: (_ for _ in ()).throw(Exception('token fail')))

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        ctrl_mod.AuthController.spotify_callback('c', None)
    assert exc.value.status_code == 500
    assert 'token fail' in str(exc.value.detail)


def test_spotify_callback_user_info_error(monkeypatch):
    ctrl_mod = importlib.import_module('app.controllers.auth_controller')
    spotify_mod = importlib.import_module('app.services.spotify_auth_service')

    monkeypatch.setattr(spotify_mod.spotify_auth_service, 'exchange_code_for_token', lambda code: {'access_token':'a'})
    monkeypatch.setattr(spotify_mod.spotify_auth_service, 'get_spotify_user_info', lambda token: (_ for _ in ()).throw(Exception('me fail')))

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        ctrl_mod.AuthController.spotify_callback('c', None)
    assert exc.value.status_code == 500
    assert 'me fail' in str(exc.value.detail)


def test_spotify_callback_create_or_update_error(monkeypatch):
    ctrl_mod = importlib.import_module('app.controllers.auth_controller')
    spotify_mod = importlib.import_module('app.services.spotify_auth_service')

    monkeypatch.setattr(spotify_mod.spotify_auth_service, 'exchange_code_for_token', lambda code: {'access_token':'a'})
    monkeypatch.setattr(spotify_mod.spotify_auth_service, 'get_spotify_user_info', lambda token: {'id':'s1'})
    monkeypatch.setattr(spotify_mod.spotify_auth_service, 'create_or_update_user_from_spotify', lambda u, t, db: (_ for _ in ()).throw(Exception('create fail')))

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        ctrl_mod.AuthController.spotify_callback('c', None)
    assert exc.value.status_code == 500
    assert 'create fail' in str(exc.value.detail)


def test_link_spotify_errors(monkeypatch):
    ctrl_mod = importlib.import_module('app.controllers.auth_controller')
    spotify_mod = importlib.import_module('app.services.spotify_auth_service')

    current_user = make_user('u2')
    # exchange failure
    monkeypatch.setattr(spotify_mod.spotify_auth_service, 'exchange_code_for_token', lambda code: (_ for _ in ()).throw(Exception('ex fail')))
    from fastapi import HTTPException
    with pytest.raises(HTTPException):
        ctrl_mod.AuthController.link_spotify('c', current_user, None)

    # simulate link_spotify_to_existing_user raising HTTPException
    from fastapi import HTTPException
    def raise_http(*a, **k):
        raise HTTPException(status_code=400, detail='already linked')

    monkeypatch.setattr(spotify_mod.spotify_auth_service, 'exchange_code_for_token', lambda code: {'access_token':'a'})
    monkeypatch.setattr(spotify_mod.spotify_auth_service, 'get_spotify_user_info', lambda token: {'id':'s1'})
    monkeypatch.setattr(spotify_mod.spotify_auth_service, 'link_spotify_to_existing_user', raise_http)

    with pytest.raises(HTTPException) as excinfo:
        ctrl_mod.AuthController.link_spotify('c', current_user, None)
    assert excinfo.value.status_code == 400
    assert 'already linked' in str(excinfo.value.detail)


def test_disconnect_spotify_errors(monkeypatch):
    ctrl_mod = importlib.import_module('app.controllers.auth_controller')
    spotify_mod = importlib.import_module('app.services.spotify_auth_service')

    # user without spotify_connected
    user = make_user('u3')
    user.spotify_connected = False
    with pytest.raises(Exception):
        ctrl_mod.AuthController.disconnect_spotify(user, None)

    # user with spotify_connected but no password_hash -> should raise
    user2 = make_user('u4')
    user2.spotify_connected = True
    user2.password_hash = ''
    with pytest.raises(Exception):
        ctrl_mod.AuthController.disconnect_spotify(user2, None)


def test_update_current_user_success_and_error(monkeypatch):
    ctrl_mod = importlib.import_module('app.controllers.auth_controller')
    svc_mod = importlib.import_module('app.services.auth_service')

    user = make_user('u5')
    updated = make_user('u5')
    updated.username = 'updated'

    monkeypatch.setattr(svc_mod.AuthService, 'update_user', lambda current_user, data, db: updated)
    res = ctrl_mod.AuthController.update_current_user(user, {'first_name':'X'}, None)
    assert res.username == 'updated'

    # make update_user raise
    def raise_generic(*a, **k):
        raise Exception('boom')
    monkeypatch.setattr(svc_mod.AuthService, 'update_user', raise_generic)
    with pytest.raises(Exception):
        ctrl_mod.AuthController.update_current_user(user, {'first_name':'X'}, None)
