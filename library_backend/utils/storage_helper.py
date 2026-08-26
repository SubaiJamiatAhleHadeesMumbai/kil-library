import os
from fastapi import UploadFile
from utils.r2_helper import is_r2_configured, upload_to_r2, delete_from_r2
from utils.cloudinary_helper import upload_to_cloudinary, delete_from_cloudinary
from utils.local_helper import save_pdf_locally, save_txt_locally, save_image_locally, resolve_upload_path
from utils.pdf_optimizer import optimize_pdf_file

def is_cloudinary_configured() -> bool:
    return bool(
        os.getenv("CLOUDINARY_CLOUD_NAME") and
        os.getenv("CLOUDINARY_API_KEY") and
        os.getenv("CLOUDINARY_API_SECRET")
    )

def smart_upload(file: UploadFile, folder: str = "library_uploads", resource_type: str = "auto") -> str | None:
    """
    Intelligent uploader with multi-storage hierarchy & conditional PDF optimizer:
    1. For PDFs: If <= 100MB, keeps untouched original. If > 100MB, performs smart HD compression.
    2. Cloudflare R2 (Primary for production / 10k+ books - Zero Egress Fees)
    3. Cloudinary (Secondary/Fallback)
    4. Local disk (Local development fallback)
    """
    if not file:
        return None

    cleanup_path = None
    try:
        # Apply smart conditional PDF optimization (Only compresses if > 100MB)
        if file.filename and file.filename.lower().endswith(".pdf"):
            file, was_compressed, orig_sz, final_sz, cleanup_path = optimize_pdf_file(file)

        # 1. Try Cloudflare R2 first if credentials are set
        if is_r2_configured():
            try:
                if hasattr(file.file, "seek"):
                    file.file.seek(0)
                url = upload_to_r2(file, folder=folder)
                if url:
                    return url
            except Exception as r2_err:
                print(f"⚠️ R2 Upload attempt failed: {r2_err}")

        # 2. Try Cloudinary if configured
        if is_cloudinary_configured():
            try:
                if hasattr(file.file, "seek"):
                    file.file.seek(0)
                url = upload_to_cloudinary(file, folder=folder, resource_type=resource_type)
                if url:
                    return url
            except Exception as c_err:
                print(f"⚠️ Cloudinary Upload attempt failed: {c_err}")

        # 3. Fallback to Local Storage
        try:
            if hasattr(file.file, "seek"):
                file.file.seek(0)
            filename = (file.filename or "").lower()
            if filename.endswith(".pdf"):
                return save_pdf_locally(file)
            elif any(filename.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"]):
                return save_image_locally(file)
            else:
                return save_txt_locally(file)
        except Exception as loc_err:
            print(f"⚠️ Local Storage fallback failed: {loc_err}")
            return None
    finally:
        # Auto-Purge any temporary compressed file
        if cleanup_path and os.path.exists(cleanup_path):
            try:
                if hasattr(file, "file") and hasattr(file.file, "close"):
                    file.file.close()
                os.remove(cleanup_path)
                print(f"🗑️ [CLEANUP] Temporary compressed file purged: {cleanup_path}")
            except Exception as cl_err:
                print(f"⚠️ Could not delete temp compressed file: {cl_err}")

def smart_delete(file_url: str | None) -> bool:
    """
    Intelligently deletes an old file from whichever storage it resides in:
    1. Cloudflare R2
    2. Cloudinary
    3. Local disk
    """
    if not file_url:
        return False

    url_str = str(file_url).strip()
    if not url_str:
        return False

    print(f"🧹 Smart-cleaning old file: {url_str}")

    # 1. Cloudflare R2 URL check
    if "r2.dev" in url_str or "r2.cloudflarestorage.com" in url_str or (is_r2_configured() and url_str.startswith("http")):
        return delete_from_r2(url_str)

    # 2. Cloudinary URL check
    if "cloudinary.com" in url_str:
        return delete_from_cloudinary(url_str)

    # 3. Local disk
    local_path = resolve_upload_path(url_str)
    if local_path and os.path.exists(local_path):
        try:
            os.remove(local_path)
            print(f"🗑️ Deleted local file: {local_path}")
            return True
        except Exception as e:
            print(f"⚠️ Error deleting local file: {e}")
            return False

    return False
