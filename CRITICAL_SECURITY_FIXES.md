# 🔧 QUICK-FIX ACTION PLAN
## Critical Security Issues - Implementation Guide

**Timeline:** 2-3 days for all critical fixes  
**Priority:** DO THIS FIRST before any feature work

---

## 🚨 ISSUE #1: REFRESH TOKEN IMPLEMENTATION (6 hours)

### Step 1: Update auth.py

Replace the `create_access_token` function:

```python
# file: library_backend/auth.py

from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"

# Modify these in .env:
# ACCESS_TOKEN_EXPIRE_MINUTES=15
# REFRESH_TOKEN_EXPIRE_DAYS=7

def create_tokens(user_id: int, username: str):
    """
    Create both access token (15 min) and refresh token (7 days)
    """
    current_time = datetime.now(timezone.utc)
    
    # Access Token (short-lived)
    access_data = {
        "sub": str(user_id),
        "username": username,
        "type": "access",
        "exp": current_time + timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15)))
    }
    access_token = jwt.encode(access_data, SECRET_KEY, algorithm=ALGORITHM)
    
    # Refresh Token (long-lived)
    refresh_data = {
        "sub": str(user_id),
        "username": username,
        "type": "refresh",
        "exp": current_time + timedelta(days=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7)))
    }
    refresh_token = jwt.encode(refresh_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

def verify_token_type(token: str, expected_type: str) -> bool:
    """Verify token hasn't been tampered with"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("type") == expected_type
    except:
        return False
```

### Step 2: Update auth_controller.py

Modify the login endpoint to return both tokens:

```python
# file: library_backend/controllers/auth_controller.py (lines ~80-130)

# Replace the token return section with:

    # ✅ 5) Create Tokens (Access + Refresh)
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

    # ✅ 7) Return Response with both tokens
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],  # ✅ NEW
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role.name if user.role else "Member",
            "permissions": user_permissions,
        }
    }
```

### Step 3: Add Refresh Endpoint in auth_controller.py

```python
# Add NEW endpoint to auth_controller.py

@router.post("/refresh")
async def refresh_access_token(
    token_data: dict,  # {"refresh_token": "..."}
    db: Session = Depends(get_db),
):
    """
    Exchange refresh token for new access token.
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
    
    if not user or user.status.lower() != "active":
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
```

### Step 4: Update Frontend - authService.js

```javascript
// file: library-frontend/src/api/authService.js

export const authService = {
    async login(username, password, rememberMe = true) {
        try {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);

            const tokenResponse = await api.post('/api/token', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            const { access_token, refresh_token } = tokenResponse.data;

            if (!access_token || !refresh_token) {
                throw new Error("Server did not return tokens");
            }

            // ✅ Save BOTH tokens
            this.setToken(access_token, rememberMe);
            this.setRefreshToken(refresh_token, rememberMe);

            // Fetch and save profile
            const userResponse = await api.get('/api/profile/');
            const user = userResponse.data;
            this.setUser(user, rememberMe);

            return {
                success: true,
                access_token,
                refresh_token,
                user,
            };
        } catch (error) {
            this.logout();
            throw error;
        }
    },

    // ✅ NEW: Refresh token mechanism
    async refreshAccessToken() {
        try {
            const refresh_token = this.getRefreshToken();
            if (!refresh_token) {
                throw new Error("No refresh token available");
            }

            const response = await api.post('/api/refresh', {
                refresh_token
            });

            const { access_token, refresh_token: new_refresh_token } = response.data;
            
            this.setToken(access_token);
            if (new_refresh_token) {
                this.setRefreshToken(new_refresh_token);
            }
            
            return access_token;
        } catch (error) {
            this.logout();
            throw error;
        }
    },

    // ✅ NEW: Refresh token storage
    setRefreshToken(token, rememberMe = true) {
        if (!token) return;
        if (rememberMe) {
            localStorage.setItem('refresh_token', token);
            sessionStorage.removeItem('refresh_token');
        } else {
            sessionStorage.setItem('refresh_token', token);
            localStorage.removeItem('refresh_token');
        }
    },

    getRefreshToken() {
        return (
            localStorage.getItem('refresh_token') ||
            sessionStorage.getItem('refresh_token')
        );
    },

    // ✅ UPDATED: Logout with server-side revocation
    async logout() {
        try {
            await api.post('/api/logout');
        } catch (e) {
            console.warn('Server logout failed');
        }
        
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_details');
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.removeItem('user_details');
    }
};
```

