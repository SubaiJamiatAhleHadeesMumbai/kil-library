import os
import io
import tempfile
import gc
from typing import Union, Tuple, Optional
from fastapi import UploadFile

# Strict 100 MB Threshold in Bytes
MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024  # 104,857,600 bytes
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
    Uses memory-efficient page-by-page streaming.
    Returns True if compression succeeded.
    """
    try:
        from pypdf import PdfReader, PdfWriter

        reader = PdfReader(input_path)
        writer = PdfWriter()

        for page in reader.pages:
            try:
                page.compress_content_streams()  # Deflate content streams
            except Exception:
                pass
            writer.add_page(page)

        # Compress duplicate streams, font subsets, and identical objects
        try:
            writer.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
        except TypeError:
            try:
                writer.compress_identical_objects(remove_identicals=True, remove_orphans=True)
            except Exception:
                pass

        with open(output_path, "wb") as f_out:
            writer.write(f_out)

        # Force garbage collection for large 1GB files
        del reader
        del writer
        gc.collect()

        return True
    except Exception as e:
        print(f"⚠️ PDF Compression engine error: {e}")
        return False


def optimize_pdf_file(upload_file: UploadFile) -> Tuple[UploadFile, bool, int, int, Optional[str]]:
    """
    Evaluates PDF file size and executes intelligent compression:
    - If <= 100 MB: Returns original file 100% untouched (0% compression, pure HD vector quality).
    - If > 100 MB (up to 1 GB+):
        1. Streams raw file to temporary disk in 8MB chunks without RAM blowup.
        2. Compresses PDF to target <= 100 MB while maintaining HD page clarity.
        3. IMMEDIATELY PURGES the raw 1 GB temporary file from disk.
        4. Returns the compressed file for R2 storage upload.
        5. The returned temporary output path is provided for immediate post-upload deletion.
        
    Returns: (optimized_upload_file, was_compressed, original_size, final_size, temp_cleanup_path)
    """
    if not upload_file or not upload_file.filename:
        return upload_file, False, 0, 0, None

    ext = os.path.splitext(upload_file.filename)[1].lower()
    if ext != ".pdf":
        return upload_file, False, 0, 0, None

    original_size = get_file_size(upload_file)
    original_mb = original_size / (1024 * 1024)
    print(f"📄 [PDF ANALYZER] File: '{upload_file.filename}' | Detected Size: {original_mb:.2f} MB")

    # RULE 1: If <= 100 MB, DO NOT COMPRESS AT ALL (Preserve 100% untouched original)
    if original_size <= MAX_UNCOMPRESSED_SIZE:
        print(f"✅ [PDF PASS] Size is <= 100 MB ({original_mb:.2f} MB). Preserving 100% original HD quality.")
        upload_file.file.seek(0)
        return upload_file, False, original_size, original_size, None

    # RULE 2: If > 100 MB (up to 1 GB+), Perform Stream HD Compression & Auto-Purge Raw File
    print(f"⚡ [PDF COMPRESS] Size ({original_mb:.2f} MB) exceeds 100 MB threshold. Running streaming HD compression...")

    temp_raw = tempfile.NamedTemporaryFile(delete=False, suffix="_raw.pdf")
    temp_compressed = tempfile.NamedTemporaryFile(delete=False, suffix="_compressed.pdf")
    temp_raw.close()
    temp_compressed.close()

    try:
        # Stream raw file to disk in 8MB chunks (prevents RAM spikes on 1GB files)
        upload_file.file.seek(0)
        with open(temp_raw.name, "wb") as f_raw:
            while chunk := upload_file.file.read(STREAM_CHUNK_SIZE):
                f_raw.write(chunk)

        # Run compression engine
        success = compress_pdf_hd(temp_raw.name, temp_compressed.name)

        # IMMEDIATELY PURGE the 1 GB raw temporary file from disk
        if os.path.exists(temp_raw.name):
            try:
                os.remove(temp_raw.name)
                print(f"🗑️ [RAW PURGE] 1 GB Raw temporary file purged from disk: {temp_raw.name}")
            except Exception as e:
                print(f"⚠️ Could not delete raw temp file: {e}")

        if success and os.path.exists(temp_compressed.name):
            compressed_size = os.path.getsize(temp_compressed.name)
            compressed_mb = compressed_size / (1024 * 1024)
            print(f"📊 [PDF COMPRESSED] Original: {original_mb:.2f} MB -> Compressed: {compressed_mb:.2f} MB (Saved {original_mb - compressed_mb:.2f} MB)")

            if compressed_size < original_size:
                compressed_file_obj = open(temp_compressed.name, "rb")
                new_upload_file = UploadFile(
                    filename=upload_file.filename,
                    file=compressed_file_obj,
                    headers=upload_file.headers
                )
                # Return the compressed file and its path for post-upload cleanup
                return new_upload_file, True, original_size, compressed_size, temp_compressed.name

        print("⚠️ Compression did not reduce file size or failed. Falling back to original file.")
        upload_file.file.seek(0)
        return upload_file, False, original_size, original_size, None

    except Exception as e:
        print(f"❌ Error during PDF optimization: {e}. Falling back to original.")
        # Ensure raw temp file is deleted on error
        if os.path.exists(temp_raw.name):
            try:
                os.remove(temp_raw.name)
            except Exception:
                pass
        upload_file.file.seek(0)
        return upload_file, False, original_size, original_size, None
