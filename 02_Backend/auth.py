"""
Authentication Module.

This module handles password hashing, token creation/verification, and current user retrieval.
It uses OAuth2 with Password Flow and JWT tokens.
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import models, crud, schemas
from database import get_db
import os

# Secret key for JWT signing. 
# WARNING: In production, this must be a strong secret loaded from environment variables.
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 43200 # 30 Days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    """Verifies a plain:hashed password match."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Generates a Bcrypt hash for a password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Creates a JWT access token with an expiration time."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
        
    user = crud.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    
    # Check if this is a restricted token (2FA pending)
    # The login endpoint will issue a token with scope="2fa_pending"
    # Endpoints requiring full auth should use get_verified_user
    return user

async def get_verified_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Returns user only if token is fully authenticated (not 2fa_pending).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    two_fa_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="2FA Verification Required",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        scope: str = payload.get("scope", "")
        print(f"DEBUG: auth check - email={email} scope={scope}")
        if email is None:
            raise credentials_exception
        if scope == "2fa_pending":
             raise two_fa_exception
             
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
        
    user = crud.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

def create_2fa_code():
    import random
    import string
    return ''.join(random.choices(string.digits, k=6))

def verify_2fa_code(user, code: str):
    if not user.two_factor_code or not user.two_factor_expires:
        return False
    if user.two_factor_code != code:
        return False
    if datetime.utcnow() > user.two_factor_expires:
        return False
    return True

def create_device_token() -> str:
    """Generates a secure random string for device identification."""
    import secrets
    return secrets.token_urlsafe(32)

def register_user_device(db: Session, user_id: str, name: str = "Unknown Device") -> str:
    """Creates a new trusted device for the user."""
    token = create_device_token()
    device = models.UserDevice(
        user_id=user_id,
        device_identifier=token,
        name=name,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db.add(device)
    db.commit()
    return token

def verify_device_token(db: Session, user_id: str, token: str) -> bool:
    """
    Checks if the device token is valid and belongs to the user.
    Updates last_used if valid.
    """
    device = db.query(models.UserDevice).filter(
        models.UserDevice.user_id == user_id,
        models.UserDevice.device_identifier == token
    ).first()

    if not device:
        return False
    
    if datetime.utcnow() > device.expires_at:
        return False

    # Update usage
    device.last_used = datetime.utcnow()
    # Optional: Extend expiration on use? Let's say yes, sliding window or fixed? 
    # Plan said 30 days. Sliding window is better for UX.
    device.expires_at = datetime.utcnow() + timedelta(days=30)
    
    db.commit()
    return True
