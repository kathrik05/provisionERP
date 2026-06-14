from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from database import get_db
from models.suppliers import Supplier
from schemas.suppliers import SupplierCreate, SupplierResponse, SupplierUpdate

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("", response_model=dict)
def list_suppliers(
    search: str | None = None,
    db: Session = Depends(get_db)
):
    query = select(Supplier).where(Supplier.is_active == True)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Supplier.name.ilike(search_term),
                Supplier.phone.ilike(search_term)
            )
        )
        
    suppliers = db.execute(query.order_by(Supplier.name)).scalars().all()
    data = [SupplierResponse.model_validate(s).model_dump() for s in suppliers]
    return {"data": data, "message": "success", "error": None}


@router.get("/{supplier_id}", response_model=dict)
def get_supplier(supplier_id: UUID, db: Session = Depends(get_db)):
    supplier = db.execute(select(Supplier).where(Supplier.id == supplier_id)).scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"data": SupplierResponse.model_validate(supplier).model_dump(), "message": "success", "error": None}


@router.post("", response_model=dict)
def create_supplier(supplier_in: SupplierCreate, db: Session = Depends(get_db)):
    supplier = Supplier(**supplier_in.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return {"data": SupplierResponse.model_validate(supplier).model_dump(), "message": "success", "error": None}


@router.put("/{supplier_id}", response_model=dict)
def update_supplier(supplier_id: UUID, supplier_in: SupplierUpdate, db: Session = Depends(get_db)):
    supplier = db.execute(select(Supplier).where(Supplier.id == supplier_id)).scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
        
    update_data = supplier_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(supplier, key, value)
        
    db.commit()
    db.refresh(supplier)
    return {"data": SupplierResponse.model_validate(supplier).model_dump(), "message": "success", "error": None}


@router.patch("/{supplier_id}/deactivate", response_model=dict)
def deactivate_supplier(supplier_id: UUID, db: Session = Depends(get_db)):
    supplier = db.execute(select(Supplier).where(Supplier.id == supplier_id)).scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
        
    supplier.is_active = False
    db.commit()
    return {"data": None, "message": "success", "error": None}
