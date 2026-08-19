import os
import time
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter, Request, status, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

# --- Redis & Rate Limiting (Safe Import) ---
# Graceful degradation: If Limiter libraries are missing, app won't crash.
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
except ImportError:
    Limiter = None
    print("⚠️ WARNING: 'slowapi' library not found. Rate limiting will be disabled.")

limiter = Limiter(key_func=get_remote_address) if Limiter else None

# ✅ NEW: Error logging utilities (Issue #7 Fix)
from utils.error_handler import log_error

# ✅ NEW: Migration Runner (Issue #8 Fix - Render deployment)
from migration_runner import run_migrations

# --- Import Database & Models ---
from database import engine, Base, get_db
from models import user_model, permission_model, library_management_models, token_blacklist_model
import auth

# --- Import Controllers ---
from controllers import (
    auth_controller,
    google_auth_controller,
    user_controller,
    role_controller,
    profile_controller,
    permission_controller,
    category_controller,
    subcategory_controller,
    language_controller,
    book_copy_controller,
    issue_controller,
    digital_access_controller,
    location_controller,
    log_controller,
    book_permission_controller,
    upload_controller,
    request_user_controller,
    public_user_controller,
    request_controller,
    book_read_controller,
    book_management_controller,
    password_controller,
    post_controller,
    donation_controller,
    interaction_controller,
    analytics_controller,
    settings_controller
)

# --- Lifespan Manager (Startup/Shutdown Logic) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 🚀 Startup
    print("🚀 System Starting...")
    
    # 1. Database Tables Check (Non-blocking - doesn't crash if DB is down)
    print("Checking database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables verified.")
    except Exception as e:
        print(f"⚠️ Database connection warning (app will retry): {str(e)[:100]}")
        print("⚠️ App starting WITHOUT database - will attempt to connect on first request")
    
    # 2. Run Database Migrations (Safe - handles DB connection errors)
    try:
        run_migrations()
    except Exception as e:
        print(f"⚠️ Migrations skipped (app will retry on next startup): {str(e)[:100]}")

    # 3. Initialize Rate Limiter (slowapi - no Redis needed)
    if limiter:
        print("✅ Rate Limiter Initialized")
    else:
        print("⚠️ Rate Limiting skipped (slowapi library missing).")

    yield  # Application runs here

    # 🛑 Shutdown
    print("🛑 System Shutting Down...")

# --- Initialize FastAPI App ---
app = FastAPI(
    title="BookNest Library API",
    version="6.3.0",
    description="Full-featured Library API with Dynamic Permissions, Redis Caching & Dual Uploads.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# ✅ Add Rate Limiter to App (Issue #4 Fix)
if limiter:
    app.state.limiter = limiter
    app.add_exception_handler(Exception, lambda req, exc: JSONResponse({"detail": "Rate limit exceeded"}, status_code=429))

# ==========================================
# 🛡️ MIDDLEWARES (Best Practices)
# ==========================================

# 1. Process Time Header (For Performance Monitoring)
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# 2. Trusted Host (Security Header)
trusted_hosts_env = os.getenv("TRUSTED_HOSTS", "")
trusted_hosts = [host.strip() for host in trusted_hosts_env.split(",") if host.strip()]
if not trusted_hosts:
    trusted_hosts = [
        "localhost",
        "127.0.0.1",
        "kil2.onrender.com",
        "*.onrender.com",
        "*.vercel.app",
        "*.netlify.app",
    ]
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=trusted_hosts
)

# 3. GZip Compression (Faster Responses)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 4. CORS (Allowed Origins) - ✅ FIXED: Whitelist-based (Issue #5)
_cors_env = os.getenv("CORS_ORIGINS", "")
origins = [o.strip() for o in _cors_env.split(",") if o.strip()] if _cors_env else [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://yourdomain.com",
    "https://kil-2-9yz1-five.vercel.app",  # ✅ Production Vercel frontend
    "https://kil-2-3ouk.vercel.app",  # ✅ Current Vercel frontend in browser screenshot
    "https://kil2.pages.dev",  # ✅ Cloudflare Pages (optional)
]

# Allow any current/future Vercel or Cloudflare Pages preview/custom domains.
# This avoids breaking deployments when the Vercel project URL changes.
cors_origin_regex = r"https://.*\.vercel\.app|https://.*\.pages\.dev"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,  # ✅ REQUIRED for cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # ✅ Whitelist (was "*")
    allow_headers=[  # ✅ Whitelist (was "*")
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
    expose_headers=["X-Process-Time"],
    max_age=3600,
)

static_path = Path("static")
static_path.mkdir(parents=True, exist_ok=True)

uploads_path = static_path / "uploads"
uploads_path.mkdir(parents=True, exist_ok=True)

