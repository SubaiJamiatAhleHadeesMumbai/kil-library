import uuid
import cloudinary
import cloudinary.uploader
import os
import shutil
from uuid import uuid4
from pathlib import Path
from dotenv import load_dotenv
from fastapi import UploadFile

# 1. Load Configuration
load_dotenv()

cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
api_key = os.getenv("CLOUDINARY_API_KEY")
api_secret = os.getenv("CLOUDINARY_API_SECRET")

has_cloudinary = bool(cloud_name and api_key and api_secret)

if has_cloudinary:
    cloudinary.config( 
        cloud_name=cloud_name, 
        api_key=api_key, 
        api_secret=api_secret,
        secure=True
    )


def save_locally(file: UploadFile, folder: str) -> str:
    """Fallback local storage when Cloudinary is unavailable or fails."""
    try:
        clean_folder = folder.replace("booknest/", "").replace("/", "_")
        target_dir = Path("static") / "uploads" / clean_folder
        target_dir.mkdir(parents=True, exist_ok=True)

        ext = Path(file.filename or "file.dat").suffix
        unique_name = f"{uuid4().hex[:12]}{ext}"
        destination = target_dir / unique_name

        file.file.seek(0)
        with open(destination, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Return accessible static URL
        relative_url = f"/static/uploads/{clean_folder}/{unique_name}"
        print(f"[STORAGE] Saved to local storage: {relative_url}")
        return relative_url
    except Exception as e:
        print(f"[STORAGE] Local storage error: {e}")
        return None


def upload_to_cloudinary(file: UploadFile, folder: str = "library_uploads", resource_type: str = "auto"):
    """
    Uploads files to Cloudinary with Smart Type Detection and Local Fallback.
    """
    if not file:
        return None

    # If Cloudinary is not configured, directly save locally
    if not has_cloudinary:
        return save_locally(file, folder)

    # Temporary Filename (Safe ASCII name to prevent errors with Urdu/Arabic filenames)
    file_ext = os.path.splitext(file.filename or "doc.bin")[1].lower()
    temp_filename = f"temp_{uuid.uuid4().hex[:12]}{file_ext}"

    try:
        print(f"🚀 PROCESSING: {file.filename}")

        if hasattr(file.file, "seek"):
            file.file.seek(0)

        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        filename_lower = (file.filename or "").lower()
        raw_extensions = [".pdf", ".txt", ".docx", ".doc", ".epub", ".md", ".csv", ".json", ".xml"]

        final_res_type = resource_type
        if resource_type == "auto":
            if any(filename_lower.endswith(ext) for ext in raw_extensions):
                final_res_type = "raw"
            else:
                final_res_type = "auto"

        response = cloudinary.uploader.upload(
            temp_filename, 
            folder=folder,
            resource_type=final_res_type
        )
        
        secure_url = response.get("secure_url")
        if secure_url:
            print(f"[STORAGE] Cloudinary upload success: {secure_url}")
            return secure_url
        else:
            return save_locally(file, folder)

    except Exception as e:
        print(f"[STORAGE] Cloudinary upload failed ({e}), falling back to local disk...")
        return save_locally(file, folder)

    finally:
        if os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
                print("🧹 Temp file cleaned")
            except Exception as cleanup_err:
                print(f"⚠️ Warning: Could not delete temp file: {cleanup_err}")


def delete_from_cloudinary(url: str) -> bool:
    """Deletes an asset from Cloudinary given its URL."""
    if not url:
        return False
    try:
        parts = url.split("/upload/")
        if len(parts) > 1:
            public_id_with_ext = parts[1].split("/", 1)[-1]
            public_id = os.path.splitext(public_id_with_ext)[0]
            print(f"🗑️ Deleting from Cloudinary: {public_id}")
            cloudinary.uploader.destroy(public_id)
            return True
        return False
    except Exception as e:
        print(f"❌ Cloudinary Delete Error: {str(e)}")
        return False
