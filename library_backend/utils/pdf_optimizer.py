import os
import io
import tempfile
from typing import Union, Tuple
from fastapi import UploadFile

# 100 MB Threshold in Bytes
MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024  # 104,857,600 bytes

def get_file_size(file_obj: Union[UploadFile, str, io.BytesIO]) -> int:
    """Returns size of the file object in bytes."""
    if isinstance(file_obj, str):
        if os.path.exists(file_obj):
            return os.path.getsize(file_obj)
        return 0
    elif isinstance(file_obj, UploadFile):
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


def compress_pdf_hd(input_path_or_bytes: Union[str, bytes, io.BytesIO], output_path: str) -> bool:
    """
    Compresses a PDF file while preserving crisp HD vector text and readable images.
    Returns True if compression succeeded.
    """
    try:
        from pypdf import PdfReader, PdfWriter

        reader = PdfReader(input_path_or_bytes)
        writer = PdfWriter()

        for page in reader.pages:
            page.compress_content_streams()  # Deflate content streams
            writer.add_page(page)

        # Compress duplicate streams, font subsets, and identical objects
        writer.compress_identical_objects(remove_identicals=True, remove_orphans=True)

        with open(output_path, "wb") as f_out:
            writer.write(f_out)

        return True
    except Exception as e:
        print(f"⚠️ PDF Compression warning: {e}")
        return False


def optimize_pdf_file(upload_file: UploadFile) -> Tuple[UploadFile, bool, int, int]:
    """
    Checks if PDF is > 100 MB.
    - If <= 100 MB: Returns original upload_file untouched (0% compression, 100% HD original).
    - If > 100 MB: Compresses PDF cleanly to reduce file size while maintaining HD readability.
    
    Returns: (optimized_upload_file, was_compressed, original_size, final_size)
    """
    if not upload_file or not upload_file.filename:
        return upload_file, False, 0, 0

    ext = os.path.splitext(upload_file.filename)[1].lower()
    if ext != ".pdf":
        return upload_file, False, 0, 0

    original_size = get_file_size(upload_file)
    print(f"📄 [PDF CHECK] Filename: '{upload_file.filename}' | Size: {original_size / (1024*1024):.2f} MB")

    # RULE 1: If <= 100 MB, DO NOT COMPRESS AT ALL (Preserve 100% untouched original)
    if original_size <= MAX_UNCOMPRESSED_SIZE:
        print(f"✅ [PDF PASS] File is <= 100 MB ({original_size / (1024*1024):.2f} MB). Preserving 100% original HD quality.")
        upload_file.file.seek(0)
        return upload_file, False, original_size, original_size

    # RULE 2: If > 100 MB, Perform Smart HD Compression
    print(f"⚡ [PDF COMPRESS] File size ({original_size / (1024*1024):.2f} MB) exceeds 100 MB threshold. Running Smart HD Compression...")

    temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    temp_output = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    temp_input.close()
    temp_output.close()

    try:
        upload_file.file.seek(0)
        with open(temp_input.name, "wb") as f_in:
            while chunk := upload_file.file.read(1024 * 1024):
                f_in.write(chunk)

        success = compress_pdf_hd(temp_input.name, temp_output.name)
        if success and os.path.exists(temp_output.name):
            compressed_size = os.path.getsize(temp_output.name)
            print(f"📊 [PDF COMPRESSED] Original: {original_size / (1024*1024):.2f} MB -> Compressed: {compressed_size / (1024*1024):.2f} MB")

            if compressed_size < original_size:
                # Replace UploadFile with the compressed temp file
                compressed_file_obj = open(temp_output.name, "rb")
                new_upload_file = UploadFile(
                    filename=upload_file.filename,
                    file=compressed_file_obj,
                    headers=upload_file.headers
                )
                return new_upload_file, True, original_size, compressed_size

        print("⚠️ Compression did not reduce file size or failed. Falling back to original file.")
        upload_file.file.seek(0)
        return upload_file, False, original_size, original_size

    except Exception as e:
        print(f"❌ Error during PDF optimization: {e}. Falling back to original.")
        upload_file.file.seek(0)
        return upload_file, False, original_size, original_size
    finally:
        if os.path.exists(temp_input.name):
            try:
                os.remove(temp_input.name)
            except Exception:
                pass
