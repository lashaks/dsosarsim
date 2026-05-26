"""IPSAS journal posting service. Caller commits transaction."""
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from models import IPSASEvent


ACCOUNTS = {
    "1310": "Inventory",
    "1600": "Property Plant & Equipment",
    "1690": "Accumulated Depreciation",
    "2110": "Goods Receipt / IR",
    "6100": "Depreciation Expense",
    "6200": "Maintenance Expense",
    "6900": "Inventory Impairment",
    "6950": "Disposal Loss",
}


def post_journal(
    db: Session,
    *,
    event_type: str,
    description: str,
    debit_account: str,
    credit_account: str,
    amount: float,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    posted_by: Optional[str] = None,
    currency: str = "SAR",
) -> IPSASEvent:
    evt = IPSASEvent(
        event_type=event_type,
        reference_id=reference_id,
        reference_type=reference_type,
        description=description,
        debit_account=debit_account,
        debit_account_name=ACCOUNTS.get(debit_account, ""),
        credit_account=credit_account,
        credit_account_name=ACCOUNTS.get(credit_account, ""),
        amount=round(float(amount), 2),
        currency=currency,
        posted_at=datetime.utcnow(),
        posted_by=posted_by,
    )
    db.add(evt)
    db.flush()
    return evt


def post_receipt(db: Session, *, amount: float, reference_id: str, posted_by: str) -> IPSASEvent:
    return post_journal(
        db,
        event_type="GOODS_RECEIPT",
        description=f"Goods received {reference_id}",
        debit_account="1310",
        credit_account="2110",
        amount=amount,
        reference_type="RECEIPT",
        reference_id=reference_id,
        posted_by=posted_by,
    )


def post_issue(db: Session, *, amount: float, reference_id: str, posted_by: str) -> IPSASEvent:
    return post_journal(
        db,
        event_type="ISSUE",
        description=f"Parts issued to {reference_id}",
        debit_account="6200",
        credit_account="1310",
        amount=amount,
        reference_type="ISSUE",
        reference_id=reference_id,
        posted_by=posted_by,
    )


def post_write_down(db: Session, *, amount: float, reference_id: str, posted_by: str, reason: str) -> IPSASEvent:
    return post_journal(
        db,
        event_type="WRITE_DOWN",
        description=f"NRV write-down: {reason}",
        debit_account="6900",
        credit_account="1310",
        amount=amount,
        reference_type="WRITE_DOWN",
        reference_id=reference_id,
        posted_by=posted_by,
    )


def post_depreciation(db: Session, *, amount: float, reference_id: str, posted_by: str) -> IPSASEvent:
    return post_journal(
        db,
        event_type="DEPRECIATION",
        description=f"Annual depreciation {reference_id}",
        debit_account="6100",
        credit_account="1690",
        amount=amount,
        reference_type="DEPRECIATION",
        reference_id=reference_id,
        posted_by=posted_by,
    )


def post_disposal(db: Session, *, amount: float, reference_id: str, posted_by: str) -> IPSASEvent:
    return post_journal(
        db,
        event_type="DISPOSAL",
        description=f"Asset disposal {reference_id}",
        debit_account="6950",
        credit_account="1600",
        amount=amount,
        reference_type="DISPOSAL",
        reference_id=reference_id,
        posted_by=posted_by,
    )
