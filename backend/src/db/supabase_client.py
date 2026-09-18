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


def insert_chunks(material_id: str, chunks: list[dict]):
    """
    Insert chunks and their embeddings into Supabase pgvector table `document_chunks`.
    Assumes table schema: id, material_id, chapter, location, content, embedding
    """
    if not supabase_configured():
        return
        
    client = get_supabase()
    
    # We need openai to compute embeddings
    try:
        from openai import OpenAI
        openai_client = OpenAI()
    except Exception:
        print("OpenAI client missing, cannot insert vector chunks.")
        return
        
    records = []
    for chunk in chunks:
        text = chunk.get("text", "")
        if not text:
            continue
            
        try:
            res = openai_client.embeddings.create(
                input=[text],
                model="text-embedding-3-small"
            )
            emb = res.data[0].embedding
        except Exception as e:
            print(f"Failed to embed chunk: {e}")
            continue
            
        records.append({
            "id": chunk.get("chunk_id"),
            "material_id": material_id,
            "chapter": chunk.get("chapter", "General"),
            "location": chunk.get("location", "unknown"),
            "content": text,
            "embedding": emb
        })
        
    if records:
        # Batch insert into Supabase
        client.table("document_chunks").upsert(records).execute()


def search_chunks(query: str, material_ids: list[str], limit: int = 3, chapter_filter: str | None = None) -> list[dict]:
    """
    Search Supabase pgvector `document_chunks` table using match_chunks RPC.
    Assumes an RPC function `match_chunks(query_embedding, match_threshold, match_count, filter_materials, filter_chapter)`
    """
    if not supabase_configured():
        return []
        
    client = get_supabase()
    
    try:
        from openai import OpenAI
        openai_client = OpenAI()
        res = openai_client.embeddings.create(
            input=[query],
            model="text-embedding-3-small"
        )
        query_emb = res.data[0].embedding
    except Exception as e:
        print(f"Failed to embed query: {e}")
        return []
        
    # Call the Postgres function (RPC)
    try:
        response = client.rpc(
            "match_chunks", 
            {
                "query_embedding": query_emb,
                "match_threshold": 0.0, # return all based on limit
                "match_count": limit,
                "filter_materials": material_ids,
                "filter_chapter": chapter_filter
            }
        ).execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Supabase RPC match_chunks failed: {e}")
        return []

