from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
import auth
from schemas.bulk_action_schema import BulkBookAction, BulkUserAction, BulkRequestAction, BulkActionResponse
from models.book_model import Book
from models.user_model import User
from models.request_model import BookRequest

router = APIRouter()

@router.post("/books", response_model=BulkActionResponse)
def bulk_books(
    action_data: BulkBookAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.require_permission("BOOK_MANAGE"))
):
    if not action_data.book_ids:
        raise HTTPException(status_code=400, detail="No book IDs provided")
    
    valid_actions = {"delete", "restrict", "unrestrict", "approve"}
    if action_data.action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action. Allowed actions: {valid_actions}")
        
    try:
        books = db.query(Book).filter(Book.id.in_(action_data.book_ids)).all()
        affected_count = 0
        
        for book in books:
            if action_data.action == "delete":
                book.deleted_at = datetime.utcnow()
            elif action_data.action == "restrict":
                book.is_restricted = True
            elif action_data.action == "unrestrict":
                book.is_restricted = False
            elif action_data.action == "approve":
                book.is_approved = True
            affected_count += 1
            
        db.commit()
        return BulkActionResponse(
            success=True,
            action=action_data.action,
            affected_count=affected_count,
            message=f"{affected_count} books {action_data.action}d successfully"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Bulk action failed: {str(e)}")

@router.post("/users", response_model=BulkActionResponse)
def bulk_users(
    action_data: BulkUserAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.require_permission("USER_MANAGE"))
):
    if not action_data.user_ids:
        raise HTTPException(status_code=400, detail="No user IDs provided")
        
    valid_actions = {"suspend", "activate", "delete"}
    if action_data.action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action. Allowed actions: {valid_actions}")
        
    try:
        users = db.query(User).filter(User.id.in_(action_data.user_ids)).all()
        affected_count = 0
        
        for user in users:
            if action_data.action == "delete":
                user.deleted_at = datetime.utcnow()
            elif action_data.action == "suspend":
                user.status = "Suspended"
            elif action_data.action == "activate":
                user.status = "Active"
            affected_count += 1
            
        db.commit()
        return BulkActionResponse(
            success=True,
            action=action_data.action,
            affected_count=affected_count,
            message=f"{affected_count} users {action_data.action}d successfully"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Bulk action failed: {str(e)}")

@router.post("/requests", response_model=BulkActionResponse)
def bulk_requests(
    action_data: BulkRequestAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.require_permission("REQUEST_MANAGE"))
):
    if not action_data.request_ids:
        raise HTTPException(status_code=400, detail="No request IDs provided")
        
    valid_actions = {"approve", "reject"}
    if action_data.action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action. Allowed actions: {valid_actions}")
        
    try:
        requests = db.query(BookRequest).filter(BookRequest.id.in_(action_data.request_ids)).all()
        affected_count = 0
        
        for req in requests:
            if action_data.action == "approve":
                req.status = "Approved"
            elif action_data.action == "reject":
                req.status = "Rejected"
                if action_data.rejection_reason:
                    req.rejection_reason = action_data.rejection_reason
            affected_count += 1
            
        db.commit()
        return BulkActionResponse(
            success=True,
            action=action_data.action,
            affected_count=affected_count,
            message=f"{affected_count} requests {action_data.action}d successfully"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Bulk action failed: {str(e)}")
