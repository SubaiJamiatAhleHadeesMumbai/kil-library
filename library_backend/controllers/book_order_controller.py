import os
import uuid
import mimetypes
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from database import get_db
from models import book_model, user_model, book_order_model
from schemas import book_order_schema
from auth import require_permission, get_current_user_optional, get_current_user
from utils.local_helper import resolve_upload_path
from utils import create_log

router = APIRouter(prefix="/book-orders", tags=["Book Orders & Paid Downloads"])


# ==============================================================================
# 0. PUBLIC: Get Payment Details for a Book
# ==============================================================================
@router.get("/book/{book_id}/payment-info")
def get_book_payment_info(book_id: int, db: Session = Depends(get_db)):
    book = db.query(book_model.Book).filter(
        book_model.Book.id == book_id,
        book_model.Book.deleted_at.is_(None)
    ).first()

    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")

    from controllers.settings_controller import _load_settings_from_disk
    settings = _load_settings_from_disk()
    paid_settings = settings.get("paid_downloads", {})
    master_enabled = paid_settings.get("master_enabled", True)

    if not master_enabled:
        is_paid = False
        price = 0.0
    else:
        is_paid = bool(book.is_download_paid) or bool(paid_settings.get("global_enabled", False))
        price = float(book.download_price or 0.0) if book.is_download_paid else float(paid_settings.get("default_price", 49.0))
    upi_id = book.download_upi_id or paid_settings.get("upi_id") or "kokanislamiclibrary@upi"
    qr_image_url = paid_settings.get("qr_image_url") or ""

    return {
        "book_id": book.id,
        "title": book.title,
        "cover_image_url": book.cover_image_url,
        "is_download_paid": is_paid,
        "master_enabled": master_enabled,
        "price": price,
        "upi_id": upi_id,
        "qr_image_url": qr_image_url,
        "instructions": paid_settings.get("instructions", "Scan QR code or use UPI ID to pay. Enter UTR reference to verify and download.")
    }


