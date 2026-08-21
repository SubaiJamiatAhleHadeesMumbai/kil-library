import os
from fastapi import UploadFile
from utils.r2_helper import is_r2_configured, upload_to_r2
from utils.cloudinary_helper import upload_to_cloudinary
from utils.local_helper import save_pdf_locally, save_txt_locally, save_image_locally

def is_cloudinary_configured() -> bool:
    return bool(
        os.getenv("CLOUDINARY_CLOUD_NAME") and
        os.getenv("CLOUDINARY_API_KEY") and
        os.getenv("CLOUDINARY_API_SECRET")
    )

def smart_upload(file: UploadFile, folder: str = "library_uploads", resource_type: str = "auto") -> str | None:
    """
    Intelligent uploader with multi-storage hierarchy:
    1. Cloudflare R2 (Primary for production / 10k+ books - Zero Egress Fees)
    2. Cloudinary (Secondary/Fallback)
    3. Local disk (Local development fallback)
    """
    if not file:
        return None

    # 1. Try Cloudflare R2 first if credentials are set
    if is_r2_configured():
        url = upload_to_r2(file, folder=folder)
        if url:
            return url

    # 2. Try Cloudinary if configured
    if is_cloudinary_configured():
        url = upload_to_cloudinary(file, folder=folder, resource_type=resource_type)
        if url:
            return url

    # 3. Fallback to Local Storage
    filename = (file.filename or "").lower()
    if filename.endswith(".pdf"):
        return save_pdf_locally(file)
    elif any(filename.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"]):
        return save_image_locally(file)
    else:
        return save_txt_locally(file)
