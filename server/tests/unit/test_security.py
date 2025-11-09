import time
from datetime import timedelta, timezone, datetime

import pytest

import app.utils.security as sec


def test_password_hash_and_verify():
    pw = "my-secret"
    h = sec.get_password_hash(pw)
    assert isinstance(h, str) and len(h) > 0
    assert sec.verify_password(pw, h) is True
    assert sec.verify_password("wrong", h) is False


def test_create_and_decode_token_and_user_id():
    payload = {"sub": "123", "username": "u", "email": "e"}
    token = sec.create_access_token(payload, expires_delta=timedelta(seconds=60))
    assert isinstance(token, str)

    decoded = sec.decode_access_token(token)
    assert decoded is not None
    assert decoded.get("sub") == "123"

    uid = sec.get_user_id_from_token(token)
    assert uid == "123"


def test_expired_token_returns_none():
    payload = {"sub": "x"}
    # Create a token that expires immediately in the past
    token = sec.create_access_token(payload, expires_delta=timedelta(seconds=-10))
    # decode should return None for expired
    assert sec.decode_access_token(token) is None
    assert sec.get_user_id_from_token(token) is None


def test_create_user_token_has_token_type():
    user_data = {"sub": "u1", "username": "u", "email": "e"}
    token = sec.create_user_token(user_data)
    decoded = sec.decode_access_token(token)
    assert decoded is not None
    assert decoded.get("token_type") == "access"