# ==============================================================================
# 1. PUBLIC: Create Purchase / Download Request
# ==============================================================================
@router.post("/create", response_model=book_order_schema.BookOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_book_order(
    payload: book_order_schema.BookOrderCreate,
    db: Session = Depends(get_db),
    current_user: Optional[user_model.User] = Depends(get_current_user_optional)
):
    # Verify book exists
    book = db.query(book_model.Book).filter(
        book_model.Book.id == payload.book_id,
        book_model.Book.deleted_at.is_(None)
    ).first()

    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")

    if not book.pdf_url and not book.txt_file_url:
        raise HTTPException(status_code=400, detail="This book does not have an attached digital file for download.")

    from controllers.settings_controller import _load_settings_from_disk
    settings = _load_settings_from_disk()
    paid_settings = settings.get("paid_downloads", {})
    master_enabled = paid_settings.get("master_enabled", True)

    # Determine amount
    if not master_enabled:
        amount = 0.0
    else:
        amount = float(book.download_price or 0.0) if book.is_download_paid else 0.0

    # Unique human-readable order code
    order_code = f"KIL-{uuid.uuid4().hex[:8].upper()}"

    # Auto-approve if price is 0 (Free book download order)
    # SECURITY: Never auto-approve restricted books - they always need admin review
    is_free = (amount <= 0.0)
    is_restricted = getattr(book, 'is_restricted', False)
    initial_status = "APPROVED" if (is_free and not is_restricted) else "PENDING"
    download_token = str(uuid.uuid4()) if (is_free and not is_restricted) else None
    expires_at = (datetime.utcnow() + timedelta(hours=48)) if (is_free and not is_restricted) else None

    order = book_order_model.BookDownloadOrder(
        order_code=order_code,
        book_id=book.id,
        user_id=current_user.id if current_user else None,
        buyer_name=payload.buyer_name.strip(),
        buyer_email=payload.buyer_email.strip().lower(),
        buyer_phone=payload.buyer_phone.strip() if payload.buyer_phone else None,
        amount=amount,
        payment_method="UPI_MANUAL",
        transaction_ref=payload.transaction_ref.strip() if payload.transaction_ref else None,
        screenshot_url=payload.screenshot_url,
        notes=payload.notes,
        status=initial_status,
        download_token=download_token,
        download_expires_at=expires_at,
        download_count=0,
        max_downloads=5
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    # Attach display metadata
    resp = book_order_schema.BookOrderResponse.model_validate(order)
    resp.book_title = book.title
    resp.cover_image_url = book.cover_image_url
    return resp


# ==============================================================================
# 2. PUBLIC: Check Order Status / Retrieve Download Token
# ==============================================================================
@router.get("/verify/{order_code}", response_model=book_order_schema.BookOrderResponse)
def verify_order_status(order_code: str, db: Session = Depends(get_db)):
    order = db.query(book_order_model.BookDownloadOrder).options(
        joinedload(book_order_model.BookDownloadOrder.book)
    ).filter(
        book_order_model.BookDownloadOrder.order_code == order_code.strip().upper()
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order reference not found.")

    resp = book_order_schema.BookOrderResponse.model_validate(order)
    if order.book:
        resp.book_title = order.book.title
        resp.cover_image_url = order.book.cover_image_url
    return resp


# ==============================================================================
# 3. ADMIN: List Orders
# ==============================================================================
@router.get("/admin/list", response_model=List[book_order_schema.BookOrderResponse])
def list_book_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("BOOK_MANAGE"))
):
    query = db.query(book_order_model.BookDownloadOrder).options(
        joinedload(book_order_model.BookDownloadOrder.book)
    )

    if status_filter and status_filter.upper() in ["PENDING", "APPROVED", "REJECTED"]:
        query = query.filter(book_order_model.BookDownloadOrder.status == status_filter.upper())

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (book_order_model.BookDownloadOrder.buyer_name.ilike(s)) |
            (book_order_model.BookDownloadOrder.buyer_email.ilike(s)) |
            (book_order_model.BookDownloadOrder.transaction_ref.ilike(s)) |
            (book_order_model.BookDownloadOrder.order_code.ilike(s))
        )

    orders = query.order_by(desc(book_order_model.BookDownloadOrder.created_at)).offset(offset).limit(limit).all()

    result = []
    for o in orders:
        item = book_order_schema.BookOrderResponse.model_validate(o)
        if o.book:
            item.book_title = o.book.title
            item.cover_image_url = o.book.cover_image_url
        result.append(item)
    return result


