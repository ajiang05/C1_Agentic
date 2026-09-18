"""
Retrieval — Person 4 plug point.

Select source passages for tutor/evaluation context packs.
Keep this separate from lesson generation (Tutor Agent).
"""

from __future__ import annotations

from src.api.schemas import SourceReference


def select_passages(
    *,
    concept_name: str,
    materials: list[dict],
    limit: int = 3,
) -> list[SourceReference]:
    """
    materials items: {id, name, text}

    Stub: keyword window around the concept name; fall back to first paragraph.
    TODO(Person 4): embeddings / chunk index.
    """
    refs: list[SourceReference] = []
    needle = concept_name.lower()
    for mat in materials:
        text = mat.get("text") or ""
        idx = text.lower().find(needle)
        if idx >= 0:
            start = max(0, idx - 80)
            end = min(len(text), idx + 200)
            excerpt = text[start:end].strip() or text[:240]
            location = f"offset {start}"
        else:
            excerpt = (text[:240] or "No excerpt available.").strip()
            location = "p. 1"
        refs.append(
            SourceReference(
                material_id=mat["id"],
                material_name=mat.get("name", "material"),
                location=location,
                excerpt=excerpt,
            )
        )
        if len(refs) >= limit:
            break

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
