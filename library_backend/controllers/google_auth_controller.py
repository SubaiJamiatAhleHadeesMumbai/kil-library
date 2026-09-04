import os
import json
import urllib.request
import requests as http_requests
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_transport_requests
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import user_model
from auth import create_tokens

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "158248986174-cv22ngbp9ctjlf0dmditmsre151lpqm9.apps.googleusercontent.com"
)

# Explicitly allowed admin emails (comma-separated in env or empty)
ADMIN_EMAILS = [
    e.strip().lower()
    for e in os.getenv("ADMIN_EMAILS", "admin@markaz.org,admin@kil.local").split(",")
    if e.strip()
]

class GoogleLoginRequest(BaseModel):
    token: str

@router.post("/auth/google")
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        # 1. Verify Google Token (Supports both ID Token and OAuth2 Access Token)
        info = None
        try:
            info = id_token.verify_oauth2_token(
                payload.token,
                google_transport_requests.Request(),
                GOOGLE_CLIENT_ID
            )
        except Exception as e:
            pass

        # If not verified as ID token, fetch from Google userinfo endpoint using access token
        if not info or not info.get("email"):
            try:
                resp = http_requests.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {payload.token}", "User-Agent": "Mozilla/5.0"},
                    timeout=10
                )
                if resp.status_code == 200:
                    info = resp.json()
            except Exception as req_err:
                print(f"[Google userinfo request error]: {req_err}")

        # Fallback to urllib if requests failed
        if not info or not info.get("email"):
            try:
                req = urllib.request.Request(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {payload.token}", "User-Agent": "Mozilla/5.0"}
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    info = json.loads(resp.read().decode("utf-8"))
            except Exception as url_err:
                print(f"[Google urllib error]: {url_err}")

        if not info or not info.get("email"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Google authentication token. Please try again."
            )

        email = info.get("email").strip().lower()
        full_name = info.get("name") or info.get("given_name") or ""

        # 2. Check if user already exists
        user = db.query(user_model.User).filter(func.lower(user_model.User.email) == email).first()

        if user:
            # ✅ If user was previously soft-deleted or inactive, reactivate upon verified Google OAuth
            if user.status != "Active" or user.deleted_at is not None:
                user.status = "Active"
                user.deleted_at = None
                db.commit()
                db.refresh(user)
        else:
            # ─── SECURE ROLE ASSIGNMENT ─────────────────────────────────────
            # Only assign Admin role if email is explicitly listed in ADMIN_EMAILS
            if email in ADMIN_EMAILS:
                role = db.query(user_model.Role).filter(
                    func.lower(user_model.Role.name) == "admin"
                ).first()
            else:
                # Find standard public member role (strictly non-admin)
                role = db.query(user_model.Role).filter(
                    func.lower(user_model.Role.name).in_(["user", "registered member / student", "member", "student", "viewer"])
                ).first()

                # Safety fallback: find any role that does NOT contain admin keywords
                if not role:
                    role = db.query(user_model.Role).filter(
                        ~func.lower(user_model.Role.name).contains("admin")
                    ).first()

                # Hard security invariant: Never grant Admin role by default
                if not role or "admin" in (role.name or "").lower():
                    # Fallback to creating/fetching a clean 'user' role
                    role = db.query(user_model.Role).filter(user_model.Role.name == "user").first()
                    if not role:
                        role = user_model.Role(name="user")
                        db.add(role)
                        db.commit()
                        db.refresh(role)

            # Generate a unique username
            base_username = email.split("@")[0].replace(".", "_")
            username = base_username
            counter = 1
            while db.query(user_model.User).filter(user_model.User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1

            # Create the new user with least privilege
            user = user_model.User(
                username=username,
                email=email,
                full_name=full_name,
                status="Active",
                role_id=role.id,
                password_hash="GOOGLE_OAUTH_LOGIN_NO_PASSWORD"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # 3. Build Access Token & Refresh Token (Standard format with type=access)
        role_name = user.role.name if user.role else "user"
        tokens = create_tokens(user.id, user.username)
        access_token = tokens["access_token"]
        refresh_token = tokens["refresh_token"]

        permissions_list = [p.name for p in user.role.permissions] if (user.role and user.role.permissions) else []

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": {
                    "name": role_name,
                    "permissions": [{"name": p} for p in permissions_list]
                },
                "permissions": permissions_list
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Google Auth Error]: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google login failed: {str(e)}"
        )