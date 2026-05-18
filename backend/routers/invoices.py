import base64
from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse, Response
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models.clients import Client
from models.invoices import Invoice, Payment
from models.sales import OrderItem, SalesOrder
from models.settings import CompanySettings
from response import error, success
from schemas.invoices import InvoiceGenerateIn, PaymentCreateIn, PaymentOut
from services.gdrive import build_credentials, upload_pdf
from services.pdf_generator import build_invoice_html, render_invoice_pdf_bytes


router = APIRouter(prefix="/invoices", tags=["invoices"])


def _get_settings(db: Session) -> CompanySettings:
    s = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    if not s:
        s = CompanySettings(id=1, company_name="", storage_mode="local")
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


def _next_invoice_number(db: Session) -> str:
    seq = db.execute(text("SELECT nextval('invoice_number_seq')")).scalar()
    return f"INV-{int(seq):04d}"


@router.get("")
def list_invoices(
    status: str | None = Query(default=None),
    client_id: UUID | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    try:
        q = (
            db.query(Invoice)
            .options(joinedload(Invoice.client), joinedload(Invoice.order))
            .order_by(Invoice.created_at.desc())
        )
        if status:
            q = q.filter(Invoice.status == status)
        if client_id:
            q = q.filter(Invoice.client_id == client_id)
        if from_date:
            q = q.filter(Invoice.invoice_date >= from_date)
        if to_date:
            q = q.filter(Invoice.invoice_date <= to_date)

        invoices = q.all()
        data = []
        for inv in invoices:
            data.append(
                {
                    "id": str(inv.id),
                    "invoice_number": inv.invoice_number,
                    "order_id": str(inv.order_id),
                    "client_id": str(inv.client_id),
                    "invoice_date": inv.invoice_date.isoformat(),
                    "due_date": inv.due_date.isoformat(),
                    "status": inv.status,
                    "amount_due": float(inv.amount_due),
                    "amount_paid": float(inv.amount_paid),
                    "storage_mode": inv.storage_mode,
                    "drive_link": inv.drive_link,
                    "created_at": inv.created_at.isoformat() if inv.created_at else None,
                    "client": {"id": str(inv.client.id), "name": inv.client.name}
                    if inv.client
                    else None,
                    "order": {"id": str(inv.order.id), "order_number": inv.order.order_number}
                    if inv.order
                    else None,
                }
            )
        return success(data)
    except Exception as e:
        return error(str(e))


@router.get("/{invoice_id}")
def get_invoice(invoice_id: UUID, db: Session = Depends(get_db)):
    try:
        inv = (
            db.query(Invoice)
            .options(
                joinedload(Invoice.client),
                joinedload(Invoice.order)
                .joinedload(SalesOrder.items)
                .joinedload(OrderItem.item),
                joinedload(Invoice.payments),
            )
            .filter(Invoice.id == invoice_id)
            .first()
        )
        if not inv:
            return error("Invoice not found")

        d = {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "order_id": str(inv.order_id),
            "client_id": str(inv.client_id),
            "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "status": inv.status,
            "amount_due": float(inv.amount_due),
            "amount_paid": float(inv.amount_paid),
            "storage_mode": inv.storage_mode,
            "pdf_data": inv.pdf_data,
            "drive_file_id": inv.drive_file_id,
            "drive_link": inv.drive_link,
            "notes": inv.notes,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
            "client": {"id": str(inv.client.id), "name": inv.client.name} if inv.client else None,
            "order": {"id": str(inv.order.id), "order_number": inv.order.order_number} if inv.order else None,
            "payments": [PaymentOut.model_validate(p).model_dump() for p in inv.payments],
        }
        return success(d)
    except Exception as e:
        return error(str(e))


@router.post("/generate/{order_id}")
def generate_invoice(order_id: UUID, payload: InvoiceGenerateIn, db: Session = Depends(get_db)):
    try:
        order = (
            db.query(SalesOrder)
            .options(
                joinedload(SalesOrder.client),
                joinedload(SalesOrder.items).joinedload(OrderItem.item),
            )
            .filter(SalesOrder.id == order_id)
            .first()
        )
        if not order:
            return error("Order not found")
        if order.status != "confirmed":
            return error("Only confirmed orders can be invoiced")

        existing = db.query(Invoice).filter(Invoice.order_id == order_id).first()
        if existing:
            return error("Invoice already exists for this order")

        settings = _get_settings(db)
        invoice_number = _next_invoice_number(db)
        amount_due = Decimal(str(order.total))

        inv = Invoice(
            invoice_number=invoice_number,
            order_id=order.id,
            client_id=order.client_id,
            due_date=payload.due_date,
            status="unpaid",
            amount_due=amount_due,
            amount_paid=Decimal("0"),
            storage_mode=settings.storage_mode,
            notes=payload.notes,
        )

        # Generate PDF
        invoice_payload = {
            "company": {
                "company_name": settings.company_name,
                "address": settings.address,
                "phone": settings.phone,
                "email": settings.email,
                "logo_base64": settings.logo_base64,
            },
            "invoice": {
                "invoice_number": invoice_number,
                "invoice_date": date.today().isoformat(),
                "due_date": payload.due_date.isoformat(),
                "status": inv.status,
                "notes": inv.notes,
            },
            "client": {
                "name": order.client.name if order.client else "",
                "contact_person": getattr(order.client, "contact_person", None) if order.client else None,
                "address": getattr(order.client, "address", None) if order.client else None,
                "phone": getattr(order.client, "phone", None) if order.client else None,
                "email": getattr(order.client, "email", None) if order.client else None,
            },
            "order": {
                "subtotal": float(order.subtotal),
                "tax_amount": float(order.tax_amount),
                "extra_charge": float(getattr(order, "extra_charge", 0) or 0),
                "extra_charge_label": getattr(order, "extra_charge_label", None),
                "total": float(order.total),
            },
            "items": [],
        }

        for li in order.items:
            invoice_payload["items"].append(
                {
                    "item_name": li.item.name if li.item else str(li.item_id),
                    "unit": li.item.unit if li.item else "",
                    "quantity": float(li.quantity),
                    "unit_price": float(li.unit_price),
                    "tax_rate": float(getattr(li, "tax_rate", 0) or 0),
                    "tax_amount": float(getattr(li, "tax_amount", 0) or 0),
                    "line_total": float(li.line_total),
                }
            )

        html = build_invoice_html(invoice_payload)
        pdf_bytes = render_invoice_pdf_bytes(html=html)

        if settings.storage_mode == "google_drive":
            if not (
                settings.drive_client_id
                and settings.drive_client_secret
                and settings.drive_access_token
            ):
                return error("Google Drive is not connected in settings")

            creds = build_credentials(
                client_id=settings.drive_client_id,
                client_secret=settings.drive_client_secret,
                access_token=settings.drive_access_token,
                refresh_token=settings.drive_refresh_token,
                token_expiry=settings.drive_token_expiry,
            )
            file_id, link = upload_pdf(
                filename=f"{invoice_number}.pdf", pdf_bytes=pdf_bytes, creds=creds
            )
            inv.drive_file_id = file_id
            inv.drive_link = link
            inv.pdf_data = None
            inv.storage_mode = "google_drive"
        else:
            inv.pdf_data = base64.b64encode(pdf_bytes).decode("utf-8")
            inv.storage_mode = "local"

        # Accounting + status updates
        order.status = "invoiced"
        client = (
            db.query(Client).filter(Client.id == order.client_id, Client.is_active.is_(True)).first()
        )
        if client:
            client.outstanding_balance = (Decimal(str(client.outstanding_balance)) + amount_due)
            db.add(client)

        db.add(inv)
        db.add(order)
        db.commit()
        db.refresh(inv)
        return success({"id": str(inv.id)})
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.get("/{invoice_id}/pdf")
def get_invoice_pdf(invoice_id: UUID, db: Session = Depends(get_db)):
    try:
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not inv:
            return error("Invoice not found")

        if inv.storage_mode == "google_drive":
            if not inv.drive_link:
                return error("Drive link not available")
            return RedirectResponse(inv.drive_link)

        if not inv.pdf_data:
            return error("PDF not available")

        pdf_bytes = base64.b64decode(inv.pdf_data)
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as e:
        return error(str(e))


@router.post("/{invoice_id}/payments")
def create_payment(invoice_id: UUID, payload: PaymentCreateIn, db: Session = Depends(get_db)):
    try:
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not inv:
            return error("Invoice not found")

        remaining = Decimal(str(inv.amount_due)) - Decimal(str(inv.amount_paid))
        if Decimal(str(payload.amount)) > remaining:
            return error("Amount exceeds remaining balance")

        if payload.method not in {"cash", "bank_transfer", "cheque"}:
            return error("Invalid payment method")

        p = Payment(
            invoice_id=inv.id,
            client_id=inv.client_id,
            amount=payload.amount,
            method=payload.method,
            notes=payload.notes,
        )
        if payload.payment_date is not None:
            p.payment_date = payload.payment_date

        inv.amount_paid = Decimal(str(inv.amount_paid)) + Decimal(str(payload.amount))
        remaining2 = Decimal(str(inv.amount_due)) - Decimal(str(inv.amount_paid))
        if remaining2 <= 0:
            inv.status = "paid"
        elif inv.amount_paid > 0:
            inv.status = "partially_paid"

        client = (
            db.query(Client)
            .filter(Client.id == inv.client_id, Client.is_active.is_(True))
            .first()
        )
        if client:
            client.outstanding_balance = Decimal(str(client.outstanding_balance)) - Decimal(
                str(payload.amount)
            )
            db.add(client)

        db.add(p)
        db.add(inv)
        db.commit()
        db.refresh(p)
        return success(PaymentOut.model_validate(p).model_dump())
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.get("/{invoice_id}/payments")
def list_payments(invoice_id: UUID, db: Session = Depends(get_db)):
    try:
        payments = (
            db.query(Payment)
            .filter(Payment.invoice_id == invoice_id)
            .order_by(Payment.created_at.desc())
            .all()
        )
        return success([PaymentOut.model_validate(p).model_dump() for p in payments])
    except Exception as e:
        return error(str(e))
