import pytest
from types import SimpleNamespace
from fastapi import HTTPException

import app.middlewares.auth_middleware as am


class FakeQuery:
    def __init__(self, result):
        self.result = result

    def filter(self, *a, **k):
        return self

    def first(self):
        return self.result


class FakeDB:
    def __init__(self, result):
        self._result = result

    def query(self, model):
        return FakeQuery(self._result)


def make_credentials(token="tok"):
    return SimpleNamespace(credentials=token)


def test_get_current_user_success(monkeypatch):
    # Valid token and active user
    monkeypatch.setattr('app.middlewares.auth_middleware.decode_access_token', lambda t: {'sub': '1'})
    user = SimpleNamespace(id='1', is_active=True)
    db = FakeDB(user)

    cred = make_credentials('ok')

    res = am.get_current_user(credentials=cred, db=db)
    assert res is user


def test_get_current_user_invalid_token(monkeypatch):
    monkeypatch.setattr('app.middlewares.auth_middleware.decode_access_token', lambda t: None)
    db = FakeDB(None)
    cred = make_credentials('bad')

    with pytest.raises(HTTPException) as exc:
        am.get_current_user(credentials=cred, db=db)
    assert exc.value.status_code == 401


def test_get_current_user_missing_sub(monkeypatch):
    monkeypatch.setattr('app.middlewares.auth_middleware.decode_access_token', lambda t: {})
    db = FakeDB(None)
    cred = make_credentials('x')

    with pytest.raises(HTTPException) as exc:
        am.get_current_user(credentials=cred, db=db)
    assert exc.value.status_code == 401


def test_get_current_user_not_found(monkeypatch):
    monkeypatch.setattr('app.middlewares.auth_middleware.decode_access_token', lambda t: {'sub': '2'})
    db = FakeDB(None)
    cred = make_credentials('x')

    with pytest.raises(HTTPException) as exc:
        am.get_current_user(credentials=cred, db=db)
    assert exc.value.status_code == 401


def test_get_current_user_inactive(monkeypatch):
    monkeypatch.setattr('app.middlewares.auth_middleware.decode_access_token', lambda t: {'sub': '3'})
    user = SimpleNamespace(id='3', is_active=False)
    db = FakeDB(user)
    cred = make_credentials('x')

    with pytest.raises(HTTPException) as exc:
        am.get_current_user(credentials=cred, db=db)
    assert exc.value.status_code == 403


def test_get_current_active_user_raises_if_inactive():
    user = SimpleNamespace(is_active=False)
    with pytest.raises(HTTPException):
        am.get_current_active_user(current_user=user)

    user2 = SimpleNamespace(is_active=True)
    assert am.get_current_active_user(current_user=user2) is user2
