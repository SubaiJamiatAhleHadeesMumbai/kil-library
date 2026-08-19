# file: controllers/book_permission_controller.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from models import book_permission_model, user_model
from schemas import book_permission_schema
from auth import require_permission, get_db

router = APIRouter()

@router.post("/", response_model=book_permission_schema.BookPermission, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("BOOK_PERMISSION_MANAGE"))])
def assign_book_permission(
    permission: book_permission_schema.BookPermissionCreate,
    db: Session = Depends(get_db)
):
    """ Ek specific book ki permission kisi user ya role ko assign karein. """
    db_permission = book_permission_model.BookPermission(**permission.dict())
    db.add(db_permission)
    db.commit()
    db.refresh(db_permission)
    return db_permission

@router.get("/book/{book_id}", response_model=List[book_permission_schema.BookPermission], dependencies=[Depends(require_permission("BOOK_PERMISSION_VIEW"))])
def get_permissions_for_book(book_id: int, db: Session = Depends(get_db)):
    """ Ek book ke liye sabhi permissions dekhein. """
    return db.query(book_permission_model.BookPermission).filter(book_permission_model.BookPermission.book_id == book_id).all()

@router.delete("/{permission_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("BOOK_PERMISSION_MANAGE"))])
def revoke_book_permission(permission_id: int, db: Session = Depends(get_db)):
    """ Ek book permission ko revoke karein. """
    db_permission = db.query(book_permission_model.BookPermission).filter(book_permission_model.BookPermission.id == permission_id).first()
    if not db_permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    db.delete(db_permission)
    db.commit()
    return {"detail": "Permission revoked"}