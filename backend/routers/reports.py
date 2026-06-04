from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models.clients import Client
from models.invoices import Invoice, Payment
from models.items import Item
from models.sales import SalesOrder
from response import error, success


router = APIRouter(prefix="/reports", tags=["reports"])


def _d(v) -> Decimal:
    return Decimal("0") if v is None else Decimal(str(v))


def _month_key(dt: date) -> str:
    return dt.strftime("%b %Y")


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    try:
        today = date.today()
        month_start = today.replace(day=1)

        total_sales_this_month = (
            db.query(func.coalesce(func.sum(Invoice.amount_due), 0))
            .filter(Invoice.invoice_date >= month_start)
            .scalar()
        )

        total_outstanding = (
            db.query(func.coalesce(func.sum(Client.outstanding_balance), 0))
            .filter(Client.is_active.is_(True))
            .scalar()
        )

        low_stock_count = (
            db.query(func.count(Item.id))
            .filter(
                Item.is_active.is_(True),
                Item.track_stock.is_(True),
                Item.stock_quantity <= Item.reorder_level,
            )
            .scalar()
        )

        overdue_invoices_count = (
            db.query(func.count(Invoice.id))
            .filter(Invoice.due_date < today, Invoice.status != "paid")
            .scalar()
        )

        # last 6 months labels incl current month
        months: List[date] = []
        y, m = today.year, today.month
        for _ in range(6):
            months.append(date(y, m, 1))
            m -= 1
            if m == 0:
                m = 12
                y -= 1
        months = list(reversed(months))

        sales_by_month = (
            db.query(
                func.date_trunc("month", Invoice.invoice_date).label("month"),
                func.coalesce(func.sum(Invoice.amount_due), 0).label("total"),
            )
            .filter(Invoice.invoice_date >= months[0])
            .group_by("month")
            .order_by("month")
            .all()
        )
        sales_map = {_month_key(r.month.date()): float(r.total) for r in sales_by_month}
        monthly_sales = [
            {"month": _month_key(mm), "total": float(sales_map.get(_month_key(mm), 0))}
            for mm in months
        ]

        breakdown = (
            db.query(Invoice.status, func.count(Invoice.id))
            .group_by(Invoice.status)
            .all()
        )
        invoice_status_breakdown = [
            {"status": s, "count": int(c)} for s, c in breakdown
        ]

        recent_orders_rows = (
            db.query(SalesOrder)
            .options(joinedload(SalesOrder.client))
            .order_by(SalesOrder.created_at.desc())
            .limit(5)
            .all()
        )
        recent_orders = [
            {
                "order_number": o.order_number,
                "client_name": o.client.name if o.client else None,
                "total": float(o.total),
                "status": o.status,
                "id": str(o.id),
            }
            for o in recent_orders_rows
        ]

        recent_invoices_rows = (
            db.query(Invoice)
            .options(joinedload(Invoice.client))
            .order_by(Invoice.created_at.desc())
            .limit(5)
            .all()
        )
        recent_invoices = [
            {
                "invoice_number": inv.invoice_number,
                "client_name": inv.client.name if inv.client else None,
                "amount_due": float(inv.amount_due),
                "status": inv.status,
                "id": str(inv.id),
            }
            for inv in recent_invoices_rows
        ]

        return success(
            {
                "total_sales_this_month": float(total_sales_this_month),
                "total_outstanding": float(total_outstanding),
                "low_stock_count": int(low_stock_count),
                "overdue_invoices_count": int(overdue_invoices_count),
                "monthly_sales": monthly_sales,
                "invoice_status_breakdown": invoice_status_breakdown,
                "recent_orders": recent_orders,
                "recent_invoices": recent_invoices,
            }
        )
    except Exception as e:
        return error(str(e))


@router.get("/sales")
def sales_report(
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    client_id: Optional[UUID] = Query(default=None),
    db: Session = Depends(get_db),
):
    try:
        q = db.query(SalesOrder).options(joinedload(SalesOrder.client))
        if from_date:
            q = q.filter(SalesOrder.order_date >= from_date)
        if to_date:
            q = q.filter(SalesOrder.order_date <= to_date)
        if client_id:
            q = q.filter(SalesOrder.client_id == client_id)

        orders = q.order_by(SalesOrder.order_date.desc()).all()

        summary = {
            "order_count": len(orders),
            "subtotal": float(sum((_d(o.subtotal) for o in orders), Decimal("0"))),
            "tax_amount": float(sum((_d(o.tax_amount) for o in orders), Decimal("0"))),
            "extra_charges": float(
                sum((_d(getattr(o, "extra_charge", 0)) for o in orders), Decimal("0"))
            ),
            "grand_total": float(sum((_d(o.total) for o in orders), Decimal("0"))),
        }

        rows = [
            {
                "order_number": o.order_number,
                "client_name": o.client.name if o.client else None,
                "date": o.order_date.isoformat() if o.order_date else None,
                "subtotal": float(o.subtotal),
                "tax": float(o.tax_amount),
                "extra_charge": float(getattr(o, "extra_charge", 0) or 0),
                "total": float(o.total),
                "status": o.status,
            }
            for o in orders
        ]

        return success({"summary": summary, "orders": rows})
    except Exception as e:
        return error(str(e))


