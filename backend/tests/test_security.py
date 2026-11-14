from cryptography.fernet import Fernet

from app import security
from app.config import get_settings


def test_token_roundtrip(monkeypatch):
    monkeypatch.setattr(get_settings(), "token_encryption_key", Fernet.generate_key().decode())
    blob = security.encrypt_token("1//refresh-token")
    assert "refresh-token" not in blob
    assert security.decrypt_token(blob) == "1//refresh-token"


def test_wrong_key_returns_none(monkeypatch):
    monkeypatch.setattr(get_settings(), "token_encryption_key", Fernet.generate_key().decode())
    blob = security.encrypt_token("secret")
    monkeypatch.setattr(get_settings(), "token_encryption_key", Fernet.generate_key().decode())
    assert security.decrypt_token(blob) is None


def test_session_token_is_hashed():
    assert security.hash_token("abc") != "abc"
    assert len(security.hash_token("abc")) == 64
