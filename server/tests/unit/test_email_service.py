import importlib
import smtplib
from types import SimpleNamespace


def test_html_to_text_simple():
    mod = importlib.import_module('app.services.email_service')
    es = mod.EmailService()
    html = '<div>Hello <strong>World</strong>!<br/>Line two.</div>'
    txt = es._html_to_text(html)
    assert 'Hello World!' in txt
    assert 'Line two.' in txt


def test_send_email_success(monkeypatch):
    mod = importlib.import_module('app.services.email_service')
    svc = mod.EmailService()

    class FakeServer:
        def __init__(self, host, port, timeout=None):
            self.host = host
            self.port = port

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def starttls(self):
            self._tls = True

        def login(self, user, pwd):
            if user != svc.sender_email:
                raise smtplib.SMTPAuthenticationError(535, b'auth failed')

        def send_message(self, msg):
            # ensure msg has subject and to
            assert 'Subject' in msg
            assert msg['To'] == 'to@example.com'

    monkeypatch.setattr(mod, 'smtplib', SimpleNamespace(SMTP=lambda host, port, timeout=10: FakeServer(host, port), SMTPAuthenticationError=smtplib.SMTPAuthenticationError, SMTPException=smtplib.SMTPException))

    ok = svc.send_email('to@example.com', 'Hi', '<b>hi</b>')
    assert ok is True


def test_send_email_auth_failure(monkeypatch):
    mod = importlib.import_module('app.services.email_service')
    svc = mod.EmailService()

    class FakeServerAuthFail:
        def __init__(self, host, port, timeout=None):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def starttls(self):
            pass

        def login(self, user, pwd):
            raise smtplib.SMTPAuthenticationError(535, b'bad auth')

        def send_message(self, msg):
            pass

    monkeypatch.setattr(mod, 'smtplib', SimpleNamespace(SMTP=lambda host, port, timeout=10: FakeServerAuthFail(host, port), SMTPAuthenticationError=smtplib.SMTPAuthenticationError, SMTPException=smtplib.SMTPException))

    try:
        svc.send_email('to@example.com', 'Hi', '<b>hi</b>')
        assert False, 'Expected HTTPException for auth'
    except Exception as e:
        assert 'Error de configuración' in str(e) or 'HTTPException' in type(e).__name__


def test_send_email_smtp_exception(monkeypatch):
    mod = importlib.import_module('app.services.email_service')
    svc = mod.EmailService()

    class FakeServerFail:
        def __init__(self, host, port, timeout=None):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def starttls(self):
            pass

        def login(self, user, pwd):
            pass

        def send_message(self, msg):
            raise smtplib.SMTPException('send failed')

    monkeypatch.setattr(mod, 'smtplib', SimpleNamespace(SMTP=lambda host, port, timeout=10: FakeServerFail(host, port), SMTPAuthenticationError=smtplib.SMTPAuthenticationError, SMTPException=smtplib.SMTPException))

    try:
        svc.send_email('to@example.com', 'Hi', '<b>hi</b>')
        assert False, 'Expected HTTPException for smtp failure'
    except Exception as e:
        assert 'Error al enviar email' in str(e) or 'HTTPException' in type(e).__name__


def test_send_password_reset_code_uses_send_email(monkeypatch):
    mod = importlib.import_module('app.services.email_service')
    svc = mod.EmailService()

    called = {}

    def fake_send_email(recipient_email, subject, html_body, text_body=None, reply_to=None):
        called['to'] = recipient_email
        called['subject'] = subject
        called['html'] = html_body
        called['text'] = text_body
        return True

    monkeypatch.setattr(mod.EmailService, 'send_email', lambda self, recipient_email, subject, html_body, text_body=None, reply_to=None: fake_send_email(recipient_email, subject, html_body, text_body, reply_to))

    ok = svc.send_password_reset_code('u@x', 'Name', '123456')
    assert ok is True
    assert called.get('to') == 'u@x'
    assert 'Código de recuperación' in called.get('subject')
