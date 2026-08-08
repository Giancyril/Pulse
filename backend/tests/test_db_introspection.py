"""
backend/tests/test_db_introspection.py
Unit tests for AES credential encryption and database introspection services.
"""
import pytest
from app.core.security import encrypt_credential, decrypt_credential


def test_credential_encryption_and_decryption():
    plain_password = "super_secret_db_password_123!"
    encrypted = encrypt_credential(plain_password)

    assert encrypted != plain_password
    assert len(encrypted) > 20

    decrypted = decrypt_credential(encrypted)
    assert decrypted == plain_password


def test_empty_credential_encryption():
    assert encrypt_credential("") == ""
    assert decrypt_credential("") == ""
