from decimal import Decimal
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models.clients import Client
from models.items import Item
from models.sales import OrderItem, SalesOrder
from models.price_history import ItemPriceHistory
from models.taxes import TaxRule
from response import error, success
from schemas.sales import (
    AddSingleItemIn,
    ExtraChargeIn,
    OverrideLineTaxIn,
    SalesOrderCreate,
    SalesOrderUpdate,
)


router = APIRouter(prefix="/sales", tags=["sales"])

def _resolve_order(db: Session, identifier: str) -> SalesOrder | None:
    """
    Accept either UUID (order id) or order_number (e.g. ORD-0003).
    """
    try:
        parsed = uuid.UUID(str(identifier))
        return db.query(SalesOrder).filter(SalesOrder.id == parsed).first()
    except Exception:
        return db.query(SalesOrder).filter(SalesOrder.order_number == str(identifier)).first()


def _compute_totals(order_items: list[OrderItem], extra_charge: Decimal):
    subtotal = Decimal("0")
    tax_amount = Decimal("0")
    for li in order_items:
        qty = Decimal(str(li.quantity))
        unit_price = Decimal(str(li.unit_price))
        li.line_total = qty * unit_price
        subtotal += Decimal(str(li.line_total))

        rate = Decimal(str(getattr(li, "tax_rate", 0) or 0))
        li.tax_amount = (Decimal(str(li.line_total)) * rate) / Decimal("100")
        tax_amount += Decimal(str(li.tax_amount))

    total = subtotal + tax_amount + extra_charge
    return subtotal, tax_amount, total


def _apply_item_tax_snapshot(db: Session, item: Item, li: OrderItem):
    li.tax_id = item.tax_id
    li.tax_rate = 0
    if item.tax_id:
        rule = db.query(TaxRule).filter(TaxRule.id == item.tax_id).first()
        if not rule:
            raise ValueError("Tax rule not found for item")
        li.tax_rate = rule.rate


def _next_order_number(db: Session) -> str:
    seq = db.execute(text("SELECT nextval('sales_order_number_seq')")).scalar()
    return f"ORD-{int(seq):04d}"


def _order_to_out(order: SalesOrder):
    client = order.client
    out = {
        "id": str(order.id),
        "order_number": order.order_number,
        "client_id": str(order.client_id),
        "order_date": order.order_date.isoformat() if order.order_date else None,
        "status": order.status,
        "notes": order.notes,
        "subtotal": float(order.subtotal),
        "tax_amount": float(order.tax_amount),
        "extra_charge": float(getattr(order, "extra_charge", 0) or 0),
        "extra_charge_label": getattr(order, "extra_charge_label", None),
        "total": float(order.total),
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "client": {"id": str(client.id), "name": client.name} if client else None,
        "items": [],
    }
    items = []
    for li in order.items:
        d = {
            "id": str(li.id),
            "item_id": str(li.item_id),
            "quantity": float(li.quantity),
            "unit_price": float(li.unit_price),
            "line_total": float(li.line_total),
            "tax_id": str(li.tax_id) if li.tax_id else None,
            "tax_rate": float(getattr(li, "tax_rate", 0) or 0),
            "tax_amount": float(getattr(li, "tax_amount", 0) or 0),
        }
        if li.item:
            d["item"] = {
                "id": str(li.item.id),
                "name": li.item.name,
                "unit": li.item.unit,
                "track_stock": bool(li.item.track_stock),
            }
        items.append(d)
    out["items"] = items
    return out


