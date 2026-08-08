"""
backend/app/core/security.py
AES-256 Fernet credential encryption and decryption utility for external DB passwords.
"""
import base64
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.core.config import settings


def _get_fernet_key() -> bytes:
    """Generate a deterministic 32-byte Fernet key from settings.ENCRYPTION_KEY or SECRET_KEY."""
    secret = (settings.ENCRYPTION_KEY or settings.SECRET_KEY).encode("utf-8")
    salt = b"ai_data_analyst_static_salt_v1"
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100_000,
    )
    return base64.urlsafe_b64encode(kdf.derive(secret))


def encrypt_credential(plain_text: str) -> str:
    """Encrypt plain text database credential returning Fernet token string."""
    if not plain_text:
        return ""
    fernet = Fernet(_get_fernet_key())
    return fernet.encrypt(plain_text.encode("utf-8")).decode("utf-8")


def decrypt_credential(token: str) -> str:
    """Decrypt Fernet token string returning plain text database credential."""
    if not token:
        return ""
    fernet = Fernet(_get_fernet_key())
    return fernet.decrypt(token.encode("utf-8")).decode("utf-8")
