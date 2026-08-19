# file: controllers/auth_controller.py

import os
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from datetime import timedelta, datetime, timezone

from models import user_model, token_blacklist_model
from auth import (
    verify_password,
    create_access_token,
    create_tokens,
    verify_token_type,
    get_db,
    get_current_user,
    get_user_from_token,
    oauth2_scheme,
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from utils import create_log
from jose import jwt

# ✅ Rate Limiter (Issue #4 Fix)
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)
except ImportError:
    limiter = None
    print("⚠️ WARNING: 'slowapi' library not found. Rate limiting will be disabled.")

router = APIRouter()


@router.post("/token", tags=["Authentication"])
@limiter.limit("5/minute") if limiter else lambda f: f  # ✅ RATE LIMIT: 5 logins per minute (Issue #4)
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    username = (form_data.username or "").strip()
    password = form_data.password or ""

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required.",
        )

    # ✅ 1) Fetch User (Eager Load Role & Permissions)
    user = (
        db.query(user_model.User)
        .options(joinedload(user_model.User.role).joinedload(user_model.Role.permissions))
        .filter(user_model.User.username == username)
        .first()
    )

    # ✅ 2) Verify Credentials with Detailed Debugging
    verification_passed = False
    
    if not user:
        print(f"❌ Login Failed: User '{username}' not found in DB.")
    else:
        try:
            # Check Password
            if verify_password(password, user.password_hash):
                verification_passed = True
            else:
                print(f"❌ Login Failed: Incorrect password for '{username}'")
        except ValueError as e:
            # Ye tab aata hai jab password > 72 bytes ho ya format galat ho
            print(f"⚠️ Bcrypt ValueError for '{username}': {e}")
        except Exception as e:
            # Ye tab aata hai jab Library version galat ho (AttributeError)
            print(f"⚠️ Critical Library Error during Verify: {e}")
            print("👉 SOLUTION: Run 'pip install bcrypt==4.0.1' in terminal.")

    if not verification_passed:
        # Log Failed Attempt in DB
        try:
            create_log(
                db=db,
                user=user if user else None,
                action_type="LOGIN_FAILED",
                description=f"Failed login attempt for username: {username}",
                target_type="User",
                target_id=user.id if user else None,
            )
            db.commit()
        except Exception:
            pass

        # Return 401 to Frontend
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ✅ 3) Account Status Check
    user_status = str(user.status).strip().lower() if user.status else "active"
    if user_status != "active":
        print(f"⛔ Login Blocked: User '{username}' is {user_status}")
        try:
            create_log(
                db=db,
                user=user,
                action_type="LOGIN_BLOCKED",
                description=f"Inactive user tried login: {user.username}",
                target_type="User",
                target_id=user.id,
            )
            db.commit()
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive.",
        )

    # ✅ 4) Permissions List
    user_permissions = []
    if user.role and user.role.permissions:
        for p in user.role.permissions:
            if getattr(p, "code", None):
                user_permissions.append(p.code)
            elif getattr(p, "name", None):
                user_permissions.append(p.name)

    # ✅ 5) Create BOTH Access + Refresh Tokens (NEW)
    tokens = create_tokens(
        user_id=user.id,
        username=user.username
    )

    # ✅ 6) Log Success
    try:
        create_log(
            db=db,
            user=user,
            action_type="LOGIN_SUCCESS",
            description=f"User '{user.username}' logged in successfully.",
            target_type="User",
            target_id=user.id,
        )
        db.commit()
    except Exception:
        pass

    print(f"✅ Login Success: {user.username}")

    # ✅ 7) Return Response with BOTH tokens
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],  # ✅ NEW
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.name if user.role else "Member",
            "permissions": user_permissions,
        },
    }


# ===================================================================
# ✅ NEW ENDPOINT: REFRESH TOKEN (Issue #1 Fix)
# ===================================================================
@router.post("/refresh", tags=["Authentication"])
async def refresh_access_token(
    token_data: dict,
    db: Session = Depends(get_db),
):
    """
    🔄 Exchange refresh token for new access token.
    Frontend sends refresh_token, gets new access_token.
    """
    refresh_token = token_data.get("refresh_token")
    
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="refresh_token required"
        )
    
    # Verify token is actually a refresh token
    if not verify_token_type(refresh_token, "refresh"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Get user from token
    user = await get_user_from_token(refresh_token, db)
    
    if not user or (user.status and str(user.status).lower() != "active"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive user"
        )
    
    # Create new tokens
    tokens = create_tokens(user.id, user.username)
    
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer"
    }


# ===================================================================
# ✅ NEW ENDPOINT: LOGOUT / REVOKE TOKEN (Issue #2 Fix)
# ===================================================================
@router.post("/logout", tags=["Authentication"])
async def logout(
    db: Session = Depends(get_db),
    token: str | None = Depends(oauth2_scheme)  # ✅ OPTIONAL token
):
    """
    🚪 Revoke current token on logout.
    Token cannot be used after this.
    """
    current_user = None
    
    # ✅ Try to validate token and get user, but don't fail if missing
    if token:
        try:
            current_user = await get_user_from_token(token, db)
            
            # ✅ Decode token for blacklist
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            jti = payload.get("jti", f"{payload.get('sub')}_{payload.get('exp')}")
            
            # Add to blacklist
            blacklist_entry = token_blacklist_model.TokenBlacklist(
                token_jti=jti,
                expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
            )
            db.add(blacklist_entry)
            db.commit()
            
            print(f"✅ Token blacklisted for user: {current_user.username}")
            
        except Exception as e:
            print(f"⚠️ Logout warning (token validation issue): {e}")
    
    # ✅ Log the logout if we have user info
    if current_user:
        try:
            create_log(
                db=db,
                user=current_user,
                action_type="LOGOUT",
                description=f"User '{current_user.username}' logged out",
                target_type="User",
                target_id=current_user.id
            )
            db.commit()
        except Exception as e:
            print(f"⚠️ Logout logging error: {e}")
    
    return {"message": "Logged out successfully"}