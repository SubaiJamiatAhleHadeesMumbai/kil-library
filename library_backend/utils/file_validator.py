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


async def _get_file_size_and_header(file: UploadFile, max_size: int, expected_magic: list = None) -> bytes:
    """Reads header for magic byte verification and measures size in chunks without loading entire file into memory."""
    header = await file.read(2048)
    if not header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    if expected_magic:
        matched = any(header.startswith(m) for m in expected_magic)
        if not matched:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File signature (magic bytes) does not match expected format."
            )

    total_size = len(header)
    chunk_size = 64 * 1024
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > max_size:
            size_mb = max_size / (1024 * 1024)
            await file.seek(0)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Max size: {size_mb:.1f}MB."
            )

    await file.seek(0)
    return header


async def validate_image(file: UploadFile, max_size: int = MAX_IMAGE_SIZE) -> bool:
    """
    ✅ Validates image upload:
    - Content-Type header check
    - File size check via streaming (prevents OOM)
    - Magic bytes check (JPEG, PNG, WEBP)
    """
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image type. Allowed: JPEG, PNG, WEBP. Got: {file.content_type}"
        )

    # Magic signatures: JPEG (\xff\xd8\xff), PNG (\x89PNG), WEBP (RIFF....WEBP)
    # For WEBP, header starts with RIFF and has WEBP at offset 8
    header = await file.read(16)
    await file.seek(0)
    
    is_jpeg = header.startswith(b"\xff\xd8\xff")
    is_png = header.startswith(b"\x89PNG\r\n\x1a\n")
    is_webp = header.startswith(b"RIFF") and header[8:12] == b"WEBP"

    if not (is_jpeg or is_png or is_webp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match a valid image signature (JPEG/PNG/WEBP)."
        )

    await _get_file_size_and_header(file, max_size)
    return True


async def validate_pdf(file: UploadFile, max_size: int = MAX_PDF_SIZE) -> bool:
    """
    ✅ Validates PDF upload:
    - Content-Type header check
    - File size check via streaming (prevents OOM)
    - Magic bytes check (%PDF-)
    """
    if file.content_type not in ALLOWED_PDF_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Only PDF allowed. Got: {file.content_type}"
        )

    # PDF magic signature: %PDF
    await _get_file_size_and_header(file, max_size, expected_magic=[b"%PDF"])
    return True


async def validate_file(file: UploadFile, allowed_types: set, max_size: int = MAX_FILE_SIZE) -> bool:
    """
    ✅ Generic file validation with streaming size check.
    """
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}. Got: {file.content_type}"
        )

    await _get_file_size_and_header(file, max_size)
    return True


def format_file_size(size_bytes: int) -> str:
    """Convert bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"
