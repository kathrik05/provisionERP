import base64
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Query, UploadFile
from google_auth_oauthlib.flow import Flow
from sqlalchemy.orm import Session

from database import get_db
from models.settings import CompanySettings
from response import error, success
from schemas.settings import CompanySettingsOut, CompanySettingsUpsert


router = APIRouter(prefix="/settings", tags=["settings"])


def _get_or_create_settings(db: Session) -> CompanySettings:
    s = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    if s:
        return s
    s = CompanySettings(id=1, company_name="", storage_mode="local")
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    try:
        s = _get_or_create_settings(db)
        return success(CompanySettingsOut.model_validate(s).model_dump())
    except Exception as e:
        return error(str(e))


@router.put("")
def upsert_settings(payload: CompanySettingsUpsert, db: Session = Depends(get_db)):
    try:
        s = _get_or_create_settings(db)
        data = payload.model_dump(exclude_unset=True)
        if "storage_mode" in data and data["storage_mode"] is None:
            data.pop("storage_mode")
        for k, v in data.items():
            setattr(s, k, v)
        db.add(s)
        db.commit()
        db.refresh(s)
        return success(CompanySettingsOut.model_validate(s).model_dump())
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.post("/logo")
async def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        s = _get_or_create_settings(db)
        content = await file.read()
        b64 = base64.b64encode(content).decode("utf-8")
        s.logo_base64 = b64
        db.add(s)
        db.commit()
        db.refresh(s)
        return success(CompanySettingsOut.model_validate(s).model_dump())
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.get("/drive/auth-url")
def drive_auth_url(db: Session = Depends(get_db)):
    try:
        s = _get_or_create_settings(db)
        if not s.drive_client_id or not s.drive_client_secret:
            return error("Drive client_id and client_secret required in settings")

        redirect_uri = s.drive_redirect_uri or "http://localhost:8000/settings/drive/callback"
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": s.drive_client_id,
                    "client_secret": s.drive_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri],
                }
            },
            scopes=["https://www.googleapis.com/auth/drive.file"],
            redirect_uri=redirect_uri,
        )
        url, _state = flow.authorization_url(
            access_type="offline", prompt="consent", include_granted_scopes="true"
        )
        return success({"url": url})
    except Exception as e:
        return error(str(e))


@router.get("/drive/callback")
def drive_callback(code: str = Query(...), db: Session = Depends(get_db)):
    try:
        s = _get_or_create_settings(db)
        if not s.drive_client_id or not s.drive_client_secret:
            return error("Drive client_id and client_secret required in settings")

        redirect_uri = s.drive_redirect_uri or "http://localhost:8000/settings/drive/callback"
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": s.drive_client_id,
                    "client_secret": s.drive_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri],
                }
            },
            scopes=["https://www.googleapis.com/auth/drive.file"],
            redirect_uri=redirect_uri,
        )
        flow.fetch_token(code=code)
        creds = flow.credentials

        s.drive_access_token = creds.token
        s.drive_refresh_token = creds.refresh_token or s.drive_refresh_token
        s.drive_token_expiry = creds.expiry
        s.drive_redirect_uri = redirect_uri
        s.storage_mode = "google_drive"

        db.add(s)
        db.commit()
        return success(True)
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.delete("/drive/disconnect")
def drive_disconnect(db: Session = Depends(get_db)):
    try:
        s = _get_or_create_settings(db)
        s.storage_mode = "local"
        s.drive_access_token = None
        s.drive_refresh_token = None
        s.drive_token_expiry = None
        db.add(s)
        db.commit()
        return success(True)
    except Exception as e:
        db.rollback()
        return error(str(e))

