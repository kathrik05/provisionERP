import io
from datetime import datetime, timezone
from typing import Optional, Tuple

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload


def build_credentials(
    *,
    client_id: str,
    client_secret: str,
    access_token: str,
    refresh_token: Optional[str],
    token_expiry: Optional[datetime],
) -> Credentials:
    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=["https://www.googleapis.com/auth/drive.file"],
    )
    if token_expiry:
        # google-auth compares expiry with naive utcnow(); keep expiry naive UTC to avoid
        # "can't compare offset-naive and offset-aware datetimes" on some environments.
        if token_expiry.tzinfo is not None:
            token_expiry = token_expiry.astimezone(timezone.utc).replace(tzinfo=None)
        creds.expiry = token_expiry
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return creds


def upload_pdf(
    *,
    filename: str,
    pdf_bytes: bytes,
    creds: Credentials,
) -> Tuple[str, str]:
    service = build("drive", "v3", credentials=creds)
    media = MediaIoBaseUpload(io.BytesIO(pdf_bytes), mimetype="application/pdf", resumable=False)
    file = service.files().create(
        body={"name": filename},
        media_body=media,
        fields="id,webViewLink",
    ).execute()
    return file["id"], file.get("webViewLink", "")
