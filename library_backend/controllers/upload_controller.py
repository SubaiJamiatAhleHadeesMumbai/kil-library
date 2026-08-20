from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from auth import require_permission
from utils.storage_helper import smart_upload
from utils.file_validator import validate_image, validate_pdf  # ✅ NEW: File validation (Issue #11)

router = APIRouter()

# --- 1. IMAGE UPLOAD ---
@router.post("/image", dependencies=[Depends(require_permission("FILE_UPLOAD"))])
async def upload_image(file: UploadFile = File(...)):
    """
    ✅ Book cover image upload with file size validation.
    Cloudflare R2 / Cloudinary URL return karta hai.
    
    Max size: 10MB
    Allowed: JPEG, PNG, WEBP
    """
    # ✅ 1. Validation check - Size + Type (Issue #11 Fix)
    await validate_image(file)
    
    # 2. Upload using smart_upload (Cloudflare R2 / Cloudinary / Local)
    url = smart_upload(file, folder="booknest/covers", resource_type="image")
    
    # 3. Error Handling
    if not url:
        raise HTTPException(status_code=500, detail="Image upload failed on server.")
        
    # 4. Return URL (Frontend compatible)
    return {"url": url}


# --- 2. PDF UPLOAD ---
@router.post("/pdf", dependencies=[Depends(require_permission("FILE_UPLOAD"))])
async def upload_pdf(file: UploadFile = File(...)):
    """
    ✅ Book PDF upload with file size validation.
    Cloudflare R2 / Cloudinary URL return karta hai.
    
    Max size: 50MB
    Allowed: PDF only
    """
    # ✅ 1. Validation check - Size + Type (Issue #11 Fix)
    await validate_pdf(file)
        
    # 2. Upload using smart_upload (Cloudflare R2 / Cloudinary / Local)
    url = smart_upload(file, folder="booknest/pdfs", resource_type="raw")
    
    # 3. Error Handling
    if not url:
        raise HTTPException(status_code=500, detail="PDF upload failed on server.")
        
    # 4. Return URL (Frontend compatible)
    return {"url": url}