# file: library_backend/utils/file_validator.py
# ✅ FILE UPLOAD VALIDATION (Issue #11 Fix)

from fastapi import UploadFile, HTTPException, status
import os

# ✅ File size limits (in bytes)
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB for images
MAX_PDF_SIZE = 50 * 1024 * 1024    # 50MB for PDFs
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB general limit

# ✅ Allowed MIME types
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_PDF_TYPES = {"application/pdf"}
ALLOWED_DOCUMENT_TYPES = {"application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}


async def validate_image(file: UploadFile, max_size: int = MAX_IMAGE_SIZE) -> bool:
    """
    ✅ Validates image upload.
    
    Checks:
    - MIME type is image
    - File size <= max_size
    
    Raises HTTPException if invalid
    """
    # Check MIME type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image type. Allowed: JPEG, PNG, WEBP. Got: {file.content_type}"
        )
    
    # Check file size
    contents = await file.read()
    file_size = len(contents)
    
    if file_size > max_size:
        size_mb = max_size / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image too large. Max size: {size_mb}MB. Your file: {file_size / (1024*1024):.2f}MB"
        )
    
    # Reset file pointer
    await file.seek(0)
    return True


async def validate_pdf(file: UploadFile, max_size: int = MAX_PDF_SIZE) -> bool:
    """
    ✅ Validates PDF upload.
    
    Checks:
    - MIME type is PDF
    - File size <= max_size
    
    Raises HTTPException if invalid
    """
    # Check MIME type
    if file.content_type not in ALLOWED_PDF_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Only PDF allowed. Got: {file.content_type}"
        )
    
    # Check file size
    contents = await file.read()
    file_size = len(contents)
    
    if file_size > max_size:
        size_mb = max_size / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"PDF too large. Max size: {size_mb}MB. Your file: {file_size / (1024*1024):.2f}MB"
        )
    
    # Reset file pointer
    await file.seek(0)
    return True


async def validate_file(file: UploadFile, allowed_types: set, max_size: int = MAX_FILE_SIZE) -> bool:
    """
    ✅ Generic file validation.
    
    Args:
        file: FastAPI UploadFile
        allowed_types: Set of MIME types (e.g., {"application/pdf", "text/plain"})
        max_size: Max file size in bytes
    
    Returns:
        True if valid
    
    Raises:
        HTTPException if invalid
    """
    # Check MIME type
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}. Got: {file.content_type}"
        )
    
    # Check file size
    contents = await file.read()
    file_size = len(contents)
    
    if file_size > max_size:
        size_mb = max_size / (1024 * 1024)
        file_mb = file_size / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max: {size_mb}MB. Your file: {file_mb:.2f}MB"
        )
    
    # Reset file pointer
    await file.seek(0)
    return True


def format_file_size(size_bytes: int) -> str:
    """Convert bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"
