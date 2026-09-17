"""
Razorpay Online Payment Controller
===================================
Handles instant online payment for book downloads/access.
User pays via UPI (GPay, PhonePe, Paytm) or Card → Book unlocks immediately.
"""
import os
import uuid
import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, Field

from database import get_db
from models import book_model, user_model, book_order_model
from schemas import book_order_schema
from auth import get_current_user_optional, get_current_user
from utils import create_log

router = APIRouter(prefix="/payment", tags=["Online Payment (Razorpay)"])

# ---------------------------------------------------------------------------
# Razorpay Client (lazy init — graceful fallback if keys not set)
# ---------------------------------------------------------------------------
_razorpay_client = None

def _get_razorpay_client():
    global _razorpay_client
    if _razorpay_client is None:
        try:
            import razorpay
            key_id = os.getenv("RAZORPAY_KEY_ID", "")
            key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
            if not key_id or not key_secret:
                raise ValueError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env")
            _razorpay_client = razorpay.Client(auth=(key_id, key_secret))
        except Exception as e:
            print(f"⚠️ Razorpay init failed: {e}")
            raise HTTPException(
                status_code=503,
                detail="Payment gateway not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
            )
    return _razorpay_client


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class CreatePaymentOrderRequest(BaseModel):
    book_id: int
    buyer_name: str = Field(..., min_length=2, max_length=255)
    buyer_email: str = Field(..., min_length=5, max_length=255)
    buyer_phone: Optional[str] = Field(None, max_length=50)

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_code: str  # Our internal order code to match


# ---------------------------------------------------------------------------
# 1. Get Razorpay Key ID (public — needed by frontend checkout)
# ---------------------------------------------------------------------------
@router.get("/config")
def get_payment_config():
    """Returns the Razorpay Key ID for frontend checkout initialization."""
    key_id = os.getenv("RAZORPAY_KEY_ID", "")
    if not key_id:
        raise HTTPException(status_code=503, detail="Payment gateway not configured.")
    return {
        "key_id": key_id,
        "currency": "INR",
        "company_name": "Kokan Islamic Library",
    }


# ---------------------------------------------------------------------------
# 2. Create Razorpay Order (Frontend calls this before opening checkout)
# ---------------------------------------------------------------------------
@router.post("/create-order")
async def create_payment_order(
    payload: CreatePaymentOrderRequest,
    db: Session = Depends(get_db),
    current_user: Optional[user_model.User] = Depends(get_current_user_optional)
):
    """
    Creates a Razorpay order and a local BookDownloadOrder (PENDING).
    Returns the razorpay_order_id needed to open the checkout popup.
    """
    # 1. Validate book
    book = db.query(book_model.Book).filter(
        book_model.Book.id == payload.book_id,
        book_model.Book.deleted_at.is_(None)
    ).first()

    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")

    if not book.pdf_url and not book.txt_file_url:
        raise HTTPException(status_code=400, detail="This book has no digital file for download.")

    # 2. Determine price
    from controllers.settings_controller import _load_settings_from_disk
    settings = _load_settings_from_disk()
    paid_settings = settings.get("paid_downloads", {})
    master_enabled = paid_settings.get("master_enabled", True)

    if not master_enabled:
        raise HTTPException(status_code=400, detail="Paid downloads are currently disabled.")

    price = float(book.download_price or 0.0) if book.is_download_paid else float(paid_settings.get("default_price", 49.0))

    if price <= 0:
        raise HTTPException(status_code=400, detail="This book is free. No payment required.")

    # 3. Create Razorpay Order
    client = _get_razorpay_client()
    amount_paise = int(round(price * 100))  # Razorpay uses paise (₹49 = 4900 paise)

    rz_order = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"KIL-{uuid.uuid4().hex[:8].upper()}",
        "notes": {
            "book_id": str(book.id),
            "book_title": book.title[:100],
            "buyer_name": payload.buyer_name[:100],
            "buyer_email": payload.buyer_email[:100],
        }
    })

    # 4. Create local order record (status=PENDING, payment_method=RAZORPAY)
    order_code = rz_order["receipt"]
    local_order = book_order_model.BookDownloadOrder(
        order_code=order_code,
        book_id=book.id,
        user_id=current_user.id if current_user else None,
        buyer_name=payload.buyer_name.strip(),
        buyer_email=payload.buyer_email.strip().lower(),
        buyer_phone=payload.buyer_phone.strip() if payload.buyer_phone else None,
        amount=price,
        payment_method="RAZORPAY",
        transaction_ref=rz_order["id"],  # Store razorpay_order_id as ref
        status="PENDING",
        download_count=0,
        max_downloads=5,
    )

    db.add(local_order)
    db.commit()
    db.refresh(local_order)

    return {
        "razorpay_order_id": rz_order["id"],
        "razorpay_key_id": os.getenv("RAZORPAY_KEY_ID", ""),
        "amount": amount_paise,
        "currency": "INR",
        "order_code": order_code,
        "book_title": book.title,
        "buyer_name": payload.buyer_name,
        "buyer_email": payload.buyer_email,
    }


