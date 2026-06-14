from datetime import date, timedelta
from decimal import Decimal
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from database import get_db
from models.purchases import PurchaseOrder, PurchaseOrderItem, SupplierPayment
from models.suppliers import Supplier
from models.items import Item
from models.price_history import ItemPriceHistory
from schemas.purchases import (
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    PurchaseOrderUpdate,
    SupplierPaymentCreate,
    SupplierPaymentResponse
)

router = APIRouter(prefix="/purchases", tags=["Purchases"])


def generate_purchase_number(db: Session) -> str:
    # simple sequence generator
    count = db.query(PurchaseOrder).count()
    return f"PUR-{(count + 1):04d}"


@router.get("", response_model=dict)
def list_purchases(
    supplier_id: UUID | None = None,
    status: str | None = None,
    db: Session = Depends(get_db)
):
    query = select(PurchaseOrder)
    if supplier_id:
        query = query.where(PurchaseOrder.supplier_id == supplier_id)
    if status:
        query = query.where(PurchaseOrder.status == status)
        
    purchases = db.execute(query.order_by(PurchaseOrder.created_at.desc())).scalars().all()
    data = [PurchaseOrderResponse.model_validate(p).model_dump() for p in purchases]
    return {"data": data, "message": "success", "error": None}


@router.get("/{purchase_id}", response_model=dict)
def get_purchase(purchase_id: UUID, db: Session = Depends(get_db)):
    purchase = db.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == purchase_id)
    ).scalar_one_or_none()
    
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase order not found")
        
    return {"data": PurchaseOrderResponse.model_validate(purchase).model_dump(), "message": "success", "error": None}


@router.post("", response_model=dict)
def create_purchase(po_in: PurchaseOrderCreate, db: Session = Depends(get_db)):
    supplier = db.execute(select(Supplier).where(Supplier.id == po_in.supplier_id)).scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=400, detail="Invalid supplier")

    subtotal = sum(item.quantity * item.unit_cost for item in po_in.items)
    due_date = po_in.purchase_date + timedelta(days=supplier.credit_days)
    
    po = PurchaseOrder(
        purchase_number=generate_purchase_number(db),
        supplier_id=po_in.supplier_id,
        purchase_date=po_in.purchase_date,
        notes=po_in.notes,
        subtotal=subtotal,
        total=subtotal, # Assuming no tax logic on purchases yet
        amount_paid=0,
        due_date=due_date,
        status="pending"
    )
    
    db.add(po)
    db.commit()
    db.refresh(po)
    
    for item_in in po_in.items:
        line_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            item_id=item_in.item_id,
            quantity=item_in.quantity,
            unit_cost=item_in.unit_cost,
            line_total=item_in.quantity * item_in.unit_cost
        )
        db.add(line_item)
        
    from decimal import Decimal
    # Update supplier outstanding balance
    supplier.outstanding_balance += Decimal(str(subtotal))
    
    db.commit()
    db.refresh(po)
    return {"data": PurchaseOrderResponse.model_validate(po).model_dump(), "message": "success", "error": None}


@router.put("/{purchase_id}", response_model=dict)
def update_purchase(purchase_id: UUID, po_in: PurchaseOrderUpdate, db: Session = Depends(get_db)):
    po = db.execute(select(PurchaseOrder).where(PurchaseOrder.id == purchase_id)).scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
        
    if po.status != "pending":
        raise HTTPException(status_code=400, detail="Cannot edit non-pending purchase order")
        
    update_data = po_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(po, key, value)
        
    db.commit()
    db.refresh(po)
    return {"data": PurchaseOrderResponse.model_validate(po).model_dump(), "message": "success", "error": None}


@router.patch("/{purchase_id}/receive", response_model=dict)
def receive_purchase(purchase_id: UUID, db: Session = Depends(get_db)):
    po = db.execute(select(PurchaseOrder).where(PurchaseOrder.id == purchase_id)).scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
        
    if po.status != "pending":
        raise HTTPException(status_code=400, detail="Can only receive pending orders")
        
    po.status = "received"
    
    # Process items
    for po_item in po.items:
        item = db.execute(select(Item).where(Item.id == po_item.item_id)).scalar_one_or_none()
        if item:
            if item.track_stock:
                item.stock_quantity += po_item.quantity
            item.current_cost_price = po_item.unit_cost
            
            # Create price history
            prev_entry = db.execute(
                select(ItemPriceHistory)
                .where(ItemPriceHistory.item_id == item.id)
                .where(ItemPriceHistory.supplier_id == po.supplier_id)
                .order_by(ItemPriceHistory.price_date.desc())
                .limit(1)
            ).scalar_one_or_none()
            
            change_percent = None
            if prev_entry and prev_entry.price > 0:
                change_percent = ((po_item.unit_cost - prev_entry.price) / prev_entry.price) * 100
                
            history_entry = ItemPriceHistory(
                item_id=item.id,
                supplier_id=po.supplier_id,
                price=po_item.unit_cost,
                price_date=po.purchase_date,
                change_percent=change_percent,
                notes=f"Auto-generated from PO {po.purchase_number}"
            )
            db.add(history_entry)
            
    db.commit()
    db.refresh(po)
    return {"data": PurchaseOrderResponse.model_validate(po).model_dump(), "message": "success", "error": None}


@router.post("/{purchase_id}/payments", response_model=dict)
def record_payment(purchase_id: UUID, payment_in: SupplierPaymentCreate, db: Session = Depends(get_db)):
    po = db.execute(select(PurchaseOrder).where(PurchaseOrder.id == purchase_id)).scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
        
    supplier = db.execute(select(Supplier).where(Supplier.id == po.supplier_id)).scalar_one_or_none()
    
    payment = SupplierPayment(
        purchase_order_id=po.id,
        supplier_id=po.supplier_id,
        amount=payment_in.amount,
        payment_date=payment_in.payment_date,
        method=payment_in.method,
        notes=payment_in.notes
    )
    db.add(payment)
    
    # Update PO amount_paid and status
    po.amount_paid += Decimal(str(payment_in.amount))
    if po.amount_paid >= po.total:
        po.status = "paid"
    elif po.amount_paid > 0:
        po.status = "partially_paid"
        
    # Update Supplier outstanding balance
    supplier.outstanding_balance -= Decimal(str(payment_in.amount))
    
    db.commit()
    db.refresh(payment)
    return {"data": SupplierPaymentResponse.model_validate(payment).model_dump(), "message": "success", "error": None}


@router.get("/{purchase_id}/payments", response_model=dict)
def list_payments(purchase_id: UUID, db: Session = Depends(get_db)):
    payments = db.execute(
        select(SupplierPayment)
        .where(SupplierPayment.purchase_order_id == purchase_id)
        .order_by(SupplierPayment.created_at.desc())
    ).scalars().all()
    data = [SupplierPaymentResponse.model_validate(p).model_dump() for p in payments]
    return {"data": data, "message": "success", "error": None}