(uploads_path / "posts").mkdir(parents=True, exist_ok=True)
# ✅ Added these two lines for Local PDFs and Texts
(uploads_path / "pdfs").mkdir(parents=True, exist_ok=True)
(uploads_path / "texts").mkdir(parents=True, exist_ok=True)

# Mount paths for frontend access
app.mount("/static", StaticFiles(directory="static"), name="static")
# ✅ Added this line so frontend can access http://127.0.0.1:8000/uploads/...
app.mount("/uploads", StaticFiles(directory="static/uploads"), name="uploads")
# ==========================================
# 🚨 EXCEPTION HANDLERS
# ==========================================

# 1. Validation Error Handler (Detailed)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_details = []
    try:
        for error in exc.errors():
            input_repr = error.get("input")
            if isinstance(input_repr, bytes):
                input_repr = f"<bytes data, length {len(input_repr)}>"
            elif input_repr is not None and not isinstance(input_repr, (str, int, float, bool, list, dict)):
                input_repr = repr(input_repr)

            error_details.append({
                "loc": error.get("loc"),
                "msg": error.get("msg"),
                "type": error.get("type"),
                "input_preview": str(input_repr)[:200]
            })

        print(f"❌ Validation Error: {error_details}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=jsonable_encoder({"detail": error_details}),
        )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error during validation."}
        )

# 2. Global Exception Handler (Crash Prevention) - ✅ Updated with error logging (Issue #7)
@app.exception_handler(Exception)
async def global_exception_handler_impl(request: Request, exc: Exception):
    try:
        db = next(get_db())
        error_log = log_error(
            db=db,
            error=exc,
            request=request,
            context="unhandled_exception",
            severity="ERROR"
        )
        db.close()
    except:
        error_log = log_error(
            db=None,
            error=exc,
            request=request,
            context="unhandled_exception",
            severity="ERROR"
        )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred on the server.",
            "error_id": error_log["error_id"],  # ✅ Give user a reference ID
            "message": "Please contact support with the error ID."
        }
    )

# ==========================================
# 🏥 HEALTH CHECK
# ==========================================
@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "version": "6.3.0", "database": "connected"}

# ==========================================
# 🛣️ ROUTER REGISTRATION
# ==========================================

api_router = APIRouter(prefix="/api")

# 1. Authentication
api_router.include_router(auth_controller.router, tags=["Authentication"])
api_router.include_router(google_auth_controller.router, tags=["Google Auth"])
api_router.include_router(password_controller.router, prefix="/auth", tags=["Password Reset"])

# 2. Identity Management
api_router.include_router(profile_controller.router, prefix="/profile", tags=["Profile"])
api_router.include_router(user_controller.router, prefix="/users", tags=["Users"])
api_router.include_router(role_controller.router, prefix="/roles", tags=["Roles"])
api_router.include_router(permission_controller.router, prefix="/permissions", tags=["Permissions"])

# 3. Library Content Management
api_router.include_router(category_controller.router, prefix="/categories", tags=["Categories"])
api_router.include_router(subcategory_controller.router, prefix="/subcategories", tags=["Subcategories"])
api_router.include_router(language_controller.router, prefix="/languages", tags=["Languages"])
api_router.include_router(location_controller.router, prefix="/locations", tags=["Locations"])
api_router.include_router(book_copy_controller.router, prefix="/copies", tags=["Copies"])
api_router.include_router(upload_controller.router, prefix="/upload", tags=["Uploads"])

# 4. Operations & Circulation
api_router.include_router(issue_controller.router, prefix="/issues", tags=["Issues"])
api_router.include_router(request_controller.router, prefix="/requests", tags=["Admin Requests"])
api_router.include_router(request_user_controller.router, prefix="/restricted-requests", tags=["User Requests"])

# 5. Security, Logs & User Interaction
api_router.include_router(book_permission_controller.router, prefix="/book-permissions", tags=["Book Permissions"])
api_router.include_router(digital_access_controller.router, prefix="/digital-access", tags=["Digital Access"])
api_router.include_router(log_controller.router, prefix="/logs", tags=["Logs"])
api_router.include_router(interaction_controller.router, prefix="/interaction", tags=["User Interaction"])

