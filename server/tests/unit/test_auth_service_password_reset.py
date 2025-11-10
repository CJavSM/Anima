import sys
import uuid
from types import SimpleNamespace
from datetime import datetime, timezone, timedelta

import pytest


class FakeQuery:
    def __init__(self, model, db):
        self.model = model
        self.db = db

    def filter(self, *a, **k):
        return self

    def order_by(self, *a, **k):
        return self

    def all(self):
        return self.db.all_results_by_model.get(self.model, [])

    def first(self):
        return self.db.first_results_by_model.get(self.model)


class FakeDB:
    def __init__(self, *, first_map=None, all_map=None):
        # maps model -> value
        self.first_results_by_model = dict(first_map or {})
        self.all_results_by_model = dict(all_map or {})
        self.added = []
        self.commits = 0

    def query(self, model):
        return FakeQuery(model, self)

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.commits += 1

    def refresh(self, obj):
        pass

    def rollback(self):
        pass


def make_user(uid=None, password_hash='h'):
    u = SimpleNamespace()
    u.id = uid or uuid.uuid4()
    u.email = f'user-{u.id}@x.test'
    u.password_hash = password_hash
    u.is_active = True
    u.get_display_name = lambda: 'User'
    return u


# Minimal Col placeholder to satisfy attribute access like PasswordResetCode.user_id
class Col:
    def __init__(self, name):
        self.name = name

    def __eq__(self, other):
        return (self.name, '==', other)

    def __repr__(self):
        return f"Col({self.name})"


def test_request_password_reset_success(monkeypatch):
    svc_mod = __import__('app.services.auth_service', fromlist=['AuthService'])
    AuthService = svc_mod.AuthService

    # fake user present
    user = make_user()
    fake_db = FakeDB(first_map={
        __import__('app.models.user', fromlist=['User']).User: user
    }, all_map={
        __import__('app.models.password_reset_code', fromlist=['PasswordResetCode']).PasswordResetCode: []
    })

    # fake PasswordResetCode.create_code
    class FakePRC:
        def __init__(self, user_id, code, email, expires_at=None):
            self.user_id = user_id
            self.code = code
            self.email = email
            self.is_used = False
            self.expires_at = expires_at or (datetime.now(timezone.utc) + timedelta(minutes=30))

        @classmethod
        def create_code(cls, user_id, email, expiration_minutes=30):
            return cls(user_id, '123456', email, datetime.now(timezone.utc) + timedelta(minutes=expiration_minutes))

    # attach class-level Col placeholders used by filters
    FakePRC.user_id = Col('user_id')
    FakePRC.is_used = Col('is_used')
    FakePRC.email = Col('email')
    FakePRC.code = Col('code')
    FakePRC.created_at = Col('created_at')
    monkeypatch.setitem(sys.modules, 'app.models.password_reset_code', SimpleNamespace(PasswordResetCode=FakePRC))

    # fake email service
    sent = {}

    class FakeEmailSvc:
        def send_password_reset_code(self, email, name, code):
            sent['email'] = email
            sent['name'] = name
            sent['code'] = code

    monkeypatch.setitem(sys.modules, 'app.services.email_service', SimpleNamespace(email_service=FakeEmailSvc()))

    res = AuthService.request_password_reset(user.email, fake_db)
    assert 'Código' in res['message'] or 'enviado' in res['message']
    assert sent.get('email') == user.email
    # ensure DB got the reset code added and committed
    assert any(hasattr(o, 'code') for o in fake_db.added)
    assert fake_db.commits >= 1


def test_request_password_reset_email_failure_marks_used(monkeypatch):
    svc_mod = __import__('app.services.auth_service', fromlist=['AuthService'])
    AuthService = svc_mod.AuthService

    user = make_user()
    fake_db = FakeDB(first_map={
        __import__('app.models.user', fromlist=['User']).User: user
    }, all_map={
        __import__('app.models.password_reset_code', fromlist=['PasswordResetCode']).PasswordResetCode: []
    })

    class FakePRC2:
        def __init__(self, user_id, code, email, expires_at=None):
            self.user_id = user_id
            self.code = code
            self.email = email
            self.is_used = False
            self.expires_at = expires_at or (datetime.now(timezone.utc) + timedelta(minutes=30))

        @classmethod
        def create_code(cls, user_id, email, expiration_minutes=30):
            return cls(user_id, '654321', email, datetime.now(timezone.utc) + timedelta(minutes=expiration_minutes))

    FakePRC2.user_id = Col('user_id')
    FakePRC2.is_used = Col('is_used')
    FakePRC2.email = Col('email')
    FakePRC2.code = Col('code')
    FakePRC2.created_at = Col('created_at')
    monkeypatch.setitem(sys.modules, 'app.models.password_reset_code', SimpleNamespace(PasswordResetCode=FakePRC2))

    class BrokenEmail:
        def send_password_reset_code(self, email, name, code):
            raise RuntimeError('smtp fail')

    monkeypatch.setitem(sys.modules, 'app.services.email_service', SimpleNamespace(email_service=BrokenEmail()))

    with pytest.raises(RuntimeError):
        AuthService.request_password_reset(user.email, fake_db)

    # The created reset_code instance should have been marked used by the except path.
    # It's the last added object
    added = fake_db.added[-1]
    assert added.is_used is True
    # commit called at least twice (initial commit + commit after marking used)
    assert fake_db.commits >= 2


