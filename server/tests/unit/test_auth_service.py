import pytest
from collections import deque
from fastapi import HTTPException


def make_fake_user(**kwargs):
    class FakeUser:
        def __init__(self, **kw):
            # default fields used by AuthService
            self.id = kw.get('id', 'fake-id')
            self.email = kw.get('email', 'u@example.com')
            self.username = kw.get('username', 'user123')
            self.password_hash = kw.get('password_hash', 'hashed')
            self.first_name = kw.get('first_name')
            self.last_name = kw.get('last_name')
            self.is_active = kw.get('is_active', True)
            self.last_login = kw.get('last_login', None)
            self.updated_at = kw.get('updated_at', None)
            self.spotify_display_name = kw.get('spotify_display_name', None)

        def get_display_name(self):
            if self.first_name and self.last_name:
                return f"{self.first_name} {self.last_name}"
            if self.first_name:
                return self.first_name
            if self.spotify_display_name:
                return self.spotify_display_name
            return self.username

        def __repr__(self):
            return f"<FakeUser {self.username} {self.email}>"

    return FakeUser(**kwargs)


class FakeQuery:
    def __init__(self, db):
        self._db = db

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def first(self):
        try:
            return self._db._results.popleft()
        except IndexError:
            return None

    def all(self):
        # return remaining results (useful for .all() calls)
        return list(self._db._results)


class FakeDB:
    def __init__(self, results=None):
        # results is a list/iterable of values that successive query(...).first() calls will return
        self._results = deque(results or [])
        self.add_called = False
        self.commit_called = False
        self.refresh_called = False
        self._last_added = None

    def query(self, model):
        return FakeQuery(self)

    def add(self, obj):
        self.add_called = True
        self._last_added = obj

    def commit(self):
        self.commit_called = True

    def refresh(self, obj):
        self.refresh_called = True


def setup_module_level_monkeypatch(monkeypatch):
    """Ensure auth module utilities are deterministic and safe for tests."""
    import importlib
    auth_mod = importlib.import_module('app.services.auth_service')

    # patch hashing/verification/token generation
    monkeypatch.setattr(auth_mod, 'get_password_hash', lambda pw: f"hashed-{pw}")
    monkeypatch.setattr(auth_mod, 'verify_password', lambda pw, h: h == f"hashed-{pw}")
    monkeypatch.setattr(auth_mod, 'create_access_token', lambda data: "token-for-" + data.get('sub', 'none'))

    return auth_mod


def test_register_user_success(monkeypatch):
    auth_mod = setup_module_level_monkeypatch(monkeypatch)

    # Replace the ORM User class in the module will be done below with our FakeUser factory

    from app.schemas.auth_schemas import UserRegister

    # Create a register payload with a valid, strong password
    payload = UserRegister(
        email='new@example.com',
        username='newuser',
        password='Aa1!strong',
        first_name='New',
        last_name='User'
    )

    # db will return None for the two uniqueness checks (email, username)
    db = FakeDB(results=[None, None])

    # Monkeypatch the module's User model: provide class-level attributes used in filters
    class FakeUserModel:
        # class attributes to allow `User.email` and `User.username` comparisons
        email = 'email'
        username = 'username'

        def __init__(self, **kw):
            # create an instance with the expected attributes
            self.id = kw.get('id', 'fake-id')
            self.email = kw.get('email', 'u@example.com')
            self.username = kw.get('username', 'user123')
            self.password_hash = kw.get('password_hash', 'hashed')
            self.first_name = kw.get('first_name')
            self.last_name = kw.get('last_name')
            self.is_active = kw.get('is_active', True)
            self.last_login = kw.get('last_login', None)
            self.updated_at = kw.get('updated_at', None)
            self.spotify_display_name = kw.get('spotify_display_name', None)

        def get_display_name(self):
            if self.first_name and self.last_name:
                return f"{self.first_name} {self.last_name}"
            if self.first_name:
                return self.first_name
            if self.spotify_display_name:
                return self.spotify_display_name
            return self.username

        def __repr__(self):
            return f"<FakeUserModel {self.username} {self.email}>"

    monkeypatch.setattr(auth_mod, 'User', FakeUserModel)

    user = auth_mod.AuthService.register_user(payload, db)

    assert user.email == 'new@example.com'
    assert user.username == 'newuser'
    assert db.add_called is True
    assert db.commit_called is True
    assert db.refresh_called is True


