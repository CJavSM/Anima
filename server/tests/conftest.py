import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set test DB URL before importing app modules that read it
TEST_DB_URL = os.getenv('TEST_DATABASE_URL', 'sqlite:///:memory:')
os.environ['TEST_DATABASE_URL'] = TEST_DB_URL
from fastapi.testclient import TestClient

# If using sqlite in-memory for unit tests, avoid importing the full app and creating
# DB tables (some models use Postgres-specific column types like JSONB which don't
# compile under SQLite). Only create the TestClient and DB fixtures when a real
# test DB URL (e.g., PostgreSQL) is provided.
if not TEST_DB_URL.startswith('sqlite'):
    from app.config.database import Base, get_db
    from main import app

    # Create a test engine and session factory
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False} if TEST_DB_URL.startswith('sqlite') else {})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Create all tables in the test DB
    Base.metadata.create_all(bind=engine)

    @pytest.fixture(scope='session')
    def client():
        """Return a TestClient that uses the test database"""

        # Override the get_db dependency to use the testing session
        def override_get_db():
            db = TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db

        with TestClient(app) as c:
            yield c
else:
    # No DB-backed client fixture for sqlite-based unit runs
    pass
