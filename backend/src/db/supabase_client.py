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
    
    # Process chunks in larger batches for OpenAI (up to 2048 allowed, we use 500)
    batch_size = 500
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        texts = [c.get("text", "") for c in batch]
        
        try:
            res = openai_client.embeddings.create(
                input=texts,
                model="text-embedding-3-small"
            )
            for j, chunk in enumerate(batch):
                records.append({
                    "id": chunk.get("chunk_id"),
                    "material_id": material_id,
                    "chapter": chunk.get("chapter", "General"),
                    "location": chunk.get("location", "unknown"),
                    "content": texts[j],
                    "embedding": res.data[j].embedding
                })
        except Exception as e:
            print(f"Failed to embed batch: {e}")
            continue
            
    if records:
        # Batch insert into Supabase to avoid PostgREST payload limits
        db_batch_size = 100
        for i in range(0, len(records), db_batch_size):
            db_batch = records[i:i + db_batch_size]
            try:
                client.table("document_chunks").upsert(db_batch).execute()
            except Exception as e:
                print(f"Failed to upsert db batch: {e}")
                continue


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


def create_profile(user_id: str, display_name: str) -> None:
    if not supabase_configured():
        return
    client = get_supabase()
    try:
        client.table("profiles").upsert({
            "id": user_id,
            "display_name": display_name
        }).execute()
    except Exception as e:
        print(f"Failed to create profile: {e}")


def create_course(course_id: str, user_id: str, name: str) -> None:
    if not supabase_configured():
        return
    client = get_supabase()
    try:
        client.table("courses").insert({
            "id": course_id,
            "user_id": user_id,
            "name": name
        }).execute()
    except Exception as e:
        print(f"Failed to create course: {e}")


def create_document(doc_id: str, course_id: str, user_id: str, title: str, kind: str) -> None:
    if not supabase_configured():
        return
    client = get_supabase()
    try:
        client.table("documents").insert({
            "id": doc_id,
            "course_id": course_id,
            "user_id": user_id,
            "title": title,
            "kind": kind,
            "status": "ready"
        }).execute()
    except Exception as e:
        print(f"Failed to create document: {e}")


def create_concepts(course_id: str, user_id: str, concepts: list[Any]) -> None:
    if not supabase_configured():
        return
    client = get_supabase()
    try:
        records = []
        for c in concepts:
            records.append({
                "id": c.id,
                "course_id": course_id,
                "user_id": user_id,
                "name": c.name,
                "description": c.description,
                "position": c.order
            })
        if records:
            client.table("concepts").insert(records).execute()
        
        prereq_records = []
        for c in concepts:
            for p_id in c.prerequisite_ids:
                prereq_records.append({
                    "concept_id": c.id,
                    "prerequisite_id": p_id,
                    "course_id": course_id,
                    "user_id": user_id
                })
        if prereq_records:
            client.table("concept_prerequisites").insert(prereq_records).execute()
    except Exception as e:
        print(f"Failed to create concepts: {e}")


def create_learning_content(content_id: str, concept_id: str, course_id: str, user_id: str, explanation: str, question: dict, teaching_strategy: str = "worked_example", difficulty: int = 1) -> None:
    if not supabase_configured():
        return
    client = get_supabase()
    try:
        client.table("learning_content").insert({
            "id": content_id,
            "concept_id": concept_id,
            "course_id": course_id,
            "user_id": user_id,
            "explanation": explanation,
            "question": question,
            "teaching_strategy": teaching_strategy,
            "difficulty": difficulty
        }).execute()
    except Exception as e:
        print(f"Failed to create learning content: {e}")


def record_attempt(user_id: str, attempt_id: str, content_id: str, student_answer: dict, correct: bool, feedback: str, misconception: str | None = None, related_concept_id: str | None = None, confidence: float | None = None, is_review: bool = False) -> dict | None:
    if not supabase_configured():
        return None
    client = get_supabase()
    try:
        response = client.rpc(
            "record_learning_attempt",
            {
                "p_user_id": user_id,
                "p_attempt_id": attempt_id,
                "p_content_id": content_id,
                "p_student_answer": student_answer,
                "p_correct": correct,
                "p_feedback": feedback,
                "p_misconception": misconception,
                "p_related_concept_id": related_concept_id,
                "p_confidence": confidence,
                "p_is_review": is_review
            }
        ).execute()
        return response.data
    except Exception as e:
        print(f"Supabase RPC record_learning_attempt failed: {e}")
        return None


def get_learning_memory(user_id: str, course_id: str) -> dict | None:
    if not supabase_configured():
        return None
    client = get_supabase()
    try:
        response = client.rpc(
            "get_learning_memory",
            {
                "p_user_id": user_id,
                "p_course_id": course_id
            }
        ).execute()
        return response.data
    except Exception as e:
        print(f"Supabase RPC get_learning_memory failed: {e}")
        return None


def get_course_documents(course_id: str) -> list[dict]:
    if not supabase_configured():
        return []
    client = get_supabase()
    try:
        response = client.table("documents").select("*").eq("course_id", course_id).execute()
        return response.data
    except Exception as e:
        print(f"Failed to fetch course documents: {e}")
        return []

