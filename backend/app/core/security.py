import secrets

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
serializer = URLSafeTimedSerializer(settings.secret_key, salt="px-session")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_session_token(subject_type: str, subject_id: int) -> str:
    return serializer.dumps({"subject_type": subject_type, "subject_id": subject_id})


def read_session_token(token: str) -> tuple[str, int] | None:
    try:
        data = serializer.loads(token, max_age=settings.session_max_age_seconds)
    except (BadSignature, SignatureExpired):
        return None
    subject_type = data.get("subject_type")
    subject_id = data.get("subject_id")
    if not isinstance(subject_type, str) or not isinstance(subject_id, int):
        return None
    return subject_type, subject_id


def generate_publisher_access_code() -> str:
    return secrets.token_urlsafe(18)
