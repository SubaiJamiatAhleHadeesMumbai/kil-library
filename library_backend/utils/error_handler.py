# file: library_backend/utils/error_handler.py
# ✅ CENTRALIZED ERROR LOGGING (Issue #7 Fix)

import traceback
from datetime import datetime, timezone
from typing import Optional, Any
from fastapi import Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class AppError(Exception):
    """✅ Custom exception for app errors"""
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(self.detail)


def log_error(
    db: Optional[Session] = None,
    error: Exception = None,
    request: Optional[Request] = None,
    user_id: Optional[int] = None,
    context: str = "general",
    severity: str = "ERROR"  # ERROR, WARNING, INFO
) -> dict:
    """
    ✅ Centralized error logging to console + database.
    
    Args:
        db: Database session
        error: Exception that occurred
        request: FastAPI Request object
        user_id: ID of user (if applicable)
        context: What operation was happening (e.g., "create_book")
        severity: ERROR, WARNING, or INFO
    
    Returns:
        dict with error_id for user to reference
    
    Usage:
        try:
            create_book()
        except Exception as e:
            error_log = log_error(
                db=db,
                error=e,
                request=request,
                user_id=current_user.id,
                context="create_book",
                severity="ERROR"
            )
            return JSONResponse(
                {"detail": "Internal error", "error_id": error_log["error_id"]},
                status_code=500
            )
    """
    
    # Generate error ID for tracking
    error_id = f"ERR_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{hash(str(error)) % 1000:04d}"
    
    # Get error details
    error_type = type(error).__name__ if error else "Unknown"
    error_message = str(error) if error else "Unknown error"
    traceback_str = traceback.format_exc() if error else ""
    
    # Get request details
    request_method = request.method if request else "N/A"
    request_path = request.url.path if request else "N/A"
    request_ip = (
        request.client.host if request and request.client else "N/A"
    )
    
    # Log to console
    log_msg = (
        f"\n{'='*60}\n"
        f"🔴 [{severity}] {error_id}\n"
        f"Type: {error_type}\n"
        f"Message: {error_message}\n"
        f"Context: {context}\n"
        f"Request: {request_method} {request_path}\n"
        f"IP: {request_ip}\n"
        f"User ID: {user_id}\n"
        f"Timestamp: {datetime.now(timezone.utc).isoformat()}\n"
        f"Traceback:\n{traceback_str}\n"
        f"{'='*60}"
    )
    
    if severity == "ERROR":
        logger.error(log_msg)
    elif severity == "WARNING":
        logger.warning(log_msg)
    else:
        logger.info(log_msg)
    
    # Log to database (if available)
    if db:
        try:
            from models.log_model import Log
            
            error_log = Log(
                user_id=user_id,
                action_type="ERROR",
                description=f"[{error_type}] {error_message[:500]}",
                target_type="Error",
                target_id=None,
                details={
                    "error_id": error_id,
                    "context": context,
                    "request_path": request_path,
                    "request_method": request_method,
                    "request_ip": request_ip,
                    "traceback": traceback_str[:1000]
                }
            )
            db.add(error_log)
            db.commit()
        except Exception as db_error:
            logger.warning(f"Failed to log error to database: {db_error}")
    
    return {
        "error_id": error_id,
        "type": error_type,
        "message": error_message,
        "context": context,
        "severity": severity
    }


async def global_exception_handler(request: Request, exc: Exception):
    """
    ✅ Global exception handler for unhandled errors.
    
    Usage in main.py:
        @app.exception_handler(Exception)
        async def global_exception_handler(request, exc):
            return await global_exception_handler(request, exc)
    """
    from auth import get_db
    
    # Log the error
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
    
    # Return error response
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "error_id": error_log["error_id"],
            "message": "An unexpected error occurred. Please contact support with error ID."
        }
    )
