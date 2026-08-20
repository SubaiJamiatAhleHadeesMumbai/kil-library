from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import DonationInfo
from schemas import DonationInfoResponse

# ✅ Cloudinary Helper Import
from utils.cloudinary_helper import upload_to_cloudinary

router = APIRouter(
    prefix="/donation",  # ✅ Fixed: main.py ka api_router pehle se /api laga raha hai
    tags=["Donation"]
)

# ============================================================
# 1. GET Donation Info (Public)
# ============================================================
@router.get("/", response_model=DonationInfoResponse)
def get_donation_details(db: Session = Depends(get_db)):
    info = db.query(DonationInfo).first()
    
    # Agar record nahi hai, to naya bana dein (Empty) taaki frontend 404 na mare
    if not info:
        info = DonationInfo()
        db.add(info)
        db.commit()
        db.refresh(info)
        
    return info

# ============================================================
# 2. UPDATE Donation Info (Admin Panel - Cloudinary Support)
# ============================================================
@router.put("/update/")
def update_donation_details(
    # --- Desktop Files ---
    qr_code_desktop: UploadFile = File(None),
    appeal_desktop: UploadFile = File(None),
    bank_desktop: UploadFile = File(None),
    
    # --- Mobile Files ---
    qr_code_mobile: UploadFile = File(None),
    appeal_mobile: UploadFile = File(None),
    bank_mobile: UploadFile = File(None),
    
    db: Session = Depends(get_db)
):
    # 1. Database se record nikalein
    info = db.query(DonationInfo).first()
    if not info:
        info = DonationInfo()
        db.add(info)

    # 2. Optimized File Processing Map
    # Isse humein har file ke liye alag se 'if' likhne ki zaroorat nahi
    files_map = {
        "qr_code_desktop": qr_code_desktop,
        "qr_code_mobile": qr_code_mobile,
        "appeal_desktop": appeal_desktop,
        "appeal_mobile": appeal_mobile,
        "bank_desktop": bank_desktop,
        "bank_mobile": bank_mobile
    }

    updates_made = False

    for field_name, file_obj in files_map.items():
        if file_obj and file_obj.filename:
            try:
                print(f"🚀 Uploading {field_name}: {file_obj.filename} to Cloudinary...")
                url = upload_to_cloudinary(file_obj, folder="library_donations")
                
                if url:
                    # Dynamically attribute set karein (e.g., info.qr_code_desktop = url)
                    setattr(info, field_name, url)
                    updates_made = True
            except Exception as e:
                print(f"❌ Error uploading {field_name}: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to upload {field_name}")

    # 3. Save to Database only if changes occurred
    if updates_made:
        db.commit()
        db.refresh(info)
        return {"status": "success", "message": "Donation details updated successfully!", "data": info}
    
    return {"status": "no_change", "message": "No new files provided for update."}