# Package initializer for app.models: import all model modules so SQLAlchemy
# can resolve relationships during mapper configuration when modules are
# imported from other places (e.g. `from app.models.user import User`).
from . import password_reset_code  # noqa: F401
from . import emotion_analysis  # noqa: F401
from . import user  # noqa: F401

# Expose User at package level for convenience
from .user import User  # noqa: F401
