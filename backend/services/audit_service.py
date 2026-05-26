"""Audit service — append-only. Never UPDATE or DELETE rows."""
from datetime import datetime
from typing import Optional, Any
from sqlalchemy.orm import Session
from models import AuditLog


def log_action(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: Optional[Any] = None,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Write an audit log entry. Caller is responsible for db.commit()."""
    entry = AuditLog(
        user_id=user_id,
        username=username,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        created_at=datetime.utcnow(),
    )
    db.add(entry)
    db.flush()
    return entry
