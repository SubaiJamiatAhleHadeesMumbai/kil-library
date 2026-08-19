# file: schemas/book_permission_schema.py
from pydantic import BaseModel, model_validator # root_validator ki jagah model_validator
from typing import Optional

class BookPermissionBase(BaseModel):
    book_id: int
    user_id: Optional[int] = None
    role_id: Optional[int] = None

    # @root_validator ko @model_validator(mode='before') se replace kiya gaya hai
    @model_validator(mode='before')
    @classmethod
    def check_user_or_role_id_exists(cls, data: any) -> any:
        """ Sunishchit karein ki user_id ya role_id mein se kam se kam ek zaroor ho. """
        if isinstance(data, dict):
            user_id = data.get('user_id')
            role_id = data.get('role_id')
            
            if user_id is None and role_id is None:
                raise ValueError('Either user_id or role_id must be provided')
            if user_id is not None and role_id is not None:
                raise ValueError('Provide either user_id or role_id, not both')
        return data

class BookPermissionCreate(BookPermissionBase):
    pass

class BookPermission(BookPermissionBase):
    id: int

    class Config:
        from_attributes = True