# ==============================================================================
# 4. ADMIN: Approve / Reject Order (Generates Download Token)
# ==============================================================================
@router.put("/admin/{order_id}/status", response_model=book_order_schema.BookOrderResponse)
def update_order_status(
    order_id: int,
    approval: book_order_schema.BookOrderApproval,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("BOOK_MANAGE"))
):
    order = db.query(book_order_model.BookDownloadOrder).options(
        joinedload(book_order_model.BookDownloadOrder.book)
    ).filter(book_order_model.BookDownloadOrder.id == order_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    new_status = approval.status.upper()
    order.status = new_status
    order.admin_remarks = approval.admin_remarks
    order.reviewed_by_id = current_user.id
    order.reviewed_at = datetime.utcnow()

    if new_status == "APPROVED":
        # Generate or retain secure download token
        if not order.download_token:
            order.download_token = str(uuid.uuid4())
        hours = approval.expiry_hours or 48
        order.download_expires_at = datetime.utcnow() + timedelta(hours=hours)
        order.max_downloads = approval.max_downloads or 5
        order.download_count = 0  # reset for freshly approved order
    elif new_status == "REJECTED":
        order.download_token = None
        order.download_expires_at = None

    create_log(
        db=db, user=current_user, action_type="BOOK_ORDER_STATUS",
        description=f"Order {order.order_code} marked as {new_status}.",
        target_type="BookDownloadOrder", target_id=order.id
    )

    db.commit()
    db.refresh(order)

    resp = book_order_schema.BookOrderResponse.model_validate(order)
    if order.book:
        resp.book_title = order.book.title
        resp.cover_image_url = order.book.cover_image_url
    return resp


# ==============================================================================
# 5. ADMIN: Resend / Re-extend Download Link
# ==============================================================================
@router.post("/admin/{order_id}/resend-link", response_model=book_order_schema.BookOrderResponse)
def resend_order_link(
    order_id: int,
    additional_hours: int = Query(48, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("BOOK_MANAGE"))
):
    order = db.query(book_order_model.BookDownloadOrder).options(
        joinedload(book_order_model.BookDownloadOrder.book)
    ).filter(book_order_model.BookDownloadOrder.id == order_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if not order.download_token:
        order.download_token = str(uuid.uuid4())

    order.status = "APPROVED"
    order.download_expires_at = datetime.utcnow() + timedelta(hours=additional_hours)
    order.download_count = 0  # reset count on admin resend

    create_log(
        db=db, user=current_user, action_type="BOOK_ORDER_RESEND",
        description=f"Refreshed download link for Order {order.order_code}.",
        target_type="BookDownloadOrder", target_id=order.id
    )

    db.commit()
    db.refresh(order)

    resp = book_order_schema.BookOrderResponse.model_validate(order)
    if order.book:
        resp.book_title = order.book.title
        resp.cover_image_url = order.book.cover_image_url
    return resp


# ==============================================================================
# 6. SECURE STREAM ENDPOINT (Token-based, single-use/expiring download)
# ==============================================================================
@router.get("/download/{download_token}", tags=["Book Download Delivery"])
async def download_book_with_token(
    download_token: str,
    db: Session = Depends(get_db)
):
    """
    Validates the download token, verifies expiry & max count, and streams the PDF as attachment.
    """
    clean_token = download_token.strip()
    order = db.query(book_order_model.BookDownloadOrder).options(
        joinedload(book_order_model.BookDownloadOrder.book)
    ).filter(
        book_order_model.BookDownloadOrder.download_token == clean_token
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Invalid or non-existent download link.")

    if order.status != "APPROVED":
        raise HTTPException(status_code=403, detail="This download order is not approved.")

    if order.download_expires_at and datetime.utcnow() > order.download_expires_at:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This download link has expired. Please contact library support to resend your link."
        )

    if order.download_count >= order.max_downloads:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Maximum download limit ({order.max_downloads} downloads) reached. Please contact library support."
        )

    book = order.book
    if not book or not book.pdf_url:
        raise HTTPException(status_code=404, detail="Book document file not found.")

    # Increment download count
    order.download_count += 1
    db.commit()

    raw_url = str(book.pdf_url).strip()
    safe_title = "".join(c for c in book.title if c.isalnum() or c in (' ', '_', '-')).strip()
    safe_filename = f"{safe_title or f'book_{book.id}'}.pdf"

    # Local file delivery
    if not raw_url.startswith("http://") and not raw_url.startswith("https://"):
        local_path = resolve_upload_path(raw_url)
        if local_path and os.path.exists(local_path):
            return FileResponse(
                path=local_path,
                media_type="application/pdf",
                filename=safe_filename,
                headers={
                    "Content-Disposition": f'attachment; filename="{safe_filename}"',
                    "Cache-Control": "private, no-cache, no-store, must-revalidate"
                }
            )
        else:
            raise HTTPException(status_code=404, detail="Local PDF file not found.")

    # Remote Cloudflare R2 / CDN delivery
    try:
        parsed = urllib.parse.urlsplit(raw_url)
        quoted_path = urllib.parse.quote(parsed.path)
        encoded_url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, quoted_path, parsed.query, parsed.fragment))

        req = urllib.request.Request(encoded_url, headers={"User-Agent": "KIL-Library/1.0"})
        remote_resp = urllib.request.urlopen(req, timeout=30)

        def file_stream_generator(resp):
            try:
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    yield chunk
            finally:
                resp.close()

        return StreamingResponse(
            file_stream_generator(remote_resp),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_filename}"',
                "Cache-Control": "private, no-cache, no-store, must-revalidate"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Unable to fetch PDF file: {str(e)}")