### Step 5: Update axiosConfig.js - Add Auto-Refresh

```javascript
// file: library-frontend/src/api/axiosConfig.js

import axios from "axios";
import { authService } from "./authService";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  isRefreshing = false;
  failedQueue = [];
};

// REQUEST INTERCEPTOR
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR with auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already refreshing
    if (error.response?.status === 401 && !isRefreshing) {
      isRefreshing = true;

      try {
        // Try to refresh token
        const newAccessToken = await authService.refreshAccessToken();

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout
        authService.logout();
        window.location.href = "/login";
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      }
    }

    // If already refreshing, queue the request
    if (error.response?.status === 401 && isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    return Promise.reject(error);
  }
);

export default api;
```

### Step 6: Update .env

```bash
# file: .env

# Token expiry times
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
SECRET_KEY=your-super-secret-key-change-this-in-production
```

**Testing:**
```bash
# Test login
curl -X POST http://localhost:8000/api/token \
  -d "username=admin&password=password" \
  -H "Content-Type: application/x-www-form-urlencoded"

# Should return: { "access_token": "...", "refresh_token": "..." }

# Test refresh
curl -X POST http://localhost:8000/api/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"..."}'

# Should return new access_token
```

---

## 🚨 ISSUE #2: TOKEN REVOCATION ON LOGOUT (3 hours)

### Step 1: Create Token Blacklist Model

Create new file: `library_backend/models/token_blacklist_model.py`

```python
from sqlalchemy import Column, Integer, String, DateTime, func
from database import Base
from datetime import datetime

class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"
    
    id = Column(Integer, primary_key=True, index=True)
    token_jti = Column(String(500), unique=True, index=True)  # JWT ID
    revoked_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)
    
    __table_args__ = {'mysql_engine': 'InnoDB'}
```

### Step 2: Create Migration

```bash
cd library_backend
alembic revision --autogenerate -m "Add token blacklist table"
```

This auto-generates migration. Run:
```bash
alembic upgrade head
```

### Step 3: Update auth.py - Add Blacklist Check

```python
# file: library_backend/auth.py

async def get_user_from_token(token: str, db: Session) -> Optional[user_model.User]:
    """
    Decodes token and fetches User + Role + Permissions.
    ✅ NEW: Also checks if token is blacklisted
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")

        if sub is None:
            return None

        # ✅ Check if token is blacklisted
        from models import token_blacklist_model
        jti = payload.get("jti", f"{sub}_{payload.get('exp')}")
        
        blacklisted = db.query(token_blacklist_model.TokenBlacklist).filter(
            token_blacklist_model.TokenBlacklist.token_jti == jti
        ).first()
        
        if blacklisted:
            print(f"⚠️ Token is blacklisted (revoked)")
            return None
        
        # Continue with existing logic...
        try:
            user_id = int(sub)
        except ValueError:
            return None

    except JWTError:
        return None

    # ... rest of function unchanged
```

### Step 4: Add Logout Endpoint in auth_controller.py

```python
# file: library_backend/controllers/auth_controller.py

@router.post("/logout")
async def logout(
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    """
    Revoke current token on logout.
    """
    try:
        from models import token_blacklist_model
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti", f"{payload.get('sub')}_{payload.get('exp')}")
        
        # Add to blacklist
        blacklist_entry = token_blacklist_model.TokenBlacklist(
            token_jti=jti,
            expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        )
        db.add(blacklist_entry)
        db.commit()
        
        # Log the logout
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
        print(f"⚠️ Logout error: {e}")
        pass  # Continue even if blacklist fails
    
    return {"message": "Logged out successfully"}
```