@router.get("")
def list_sales_orders(
    status: str | None = Query(default=None),
    client_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    try:
        items_count_sq = (
            db.query(func.count(OrderItem.id))
            .filter(OrderItem.order_id == SalesOrder.id)
            .correlate(SalesOrder)
            .scalar_subquery()
        )

        query = db.query(SalesOrder, items_count_sq.label("items_count")).options(
            joinedload(SalesOrder.client)
        )

        if status:
            query = query.filter(SalesOrder.status == status)
        if client_id:
            query = query.filter(SalesOrder.client_id == client_id)
        if search:
            like = f"%{search}%"
            query = query.join(Client, Client.id == SalesOrder.client_id).filter(
                or_(SalesOrder.order_number.ilike(like), Client.name.ilike(like))
            )

        orders = query.order_by(SalesOrder.created_at.desc()).all()
        data = []
        for o, items_count in orders:
            data.append(
                {
                    "id": str(o.id),
                    "order_number": o.order_number,
                    "client_id": str(o.client_id),
                    "order_date": o.order_date.isoformat(),
                    "status": o.status,
                    "subtotal": float(o.subtotal),
                    "tax_amount": float(o.tax_amount),
                    "total": float(o.total),
                    "created_at": o.created_at.isoformat() if o.created_at else None,
                    "updated_at": o.updated_at.isoformat() if o.updated_at else None,
                    "client": {"id": str(o.client.id), "name": o.client.name}
                    if o.client
                    else None,
                    "items_count": int(items_count or 0),
                }
            )
        return success(data)
    except Exception as e:
        return error(str(e))


@router.get("/{order_id}")
def get_sales_order(order_id: str, db: Session = Depends(get_db)):
    try:
        base = _resolve_order(db, order_id)
        if not base:
            return error("Order not found")

        order = (
            db.query(SalesOrder)
            .options(
                joinedload(SalesOrder.client),
                joinedload(SalesOrder.items).joinedload(OrderItem.item),
            )
            .filter(SalesOrder.id == base.id)
            .first()
        )
        if not order:
            return error("Order not found")
        return success(_order_to_out(order))
    except Exception as e:
        # Return error with detail so frontend can show useful info
        return error(f"Failed to load order: {e}")


@router.post("")
def create_sales_order(payload: SalesOrderCreate, db: Session = Depends(get_db)):
    try:
        client = (
            db.query(Client)
            .filter(Client.id == payload.client_id, Client.is_active.is_(True))
            .first()
        )
        if not client:
            return error("Client not found")

        order_number = _next_order_number(db)

        order = SalesOrder(
            order_number=order_number,
            client_id=payload.client_id,
            notes=payload.notes,
            status="draft",
        )
        if payload.order_date is not None:
            order.order_date = payload.order_date

        line_items: list[OrderItem] = []
        for li in payload.items:
            item = (
                db.query(Item)
                .filter(Item.id == li.item_id, Item.is_active.is_(True))
                .first()
            )
            if not item:
                return error("Item not found")
            oi = OrderItem(
                item_id=li.item_id,
                quantity=li.quantity,
                unit_price=li.unit_price,
                line_total=Decimal(str(li.quantity)) * Decimal(str(li.unit_price)),
            )
            _apply_item_tax_snapshot(db, item, oi)
            line_items.append(oi)

        order.items = line_items
        subtotal, tax_amount, total = _compute_totals(order.items, Decimal("0"))
        order.subtotal = subtotal
        order.tax_amount = tax_amount
        order.total = total

        db.add(order)
        db.commit()
        db.refresh(order)
        order = (
            db.query(SalesOrder)
            .options(
                joinedload(SalesOrder.client),
                joinedload(SalesOrder.items).joinedload(OrderItem.item),
            )
            .filter(SalesOrder.id == order.id)
            .first()
        )
        return success(_order_to_out(order))
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.put("/{order_id}")
def update_sales_order(order_id: str, payload: SalesOrderUpdate, db: Session = Depends(get_db)):
    try:
        base = _resolve_order(db, order_id)
        if not base:
            return error("Order not found")
        order = (
            db.query(SalesOrder)
            .options(joinedload(SalesOrder.items))
            .filter(SalesOrder.id == base.id)
            .first()
        )
        if not order:
            return error("Order not found")
        if order.status != "draft":
            return error("Only draft orders can be edited")

        if payload.order_date is not None:
            order.order_date = payload.order_date
        if payload.notes is not None:
            order.notes = payload.notes

        if payload.items is not None:
            order.items = []
            for li in payload.items:
                item = (
                    db.query(Item)
                    .filter(Item.id == li.item_id, Item.is_active.is_(True))
                    .first()
                )
                if not item:
                    return error("Item not found")
                oi = OrderItem(
                    item_id=li.item_id,
                    quantity=li.quantity,
                    unit_price=li.unit_price,
                    line_total=Decimal(str(li.quantity)) * Decimal(str(li.unit_price)),
                )
                _apply_item_tax_snapshot(db, item, oi)
                order.items.append(oi)

        extra_charge = Decimal(str(getattr(order, "extra_charge", 0) or 0))
        subtotal, tax_amount, total = _compute_totals(order.items, extra_charge)
        order.subtotal = subtotal
        order.tax_amount = tax_amount
        order.total = total

        db.add(order)
        db.commit()
        db.refresh(order)
        order = (
            db.query(SalesOrder)
            .options(
                joinedload(SalesOrder.client),
                joinedload(SalesOrder.items).joinedload(OrderItem.item),
            )
            .filter(SalesOrder.id == order.id)
            .first()
        )
        return success(_order_to_out(order))
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.post("/{order_id}/items")
def add_order_item(order_id: str, payload: AddSingleItemIn, db: Session = Depends(get_db)):
    try:
        base = _resolve_order(db, order_id)
        if not base:
            return error("Order not found")
        order = (
            db.query(SalesOrder)
            .options(joinedload(SalesOrder.items))
            .filter(SalesOrder.id == base.id)
            .first()
        )
        if not order:
            return error("Order not found")
        if order.status != "draft":
            return error("Only draft orders can be edited")

        item = (
            db.query(Item).filter(Item.id == payload.item_id, Item.is_active.is_(True)).first()
        )
        if not item:
            return error("Item not found")

        unit_price = payload.unit_price if payload.unit_price is not None else item.price
        li = OrderItem(
            item_id=payload.item_id,
            quantity=payload.quantity,
            unit_price=unit_price,
            line_total=Decimal(str(payload.quantity)) * Decimal(str(unit_price)),
        )
        _apply_item_tax_snapshot(db, item, li)
        order.items.append(li)

        extra_charge = Decimal(str(getattr(order, "extra_charge", 0) or 0))
        subtotal, tax_amount, total = _compute_totals(order.items, extra_charge)
        order.subtotal = subtotal
        order.tax_amount = tax_amount
        order.total = total

        db.add(order)
        db.commit()
        db.refresh(order)
        order = (
            db.query(SalesOrder)
            .options(
                joinedload(SalesOrder.client),
                joinedload(SalesOrder.items).joinedload(OrderItem.item),
            )
            .filter(SalesOrder.id == order.id)
            .first()
        )
        return success(_order_to_out(order))
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.delete("/{order_id}/items/{item_id}")
def remove_order_item(order_id: str, item_id: UUID, db: Session = Depends(get_db)):
    try:
        base = _resolve_order(db, order_id)
        if not base:
            return error("Order not found")
        order = (
            db.query(SalesOrder)
            .options(joinedload(SalesOrder.items))
            .filter(SalesOrder.id == base.id)
            .first()
        )
        if not order:
            return error("Order not found")
        if order.status != "draft":
            return error("Only draft orders can be edited")

        before = len(order.items)
        order.items = [li for li in order.items if li.item_id != item_id]
        if len(order.items) == before:
            return error("Line item not found")

        extra_charge = Decimal(str(getattr(order, "extra_charge", 0) or 0))
        subtotal, tax_amount, total = _compute_totals(order.items, extra_charge)
        order.subtotal = subtotal
        order.tax_amount = tax_amount
        order.total = total

        db.add(order)
        db.commit()
        db.refresh(order)
        order = (
            db.query(SalesOrder)
            .options(
                joinedload(SalesOrder.client),
                joinedload(SalesOrder.items).joinedload(OrderItem.item),
            )
            .filter(SalesOrder.id == order.id)
            .first()
        )
        return success(_order_to_out(order))
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.patch("/{order_id}/confirm")
def confirm_order(order_id: str, db: Session = Depends(get_db)):
    try:
        base = _resolve_order(db, order_id)
        if not base:
            return error("Order not found")
        order = (
            db.query(SalesOrder)
            .options(joinedload(SalesOrder.items))
            .filter(SalesOrder.id == base.id)
            .first()
        )
        if not order:
            return error("Order not found")
        if order.status != "draft":
            return error("Only draft orders can be confirmed")

        for li in order.items:
            item = (
                db.query(Item)
                .filter(Item.id == li.item_id, Item.is_active.is_(True))
                .with_for_update()
                .first()
            )
            if not item:
                return error("Item not found")
            if item.track_stock:
                new_qty = Decimal(str(item.stock_quantity)) - Decimal(str(li.quantity))
                if new_qty < 0:
                    return error(f"Insufficient stock for item: {item.name}")
                item.stock_quantity = new_qty
                db.add(item)
                
            # Calculate profit
            price_history = (
                db.query(ItemPriceHistory)
                .filter(ItemPriceHistory.item_id == li.item_id)
                .filter(ItemPriceHistory.price_date <= order.order_date)
                .order_by(ItemPriceHistory.price_date.desc())
                .first()
            )
            
            if price_history:
                cost_price = price_history.price
                li.cost_price = cost_price
                
                unit_price = Decimal(str(li.unit_price))
                qty = Decimal(str(li.quantity))
                cost = Decimal(str(cost_price))
                
                profit_amount = (unit_price - cost) * qty
                li.profit_amount = profit_amount
                
                if cost > 0:
                    profit_percent = ((unit_price - cost) / cost) * Decimal("100")
                    li.profit_percent = profit_percent
                else:
                    li.profit_percent = Decimal("100") # Edge case
                    
                db.add(li)

        order.status = "confirmed"
        db.add(order)
        db.commit()

        order = (
            db.query(SalesOrder)
            .options(
                joinedload(SalesOrder.client),
                joinedload(SalesOrder.items).joinedload(OrderItem.item),
            )
            .filter(SalesOrder.id == order.id)
            .first()
        )
        return success(_order_to_out(order))
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.put("/{order_id}/extra-charge")
def update_extra_charge(order_id: str, payload: ExtraChargeIn, db: Session = Depends(get_db)):
    try:
        base = _resolve_order(db, order_id)
        if not base:
            return error("Order not found")
        order = (
            db.query(SalesOrder)
            .options(joinedload(SalesOrder.items))
            .filter(SalesOrder.id == base.id)
            .first()
        )
        if not order:
            return error("Order not found")
        if order.status != "draft":
            return error("Only draft orders can be edited")

        order.extra_charge = payload.extra_charge or 0
        order.extra_charge_label = payload.extra_charge_label

        subtotal, tax_amount, total = _compute_totals(
            order.items, Decimal(str(order.extra_charge or 0))
        )
        order.subtotal = subtotal
        order.tax_amount = tax_amount
        order.total = total

        db.add(order)
        db.commit()
        db.refresh(order)
        return success(True)
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.patch("/{order_id}/items/{item_id}/tax")
def override_line_tax(
    order_id: str, item_id: UUID, payload: OverrideLineTaxIn, db: Session = Depends(get_db)
):
    try:
        base = _resolve_order(db, order_id)
        if not base:
            return error("Order not found")
        order = (
            db.query(SalesOrder)
            .options(joinedload(SalesOrder.items))
            .filter(SalesOrder.id == base.id)
            .first()
        )
        if not order:
            return error("Order not found")
        if order.status != "draft":
            return error("Only draft orders can be edited")

        tax_id = payload.tax_id
        tax_rate = Decimal("0")
        if tax_id:
            rule = db.query(TaxRule).filter(TaxRule.id == tax_id).first()
            if not rule:
                return error("Tax rule not found")
            tax_rate = Decimal(str(rule.rate))

        touched = False
        for li in order.items:
            if li.item_id == item_id:
                li.tax_id = tax_id
                li.tax_rate = tax_rate
                li.tax_amount = (Decimal(str(li.line_total)) * tax_rate) / Decimal("100")
                touched = True
                db.add(li)

        if not touched:
            return error("Line item not found")

        extra_charge = Decimal(str(order.extra_charge or 0))
        subtotal, tax_amount, total = _compute_totals(order.items, extra_charge)
        order.subtotal = subtotal
        order.tax_amount = tax_amount
        order.total = total

        db.add(order)
        db.commit()
        return success(True)
    except Exception as e:
        db.rollback()
        return error(str(e))