def test_register_user_duplicate_email(monkeypatch):
    auth_mod = setup_module_level_monkeypatch(monkeypatch)

    # existing user present for email check
    existing = make_fake_user(email='exists@example.com')
    db = FakeDB(results=[existing])

    from app.schemas.auth_schemas import UserRegister
    payload = UserRegister(
        email='exists@example.com',
        username='whatever',
        password='Aa1!strong'
    )

    with pytest.raises(HTTPException) as exc:
        auth_mod.AuthService.register_user(payload, db)

    assert exc.value.status_code == 400


def test_authenticate_user_success(monkeypatch):
    auth_mod = setup_module_level_monkeypatch(monkeypatch)

    # create a user with a password hash matching our fake verifier
    u = make_fake_user(password_hash='hashed-mypass', username='u1')
    # db.query(...).first() should return our user
    db = FakeDB(results=[u])

    # call authenticate
    returned = auth_mod.AuthService.authenticate_user('u1', 'mypass', db)

    assert returned is u
    # last_login should be set
    assert returned.last_login is not None
    assert db.commit_called is True


def test_authenticate_user_wrong_password(monkeypatch):
    auth_mod = setup_module_level_monkeypatch(monkeypatch)

    u = make_fake_user(password_hash='hashed-other')
    db = FakeDB(results=[u])

    with pytest.raises(HTTPException) as exc:
        auth_mod.AuthService.authenticate_user('u1', 'mypass', db)

    assert exc.value.status_code == 401


def test_create_user_token(monkeypatch):
    auth_mod = setup_module_level_monkeypatch(monkeypatch)
    fake = make_fake_user(id='42', username='alpha', email='a@b.com')

    token = auth_mod.AuthService.create_user_token(fake)
    assert token == 'token-for-42'


def test_get_user_by_id_not_found(monkeypatch):
    auth_mod = setup_module_level_monkeypatch(monkeypatch)
    db = FakeDB(results=[None])

    with pytest.raises(HTTPException) as exc:
        auth_mod.AuthService.get_user_by_id('nope', db)

    assert exc.value.status_code == 404


def test_get_user_by_id_found(monkeypatch):
    auth_mod = setup_module_level_monkeypatch(monkeypatch)
    u = make_fake_user(id='abc')
    db = FakeDB(results=[u])

    found = auth_mod.AuthService.get_user_by_id('abc', db)
    assert found is u


def test_update_user_success(monkeypatch):
    auth_mod = setup_module_level_monkeypatch(monkeypatch)
    # existing user being updated
    u = make_fake_user(username='old', email='old@example.com')

    # For uniqueness checks, return None (no conflicts)
    db = FakeDB(results=[None, None])

    updated = auth_mod.AuthService.update_user(u, {'username': 'new', 'email': 'new@example.com', 'first_name': 'F', 'last_name': 'L'}, db)

    assert updated.username == 'new'
    assert updated.email == 'new@example.com'
    assert updated.first_name == 'F'
    assert db.commit_called is True
    assert db.refresh_called is True


def test_update_user_conflict_username(monkeypatch):
    auth_mod = setup_module_level_monkeypatch(monkeypatch)
    u = make_fake_user(username='old')
    # First uniqueness check returns an existing user (conflict)
    db = FakeDB(results=[make_fake_user(username='new')])

    with pytest.raises(HTTPException) as exc:
        auth_mod.AuthService.update_user(u, {'username': 'new'}, db)

    assert exc.value.status_code == 400
