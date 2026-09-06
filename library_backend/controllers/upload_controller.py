import os
import shutil
import tempfile
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Form
from auth import require_permission
from utils.cloudinary_helper import upload_to_cloudinary
from utils.file_validator import validate_image, validate_pdf
from utils.storage_helper import smart_upload
from utils.pdf_optimizer import optimize_pdf_file

router = APIRouter()

# --- 1. IMAGE UPLOAD ---
@router.post("/image", dependencies=[Depends(require_permission("FILE_UPLOAD", "HOMEPAGE_CONTENT_MANAGE", "HOMEPAGE_BRANDING_MANAGE", "BOOK_MANAGE"))])
async def upload_image(file: UploadFile = File(...)):
    await validate_image(file)
    url = smart_upload(file, folder="booknest/branding", resource_type="image")
    if not url:
        raise HTTPException(status_code=500, detail="Image upload failed on server.")
    return {"url": url}


# --- 2. PDF UPLOAD ---
@router.post("/pdf", dependencies=[Depends(require_permission("FILE_UPLOAD"))])
async def upload_pdf(file: UploadFile = File(...)):
    await validate_pdf(file)
    url = smart_upload(file, folder="booknest/pdfs")
    if not url:
        raise HTTPException(status_code=500, detail="PDF upload failed on server.")
    return {"url": url}


# --- 3. CHUNKED UPLOAD (For 100MB to 1GB+ Large PDFs - Zero 413 Errors) ---
@router.post("/chunk", dependencies=[Depends(require_permission("FILE_UPLOAD"))])
async def upload_chunk(
    chunk: UploadFile = File(...),
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...)
):
    """
    Receives a single 15MB piece of a large file.
    Stores chunks temporarily on disk for reassembly.
    """
    try:
        # Sanitize upload_id
        safe_id = "".join(c for c in upload_id if c.isalnum() or c in "-_")
        chunk_dir = os.path.join(tempfile.gettempdir(), f"kil_chunks_{safe_id}")
        os.makedirs(chunk_dir, exist_ok=True)

        chunk_path = os.path.join(chunk_dir, f"chunk_{chunk_index:05d}.part")
        with open(chunk_path, "wb") as f:
            while data := await chunk.read(1024 * 1024):
                f.write(data)

        return {
            "status": "ok",
            "chunk_index": chunk_index,
            "total_chunks": total_chunks,
            "upload_id": safe_id
        }
    except Exception as e:
        print(f"❌ Error saving chunk {chunk_index}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save chunk {chunk_index}: {str(e)}")


# --- 4. CHUNKED UPLOAD COMPLETE (Assemble, Compress <=100MB, Upload R2 & Purge Raw) ---
@router.post("/chunk/complete", dependencies=[Depends(require_permission("FILE_UPLOAD"))])
async def complete_chunk_upload(
    upload_id: str = Form(...),
    filename: str = Form(...),
    folder: str = Form("booknest/pdfs")
):
    """
    Reassembles all chunks into a complete PDF,
    compresses to <= 100MB if necessary,
    uploads directly to Cloudflare R2 / Storage,
    and PURGES all temporary raw chunks from disk immediately.
    """
    safe_id = "".join(c for c in upload_id if c.isalnum() or c in "-_")
    chunk_dir = os.path.join(tempfile.gettempdir(), f"kil_chunks_{safe_id}")

    if not os.path.exists(chunk_dir):
        raise HTTPException(status_code=404, detail="Upload session not found or expired.")

    temp_assembled = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    temp_assembled.close()

    try:
        # 1. Reassemble chunks in exact numeric order
        chunk_files = sorted(os.listdir(chunk_dir))
        if not chunk_files:
            raise HTTPException(status_code=400, detail="No chunks found for upload.")

        with open(temp_assembled.name, "wb") as f_out:
            for c_file in chunk_files:
                c_path = os.path.join(chunk_dir, c_file)
                with open(c_path, "rb") as f_in:
                    shutil.copyfileobj(f_in, f_out)

        # 2. IMMEDIATELY purge chunk pieces folder
        shutil.rmtree(chunk_dir, ignore_errors=True)
        print(f"🗑️ [PURGED] Raw chunk pieces purged: {chunk_dir}")

        # 3. Create UploadFile wrapper for smart_upload
        with open(temp_assembled.name, "rb") as f_assembled:
            upload_file_obj = UploadFile(
                filename=filename,
                file=f_assembled,
            )

            # 4. smart_upload executes conditional HD compression (<= 100MB target) & R2 upload
            url = smart_upload(upload_file_obj, folder=folder)

        if not url:
            raise HTTPException(status_code=500, detail="Failed to store reassembled PDF on cloud storage.")

        return {
            "url": url,
            "filename": filename,
            "status": "success"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error completing chunk upload: {e}")
        raise HTTPException(status_code=500, detail=f"Reassembly and storage failed: {str(e)}")
    finally:
        # 5. Clean up temporary assembled raw file
        if os.path.exists(temp_assembled.name):
            try:
                os.remove(temp_assembled.name)
                print(f"🗑️ [PURGED] Temporary assembled raw file removed: {temp_assembled.name}")
            except Exception:
                pass
        # Clean up chunk dir if still exists
        if os.path.exists(chunk_dir):
            shutil.rmtree(chunk_dir, ignore_errors=True)
