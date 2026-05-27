from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_db, get_current_user
from app.core.security import (
    decode_access_token,
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
)
from app.models.user import User, UserRole
from app.models.profile import Profile
from app.models.refresh_token import RefreshToken

router = APIRouter()


class UserRegister(BaseModel):
    full_name: str
    email: str
    password: str
    role: UserRole = UserRole.DEVELOPER


class UserIn(BaseModel):
    email: str
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


def _create_and_store_tokens(user: User, db: Session) -> dict:
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_token = RefreshToken(
        token=refresh_token,
        user_id=user.id,
        expires_at=expires_at,
    )
    db.add(db_token)
    db.commit()

    return {"access_token": access_token, "refresh_token": refresh_token}


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.flush()
    db.add(
        Profile(
            user_id=user.id,
            full_name=payload.full_name,
        )
    )
    db.commit()

    return {"message": "User and Profile created successfully"}


@router.post("/login")
async def login(
    payload: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == payload.username).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return _create_and_store_tokens(user, db)


@router.post("/refresh")
async def refresh_access_token(
    body: RefreshTokenRequest, db: Session = Depends(get_db)
):
    payload = decode_access_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    db_token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == body.refresh_token,
            RefreshToken.revoked == False,
        )
        .first()
    )

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or revoked",
        )

    if db_token.expires_at < datetime.utcnow():
        db_token.revoked = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    db_token.revoked = True
    db.commit()

    return _create_and_store_tokens(user, db)


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.revoked == False,
    ).update({"revoked": True})
    db.commit()

    return {"message": "Logged out successfully"}


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return current_user