# ==============================================================================
# 7. ADMIN: Master Paid Download Toggle (1-Click Global Switch)
# ==============================================================================
@router.get("/admin/master-toggle")
async def get_master_toggle():
    from controllers.settings_controller import _load_settings_from_disk
    settings = _load_settings_from_disk()
    paid_settings = settings.get("paid_downloads", {})
    return {
        "master_enabled": paid_settings.get("master_enabled", True)
    }


@router.post("/admin/master-toggle")
async def set_master_toggle(
    payload: dict,
    current_user: user_model.User = Depends(get_current_user)
):
    from controllers.settings_controller import _load_settings_from_disk, _write_settings_to_disk
    settings = _load_settings_from_disk()
    if "paid_downloads" not in settings:
        settings["paid_downloads"] = {}

    master_val = bool(payload.get("master_enabled", True))
    settings["paid_downloads"]["master_enabled"] = master_val
    _write_settings_to_disk(settings)

    return {
        "master_enabled": master_val,
        "message": f"Global Paid Download feature is now {'ACTIVATED (Charges applied)' if master_val else 'DEACTIVATED (100% Free Downloads everywhere)'}."
    }


# ==============================================================================
# 8. ADMIN: Payment Settings & Custom QR Code
# ==============================================================================
@router.get("/admin/payment-settings")
async def get_payment_settings(current_user: user_model.User = Depends(get_current_user)):
    from controllers.settings_controller import _load_settings_from_disk
    settings = _load_settings_from_disk()
    paid_settings = settings.get("paid_downloads", {})
    return {
        "master_enabled": paid_settings.get("master_enabled", True),
        "default_upi_id": paid_settings.get("default_upi_id", "kokanislamiclibrary@upi"),
        "default_price": paid_settings.get("default_price", 49),
        "qr_image_url": paid_settings.get("qr_image_url", ""),
        "instructions": paid_settings.get("instructions", "Scan QR code or use UPI ID to pay. Enter UTR reference to verify and download.")
    }


@router.post("/admin/payment-settings")
async def update_payment_settings(
    payload: dict,
    current_user: user_model.User = Depends(require_permission("BOOK_MANAGE"))
):
    from controllers.settings_controller import _load_settings_from_disk, _write_settings_to_disk
    settings = _load_settings_from_disk()
    if "paid_downloads" not in settings:
        settings["paid_downloads"] = {}

    if "default_upi_id" in payload:
        settings["paid_downloads"]["default_upi_id"] = str(payload["default_upi_id"]).strip()
    if "default_price" in payload:
        try:
            settings["paid_downloads"]["default_price"] = float(payload["default_price"])
        except (ValueError, TypeError):
            pass
    if "qr_image_url" in payload:
        settings["paid_downloads"]["qr_image_url"] = str(payload["qr_image_url"]).strip()
    if "instructions" in payload:
        settings["paid_downloads"]["instructions"] = str(payload["instructions"]).strip()

    _write_settings_to_disk(settings)
    return {
        "message": "Payment settings updated successfully.",
        "settings": settings["paid_downloads"]
    }


@router.post("/admin/upload-qr")
async def upload_qr_code(
    file: UploadFile = File(...),
    current_user: user_model.User = Depends(require_permission("BOOK_MANAGE"))
):
    from utils.storage_helper import smart_upload
    from controllers.settings_controller import _load_settings_from_disk, _write_settings_to_disk
    
    url = smart_upload(file, folder="booknest/qr_codes", resource_type="image")
    if not url:
        raise HTTPException(status_code=500, detail="Failed to upload QR code image.")

    settings = _load_settings_from_disk()
    if "paid_downloads" not in settings:
        settings["paid_downloads"] = {}
    settings["paid_downloads"]["qr_image_url"] = url
    _write_settings_to_disk(settings)

    return {
        "message": "QR Code image uploaded successfully.",
        "qr_image_url": url
    }


