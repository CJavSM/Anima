import smtplib
import asyncio

import pytest

from app import routes
from app.routes.contact_routes import ContactMessage


def make_payload():
    return {
        "name": "Test User",
        "email": "test@example.com",
        "subject": "Consulta de prueba",
        "message": "Este es un mensaje de prueba desde el formulario de contacto."
    }


def test_health_check():
    body = asyncio.run(routes.contact_routes.health_check())
    assert body["status"] == "ok"
    assert body["service"] == "contact"
    assert "email_configured" in body


def test_send_contact_success(monkeypatch):
    # Replace SMTP with a dummy that succeeds
    class DummySMTP:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def starttls(self):
            return None

        def login(self, user, password):
            return None

        def send_message(self, msg):
            # mark that send was called
            self._sent = True

    monkeypatch.setattr(routes.contact_routes.smtplib, "SMTP", DummySMTP)

    result = asyncio.run(routes.contact_routes.send_contact_email(ContactMessage(**make_payload())))
    assert result.get("success") is True
    assert "Mensaje enviado" in result.get("message")


def test_send_contact_smtp_auth_failure(monkeypatch):
    # SMTP that raises authentication error on login
    class AuthFailSMTP:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def starttls(self):
            return None

        def login(self, user, password):
            raise smtplib.SMTPAuthenticationError(534, b"Auth failed")

        def send_message(self, msg):
            return None

    monkeypatch.setattr(routes.contact_routes.smtplib, "SMTP", AuthFailSMTP)

    with pytest.raises(Exception) as excinfo:
        asyncio.run(routes.contact_routes.send_contact_email(ContactMessage(**make_payload())))

    err = excinfo.value
    # Either an HTTPException-like object or generic exception string
    assert hasattr(err, "status_code") or "autenticación" in str(err).lower() or "auth" in str(err).lower()


def test_send_contact_smtp_exception(monkeypatch):
    # SMTP that raises a generic SMTPException during send
    class SendFailSMTP:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def starttls(self):
            return None

        def login(self, user, password):
            return None

        def send_message(self, msg):
            raise smtplib.SMTPException("send failed")

    monkeypatch.setattr(routes.contact_routes.smtplib, "SMTP", SendFailSMTP)

    with pytest.raises(Exception) as excinfo:
        asyncio.run(routes.contact_routes.send_contact_email(ContactMessage(**make_payload())))

    err = excinfo.value
    assert hasattr(err, "status_code") or "error" in str(err).lower() or "enviar" in str(err).lower()


def test_send_contact_generic_exception(monkeypatch):
    # Make SMTP constructor raise a generic exception to hit the final except
    def raise_on_init(*args, **kwargs):
        raise Exception("boom")

    monkeypatch.setattr(routes.contact_routes.smtplib, "SMTP", raise_on_init)

    with pytest.raises(Exception) as excinfo:
        asyncio.run(routes.contact_routes.send_contact_email(ContactMessage(**make_payload())))

    err = excinfo.value
    assert hasattr(err, "status_code") or "inesperado" in str(err).lower() or "error inesperado" in str(err).lower()
