"""Ensure all model modules are imported so SQLAlchemy can resolve inter-model
relationships during mapper configuration when modules are imported in tests.
Import dependent model modules first so relationships referencing them by name
are present in the declarative registry before User is configured.
"""
from app.models import password_reset_code  # noqa: F401 (import for side-effects)
from app.models import emotion_analysis  # noqa: F401
from app.models.user import User