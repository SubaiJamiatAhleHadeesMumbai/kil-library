# file: library_backend/utils/pagination.py
# ✅ PAGINATION UTILITY - Prevents DoS via huge requests (Issue #8 Fix)

from fastapi import Query, HTTPException, status

def validate_pagination_params(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max records to return (max 100)")
):
    """
    ✅ Validates pagination parameters with security limits.
    - skip: >= 0 (default 0)
    - limit: 1-100 (default 20, max 100)
    
    Prevents:
    - Requesting 1M records → Out of Memory
    - DoS attacks via huge pagination
    - Slow queries
    
    Usage:
        @router.get("/items")
        def get_items(
            db: Session = Depends(get_db),
            pagination: dict = Depends(validate_pagination_params)
        ):
            skip = pagination["skip"]
            limit = pagination["limit"]
    
    Or simpler:
        @router.get("/items")
        def get_items(
            skip: int = Query(0, ge=0),
            limit: int = Query(20, ge=1, le=100),
            db: Session = Depends(get_db)
        ):
            # Automatically validated by Pydantic
    """
    return {"skip": skip, "limit": limit}


def cap_limit(limit: int, max_limit: int = 100) -> int:
    """
    ✅ Simple helper to cap limit at maximum.
    
    Usage:
        limit = cap_limit(request.query_params.get("limit", 20))
        books = db.query(Book).limit(limit).all()
    """
    if limit is None or limit <= 0:
        return 20  # Default
    if limit > max_limit:
        return max_limit  # Cap at max
    return limit