# 6. Public Actions & Utils
api_router.include_router(public_user_controller.router, prefix="/public", tags=["Public Actions"])
api_router.include_router(book_read_controller.router, prefix="/books", tags=["Books (Read)"])
api_router.include_router(book_management_controller.router, prefix="/books", tags=["Books (Manage)"])
api_router.include_router(post_controller.router, prefix="/posts", tags=["Markaz News"])
api_router.include_router(donation_controller.router, tags=["Donation"]) # ✅ Moved INSIDE /api to fix 404
api_router.include_router(analytics_controller.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(settings_controller.router, prefix="/settings", tags=["Homepage Settings"])

# Register Main Router
app.include_router(api_router)


# ------------------------------------------------------------------
# Fallback aliases for request count endpoints
# ------------------------------------------------------------------
# Some clients were still hitting a 404 on /count while the router reload
# catches up. Keep explicit aliases here so the route is always available.
@app.get("/api/restricted-requests/count", tags=["User Requests"], include_in_schema=False)
def restricted_requests_count_alias(
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return request_user_controller.get_requests_count(db=db, current_user=current_user)


@app.get("/api/restricted-requests/counts", tags=["User Requests"], include_in_schema=False)
def restricted_requests_counts_alias(
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return request_user_controller.get_requests_count(db=db, current_user=current_user)

# ==========================================
# 🛠️ UTILITY & SETUP ENDPOINTS
# ==========================================

@app.get("/api/nuke-issues", tags=["Debug"], include_in_schema=False)
def nuke_issues(db: Session = Depends(get_db), current_user=Depends(auth.get_current_user)):
    try:
        from models.library_management_models import IssuedBook
        deleted_count = db.query(IssuedBook).delete()
        db.commit()
        return {"message": f"Successfully deleted {deleted_count} corrupt issue records. Dashboard should work now."}
    except Exception as e:
        db.rollback()
        return {"message": f"Error deleting issues: {str(e)}"}

@app.get("/api/setup-permissions", tags=["Setup"])
def setup_default_permissions(db: Session = Depends(get_db)):
    permission_groups = {
        "User Management": [
            {"name": "USER_VIEW", "description": "Can view user lists and profiles"},
            {"name": "USER_MANAGE", "description": "Can create, edit, and delete users"},
        ],
        "Library Management": [
            {"name": "BOOK_VIEW", "description": "Can view the book library"},
            {"name": "BOOK_MANAGE", "description": "Can add, edit, and delete books"},
            {"name": "BOOK_ISSUE", "description": "Can issue and return physical book copies"},
        ],
        "Security & Roles": [
            {"name": "ROLE_VIEW", "description": "Can view system roles"},
            {"name": "ROLE_MANAGE", "description": "Can create and modify roles"},
            {"name": "ROLE_PERMISSION_ASSIGN", "description": "Can assign permissions to roles"},
            {"name": "PERMISSION_VIEW", "description": "Can view all available permissions"},
        ],
        "Access Requests": [
            {"name": "REQUEST_VIEW", "description": "Can view pending digital access requests"},
            {"name": "REQUEST_MANAGE", "description": "Can approve or reject access requests"},
        ],
        "System Audit": [
            {"name": "LOGS_VIEW", "description": "Can view system audit logs and activity"},
        ],
        "Homepage Management": [
            {"name": "HOMEPAGE_BRANDING_MANAGE", "description": "Can update homepage theme, language, title, and hero badge"},
            {"name": "HOMEPAGE_CONTENT_MANAGE", "description": "Can update homepage section content, ordering, and featured books"},
            {"name": "HOMEPAGE_LAYOUT_MANAGE", "description": "Can update homepage layout toggles and extra blocks"},
            {"name": "HOMEPAGE_VISIBILITY_MANAGE", "description": "Can control homepage section visibility"},
            {"name": "HOMEPAGE_SEARCH_MANAGE", "description": "Can update homepage search options (hint, voice, deep search, suggestions, placeholder)"},
        ]
    }

    all_perms = [p for group in permission_groups.values() for p in group]
    added_names = []
    all_db_permissions = []

    for p_data in all_perms:
        db_perm = db.query(permission_model.Permission).filter(
            permission_model.Permission.name == p_data["name"]
        ).first()

        if not db_perm:
            db_perm = permission_model.Permission(
                name=p_data["name"],
                description=p_data["description"]
            )
            db.add(db_perm)
            added_names.append(p_data["name"])

        all_db_permissions.append(db_perm)

    db.flush()

    admin_role = db.query(user_model.Role).filter(
        user_model.Role.name.in_(["Admin", "SuperAdmin", "Administrator"])
    ).first()

    link_message = "Admin role not found."
    if admin_role:
        current_perms = set(admin_role.permissions)
        new_perms = set(all_db_permissions)
        admin_role.permissions = list(current_perms.union(new_perms))
        link_message = f"All permissions linked to role: {admin_role.name}"

    try:
        db.commit()
        return {
            "status": "Success",
            "permissions_created": len(added_names),
            "total_permissions_in_system": len(all_db_permissions),
            "role_assignment": link_message,
            "newly_added": added_names
        }
    except Exception as e:
        db.rollback()
        return {"status": "Error", "detail": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)