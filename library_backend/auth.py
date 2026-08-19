import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt as _bcrypt
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, joinedload
from dotenv import load_dotenv

# --- Imports ---
from models import user_model
from database import SessionLocal, engine

# ✅ Load .env
load_dotenv()

# --- CONFIGURATION ---
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-for-dev-only")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# ✅ FIXED: Token expiry times
try:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))
except ValueError:
    ACCESS_TOKEN_EXPIRE_MINUTES = 15

try:
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))
except ValueError:
    REFRESH_TOKEN_EXPIRE_DAYS = 7

# ✅ auto_error=False => optional auth supported
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token", auto_error=False)


# ==========================================================
# ✅ HELPERS
# ==========================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return _bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return _bcrypt.hashpw(password.encode('utf-8'), _bcrypt.gensalt()).decode('utf-8')


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """✅ Legacy function - kept for compatibility. Use create_tokens() instead."""
    to_encode = data.copy()
    if "sub" in to_encode and to_encode["sub"] is not None:
        to_encode["sub"] = str(to_encode["sub"])
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_tokens(user_id: int, username: str):
    """
    ✅ NEW: Creates both access token (short-lived) and refresh token (long-lived)
    Access: 15 minutes | Refresh: 7 days
    """
    current_time = datetime.now(timezone.utc)
    
    # Access Token (short-lived: 15 min)
    access_data = {
        "sub": str(user_id),
        "username": username,
        "type": "access",
        "exp": current_time + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }
    access_token = jwt.encode(access_data, SECRET_KEY, algorithm=ALGORITHM)
    
    # Refresh Token (long-lived: 7 days)
    refresh_data = {
        "sub": str(user_id),
        "username": username,
        "type": "refresh",
        "exp": current_time + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    }
    refresh_token = jwt.encode(refresh_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


def verify_token_type(token: str, expected_type: str = "access") -> bool:
    """✅ NEW: Verify token type (access vs refresh)"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("type") == expected_type
    except:
        return False


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================================
# ✅ TOKEN -> USER FETCH (FIXED)
# ==========================================================

async def get_user_from_token(token: str, db: Session) -> Optional[user_model.User]:
    """
    ✅ Decodes token and fetches User + Role + Permissions.
    ✅ ALSO: Checks if token is blacklisted (revoked)
    FIX: sub is user_id (example: "20"), not username
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")

        if sub is None:
            return None

        # ✅ Check if token is blacklisted (ISSUE #2 FIX)
        from models import token_blacklist_model
        jti = payload.get("jti", f"{sub}_{payload.get('exp')}")
        
        try:
            blacklisted = db.query(token_blacklist_model.TokenBlacklist).filter(
                token_blacklist_model.TokenBlacklist.token_jti == jti
            ).first()
            
            if blacklisted:
                print(f"⚠️ Token is blacklisted (revoked)")
                return None
        except Exception as e:
            print(f"⚠️ Blacklist check failed: {e}")
            # Continue anyway - don't block auth on blacklist check failure
        
        # ✅ Convert sub -> int user_id safely
        try:
            user_id = int(sub)
        except ValueError:
            return None

    except JWTError:
        return None

    def _fetch_user(session: Session):
        return (
            session.query(user_model.User)
            .options(
                joinedload(user_model.User.role).joinedload(user_model.Role.permissions)
            )
            .filter(user_model.User.id == user_id)
            .first()
        )

    try:
        return _fetch_user(db)
    except OperationalError:
        try:
            db.rollback()
        except Exception:
            pass

        # Drop stale pooled connections and retry once with a fresh session.
        try:
            engine.dispose()
        except Exception:
            pass

        retry_db = SessionLocal()
        try:
            return _fetch_user(retry_db)
        except OperationalError:
            return None
        finally:
            retry_db.close()


# ==========================================================
# ✅ CURRENT USER (OPTIONAL + REQUIRED)
# ==========================================================

async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[user_model.User]:
    """
    ✅ PUBLIC ACCESS
    Returns user if logged in else None
    """
    if not token:
        return None

    user = await get_user_from_token(token, db)
    return user


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> user_model.User:
    """
    🔒 PRIVATE/PROTECTED ACCESS
    Returns 401 if not logged in or invalid token
    """
    auth_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise auth_exception

    user = await get_user_from_token(token, db)

    if user is None:
        raise auth_exception

    # ✅ Status check
    if user.status and str(user.status).lower() != "active":
        raise HTTPException(status_code=400, detail="User account is inactive.")

    return user


# ==========================================================
# ✅ PERMISSION CHECKER
# ==========================================================

def require_permission(permission_code: str):
    """
    Dependency to check user permissions.
    """

    async def permission_checker(
        current_user: user_model.User = Depends(get_current_user),
    ):
        # ✅ Admin bypass
        if current_user.role and current_user.role.name and current_user.role.name.lower() in [
            "admin", "superadmin", "administrator"
        ]:
            return current_user

        # ✅ Collect permissions
        user_perms = set()

        if current_user.role and current_user.role.permissions:
            for p in current_user.role.permissions:
                if hasattr(p, "code") and p.code:
                    user_perms.add(p.code)
                elif hasattr(p, "name") and p.name:
                    user_perms.add(p.name)

        if permission_code not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have permission: {permission_code}",
            )

        return current_user

    return permission_checker
