"""
FinSight AI -- Authentication Service
======================================
Handles password hashing, JWT token generation,
and extracting the authenticated user from tokens.
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt  # using bcrypt directly instead of passlib to avoid 72-byte string bug
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.config import settings
from app.db import get_users_collection

# ── Password Hashing ─────────────────────────────────────────────────────────

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plain password against the stored bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    """Generate a bcrypt hash of a password."""
    # hashpw returns bytes; decode to store as string in MongoDB
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return hashed_bytes.decode('utf-8')


# ── JWT Token Management ─────────────────────────────────────────────────────

# Define the OAuth2 scheme (where FastAPI looks for the token: Authorization header)
# We use a placeholder URL because we are using our custom /api/auth/login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a new JWT token containing the given payload data."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Default expiration from settings
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

# ── FastAPI Dependency for Protected Routes ──────────────────────────────────

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Dependency to validate the JWT token in the Authorization header.
    Returns the user document directly from the database if valid.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the token using our secret key
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")  # convention is to store user ID in 'sub'
        if user_id is None:
            raise credentials_exception
    except JWTError:
        # Token is invalid or expired
        raise credentials_exception

    # Fetch user from DB to ensure they still exist
    users_collection = get_users_collection()
    user = await users_collection.find_one({"_id": user_id})
    if user is None:
        raise credentials_exception
        
    # Map _id to id before returning
    user["id"] = user.pop("_id")
    return user
