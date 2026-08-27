import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SENDER_EMAIL = os.getenv("SMTP_SENDER_EMAIL", os.getenv("SENDER_EMAIL", "itsoft404@gmail.com"))
SENDER_PASSWORD = os.getenv("SMTP_SENDER_PASSWORD", os.getenv("SENDER_PASSWORD", "fagbpflegfwegswk"))

def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Sends a 6-digit OTP to the user's email.
    """
    try:
        # Check if credentials are placeholders or empty
        if not SENDER_EMAIL or not SENDER_PASSWORD:
            print(f"[EMAIL SERVICE WARNING] SMTP credentials not set. Dev OTP for {to_email}: {otp}")
            return False

        # Email Content
        subject = "Password Reset OTP -MARKAZ AHLE HADEES KOKAN"
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
                <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 28px; border-radius: 16px; border: 1px solid #e2e8f0;">
                    <h2 style="color: #002147; margin-top: 0;">Password Reset Request</h2>
                    <p style="color: #475569; font-size: 14px;">Use the following 6-digit OTP to reset your password:</p>
                    <div style="text-align: center; margin: 24px 0; background: #f0fdf4; padding: 16px; border-radius: 12px; border: 1px solid #bbf7d0;">
                        <span style="font-size: 32px; font-weight: bold; color: #166534; letter-spacing: 8px;">{otp}</span>
                    </div>
                    <p style="color: #64748b; font-size: 13px;">This OTP is valid for <b>10 minutes</b>.</p>
                    <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">If you did not request this password reset, please ignore this email.</p>
                </div>
            </body>
        </html>
        """

        # Setup Message
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))

        # Send Email via SMTP TLS
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        server.quit()
        
        print(f"[EMAIL SERVICE SUCCESS] OTP email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL SERVICE ERROR] Failed to send email to {to_email}: {str(e)}")
        print(f"[DEV FALLBACK OTP] Generated OTP for {to_email}: {otp}")
        return False