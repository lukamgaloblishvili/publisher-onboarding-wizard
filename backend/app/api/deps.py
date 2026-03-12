from dataclasses import dataclass

from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import Session

from app.core.config import settings
from app.core.security import read_session_token
from app.db.session import get_session
from app.models.models import Publisher, User


@dataclass
class AuthContext:
    role: str
    user: User | None = None
    publisher: Publisher | None = None

    @property
    def publisher_id(self) -> int | None:
        return self.publisher.id if self.publisher else None


def get_current_user(
    session: Session = Depends(get_session),
    session_cookie: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> AuthContext:
    if not session_cookie:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    subject = read_session_token(session_cookie)
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    subject_type, subject_id = subject
    if subject_type == "admin_user":
        user = session.get(User, subject_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return AuthContext(role=user.role, user=user)
    if subject_type == "publisher":
        publisher = session.get(Publisher, subject_id)
        if not publisher:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Publisher not found")
        return AuthContext(role="publisher", publisher=publisher)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")


def require_admin(user: AuthContext = Depends(get_current_user)) -> AuthContext:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
