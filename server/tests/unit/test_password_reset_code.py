import uuid
from datetime import datetime, timezone, timedelta

import pytest


def test_create_code_defaults():
    mod = __import__('app.models.password_reset_code', fromlist=['PasswordResetCode'])
    PRC = mod.PasswordResetCode

    uid = uuid.uuid4()
    obj = PRC.create_code(uid, 'u@example.com')

    assert obj.user_id == uid
    assert obj.email == 'u@example.com'
    assert isinstance(obj.code, str) and len(obj.code) == 6
    # expires_at should be roughly ~30 minutes in the future
    delta = obj.expires_at - datetime.now(timezone.utc)
    assert timedelta(minutes=25) < delta < timedelta(minutes=35)


def test_is_expired_and_valid_flags():
    mod = __import__('app.models.password_reset_code', fromlist=['PasswordResetCode'])
    PRC = mod.PasswordResetCode

    uid = uuid.uuid4()
    # create a code that already expired
    expired = PRC(user_id=uid, code='000000', email='x@x.com', expires_at=datetime.now(timezone.utc) - timedelta(minutes=1), is_used=False)
    assert expired.is_expired() is True
    assert expired.is_valid() is False

    # create a valid code
    future = PRC(user_id=uid, code='111111', email='x@x.com', expires_at=datetime.now(timezone.utc) + timedelta(minutes=10), is_used=False)
    assert future.is_expired() is False
    assert future.is_valid() is True

    # mark used
    future.is_used = True
    assert future.is_valid() is False
