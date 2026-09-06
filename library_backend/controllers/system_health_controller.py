from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import os
import sys
import fastapi
from datetime import datetime, timezone
import psutil

from database import get_db
from models.book_model import Book, Category, Subcategory
from models.user_model import User, Role
from models.request_model import BookRequest, UploadRequest
from models.issue_model import Issue
from models.post_model import MarkazPost
from models.poster_model import HomepagePoster
from models.log_model import Log
from models.permission_model import Permission
from models.language_model import Language
from auth import require_permission

router = APIRouter()

STARTUP_TIME = datetime.now(timezone.utc)

@router.get("/health")
def get_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("LOG_VIEW"))
):
    try:
        # DB Table counts
        db_tables = {
            "books": {"row_count": db.query(func.count(Book.id)).scalar() or 0},
            "users": {"row_count": db.query(func.count(User.id)).scalar() or 0},
            "book_requests": {"row_count": db.query(func.count(BookRequest.id)).scalar() or 0},
            "issues": {"row_count": db.query(func.count(Issue.id)).scalar() or 0},
            "markaz_posts": {"row_count": db.query(func.count(MarkazPost.id)).scalar() or 0},
            "posters": {"row_count": db.query(func.count(HomepagePoster.id)).scalar() or 0},
            "logs": {"row_count": db.query(func.count(Log.id)).scalar() or 0},
            "roles": {"row_count": db.query(func.count(Role.id)).scalar() or 0},
            "permissions": {"row_count": db.query(func.count(Permission.id)).scalar() or 0},
            "categories": {"row_count": db.query(func.count(Category.id)).scalar() or 0},
            "languages": {"row_count": db.query(func.count(Language.id)).scalar() or 0}
        }

        # Storage info
        uploads_dir = "static/uploads"
        total_size = 0
        total_files = 0
        if os.path.exists(uploads_dir):
            for dirpath, dirnames, filenames in os.walk(uploads_dir):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if not os.path.islink(fp):
                        total_size += os.path.getsize(fp)
                        total_files += 1

        size_mb = total_size / (1024 * 1024)

        # Server info
        uptime = (datetime.now(timezone.utc) - STARTUP_TIME).total_seconds()
        
        # User Sessions
        total_users = db.query(func.count(User.id)).scalar() or 0
        active_users = db.query(func.count(User.id)).filter(User.status == "ACTIVE").scalar() or 0
        suspended_users = db.query(func.count(User.id)).filter(User.status == "SUSPENDED").scalar() or 0

        return {
            "database": {
                "status": "healthy",
                "tables": db_tables
            },
            "storage": {
                "local_uploads_size_mb": round(size_mb, 2),
                "local_uploads_file_count": total_files
            },
            "server": {
                "python_version": sys.version.split(' ')[0],
                "fastapi_version": fastapi.__version__,
                "uptime_seconds": round(uptime, 2),
                "environment": os.environ.get("ENV", "development")
            },
            "active_sessions": {
                "total_users": total_users,
                "active_users": active_users,
                "suspended_users": suspended_users
            },
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
