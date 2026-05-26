"""Inventory mutations always paired with IPSAS journal posting in one transaction.
If journal posting fails, the entire transaction rolls back.
"""
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException

from models import (
    Inventory, InventoryMovement, PartMaster, Warehouse, WorkOrder, WOPart
)
from services import ipsas_service, audit_service


def _get_or_create_inventory(
    db: Session, part_id: int, warehouse_id: int, condition: str, bin_id: Optional[int] = None
) -> Inventory:
    inv = (
        db.query(Inventory)
        .filter(
            Inventory.part_id == part_id,
            Inventory.warehouse_id == warehouse_id,
            Inventory.condition == condition,
        )
        .first()
    )
    if not inv:
        inv = Inventory(
            part_id=part_id,
            warehouse_id=warehouse_id,
            bin_id=bin_id,
            quantity_on_hand=0,
            quantity_reserved=0,
            reorder_point=0,
            max_stock=0,
            condition=condition,
        )
        db.add(inv)
        db.flush()
    return inv


def receive_stock(
    db: Session,
    *,
    part_id: int,
    warehouse_id: int,
    quantity: float,
    condition: str = "SERVICEABLE",
    unit_cost: Optional[float] = None,
    po_reference: Optional[str] = None,
    bin_id: Optional[int] = None,
    actor: Optional[str] = None,
    user_id: Optional[int] = None,
    notes: Optional[str] = None,
):
    if quantity <= 0:
        raise HTTPException(400, "Quantity must be positive")

    part = db.get(PartMaster, part_id)
    if not part:
        raise HTTPException(404, "Part not found")
    if not db.get(Warehouse, warehouse_id):
        raise HTTPException(404, "Warehouse not found")

    try:
        inv = _get_or_create_inventory(db, part_id, warehouse_id, condition, bin_id)
        inv.quantity_on_hand = (inv.quantity_on_hand or 0) + quantity

        cost_per_unit = unit_cost if unit_cost is not None else part.unit_cost
        total = round(cost_per_unit * quantity, 2)

        journal = ipsas_service.post_receipt(
            db,
            amount=total,
            reference_id=po_reference or f"INV-{inv.id}",
            posted_by=actor or "system",
        )

        mv = InventoryMovement(
            part_id=part_id,
            warehouse_id=warehouse_id,
            movement_type="RECEIPT",
            quantity=quantity,
            reference_type="PO" if po_reference else "MANUAL",
            reference_id=po_reference,
            journal_id=journal.id,
            actor=actor,
            notes=notes,
        )
        db.add(mv)

        audit_service.log_action(
            db,
            action="RECEIVE_STOCK",
            entity_type="Inventory",
            entity_id=inv.id,
            user_id=user_id,
            username=actor,
            new_values={
                "part_id": part_id,
                "warehouse_id": warehouse_id,
                "quantity": quantity,
                "condition": condition,
                "po_reference": po_reference,
                "amount": total,
                "journal_id": journal.id,
            },
        )
        db.commit()
        db.refresh(inv)
        return {"inventory": inv, "movement": mv, "journal": journal}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(500, f"Receive failed: {e}")


def issue_to_wo(
    db: Session,
    *,
    inventory_id: int,
    quantity: float,
    wo_reference: Optional[str] = None,
    wo_part_id: Optional[int] = None,
    actor: Optional[str] = None,
    user_id: Optional[int] = None,
    notes: Optional[str] = None,
):
    if quantity <= 0:
        raise HTTPException(400, "Quantity must be positive")

    inv = db.get(Inventory, inventory_id)
    if not inv:
        raise HTTPException(404, "Inventory record not found")
    if inv.quantity_on_hand < quantity:
        raise HTTPException(400, f"Insufficient stock (have {inv.quantity_on_hand}, need {quantity})")

    try:
        part = db.get(PartMaster, inv.part_id)
        inv.quantity_on_hand -= quantity
        total = round(part.unit_cost * quantity, 2)

        # Update WOPart issued quantity if linked
        if wo_part_id:
            wp = db.get(WOPart, wo_part_id)
            if wp:
                wp.quantity_issued = (wp.quantity_issued or 0) + quantity

        journal = ipsas_service.post_issue(
            db,
            amount=total,
            reference_id=wo_reference or f"WO-PART-{wo_part_id}",
            posted_by=actor or "system",
        )

        mv = InventoryMovement(
            part_id=inv.part_id,
            warehouse_id=inv.warehouse_id,
            movement_type="ISSUE",
            quantity=quantity,
            reference_type="WO",
            reference_id=wo_reference,
            journal_id=journal.id,
            actor=actor,
            notes=notes,
        )
        db.add(mv)

        # Activity log if WO can be resolved
        if wo_reference:
            wo = db.query(WorkOrder).filter(WorkOrder.wo_number == wo_reference).first()
            if wo:
                from models import WOActivity
                db.add(WOActivity(
                    wo_id=wo.id,
                    activity=f"Issued {quantity} × {part.part_number} from inventory",
                    actor=actor,
                ))

        audit_service.log_action(
            db,
            action="ISSUE_STOCK",
            entity_type="Inventory",
            entity_id=inv.id,
            user_id=user_id,
            username=actor,
            new_values={
                "quantity": quantity,
                "wo_reference": wo_reference,
                "amount": total,
                "journal_id": journal.id,
            },
        )
        db.commit()
        db.refresh(inv)
        return {"inventory": inv, "movement": mv, "journal": journal}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(500, f"Issue failed: {e}")


def write_down(
    db: Session,
    *,
    inventory_id: int,
    quantity: float,
    nrv_estimate: float,
    reason: str,
    actor: Optional[str] = None,
    user_id: Optional[int] = None,
    notes: Optional[str] = None,
):
    if quantity <= 0:
        raise HTTPException(400, "Quantity must be positive")

    inv = db.get(Inventory, inventory_id)
    if not inv:
        raise HTTPException(404, "Inventory record not found")
    if inv.quantity_on_hand < quantity:
        raise HTTPException(400, f"Cannot write down more than on-hand ({inv.quantity_on_hand})")

    try:
        part = db.get(PartMaster, inv.part_id)
        inv.quantity_on_hand -= quantity
        impairment = round(max(part.unit_cost - nrv_estimate, 0) * quantity, 2)
        if impairment == 0:
            impairment = round(part.unit_cost * quantity, 2)

        journal = ipsas_service.post_write_down(
            db,
            amount=impairment,
            reference_id=f"INV-{inv.id}",
            posted_by=actor or "system",
            reason=reason,
        )

        mv = InventoryMovement(
            part_id=inv.part_id,
            warehouse_id=inv.warehouse_id,
            movement_type="WRITE_DOWN",
            quantity=quantity,
            reference_type="MANUAL",
            reference_id=reason[:60],
            journal_id=journal.id,
            actor=actor,
            notes=notes,
        )
        db.add(mv)

        audit_service.log_action(
            db,
            action="WRITE_DOWN",
            entity_type="Inventory",
            entity_id=inv.id,
            user_id=user_id,
            username=actor,
            new_values={
                "quantity": quantity,
                "nrv_estimate": nrv_estimate,
                "reason": reason,
                "amount": impairment,
                "journal_id": journal.id,
            },
        )
        db.commit()
        db.refresh(inv)
        return {"inventory": inv, "movement": mv, "journal": journal}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(500, f"Write-down failed: {e}")