---

## 🚨 ISSUE #3: HTTPONLY COOKIES (4 hours)

### Step 1: Update auth_controller.py - Return Cookies

```python
# file: library_backend/controllers/auth_controller.py (at top)

from fastapi.responses import JSONResponse
import os

# ... existing imports ...

@router.post("/token", tags=["Authentication"])
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Login endpoint - now returns cookies instead of tokens in body"""
    
    # ... existing validation & token creation ...
    
    # ✅ Create response
    response = JSONResponse(
        content={
            "user": {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role.name if user.role else "Member",
                "permissions": user_permissions,
            },
            "token_type": "bearer"
            # ❌ NO access_token or refresh_token in body
        },
        status_code=200
    )
    
    # ✅ Set httpOnly cookies (browser will auto-send with every request)
    is_prod = os.getenv("ENVIRONMENT") == "production"
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=900,  # 15 minutes
        httponly=True,  # ✅ JavaScript cannot access
        secure=is_prod,  # ✅ HTTPS only in production
        samesite="strict",  # ✅ CSRF protection
        domain=os.getenv("COOKIE_DOMAIN", "localhost"),
        path="/"
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=604800,  # 7 days
        httponly=True,  # ✅ JavaScript cannot access
        secure=is_prod,
        samesite="strict",
        domain=os.getenv("COOKIE_DOMAIN", "localhost"),
        path="/"
    )
    
    return response
```

### Step 2: Update auth.py - Read from Cookies

```python
# file: library_backend/auth.py

from fastapi.security import APIKeyCookie

# Update oauth2_scheme to read from cookies
oauth2_scheme = APIKeyCookie(name="access_token", auto_error=False)

# Alternative: Create custom extractor
async def get_token_from_cookie_or_header(
    request: Request,
    cookie: str = Depends(APIKeyCookie(name="access_token", auto_error=False))
) -> Optional[str]:
    """Get token from httpOnly cookie or Authorization header"""
    # First try cookie (preferred)
    if cookie:
        return cookie
    
    # Fallback to Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    
    return None
```

### Step 3: Update .env

```bash
# file: .env

ENVIRONMENT=production  # or development
COOKIE_DOMAIN=.yourdomain.com  # For production
# Or for localhost:
COOKIE_DOMAIN=localhost
```

### Step 4: Update CORS Middleware in main.py

```python
# file: library_backend/main.py (line ~135)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,  # ✅ Required for cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=3600,
)
```

### Step 5: Update Frontend - Remove Token Management

```javascript
// file: library-frontend/src/api/authService.js

export const authService = {
    async login(username, password) {
        try {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);

            // ✅ Browser will automatically include httpOnly cookies
            const response = await api.post('/api/token', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                withCredentials: true,  // ✅ Include cookies
            });

            // No more manual token storage!
            const user = response.data.user;
            this.setUser(user);  // Store user info only (not token)

            return {
                success: true,
                user,
            };
        } catch (error) {
            throw error;
        }
    },

    logout() {
        // Browser will clear httpOnly cookies automatically on /logout
        localStorage.removeItem('user_details');
        sessionStorage.removeItem('user_details');
    },

    // Simplified - no token storage needed
    setUser(user) {
        localStorage.setItem('user_details', JSON.stringify(user));
    },

    getUser() {
        const userStr = localStorage.getItem('user_details');
        return userStr ? JSON.parse(userStr) : null;
    }
};
```

### Step 6: Update axiosConfig.js

```javascript
// file: library-frontend/src/api/axiosConfig.js

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,  // ✅ Send cookies with every request
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - no need to add token manually
api.interceptors.request.use(
  (config) => {
    // Cookies are sent automatically by browser
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor unchanged
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Logout and redirect
      localStorage.removeItem('user_details');
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
```

**Testing:**
```bash
# Check if cookies are set
curl -v -X POST http://localhost:8000/api/token \
  -d "username=admin&password=password" \
  -H "Content-Type: application/x-www-form-urlencoded"

# Should see Set-Cookie headers:
# Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict
# Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict
```

