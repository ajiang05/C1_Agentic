"""
Retrieval — Person 4 plug point.

Select source passages for tutor/evaluation context packs.
Keep this separate from lesson generation (Tutor Agent).
"""

from __future__ import annotations

from src.api.schemas import SourceReference
from src.retrieval.vector_store import vector_store
from src.db.supabase_client import search_chunks, supabase_configured


def select_passages(
    *,
    concept_name: str,
    materials: list[dict],
    limit: int = 3,
) -> list[SourceReference]:
    """
    materials items: {id, name, text, chunks}
    """
    refs: list[SourceReference] = []
    material_ids = [m["id"] for m in materials]
    
    if supabase_configured():
        # Use Supabase pgvector search
        best_chunks = search_chunks(concept_name, material_ids, limit=limit)
    else:
        # Fallback to local in-memory vector store
        all_chunks = []
        for mat in materials:
            mat_chunks = mat.get("chunks", [])
            if mat_chunks:
                all_chunks.extend(mat_chunks)
            else:
                text = mat.get("text", "")
                if text:
                    all_chunks.append({
                        "chunk_id": f"{mat['id']}_fallback",
                        "material_id": mat["id"],
                        "material_name": mat.get("name", "material"),
                        "location": "p. 1",
                        "text": text[:1000]
                    })
        best_chunks = vector_store.search(concept_name, all_chunks, top_k=limit)
    
    for chunk in best_chunks:
        refs.append(
            SourceReference(
                material_id=chunk.get("material_id", "mat_unknown"),
                material_name=chunk.get("material_name", "material"),
                location=chunk.get("location", "unknown"),
                excerpt=chunk.get("content") or chunk.get("text", "")[:500]
            )
        )

    if not refs:
        refs.append(
            SourceReference(
                material_id="mat_unknown",
                material_name="Uploaded notes",
                location="n/a",
                excerpt=f"Placeholder passage for {concept_name}.",
            )
        )
    return refs

