from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
from models import user_model
from schemas import user_schema
from auth import get_password_hash

# Rate limiting
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)
except ImportError:
    limiter = None

# Note: Yahan humne koi 'get_current_user' dependency nahi lagayi
router = APIRouter()

@router.post("/register", response_model=user_schema.UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute") if limiter else lambda f: f
def register_public_user(request: Request, user: user_schema.UserCreate, db: Session = Depends(get_db)):
    """
    Public Registration:
    - Koi bhi naya user yahan account bana sakta hai.
    - Token ki zaroorat nahi hai.
    - Default Role 'Member' milega.
    """
    # 1. Check Duplicates (Email)
    if db.query(user_model.User).filter(user_model.User.email == user.email).first():
        raise HTTPException(status_code=409, detail="Email is already registered")
    
    # 2. Check Duplicates (Username)
    if db.query(user_model.User).filter(user_model.User.username == user.username).first():
        raise HTTPException(status_code=409, detail="Username is already taken")

    # 3. Get Default Role ('Member' or 'User' or 'Student')
    default_role = db.query(user_model.Role).filter(
        user_model.Role.name.in_(["Member", "member", "User", "user", "Student", "student"])
    ).first()
    
    # Safety Check: Agar Member role DB mein nahi hai to create kar lo ya non-admin role lo
    if not default_role:
        default_role = db.query(user_model.Role).filter(~user_model.Role.name.ilike("%admin%")).first()
        if not default_role:
            # Create a Member role to prevent assigning Admin role
            default_role = user_model.Role(name="Member", description="Standard library member")
            db.add(default_role)
            db.commit()
            db.refresh(default_role)

    # 4. Create User
    hashed_pwd = get_password_hash(user.password)
    
    new_user = user_model.User(
        email=user.email,
        username=user.username,
        password_hash=hashed_pwd,
        full_name=user.full_name,
        role_id=default_role.id,
        status="Active"
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")