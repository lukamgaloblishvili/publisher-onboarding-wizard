import base64
import hashlib
import json
import secrets

from cryptography.fernet import Fernet, InvalidToken
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
ENCRYPTED_PREFIX = "enc::"


def _build_fernet_key(secret: str) -> bytes:
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


session_fernet = Fernet(_build_fernet_key(settings.secret_key))
data_encryption_secret = settings.data_encryption_key or settings.secret_key
data_fernet = Fernet(_build_fernet_key(data_encryption_secret))


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_session_token(subject_type: str, subject_id: int) -> str:
    payload = json.dumps({"subject_type": subject_type, "subject_id": subject_id}).encode("utf-8")
    return session_fernet.encrypt(payload).decode("utf-8")


def read_session_token(token: str) -> tuple[str, int] | None:
    try:
        data = json.loads(session_fernet.decrypt(token.encode("utf-8"), ttl=settings.session_max_age_seconds).decode("utf-8"))
    except (InvalidToken, UnicodeDecodeError, json.JSONDecodeError):
        return None
    subject_type = data.get("subject_type")
    subject_id = data.get("subject_id")
    if not isinstance(subject_type, str) or not isinstance(subject_id, int):
        return None
    return subject_type, subject_id


def generate_publisher_access_code() -> str:
    return secrets.token_urlsafe(18)


def encrypt_text(value: str | None) -> str | None:
    if not value:
        return None
    if value.startswith(ENCRYPTED_PREFIX):
        return value
    encrypted = data_fernet.encrypt(value.encode("utf-8")).decode("utf-8")
    return f"{ENCRYPTED_PREFIX}{encrypted}"


def decrypt_text(value: str | None) -> str | None:
    if not value:
        return None
    if not value.startswith(ENCRYPTED_PREFIX):
        return value
    encrypted = value[len(ENCRYPTED_PREFIX) :]
    return data_fernet.decrypt(encrypted.encode("utf-8")).decode("utf-8")
