from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import Session

from app.core.config import settings
from app.core.security import read_session_token
from app.db.session import get_session
from app.models.models import User


def get_current_user(
    session: Session = Depends(get_session),
    session_cookie: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> User:
    if not session_cookie:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = read_session_token(session_cookie)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