def test_request_password_reset_no_user_raises(monkeypatch):
    svc_mod = __import__('app.services.auth_service', fromlist=['AuthService'])
    AuthService = svc_mod.AuthService

    fake_db = FakeDB(first_map={})

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        AuthService.request_password_reset('no@x.test', fake_db)
    assert exc.value.status_code == 404
    assert 'No existe una cuenta' in str(exc.value.detail)


def test_reset_password_with_code_success(monkeypatch):
    svc_mod = __import__('app.services.auth_service', fromlist=['AuthService'])
    AuthService = svc_mod.AuthService

    # setup reset_code and user
    uid = uuid.uuid4()
    class ResetObj:
        def __init__(self):
            self.user_id = uid
            self.email = 'u@test'
            self.code = '000111'
            self.is_used = False
            self.created_at = datetime.now(timezone.utc)
        def is_expired(self):
            return False

    reset_obj = ResetObj()
    user = make_user(uid)

    fake_db = FakeDB(first_map={
        __import__('app.models.password_reset_code', fromlist=['PasswordResetCode']).PasswordResetCode: reset_obj,
        __import__('app.models.user', fromlist=['User']).User: user
    })

    # patch get_password_hash to predictable value
    monkeypatch.setattr(svc_mod, 'get_password_hash', lambda p: 'newhash')

    res = AuthService.reset_password_with_code(user.email, '000111', 'NewP@ss1', fake_db)
    assert 'Contraseña' in res['message']
    assert fake_db.commits >= 1


def test_reset_password_with_code_invalid_or_used(monkeypatch):
    svc_mod = __import__('app.services.auth_service', fromlist=['AuthService'])
    AuthService = svc_mod.AuthService

    fake_db = FakeDB(first_map={
        __import__('app.models.password_reset_code', fromlist=['PasswordResetCode']).PasswordResetCode: None
    })

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        AuthService.reset_password_with_code('u@x', 'bad', 'np', fake_db)
    assert exc.value.status_code == 400
    assert 'Código inválido' in str(exc.value.detail)


def test_reset_password_with_code_expired(monkeypatch):
    svc_mod = __import__('app.services.auth_service', fromlist=['AuthService'])
    AuthService = svc_mod.AuthService

    uid = uuid.uuid4()
    class ResetExpired:
        def __init__(self):
            self.user_id = uid
            self.email = 'u@test'
            self.code = '111000'
            self.is_used = False
            self.created_at = datetime.now(timezone.utc) - timedelta(hours=1)
        def is_expired(self):
            return True

    reset_obj = ResetExpired()
    fake_db = FakeDB(first_map={
        __import__('app.models.password_reset_code', fromlist=['PasswordResetCode']).PasswordResetCode: reset_obj
    })

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        AuthService.reset_password_with_code('u@test', '111000', 'no', fake_db)
    assert exc.value.status_code == 400
    assert 'expir' in str(exc.value.detail)
    # reset_obj should be marked used
    assert reset_obj.is_used is True


def test_reset_password_with_code_user_not_found(monkeypatch):
    svc_mod = __import__('app.services.auth_service', fromlist=['AuthService'])
    AuthService = svc_mod.AuthService

    uid = uuid.uuid4()
    class ResetObj2:
        def __init__(self):
            self.user_id = uid
            self.email = 'u@test'
            self.code = '222333'
            self.is_used = False
            self.created_at = datetime.now(timezone.utc)
        def is_expired(self):
            return False

    reset_obj = ResetObj2()
    fake_db = FakeDB(first_map={
        __import__('app.models.password_reset_code', fromlist=['PasswordResetCode']).PasswordResetCode: reset_obj,
        __import__('app.models.user', fromlist=['User']).User: None
    })

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        AuthService.reset_password_with_code('u@test', '222333', 'p', fake_db)
    assert exc.value.status_code == 404
    assert 'Usuario no encontrado' in str(exc.value.detail)