# ---------------------------------------------------------------------------
# 3. Verify Payment (Frontend calls after successful checkout)
# ---------------------------------------------------------------------------
@router.post("/verify")
async def verify_payment(
    payload: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: Optional[user_model.User] = Depends(get_current_user_optional)
):
    """
    Verifies Razorpay payment signature (HMAC SHA-256).
    On success → marks order APPROVED, generates download token, grants instant access.
    """
    # 1. Verify signature (cryptographic proof of payment)
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
    if not key_secret:
        raise HTTPException(status_code=503, detail="Payment gateway not configured.")

    message = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
    expected_signature = hmac.new(
        key_secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed. Invalid signature.")

    # 2. Find local order
    order = db.query(book_order_model.BookDownloadOrder).options(
        joinedload(book_order_model.BookDownloadOrder.book)
    ).filter(
        book_order_model.BookDownloadOrder.order_code == payload.order_code
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.status == "APPROVED":
        # Already approved (idempotent)
        resp = book_order_schema.BookOrderResponse.model_validate(order)
        if order.book:
            resp.book_title = order.book.title
            resp.cover_image_url = order.book.cover_image_url
        return {
            "success": True,
            "message": "Payment already verified.",
            "order": resp,
        }

    # 3. Approve order + generate download token
    order.status = "APPROVED"
    order.transaction_ref = payload.razorpay_payment_id  # Store actual payment ID
    order.notes = f"Razorpay Order: {payload.razorpay_order_id}"
    order.download_token = str(uuid.uuid4())
    order.download_expires_at = datetime.utcnow() + timedelta(hours=720)  # 30 days
    order.max_downloads = 10
    order.download_count = 0
    order.reviewed_at = datetime.utcnow()

    try:
        create_log(
            db=db,
            user=current_user if current_user else None,
            action_type="PAYMENT_VERIFIED",
            description=f"Online payment verified for Order {order.order_code}. Razorpay Payment ID: {payload.razorpay_payment_id}",
            target_type="BookDownloadOrder",
            target_id=order.id,
        )
    except Exception:
        pass

    db.commit()
    db.refresh(order)

    resp = book_order_schema.BookOrderResponse.model_validate(order)
    if order.book:
        resp.book_title = order.book.title
        resp.cover_image_url = order.book.cover_image_url

    return {
        "success": True,
        "message": "Payment verified! Book access granted.",
        "order": resp,
    }


# ---------------------------------------------------------------------------
# 4. Webhook (Backup — Razorpay server-to-server confirmation)
# ---------------------------------------------------------------------------
@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Razorpay Webhook handler.
    If user's internet drops after payment, this ensures the order is still approved.
    """
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    if not webhook_secret:
        return {"status": "webhook_secret_not_configured"}

    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    expected = hmac.new(
        webhook_secret.encode("utf-8"),
        body,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    import json
    try:
        payload = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    event = payload.get("event", "")

    if event == "payment.captured":
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        rz_order_id = payment_entity.get("order_id", "")
        rz_payment_id = payment_entity.get("id", "")

        if rz_order_id:
            # Find order by razorpay order_id stored in transaction_ref or notes
            order = db.query(book_order_model.BookDownloadOrder).filter(
                book_order_model.BookDownloadOrder.payment_method == "RAZORPAY",
                (
                    (book_order_model.BookDownloadOrder.transaction_ref == rz_order_id) |
                    (book_order_model.BookDownloadOrder.transaction_ref == rz_payment_id)
                )
            ).first()

            if order and order.status != "APPROVED":
                order.status = "APPROVED"
                order.transaction_ref = rz_payment_id
                order.notes = f"Webhook: Razorpay Order {rz_order_id}"
                if not order.download_token:
                    order.download_token = str(uuid.uuid4())
                order.download_expires_at = datetime.utcnow() + timedelta(hours=720)
                order.max_downloads = 10
                order.download_count = 0
                order.reviewed_at = datetime.utcnow()
                db.commit()

    return {"status": "ok"}
