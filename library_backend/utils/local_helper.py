import os
import uuid
import shutil
from pathlib import Path
from fastapi import UploadFile

# Resolve paths relative to this file so uploads work reliably from any working directory
BASE_DIR = Path(__file__).resolve().parent.parent
PDF_DIR = BASE_DIR / "static" / "uploads" / "pdfs"
TXT_DIR = BASE_DIR / "static" / "uploads" / "texts"
IMAGE_DIR = BASE_DIR / "static" / "uploads" / "images"

# Ensure directories exist
PDF_DIR.mkdir(parents=True, exist_ok=True)
TXT_DIR.mkdir(parents=True, exist_ok=True)
IMAGE_DIR.mkdir(parents=True, exist_ok=True)


def resolve_upload_path(url_path: str | None):
    """Resolve an uploaded file URL to a real filesystem path.

    The backend stores URLs like /uploads/texts/filename.txt. These should be
    resolved relative to the library_backend/static directory so deep-search can
    read uploaded text files regardless of the current working directory.
    """
    if not url_path:
        return None

    cleaned = str(url_path).strip()
    if not cleaned:
        return None

    if cleaned.startswith("http://") or cleaned.startswith("https://"):
        return cleaned

    normalized = cleaned.replace("\\", "/")
    if normalized.startswith("/uploads/"):
        relative_path = normalized.lstrip("/")
        return (BASE_DIR / "static" / relative_path).resolve()

    if normalized.startswith("uploads/"):
        return (BASE_DIR / "static" / normalized).resolve()

    return (BASE_DIR / normalized).resolve()


def _ensure_dir(path):
    path_obj = Path(path)
    path_obj.mkdir(parents=True, exist_ok=True)
    return path_obj

def save_pdf_locally(file: UploadFile):
    """Saves a PDF file locally and returns the public URL path."""
    if not file:
        return None

    try:
        print(f"🚀 Saving PDF locally: {file.filename}")
        
        file_ext = Path(file.filename or "file.pdf").suffix.lower()
        if file_ext != ".pdf":
            print("❌ Only PDF files allowed for this field")
            return None
                
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        upload_dir = _ensure_dir(PDF_DIR)
        file_path = upload_dir / unique_filename
        
        # Save file to the local directory
        if hasattr(file.file, "seek"):
            file.file.seek(0)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return frontend URL (matches app.mount("/uploads") in main.py)
        local_url = f"/uploads/pdfs/{unique_filename}"
        print(f"✅ Local PDF Upload Success: {local_url}")
        return local_url

    except Exception as e:
        print(f"❌ Local PDF Save Error: {e}")
        return None

def save_txt_locally(file: UploadFile):
    """Saves a TXT file locally and returns the public URL path."""
    if not file:
        return None

    try:
        print(f"🚀 Saving TXT locally: {file.filename}")
        
        file_ext = Path(file.filename or "file.txt").suffix.lower()
        if not file_ext:
            file_ext = ".txt"
        allowed_extensions = {".txt", ".text", ".md", ".docx", ".doc", ".rtf", ".html", ".json", ".csv", ".xml"}
        if file_ext not in allowed_extensions:
            file_ext = ".txt"
                
        # Generate unique filename
        unique_filename = f"{uuid.uuid4().hex[:16]}{file_ext}"
        upload_dir = _ensure_dir(TXT_DIR)
        file_path = upload_dir / unique_filename
        
        # Save file to the local directory
        if hasattr(file.file, "seek"):
            file.file.seek(0)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return frontend URL
        local_url = f"/uploads/texts/{unique_filename}"
        print(f"✅ Local TXT Upload Success: {local_url}")
        return local_url

    except Exception as e:
        print(f"❌ Local TXT Save Error: {e}")
        return None

def save_image_locally(file: UploadFile):
    """Saves an image file locally and returns the public URL path."""
    if not file:
        return None

    try:
        print(f"🚀 Saving Image locally: {file.filename}")
        
        file_ext = Path(file.filename or "image.jpg").suffix.lower()
        if not file_ext or file_ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"}:
            file_ext = ".jpg"
                
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        upload_dir = _ensure_dir(IMAGE_DIR)
        file_path = upload_dir / unique_filename
        
        # Save file to the local directory
        if hasattr(file.file, "seek"):
            file.file.seek(0)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return frontend URL
        local_url = f"/uploads/images/{unique_filename}"
        print(f"✅ Local Image Upload Success: {local_url}")
        return local_url

    except Exception as e:
        print(f"❌ Local Image Save Error: {e}")
        return None