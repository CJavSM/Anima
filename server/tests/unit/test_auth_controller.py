import pytest
from fastapi import HTTPException

from app.controllers import auth_controller
from app.controllers.auth_controller import AuthController
from app.schemas.auth_schemas import UserRegister, UserLogin


class DummyUser:
    def __init__(self):
        self.id = "u1"
        self.username = "testuser"
        self.email = "t@example.com"
        self.first_name = "First"
        self.last_name = "Last"
        self.profile_picture = None
        self.is_active = True
        self.is_verified = True
        import pytest
        from datetime import datetime, timezone
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
            u.created_at = kw.get('created_at', datetime.now(timezone.utc))
            u.spotify_connected = kw.get('spotify_connected', False)
            u.spotify_display_name = kw.get('spotify_display_name')
            u.spotify_email = kw.get('spotify_email')
            return u


        def test_register_success(monkeypatch):
            import app.controllers.auth_controller as ctrl

            fake_user = make_user(username='newuser')

            monkeypatch.setattr(ctrl.AuthService, 'register_user', lambda user_data, db: fake_user)

            from app.schemas.auth_schemas import UserRegister

            payload = UserRegister(email='x@y.com', username='newuser', password='Aa1!strong')

            res = ctrl.AuthController.register(payload, db=None)

            assert res.message.startswith('Usuario registrado')
            assert 'newuser' in res.detail


        def test_register_propagates_http_exception(monkeypatch):
            import app.controllers.auth_controller as ctrl

            def raise_http(*a, **k):
                raise HTTPException(status_code=400, detail='bad')

            monkeypatch.setattr(ctrl.AuthService, 'register_user', raise_http)

            from app.schemas.auth_schemas import UserRegister
            # username must meet min_length=3 in schema
            payload = UserRegister(email='x@y.com', username='usr', password='Aa1!strong')

            with pytest.raises(HTTPException):
                ctrl.AuthController.register(payload, db=None)


        def test_login_success(monkeypatch):
            import app.controllers.auth_controller as ctrl

            user = make_user(id='u1', username='u1')
            monkeypatch.setattr(ctrl.AuthService, 'authenticate_user', lambda a, b, c: user)
            monkeypatch.setattr(ctrl.AuthService, 'create_user_token', lambda u: 'tok123')

            from app.schemas.auth_schemas import UserLogin
            payload = UserLogin(username_or_email='u1', password='pw')

            res = ctrl.AuthController.login(payload, db=None)

            assert res.access_token == 'tok123'
            assert res.user.username == 'u1'


        def test_get_current_user_info_not_found(monkeypatch):
            import app.controllers.auth_controller as ctrl
            def raise_not_found(uid, db):
                raise HTTPException(status_code=404)

            monkeypatch.setattr(ctrl.AuthService, 'get_user_by_id', raise_not_found)

            with pytest.raises(HTTPException):
                ctrl.AuthController.get_current_user_info('no', db=None)


        def test_spotify_login_url(monkeypatch):
            import app.controllers.auth_controller as ctrl

            monkeypatch.setattr(ctrl.spotify_auth_service, 'get_authorization_url', lambda: ('http://auth', 'state123'))

            res = ctrl.AuthController.spotify_login_url()
            assert res['authorization_url'] == 'http://auth'
            assert res['state'] == 'state123'


        def test_spotify_callback_success(monkeypatch):
            import app.controllers.auth_controller as ctrl

            token_data = {'access_token': 'at', 'refresh_token': 'rt'}
            spotify_user = {'id': 's1', 'email': 's@sp.com'}
            user = make_user(id='suid', username='su')

            monkeypatch.setattr(ctrl.spotify_auth_service, 'exchange_code_for_token', lambda code: token_data)
            monkeypatch.setattr(ctrl.spotify_auth_service, 'get_spotify_user_info', lambda at: spotify_user)
            monkeypatch.setattr(ctrl.spotify_auth_service, 'create_or_update_user_from_spotify', lambda u, t, db: user)
            monkeypatch.setattr(ctrl.spotify_auth_service, 'create_user_token', lambda u: 'tok-sp')

            res = ctrl.AuthController.spotify_callback('code123', db=None)
            assert res.access_token == 'tok-sp'
            assert res.user.username == 'su'


        def test_disconnect_spotify(monkeypatch):
            import app.controllers.auth_controller as ctrl
            user = make_user()

            monkeypatch.setattr(ctrl.spotify_auth_service, 'disconnect_spotify', lambda u, db: None)

            res = ctrl.AuthController.disconnect_spotify(user, db=None)
            assert 'desvinculada' in res.message


        def test_request_and_reset_password(monkeypatch):
            import app.controllers.auth_controller as ctrl

            monkeypatch.setattr(ctrl.AuthService, 'request_password_reset', lambda email, db: {'message': 'm', 'detail': 'd'})
            monkeypatch.setattr(ctrl.AuthService, 'reset_password_with_code', lambda email, code, new_pw, db: {'message': 'ok', 'detail': 'done'})

            res = ctrl.AuthController.request_password_reset('a@b.com', db=None)
            assert res.message == 'm'

            res2 = ctrl.AuthController.reset_password_with_code('a@b.com', '123456', 'Aa1!strong', db=None)
            assert res2.message == 'ok'
        return cur_user
