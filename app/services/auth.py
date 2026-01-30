from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import jwt, JWTError
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from uuid7 import uuid7

from app.config import get_settings
from app.database import get_db
from app.models.domain import Teacher

security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(teacher_id: str) -> str:
    """Create a JWT token for a teacher."""
    settings = get_settings()
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": teacher_id,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[str]:
    """Decode a JWT token and return the teacher ID."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload.get("sub")
    except JWTError:
        return None


async def get_current_teacher(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    """
    FastAPI dependency to get the current authenticated teacher ID.
    Raises HTTPException if not authenticated.
    """
    token = credentials.credentials
    teacher_id = decode_token(token)

    if teacher_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Verify teacher exists
    with get_db() as conn:
        result = conn.execute(
            "SELECT id FROM teachers WHERE id = ?",
            [teacher_id]
        ).fetchone()

        if result is None:
            raise HTTPException(status_code=401, detail="Teacher not found")

    return teacher_id


def register_teacher(username: str, password: str, display_name: Optional[str] = None) -> Teacher:
    """
    Register a new teacher.

    Args:
        username: Unique username
        password: Plain text password
        display_name: Optional display name

    Returns:
        Created Teacher object

    Raises:
        ValueError: If username already exists
    """
    with get_db() as conn:
        # Check if username exists
        existing = conn.execute(
            "SELECT id FROM teachers WHERE username = ?",
            [username]
        ).fetchone()

        if existing:
            raise ValueError("Username already exists")

        teacher_id = str(uuid7())
        password_hash = hash_password(password)
        created_at = datetime.utcnow()

        conn.execute(
            """
            INSERT INTO teachers (id, username, password_hash, display_name, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            [teacher_id, username, password_hash, display_name, created_at]
        )

        return Teacher(
            id=teacher_id,
            username=username,
            display_name=display_name,
            created_at=created_at,
        )


def login_teacher(username: str, password: str) -> tuple[Teacher, str]:
    """
    Authenticate a teacher and return their data with a token.

    Args:
        username: Teacher's username
        password: Plain text password

    Returns:
        Tuple of (Teacher, JWT token)

    Raises:
        ValueError: If credentials are invalid
    """
    with get_db() as conn:
        result = conn.execute(
            """
            SELECT id, username, password_hash, display_name, created_at
            FROM teachers WHERE username = ?
            """,
            [username]
        ).fetchone()

        if result is None:
            raise ValueError("Invalid credentials")

        teacher_id, db_username, password_hash, display_name, created_at = result

        if not verify_password(password, password_hash):
            raise ValueError("Invalid credentials")

        teacher = Teacher(
            id=teacher_id,
            username=db_username,
            display_name=display_name,
            created_at=created_at,
        )

        token = create_token(teacher_id)

        return teacher, token


def get_teacher_by_id(teacher_id: str) -> Optional[Teacher]:
    """Get a teacher by their ID."""
    with get_db() as conn:
        result = conn.execute(
            """
            SELECT id, username, display_name, created_at
            FROM teachers WHERE id = ?
            """,
            [teacher_id]
        ).fetchone()

        if result is None:
            return None

        return Teacher(
            id=result[0],
            username=result[1],
            display_name=result[2],
            created_at=result[3],
        )
