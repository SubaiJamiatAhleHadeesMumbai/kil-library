import os
import uuid
import mimetypes
import boto3
from pathlib import Path
from botocore.config import Config
from fastapi import UploadFile
from dotenv import load_dotenv

# Explicitly load .env from backend directory
backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(backend_dir / ".env")
load_dotenv()

def get_r2_config():
    return {
        "account_id": os.getenv("R2_ACCOUNT_ID"),
        "access_key_id": os.getenv("R2_ACCESS_KEY_ID"),
        "secret_access_key": os.getenv("R2_SECRET_ACCESS_KEY"),
        "bucket_name": os.getenv("R2_BUCKET_NAME", "kil-library-storage"),
        "public_url": os.getenv("R2_PUBLIC_URL", "").rstrip("/"),
    }

def is_r2_configured() -> bool:
    """Checks if Cloudflare R2 environment variables are present."""
    cfg = get_r2_config()
    return bool(cfg["account_id"] and cfg["access_key_id"] and cfg["secret_access_key"] and cfg["bucket_name"])

def get_r2_client():
    """Initializes and returns boto3 S3 client configured for Cloudflare R2."""
    if not is_r2_configured():
        return None

    cfg = get_r2_config()
    endpoint_url = f"https://{cfg['account_id']}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=cfg["access_key_id"],
        aws_secret_access_key=cfg["secret_access_key"],
        config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
        region_name="auto"
    )

def upload_to_r2(file: UploadFile, folder: str = "uploads") -> str | None:
    """
    Uploads an UploadFile directly to Cloudflare R2 with automatic content-based deduplication.
    If the exact same file was already uploaded, it reuses the existing URL without creating duplicates.
    Returns the public accessible URL of the uploaded file.
    """
    if not file or not is_r2_configured():
        return None

    client = get_r2_client()
    if not client:
        return None

    try:
        # Determine content type
        content_type = file.content_type
        if not content_type:
            content_type, _ = mimetypes.guess_type(file.filename or "")
        if not content_type:
            content_type = "application/octet-stream"

        # Compute SHA-256 content hash for 100% accurate deduplication
        import hashlib
        hasher = hashlib.sha256()
        file.file.seek(0)
        while chunk := file.file.read(1024 * 1024):
            hasher.update(chunk)
        file_hash = hasher.hexdigest()[:16]
        file.file.seek(0)

        # Unique key name based on content hash to prevent duplicate copies
        file_ext = os.path.splitext(file.filename or "")[1].lower()
        raw_name = os.path.splitext(file.filename or "file")[0]
        # Keep only alphanumeric and hyphen/underscore
        safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in raw_name).strip("_")
        if not safe_name:
            safe_name = "doc"
        
        clean_folder = folder.strip("/")
        object_key = f"{clean_folder}/{file_hash}_{safe_name[:40]}{file_ext}" if clean_folder else f"{file_hash}_{safe_name[:40]}{file_ext}"

        cfg = get_r2_config()

        # 🔍 DEDUPLICATION CHECK: Check if this identical file already exists in R2 bucket
        try:
            client.head_object(Bucket=cfg["bucket_name"], Key=object_key)
            # If head_object succeeds, the file already exists in R2!
            print(f"✨ [DEDUPLICATION] File already exists in Cloudflare R2: {object_key}. Skipping re-upload!")
            if cfg["public_url"]:
                return f"{cfg['public_url']}/{object_key}"
            return f"https://{cfg['bucket_name']}.r2.cloudflarestorage.com/{object_key}"
        except Exception:
            # File doesn't exist yet -> Proceed with fresh upload
            pass

        # Reset cursor to start
        file.file.seek(0)

        print(f"🚀 Uploading to Cloudflare R2: {object_key} (Type: {content_type})")
        client.upload_fileobj(
            file.file,
            cfg["bucket_name"],
            object_key,
            ExtraArgs={
                "ContentType": content_type,
            }
        )

        # Build public URL
        if cfg["public_url"]:
            public_url = f"{cfg['public_url']}/{object_key}"
        else:
            public_url = f"https://{cfg['bucket_name']}.r2.cloudflarestorage.com/{object_key}"

        print(f"✅ R2 Upload Success: {public_url}")
        return public_url

    except Exception as e:
        print(f"❌ Cloudflare R2 Upload Error: {e}")
        return None


def delete_from_r2(url_or_key: str) -> bool:
    """
    Deletes an object from Cloudflare R2 bucket.
    Accepts full public URL or object key.
    """
    if not url_or_key or not is_r2_configured():
        return False

    client = get_r2_client()
    if not client:
        return False

    try:
        cfg = get_r2_config()
        # Extract object key from URL if full URL is passed
        if "://" in url_or_key:
            import urllib.parse
            parsed = urllib.parse.urlparse(url_or_key)
            object_key = parsed.path.lstrip("/")
        else:
            object_key = url_or_key.lstrip("/")

        if not object_key:
            return False

        print(f"🗑️ Deleting from Cloudflare R2: {object_key}")
        client.delete_object(Bucket=cfg["bucket_name"], Key=object_key)
        print(f"✅ R2 Delete Success: {object_key}")
        return True
    except Exception as e:
        print(f"⚠️ Cloudflare R2 Delete Error ({url_or_key}): {e}")
        return False