---

## 🚨 ISSUE #4: RATE LIMITING ON LOGIN (2 hours)

### Step 1: Install Required Package

```bash
cd library_backend
pip install fastapi-limiter2 redis
```

### Step 2: Update auth_controller.py

```python
# file: library_backend/controllers/auth_controller.py (at top)

from fastapi_limiter2 import FastAPILimiter
from fastapi_limiter2.depends import RateLimiter
from fastapi_limiter2.util import get_remote_address
from fastapi import Request

# Add to login endpoint:
@router.post("/token", tags=["Authentication"])
async def login_for_access_token(
    request: Request,  # ✅ Add this
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    _: None = Depends(RateLimiter(times=5, seconds=60))  # ✅ 5 attempts per 60 seconds
):
    """
    Login endpoint with rate limiting.
    Max 5 login attempts per minute per IP address.
    """
    # ... rest of existing logic unchanged
```

### Step 3: Update main.py - Initialize FastAPILimiter

```python
# file: library_backend/main.py (in lifespan function)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 System Starting...")
    
    Base.metadata.create_all(bind=engine)
    
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        import redis.asyncio as aioredis
        from fastapi_limiter2 import FastAPILimiter
        
        redis_conn = aioredis.from_url(redis_url)
        await FastAPILimiter.init(redis_conn)
        print(f"✅ Rate Limiter Initialized")
    except Exception as e:
        print(f"⚠️ Rate limiter setup failed: {e}")
    
    yield  # App runs
    
    # Shutdown
    print("🛑 System Shutting Down...")
```

### Step 4: Update .env

```bash
# file: .env

REDIS_URL=redis://localhost:6379
```

**Testing:**
```bash
# Try 5 successful logins quickly
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:8000/api/token \
    -d "username=admin&password=password" \
    -H "Content-Type: application/x-www-form-urlencoded"
  sleep 0.5
done

# 6th attempt should return 429 (Too Many Requests)
```

---

## 🚨 ISSUE #5: CORS WHITELIST (1 hour)

### Update main.py

```python
# file: library_backend/main.py (line ~135)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://yourdomain.com",  # Production
        "https://www.yourdomain.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # ✅ Whitelist
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
    ],  # ✅ Whitelist
    expose_headers=["X-Process-Time"],
    max_age=3600,
)
```

---

# ✅ FINAL VALIDATION

After implementing all 5 fixes, run:

```bash
# 1. Start backend
cd library_backend
python -m uvicorn main:app --reload

# 2. Test in new terminal
cd library-frontend
npm run dev

# 3. Test login in browser
# - Check Network tab → Cookies tab
# - Should see access_token and refresh_token with HttpOnly flag
# - Tokens should NOT appear in localStorage
# - Logout should clear cookies

# 4. Test refresh by waiting >15 min and making API call
# - Should auto-refresh silently

# 5. Test rate limiting
# - 6 rapid login attempts → 429 error on 6th
```

---

## 📋 BEFORE YOU COMMIT

Run these checks:

```bash
# Backend syntax
python -m py_compile library_backend/*.py
python -m py_compile library_backend/controllers/*.py

# Frontend build
cd library-frontend && npm run build
# Should complete without errors

# Git review
git diff --stat
# Should see: ~10 modified files
```

**Estimated Total Time:** 12-15 hours  
**Team Size:** 2 developers (1 backend, 1 frontend)  
**Blockers:** None - can be done in parallel

---

## 🚀 DEPLOYMENT AFTER FIXES

Once ALL 5 are done:

```bash
# 1. Update production .env
ENVIRONMENT=production
SECRET_KEY=<generate-random-256-bit-key>
COOKIE_DOMAIN=.yourdomain.com

# 2. Deploy
git push && az deployment ...

# 3. Run migrations
alembic upgrade head

# 4. Monitor
# - Check error logs
# - Test login
# - Check token refresh after 20 min
# - Verify logout clears cookies
```

---

**Priority:** CRITICAL - Do these first!  
**Success Metric:** 100% of tests pass, zero security warnings
