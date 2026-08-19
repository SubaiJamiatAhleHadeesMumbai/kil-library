# file: controllers/digital_access_controller.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from models import library_management_models as models, user_model
from schemas import library_management_schemas as schemas
from auth import require_permission, get_db, get_current_user
from utils import create_log

router = APIRouter()

@router.post("/", response_model=schemas.DigitalAccess, status_code=status.HTTP_201_CREATED)
def log_digital_access(
    access_data: schemas.DigitalAccessCreate, 
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user) # Any logged-in user can access
):
    """
    Log karein jab koi user ek digital book access karta hai.
    """
    # Verify that the current user is the one logging the access
    if current_user.id != access_data.client_id:
        raise HTTPException(status_code=403, detail="Cannot log access for another user.")

    db_access = models.DigitalAccess(**access_data.dict())
    db.add(db_access)
    
    log_desc = f"User '{current_user.username}' accessed digital book ID {access_data.book_id}."
    create_log(db, current_user, "DIGITAL_ACCESS_LOGGED", log_desc, "DigitalAccess", db_access.id)
    
    db.commit()
    db.refresh(db_access)
    return db_access

@router.get("/user/{client_id}", response_model=List[schemas.DigitalAccess], dependencies=[Depends(require_permission("DIGITAL_ACCESS_VIEW"))])
def get_user_digital_access_history(client_id: int, db: Session = Depends(get_db)):
    """
    Ek specific user ki digital access history dekhein.
    """
    history = db.query(models.DigitalAccess).filter(models.DigitalAccess.client_id == client_id).all()
    if not history:
        raise HTTPException(status_code=404, detail="No access history found for this user")
    return history