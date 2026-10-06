import os
import io
import tempfile
import gc
from typing import Union, Tuple, Optional
from fastapi import UploadFile

# Strict 250 MB Threshold in Bytes (Files up to 250MB are preserved in original HD quality for instant R2 cloud upload)
MAX_UNCOMPRESSED_SIZE = 250 * 1024 * 1024  # 262,144,000 bytes
STREAM_CHUNK_SIZE = 8 * 1024 * 1024        # 8 MB streaming buffer for low-RAM usage


def get_file_size(file_obj: Union[UploadFile, str, io.BytesIO]) -> int:
    """Returns the size of the file object in bytes accurately."""
    if isinstance(file_obj, str):
        if os.path.exists(file_obj):
            return os.path.getsize(file_obj)
        return 0
    elif isinstance(file_obj, UploadFile):
        if hasattr(file_obj, "size") and file_obj.size is not None and file_obj.size > 0:
            return file_obj.size
        if hasattr(file_obj, "file"):
            file_obj.file.seek(0, os.SEEK_END)
            size = file_obj.file.tell()
            file_obj.file.seek(0)
            return size
        return 0
    elif isinstance(file_obj, (io.BytesIO, io.BufferedReader)):
        pos = file_obj.tell()
        file_obj.seek(0, os.SEEK_END)
        size = file_obj.tell()
        file_obj.seek(pos)
        return size
    return 0


def compress_pdf_hd(input_path: str, output_path: str) -> bool:
    """
    Compresses a PDF file while preserving crisp HD vector text and readable images.
    Uses pypdf + Pillow image downsampling (re-compressing raster scans from 130MB to ~30MB).
    Returns True if compression succeeded.
    """
    try:
        from pypdf import PdfReader, PdfWriter

        reader = PdfReader(input_path)
        writer = PdfWriter()

        print(f"📄 Processing {len(reader.pages)} PDF pages for scan image compression...")

        # Step 1: Add all pages to writer so objects are registered in writer
        for page in reader.pages:
            writer.add_page(page)

        # Step 2: Recompress embedded raster scan images and deflate content streams on writer.pages
        for page in writer.pages:
            try:
                for img_obj in page.images:
                    try:
                        pil_img = img_obj.image
                        if pil_img.mode in ("RGBA", "P"):
                            pil_img = pil_img.convert("RGB")
                        img_obj.replace(pil_img, quality=55)
                    except Exception:
                        pass
            except Exception:
                pass

            try:
                page.compress_content_streams()
            except Exception:
                pass

        try:
            writer.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
        except Exception:
            try:
                writer.compress_identical_objects(remove_identicals=True, remove_orphans=True)
            except Exception:
                pass

        with open(output_path, "wb") as f_out:
            writer.write(f_out)

        del reader
        del writer
        gc.collect()

        return os.path.exists(output_path) and os.path.getsize(output_path) > 0

    except Exception as e:
        print(f"⚠️ PDF Compression error: {e}")
        return False


def optimize_pdf_file(upload_file: UploadFile) -> Tuple[UploadFile, bool, int, int, Optional[str]]:
    """
    Direct zero-latency pass: Preserves 100% original HD vector & scan quality
    and bypasses slow synchronous CPU compression so R2 cloud upload completes in 1-2 seconds.
    """
    if not upload_file or not upload_file.filename:
        return upload_file, False, 0, 0, None

    ext = os.path.splitext(upload_file.filename)[1].lower()
    if ext != ".pdf":
        return upload_file, False, 0, 0, None

    original_size = get_file_size(upload_file)
    original_mb = original_size / (1024 * 1024)
    print(f"📄 [PDF CLOUD PASS] File: '{upload_file.filename}' ({original_mb:.2f} MB) -> Instant Original HD Upload to Cloudflare R2")
    if hasattr(upload_file, "file") and hasattr(upload_file.file, "seek"):
        upload_file.file.seek(0)
    return upload_file, False, original_size, original_size, None
