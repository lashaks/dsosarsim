from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import Token, UserOut, LoginRequest
from auth import verify_password, create_access_token, get_current_user
from services import audit_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    token = create_access_token({"sub": user.username, "role": user.role})
    audit_service.log_action(
        db, action="LOGIN", entity_type="User", entity_id=user.id,
        user_id=user.id, username=user.username,
    )
    db.commit()
    return {"access_token": token, "token_type": "bearer", "user": UserOut.model_validate(user)}


@router.post("/login-json", response_model=Token)
def login_json(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    token = create_access_token({"sub": user.username, "role": user.role})
    audit_service.log_action(
        db, action="LOGIN", entity_type="User", entity_id=user.id,
        user_id=user.id, username=user.username,
    )
    db.commit()
    return {"access_token": token, "token_type": "bearer", "user": UserOut.model_validate(user)}


@router.get("/me", response_model=UserOut)
def me(current=Depends(get_current_user)):
    return current


@router.post("/logout")
def logout(current=Depends(get_current_user), db: Session = Depends(get_db)):
    audit_service.log_action(
        db, action="LOGOUT", entity_type="User", entity_id=current.id,
        user_id=current.id, username=current.username,
    )
    db.commit()
    return {"detail": "logged out"}
