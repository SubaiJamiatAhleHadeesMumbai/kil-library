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
    from slowapi.errors import RateLimitExceeded
except ImportError:
    Limiter = None
    RateLimitExceeded = None
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
    poster_controller,
    donation_controller,
    interaction_controller,
    analytics_controller,
    settings_controller,
    about_controller,
    fatawa_controller,
    social_work_controller,
    search_controller,
    newspaper_clipping_controller,
    system_health_controller,
    bulk_actions_controller,
    admin_dashboard_controller,
    book_order_controller,
    translation_controller,
    gallery_controller,
    comment_controller,
    admin_comment_controller,
)

def sync_database_schema():
    """Ensure all required columns (like txt_file_url) exist in PostgreSQL tables on startup."""
    from sqlalchemy import text
    
    statements = [
        # books columns
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS txt_file_url VARCHAR;",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS fatawa_category_id INTEGER;",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS extra_data TEXT;",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS is_digital BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS total_copies INTEGER DEFAULT 1;",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS available_copies INTEGER DEFAULT 1;",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS published_date DATE;",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS edition VARCHAR(100);",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS parts_or_volumes VARCHAR(100);",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS page_count INTEGER;",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS subject_number VARCHAR(100);",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS translator VARCHAR(255);",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS price DOUBLE PRECISION;",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS date_of_purchase DATE;",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS book_number VARCHAR(100);",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS is_download_paid BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS download_price DOUBLE PRECISION DEFAULT 0.0;",
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS download_upi_id VARCHAR(100);",
        # book_download_orders
        """
        CREATE TABLE IF NOT EXISTS book_download_orders (
            id SERIAL PRIMARY KEY,
            order_code VARCHAR(64) UNIQUE NOT NULL,
            book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            buyer_name VARCHAR(255) NOT NULL,
            buyer_email VARCHAR(255) NOT NULL,
            buyer_phone VARCHAR(50),
            amount DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
            payment_method VARCHAR(50) DEFAULT 'UPI_MANUAL' NOT NULL,
            transaction_ref VARCHAR(100),
            screenshot_url TEXT,
            notes TEXT,
            status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
            admin_remarks TEXT,
            reviewed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            reviewed_at TIMESTAMP,
            download_token VARCHAR(128) UNIQUE,
            download_expires_at TIMESTAMP,
            download_count INTEGER DEFAULT 0 NOT NULL,
            max_downloads INTEGER DEFAULT 5 NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        """,
        # translations CMS table
        """
        CREATE TABLE IF NOT EXISTS translations (
            id SERIAL PRIMARY KEY,
            key VARCHAR(120) UNIQUE NOT NULL,
            category VARCHAR(50) DEFAULT 'common',
            en TEXT NOT NULL,
            ur TEXT,
            ar TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
        # upload_requests
        "ALTER TABLE upload_requests ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
        "ALTER TABLE upload_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;",
        "ALTER TABLE upload_requests ADD COLUMN IF NOT EXISTS remarks VARCHAR(500);",
        # logs
        "ALTER TABLE logs ADD COLUMN IF NOT EXISTS action_by_id INTEGER;",
        "ALTER TABLE logs ADD COLUMN IF NOT EXISTS target_type VARCHAR(50);",
        "ALTER TABLE logs ADD COLUMN IF NOT EXISTS target_id INTEGER;",
        "ALTER TABLE logs ADD COLUMN IF NOT EXISTS details TEXT;",
        # users
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS education VARCHAR(500);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS social_activities VARCHAR(1000);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;",
        # newspaper_clippings
        "ALTER TABLE newspaper_clippings ADD COLUMN IF NOT EXISTS images TEXT;",
        # comments system
        """
        CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            entity_type VARCHAR(50) NOT NULL,
            entity_id INTEGER NOT NULL,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
            rating SMALLINT,
            body TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'pending' NOT NULL,
            is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
            flagged_reason VARCHAR(255),
            report_count INTEGER DEFAULT 0 NOT NULL,
            admin_reply TEXT,
            admin_reply_at TIMESTAMP,
            helpful_count INTEGER DEFAULT 0 NOT NULL,
            not_helpful_count INTEGER DEFAULT 0 NOT NULL,
            is_verified_read BOOLEAN DEFAULT FALSE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            deleted_at TIMESTAMP
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS comment_votes (
            id SERIAL PRIMARY KEY,
            comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            vote_type VARCHAR(20) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            UNIQUE(comment_id, user_id)
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS comment_settings (
            id SERIAL PRIMARY KEY,
            entity_type VARCHAR(50) UNIQUE NOT NULL,
            feature_comments_enabled BOOLEAN DEFAULT TRUE NOT NULL,
            feature_login_required BOOLEAN DEFAULT TRUE NOT NULL,
            feature_admin_approval BOOLEAN DEFAULT TRUE NOT NULL,
            feature_ratings_enabled BOOLEAN DEFAULT TRUE NOT NULL,
            feature_helpful_votes BOOLEAN DEFAULT TRUE NOT NULL,
            feature_verified_badge BOOLEAN DEFAULT TRUE NOT NULL,
            feature_replies_enabled BOOLEAN DEFAULT TRUE NOT NULL,
            feature_report_enabled BOOLEAN DEFAULT TRUE NOT NULL,
            feature_pin_enabled BOOLEAN DEFAULT TRUE NOT NULL,
            feature_admin_reply BOOLEAN DEFAULT TRUE NOT NULL,
            auto_flag_threshold INTEGER DEFAULT 3 NOT NULL,
            max_comment_length INTEGER DEFAULT 1000 NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        """,
    ]
    
    try:
        with engine.begin() as conn:
            for stmt in statements:
                try:
                    conn.execute(text(stmt))
                except Exception:
                    pass
        print("[OK] Database schema synchronized successfully.")
    except Exception as e:
        print(f"[WARN] Schema sync notice: {e}")

# --- Lifespan Manager (Startup/Shutdown Logic) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 🚀 Startup
    print("🚀 System Starting...")
    
    # 1. Database Tables Check (Non-blocking - doesn't crash if DB is down)
    print("Checking database tables...")
    try:
        sync_database_schema()
    except Exception as e:
        print(f"⚠️ Schema sync call: {e}")
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

    # 3. Seed initial essential data if catalog is empty
    try:
        from scripts.seed_data import seed_everything
        seed_everything()
    except Exception as e:
        print(f"⚠️ Seeding check: {str(e)[:100]}")

    # 4. Initialize Rate Limiter (slowapi - no Redis needed)
    if limiter:
        print("✅ Rate Limiter Initialized")
    else:
        print("⚠️ Rate Limiting skipped (slowapi library missing).")

    # 5. ✅ Start Content Scheduler (auto-publish scheduled posts/posters)
    import asyncio
    scheduler_task = None
    try:
        from utils.content_scheduler import content_scheduler_loop
        scheduler_task = asyncio.create_task(content_scheduler_loop())
        print("✅ Content Scheduler Started")
    except Exception as e:
        print(f"⚠️ Content scheduler skipped: {str(e)[:100]}")

    yield  # Application runs here

    # 🛑 Shutdown
    if scheduler_task:
        scheduler_task.cancel()
        print("🕐 Content Scheduler Stopped")
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

# ✅ Add Rate Limiter to App (Issue #16 Fix)
if limiter:
    app.state.limiter = limiter
    if RateLimitExceeded:
        app.add_exception_handler(RateLimitExceeded, lambda req, exc: JSONResponse({"detail": "Rate limit exceeded. Please try again later."}, status_code=429))

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

# SECURITY FIX: Removed cors_origin_regex = r".*" which allowed ANY origin with credentials.
# Now uses strict whitelist-only matching via allow_origins above.

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # ✅ Allow GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
    allow_headers=["*"],  # ✅ Allow Range, Content-Type, Authorization, etc.
    expose_headers=[
        "Content-Range",
        "Accept-Ranges",
        "Content-Length",
        "Content-Disposition",
        "X-Process-Time",
    ],
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

class CORSStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        # Extract origin from scope headers if present
        headers_dict = dict(scope.get("headers", []))
        origin = headers_dict.get(b"origin", b"").decode("latin1")
        allowed_origin = origin if origin else "*"

        if scope["method"] == "OPTIONS":
            from starlette.responses import Response
            resp = Response(status_code=200)
            resp.headers["Access-Control-Allow-Origin"] = allowed_origin
            resp.headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
            resp.headers["Access-Control-Allow-Headers"] = "*"
            if allowed_origin != "*":
                resp.headers["Access-Control-Allow-Credentials"] = "true"
            resp.headers["Access-Control-Max-Age"] = "86400"
            return resp

        resp = await super().get_response(path, scope)
        resp.headers["Access-Control-Allow-Origin"] = allowed_origin
        resp.headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "*"
        if allowed_origin != "*":
            resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Expose-Headers"] = "Content-Range, Accept-Ranges, Content-Length, Content-Disposition, *"
        resp.headers["Accept-Ranges"] = "bytes"
        return resp

# Mount paths for frontend access with guaranteed CORS and Range streaming
app.mount("/static", CORSStaticFiles(directory="static"), name="static")
app.mount("/uploads", CORSStaticFiles(directory="static/uploads"), name="uploads")
# ==========================================
# 🚨 EXCEPTION HANDLERS
# ==========================================
# 🚨 EXCEPTION HANDLERS (With Guaranteed CORS)
# ==========================================

def _get_cors_headers(request: Request) -> dict:
    origin = request.headers.get("origin")
    if origin and (origin in origins or "*" in origins):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    return {
        "Access-Control-Allow-Origin": "*",
    }

# 1. Validation Error Handler (Detailed)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_details = []
    cors_headers = _get_cors_headers(request)
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
            headers=cors_headers,
        )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error during validation."},
            headers=cors_headers,
        )

# 2. Global Exception Handler (Crash Prevention) - ✅ Updated with error logging (Issue #7)
@app.exception_handler(Exception)
async def global_exception_handler_impl(request: Request, exc: Exception):
    cors_headers = _get_cors_headers(request)
    if RateLimitExceeded and isinstance(exc, RateLimitExceeded):
        return JSONResponse(
            {"detail": "Rate limit exceeded. Please try again later."}, 
            status_code=429,
            headers=cors_headers
        )

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
            "error_id": error_log.get("error_id", "ERR_UNKNOWN") if isinstance(error_log, dict) else "ERR_UNKNOWN",
            "message": "Please contact support with the error ID."
        },
        headers=cors_headers
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
api_router.include_router(permission_controller.router, tags=["Permissions"])

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
api_router.include_router(book_management_controller.router, prefix="/books", tags=["Books (Manage)"])
api_router.include_router(book_read_controller.router, prefix="/books", tags=["Books (Read)"])
api_router.include_router(post_controller.router, prefix="/posts", tags=["Markaz News"])
api_router.include_router(poster_controller.router, prefix="/posters", tags=["Homepage Posters"])
api_router.include_router(donation_controller.router, tags=["Donation"]) # ✅ Moved INSIDE /api to fix 404
api_router.include_router(analytics_controller.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(settings_controller.router, prefix="/settings", tags=["Homepage Settings"])
api_router.include_router(about_controller.router, prefix="/settings", tags=["About Settings"])
api_router.include_router(fatawa_controller.router, prefix="/fatawa", tags=["Fatawa"])
api_router.include_router(social_work_controller.router, prefix="/social-work-items", tags=["Social Work & Activities"])
api_router.include_router(search_controller.router, prefix="/search", tags=["Global Search"])
api_router.include_router(newspaper_clipping_controller.router, prefix="/newspaper-clippings", tags=["Newspaper Clippings"])
api_router.include_router(system_health_controller.router, prefix="/system", tags=["System Health"])

api_router.include_router(bulk_actions_controller.router, prefix="/bulk", tags=["Bulk Actions"])
api_router.include_router(admin_dashboard_controller.router, prefix="/admin", tags=["Admin Dashboard"])
api_router.include_router(book_order_controller.router, tags=["Book Orders & Paid Downloads"])
api_router.include_router(translation_controller.router, prefix="/translations", tags=["Translations CMS"])
api_router.include_router(gallery_controller.router, tags=["Gallery"])

# Comments & Feedback
api_router.include_router(comment_controller.router, prefix="/comments", tags=["Comments"])
api_router.include_router(admin_comment_controller.router, prefix="/admin/comments", tags=["Admin Comments"])

# Register Main Router
app.include_router(api_router)
app.include_router(gallery_controller.router, include_in_schema=False)
app.include_router(translation_controller.router, prefix="/api/translations", include_in_schema=False)
app.include_router(book_order_controller.router, prefix="/api/books", include_in_schema=False)
app.include_router(social_work_controller.router, prefix="/social-work-items", include_in_schema=False)
app.include_router(search_controller.router, prefix="/search", include_in_schema=False)
app.include_router(newspaper_clipping_controller.router, prefix="/newspaper-clippings", include_in_schema=False)


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

# REMOVED: /api/nuke-issues debug endpoint (Security Audit - Critical)
# This endpoint allowed any authenticated user to delete all IssuedBook records.
# Use a proper admin CLI command or migration script instead.

@app.get("/api/setup-permissions", tags=["Setup"])
def setup_default_permissions(
    db: Session = Depends(get_db),
    current_user=Depends(auth.require_permission("ROLE_MANAGE"))
):
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