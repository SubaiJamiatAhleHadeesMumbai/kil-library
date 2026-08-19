import cloudinary
import cloudinary.uploader
import os
import shutil
from dotenv import load_dotenv
from fastapi import UploadFile

# 1. Load Configuration
load_dotenv()

cloudinary.config( 
  cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"), 
  api_key = os.getenv("CLOUDINARY_API_KEY"), 
  api_secret = os.getenv("CLOUDINARY_API_SECRET"),
  secure = True
)

def upload_to_cloudinary(file: UploadFile, folder: str = "library_uploads", resource_type: str = "auto"):
    """
    Uploads files to Cloudinary with Smart Type Detection.
    
    Features:
    - Auto-detects PDFs, Docs, Text files and forces 'raw' mode (Crucial for retrieval).
    - Uses 'upload_large' (Chunking) for stability on big files.
    - Handles cleanup automatically.
    """
    if not file:
        return None
    
    # 2. Temporary Filename
    temp_filename = f"temp_{file.filename}"
    
    try:
        print(f"🚀 PROCESSING: {file.filename}")

        # 3. Save to Disk (Buffer Safety)
        # Reset cursor to beginning just in case
        file.file.seek(0)
        
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 4. Check File Size
        file_size = os.path.getsize(temp_filename)
        print(f"📊 Size: {file_size / (1024*1024):.2f} MB")

        # 5. SMART RESOURCE TYPE LOGIC (The "Best-in-Class" Part)
        # Cloudinary 'auto' sometimes fails for raw text/docs. We force 'raw' for specific extensions.
        
        filename_lower = file.filename.lower()
        
        # Extensions that MUST be treated as 'raw' to preserve content structure
        raw_extensions = [
            ".pdf", ".txt", ".docx", ".doc", ".epub", ".md", ".csv", ".json", ".xml"
        ]
        
        final_res_type = resource_type

        # Logic: Agar user ne 'auto' bheja hai, to hum check karenge
        if resource_type == "auto":
            if any(filename_lower.endswith(ext) for ext in raw_extensions):
                final_res_type = "raw"
                print(f"📄 Document/Text Detected ({filename_lower}) -> Forcing 'raw' mode.")
            elif file_size > 10 * 1024 * 1024: # > 10MB
                final_res_type = "raw" # Large files often safer as raw
                print("⚠️ Large File (>10MB) -> Forcing 'raw' mode for chunking stability.")
            else:
                final_res_type = "auto" # Let Cloudinary decide (Images/Videos)

        print(f"📤 UPLOADING CHUNKS (Mode: {final_res_type})...")

        # 6. Upload (Chunked)
        response = cloudinary.uploader.upload_large(
            temp_filename, 
            folder=folder,
            resource_type=final_res_type, # ✅ Corrected Mode
            chunk_size=5 * 1024 * 1024    # 5MB Chunks (Best balance)
        )
        
        secure_url = response.get("secure_url")
        print(f"✅ UPLOAD SUCCESS: {secure_url}")
        return secure_url

    except Exception as e:
        print(f"❌ Cloudinary Upload Error: {str(e)}")
        return None
        
    finally:
        # 7. Cleanup (Always run)
        if os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
                print("🧹 Temp file cleaned")
            except Exception as cleanup_err:
                print(f"⚠️ Warning: Could not delete temp file: {cleanup_err}")