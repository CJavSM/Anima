import importlib
import sys
from types import SimpleNamespace
from datetime import datetime, timezone, timedelta

import pytest


# Minimal Col placeholder to emulate SQLAlchemy column attributes used in filters/order_by
class Col:
    def __init__(self, name):
        self.name = name

    def __eq__(self, other):
        return (self.name, '==', other)

    def __ne__(self, other):
        return (self.name, '!=', other)

    def __repr__(self):
        return f"Col({self.name})"

    def desc(self):
        return self


class FakeQuery:
    def __init__(self, first_result=None, all_results=None):
        self._first = first_result
        self._all_queue = list(all_results or [])

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self._first

    def all(self):
        if self._all_queue:
            return self._all_queue.pop(0)
        return []


class FakeDB:
    def __init__(self, *, first=None, all_results=None):
        self._first = first
        self._all_results = list(all_results or [])
        self.add_called = False
        self.commit_called = False
        self.refresh_called = False
        self.rollback_called = False
        self._last_added = None

    def query(self, model):
        next_all = None
        if self._all_results:
            next_all = self._all_results.pop(0)
        return FakeQuery(first_result=self._first, all_results=[next_all] if next_all is not None else [])

    def add(self, obj):
        self.add_called = True
        self._last_added = obj

    def commit(self):
        if hasattr(self, 'commit_raises') and self.commit_raises:
            raise Exception('db commit failed')
        self.commit_called = True

    def refresh(self, obj):
        self.refresh_called = True
        if not getattr(obj, 'id', None):
            obj.id = 'generated-id'

    def rollback(self):
        self.rollback_called = True


def make_user(**kw):
    u = SimpleNamespace()
    u.id = kw.get('id', 'u1')
    u.email = kw.get('email', 'a@b.com')
    u.username = kw.get('username', 'u')
    u.password_hash = kw.get('password_hash', 'hash')
    u.is_active = kw.get('is_active', True)
    u.get_display_name = lambda: kw.get('display_name', u.username)
    return u


def test_register_user_conflict_on_email():
    mod = importlib.import_module('app.services.auth_service')
    svc = mod.AuthService

    # simulate existing user by email
    fake_db = FakeDB(first=make_user(email='exists@x.com'))

    class Req:
        email = 'exists@x.com'
        username = 'newuser'
        password = 'p'
        first_name = 'F'
        last_name = 'L'

    with pytest.raises(Exception):
        svc.register_user(Req(), fake_db)


def test_authenticate_user_invalid_and_inactive(monkeypatch):
    mod = importlib.import_module('app.services.auth_service')
    svc = mod.AuthService

    # no user found
    fake_db = FakeDB(first=None)
    with pytest.raises(Exception):
        svc.authenticate_user('noone', 'pw', fake_db)

    # inactive user
    user = make_user(id='u2', username='u2', password_hash='h', is_active=False)
    fake_db2 = FakeDB(first=user)
    with pytest.raises(Exception):
        svc.authenticate_user('u2', 'pw', fake_db2)


def test_request_password_reset_and_email(monkeypatch):
    mod = importlib.import_module('app.services.auth_service')
    svc = mod.AuthService

    # prepare fake PasswordResetCode module
    class FakePRC:
        def __init__(self, **kw):
            self.user_id = kw.get('user_id')
            self.email = kw.get('email')
            self.code = kw.get('code', '123456')
            self.is_used = False
            self.created_at = datetime.now(timezone.utc)

        @classmethod
        def create_code(cls, user_id, email, expiration_minutes=30):
            return cls(user_id=user_id, email=email, code='999999')

    # attach class-level column-like attributes so auth_service can access fields
    FakePRC.user_id = Col('user_id')
    FakePRC.is_used = Col('is_used')
    FakePRC.email = Col('email')
    FakePRC.code = Col('code')
    FakePRC.created_at = Col('created_at')

    fake_prc_mod = SimpleNamespace(PasswordResetCode=FakePRC)
    monkeypatch.setitem(sys.modules, 'app.models.password_reset_code', fake_prc_mod)

    # fake email service
    sent = {}

    class FakeEmailSvc:
        def send_password_reset_code(self, email, name, code):
            sent['email'] = email
            sent['name'] = name
            sent['code'] = code

    fake_email_mod = SimpleNamespace(email_service=FakeEmailSvc())
    monkeypatch.setitem(sys.modules, 'app.services.email_service', fake_email_mod)

    # user exists and is active and has password
    user = make_user(id='u3', email='u3@x.com', username='u3', password_hash='h')
    # no old codes
    fake_db = FakeDB(first=user, all_results=[[]])

    res = svc.request_password_reset('u3@x.com', fake_db)
    assert 'Código' in res.get('message', '') or 'enviado' in res.get('message', '')
    assert sent.get('email') == 'u3@x.com'


def test_reset_password_with_code_success(monkeypatch):
    mod = importlib.import_module('app.services.auth_service')
    svc = mod.AuthService

    # create fake reset code object
    class FakeReset:
        def __init__(self, user_id, email, code, created_at=None, is_used=False):
            self.user_id = user_id
            self.email = email
            self.code = code
            self.created_at = created_at or datetime.now(timezone.utc)
            self.is_used = is_used

        def is_expired(self):
            return False

    reset_obj = FakeReset(user_id='u4', email='u4@x.com', code='000111')

    # We'll implement a query state object to return reset_obj first, then user
    user = make_user(id='u4', email='u4@x.com')

    class QState:
        def __init__(self):
            self.calls = 0

        def __call__(self, model):
            self.calls += 1
            class Q:
                def filter(inner_self, *a, **k):
                    return inner_self

                def order_by(inner_self, *a, **k):
                    return inner_self

                def first(inner_self):
                    if QState.inst.calls == 1:
                        return reset_obj
                    return user

            return Q()

    QState.inst = QState()
    fake_db = FakeDB()
    fake_db.query = QState.inst

    # inject dummy PasswordResetCode module so imports inside function don't fail
    # create a lightweight PasswordResetCode class with column-like attrs for the function's attribute access
    PRCClass = type('PRCClass', (), {})
    PRCClass.email = Col('email')
    PRCClass.code = Col('code')
    PRCClass.is_used = Col('is_used')
    PRCClass.created_at = Col('created_at')
    monkeypatch.setitem(sys.modules, 'app.models.password_reset_code', SimpleNamespace(PasswordResetCode=PRCClass))

    res = svc.reset_password_with_code('u4@x.com', '000111', 'newpass', fake_db)
    assert 'Contraseña' in res.get('message', '') or 'cambiada' in res.get('message', '')
