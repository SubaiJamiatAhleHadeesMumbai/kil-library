import math
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional, Union

from models import log_model
from schemas import log_schema
from auth import require_permission, get_db

router = APIRouter()


@router.get(
    "/",
    response_model=Union[log_schema.PaginatedLogResponse, List[log_schema.Log]],
    dependencies=[Depends(require_permission("LOG_VIEW"))]
)
def get_logs(
    skip: int = 0,
    limit: int = 50,
    page: Optional[int] = None,
    paginated: bool = False,
    user_id: Optional[int] = None,
    action_type: Optional[str] = None,
    target_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    ✅ System audit logs list with search, filter, and server-side pagination.
    """
    is_paginated = paginated or (page is not None)
    active_page = max(1, page or 1)
    page_limit = max(1, min(limit or 50, 500))
    offset = (active_page - 1) * page_limit if is_paginated else skip

    query = (
        db.query(log_model.Log)
        .options(joinedload(log_model.Log.action_by))  # ✅ action_by user load
    )

    if user_id:
        query = query.filter(log_model.Log.action_by_id == user_id)

    if action_type and action_type.strip() and action_type.strip().lower() != "all":
        query = query.filter(log_model.Log.action_type.ilike(action_type.strip()))

    if target_type and target_type.strip() and target_type.strip().lower() != "all":
        query = query.filter(log_model.Log.target_type.ilike(target_type.strip()))

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                log_model.Log.description.ilike(term),
                log_model.Log.action_type.ilike(term),
                log_model.Log.target_type.ilike(term)
            )
        )

    total_count = query.count()
    logs = query.order_by(log_model.Log.timestamp.desc()).offset(offset).limit(page_limit).all()

    if is_paginated:
        total_pages = math.ceil(total_count / page_limit) if total_count > 0 else 1
        return {
            "items": logs,
            "total": total_count,
            "page": active_page,
            "limit": page_limit,
            "total_pages": total_pages
        }

    return logs
