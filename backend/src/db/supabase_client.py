"""
Supabase client plug points — Person 7 (+ Person 1 for Auth wiring).

Auth: verify JWT from Authorization header (anon key / user access token).
Postgres: service-role client for mastery writes.
Storage: upload course materials to SUPABASE_STORAGE_BUCKET.
"""

from __future__ import annotations

from typing import Any

from src.config import get_settings

_client = None


def supabase_configured() -> bool:
    s = get_settings()
    return bool(s.supabase_url and s.supabase_service_role_key)


def get_supabase():
    """Service-role client for server-side persistence + storage."""
    global _client
    if _client is not None:
        return _client
    if not supabase_configured():
        raise RuntimeError("Supabase is not configured")
    from supabase import create_client

    s = get_settings()
    _client = create_client(s.supabase_url, s.supabase_service_role_key)
    return _client


def verify_access_token(authorization: str | None) -> dict[str, Any] | None:
    """
    Validate Supabase Auth Bearer token. Returns user dict or None.

    TODO(Person 1/7): enforce on protected routes once Auth is live.
    Local demo allows anonymous student_id without a token.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    if not supabase_configured():
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        client = get_supabase()
        user_resp = client.auth.get_user(token)
        user = getattr(user_resp, "user", None)
        if user is None:
            return None
        return {"id": user.id, "email": getattr(user, "email", None)}
    except Exception:
        return None


def upload_to_storage(
    *,
    path: str,
    data: bytes,
    content_type: str = "application/octet-stream",
) -> str:
    """
    Upload bytes to the course-materials bucket. Returns storage path.

    When Supabase is not configured, returns a local stub path (caller may
    still persist bytes under backend/uploads/).
    """
    settings = get_settings()
    if not supabase_configured():
        return f"local://{path}"

    client = get_supabase()
    bucket = settings.supabase_storage_bucket
    client.storage.from_(bucket).upload(
        path,
        data,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    return path