@router.get("/outstanding")
def outstanding_report(db: Session = Depends(get_db)):
    try:
        total_outstanding = (
            db.query(func.coalesce(func.sum(Client.outstanding_balance), 0))
            .filter(Client.is_active.is_(True))
            .scalar()
        )

        last_payment_sq = (
            db.query(func.max(Payment.payment_date))
            .filter(Payment.client_id == Client.id)
            .correlate(Client)
            .scalar_subquery()
        )

        total_invoiced_sq = (
            db.query(func.coalesce(func.sum(Invoice.amount_due), 0))
            .filter(Invoice.client_id == Client.id)
            .correlate(Client)
            .scalar_subquery()
        )

        total_paid_sq = (
            db.query(func.coalesce(func.sum(Payment.amount), 0))
            .filter(Payment.client_id == Client.id)
            .correlate(Client)
            .scalar_subquery()
        )

        overdue_count_sq = (
            db.query(func.count(Invoice.id))
            .filter(
                Invoice.client_id == Client.id,
                Invoice.due_date < date.today(),
                Invoice.status != "paid",
            )
            .correlate(Client)
            .scalar_subquery()
        )

        rows = (
            db.query(
                Client,
                total_invoiced_sq.label("total_invoiced"),
                total_paid_sq.label("total_paid"),
                overdue_count_sq.label("overdue_invoices"),
                last_payment_sq.label("last_payment_date"),
            )
            .filter(Client.is_active.is_(True))
            .order_by(Client.name.asc())
            .all()
        )

        clients = []
        for c, total_invoiced, total_paid, overdue_invoices, last_payment_date in rows:
            balance_due = _d(total_invoiced) - _d(total_paid)
            clients.append(
                {
                    "client_name": c.name,
                    "phone": c.phone,
                    "total_invoiced": float(total_invoiced or 0),
                    "total_paid": float(total_paid or 0),
                    "balance_due": float(balance_due),
                    "overdue_invoices": int(overdue_invoices or 0),
                    "last_payment_date": last_payment_date.isoformat()
                    if last_payment_date
                    else None,
                }
            )

        return success(
            {
                "total_outstanding": float(total_outstanding),
                "clients": clients,
            }
        )
    except Exception as e:
        return error(str(e))


@router.get("/inventory")
def inventory_report(db: Session = Depends(get_db)):
    try:
        items = db.query(Item).filter(Item.is_active.is_(True)).order_by(Item.name.asc()).all()

        total_items = len(items)
        stocked_items = len([i for i in items if i.track_stock])
        on_demand_items = total_items - stocked_items
        low_stock_items = len(
            [
                i
                for i in items
                if i.track_stock and _d(i.stock_quantity) <= _d(i.reorder_level)
            ]
        )

        rows = []
        for i in items:
            if not i.track_stock:
                status = "on_demand"
            elif _d(i.stock_quantity) <= _d(i.reorder_level):
                status = "low"
            else:
                status = "ok"
            rows.append(
                {
                    "name": i.name,
                    "category": i.category,
                    "unit": i.unit,
                    "price": float(i.price),
                    "track_stock": bool(i.track_stock),
                    "stock_quantity": float(i.stock_quantity),
                    "reorder_level": float(i.reorder_level),
                    "status": status,
                }
            )

        return success(
            {
                "total_items": total_items,
                "stocked_items": stocked_items,
                "on_demand_items": on_demand_items,
                "low_stock_items": low_stock_items,
                "items": rows,
            }
        )
    except Exception as e:
        return error(str(e))


@router.get("/payments")
def payments_report(
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
):
    try:
        q = (
            db.query(Payment)
            .options(joinedload(Payment.client), joinedload(Payment.invoice))
            .order_by(Payment.payment_date.desc(), Payment.created_at.desc())
        )
        if from_date:
            q = q.filter(Payment.payment_date >= from_date)
        if to_date:
            q = q.filter(Payment.payment_date <= to_date)

        payments = q.all()

        total_received = sum((_d(p.amount) for p in payments), Decimal("0"))
        by_method = {"cash": Decimal("0"), "bank_transfer": Decimal("0"), "cheque": Decimal("0")}
        for p in payments:
            if p.method in by_method:
                by_method[p.method] += _d(p.amount)

        rows = [
            {
                "date": p.payment_date.isoformat() if p.payment_date else None,
                "client_name": p.client.name if p.client else None,
                "invoice_number": p.invoice.invoice_number if p.invoice else None,
                "amount": float(p.amount),
                "method": p.method,
                "notes": p.notes,
            }
            for p in payments
        ]

        return success(
            {
                "summary": {
                    "total_received": float(total_received),
                    "by_method": {k: float(v) for k, v in by_method.items()},
                },
                "payments": rows,
            }
        )
    except Exception as e:
        return error(str(e))

