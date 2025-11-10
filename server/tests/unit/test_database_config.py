import importlib
import types
import pytest


def test_check_database_connection_success(monkeypatch):
    db_mod = importlib.import_module('app.config.database')

    class FakeConn:
        def exec_driver_sql(self, q):
            assert q == 'SELECT 1'

    class FakeCtx:
        def __enter__(self):
            return FakeConn()

        def __exit__(self, exc_type, exc, tb):
            return False

    class FakeEngine:
        def connect(self):
            return FakeCtx()

    monkeypatch.setattr(db_mod, 'engine', FakeEngine())

    assert db_mod.check_database_connection() is True


def test_check_database_connection_failure(monkeypatch):
    db_mod = importlib.import_module('app.config.database')

    class BadEngine:
        def connect(self):
            raise Exception('conn fail')

    monkeypatch.setattr(db_mod, 'engine', BadEngine())

    assert db_mod.check_database_connection() is False


def test_create_tables_success_and_failure(monkeypatch):
    db_mod = importlib.import_module('app.config.database')

    # success path: replace Base.metadata.create_all with a callable that sets a flag
    called = {}

    def fake_create_all(bind=None):
        called['ok'] = True

    monkeypatch.setattr(db_mod.Base.metadata, 'create_all', fake_create_all)
    db_mod.create_tables()
    assert called.get('ok') is True

    # failure path: raise and ensure exception propagates
    def raise_create_all(bind=None):
        raise RuntimeError('create fail')

    monkeypatch.setattr(db_mod.Base.metadata, 'create_all', raise_create_all)
    with pytest.raises(RuntimeError):
        db_mod.create_tables()


def test_get_db_closes_session(monkeypatch):
    db_mod = importlib.import_module('app.config.database')

    class FakeSession:
        def __init__(self):
            self.closed = False

        def close(self):
            self.closed = True

    def fake_session_factory():
        return FakeSession()

    monkeypatch.setattr(db_mod, 'SessionLocal', fake_session_factory)

    gen = db_mod.get_db()
    sess = next(gen)
    # session should be our FakeSession
    assert isinstance(sess, FakeSession)

    # closing the generator should invoke finally and close session
    gen.close()
    assert sess.closed is True
