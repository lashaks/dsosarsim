from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from models import AuditLog
from schemas import AuditLogOut
from auth import get_current_user

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("", response_model=List[AuditLogOut])
def list_audit(
    user: Optional[str] = None,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = Query(200, le=2000),
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    q = db.query(AuditLog)
    if user:
        q = q.filter(AuditLog.username == user)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if action:
        q = q.filter(AuditLog.action == action)
    return q.order_by(desc(AuditLog.created_at)).limit(limit).all()
