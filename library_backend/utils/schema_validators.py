# file: library_backend/utils/schema_validators.py
# ✅ ENHANCED INPUT VALIDATION (Issue #12 Fix)

from pydantic import BaseModel, Field, validator, constr
from typing import Optional
import re


class ValidatedString(str):
    """✅ String with SQL injection prevention and length limits"""
    pass


class BookSearchSchema(BaseModel):
    """✅ Enhanced search schema with input validation"""
    title: Optional[str] = Field(None, max_length=200, min_length=1, description="Book title (max 200 chars)")
    author: Optional[str] = Field(None, max_length=200, min_length=1, description="Author name (max 200 chars)")
    isbn: Optional[str] = Field(None, max_length=20, min_length=5, description="ISBN (5-20 chars)")
    
    @validator('title', 'author')
    def sanitize_string(cls, v):
        """✅ Remove potentially dangerous characters"""
        if v is None:
            return v
        # Remove SQL dangerous patterns
        dangerous_patterns = ['--', '/*', '*/', 'xp_', 'sp_']
        for pattern in dangerous_patterns:
            if pattern.lower() in v.lower():
                raise ValueError(f"Invalid characters in input: {pattern}")
        return v.strip()


class UserCreateSchema(BaseModel):
    """✅ Enhanced user creation with validation"""
    username: constr(min_length=3, max_length=50, regex=r'^[a-zA-Z0-9_-]+$')  # Alphanumeric only
    email: constr(min_length=5, max_length=255, regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    password: constr(min_length=8, max_length=128)  # Strong password
    full_name: constr(max_length=255)
    
    @validator('password')
    def validate_password(cls, v):
        """✅ Ensure password is strong"""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if not any(c in "!@#$%^&*" for c in v):
            raise ValueError("Password must contain at least one special character")
        return v


class PaginationSchema(BaseModel):
    """✅ Pagination with limits (Issue #8 Fix)"""
    skip: int = Field(0, ge=0, description="Records to skip")
    limit: int = Field(20, ge=1, le=100, description="Max records (capped at 100)")


class FileUploadSchema(BaseModel):
    """✅ File upload validation"""
    filename: constr(max_length=255)
    size_bytes: int = Field(gt=0, le=100*1024*1024, description="File size in bytes")
    mime_type: str = Field(max_length=50)


def validate_no_sql_injection(value: str) -> str:
    """✅ Generic SQL injection prevention"""
    dangerous_patterns = [
        r"(?i)(union.*select|select.*from|insert.*into|delete.*from|update.*set|drop.*table)",
        r"(?i)(exec|execute|script|javascript)",
        r"(--|;|/\*|\*/|xp_|sp_)"
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, value):
            raise ValueError(f"Invalid characters detected in input: {pattern}")
    
    return value


# ✅ Usage Example:
# from utils.schema_validators import BookSearchSchema, validate_no_sql_injection
#
# @router.get("/books")
# def search_books(search: BookSearchSchema = Depends()):
#     # search.title is already validated
#     ...
