"""
Ingestion — Person 4 plug point.

Extract text from uploaded syllabus/notes while preserving source locations.
MVP stub: decode UTF-8 / latin-1 text files; PDF/OCR later.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class IngestedMaterial:
    material_id: str
    material_name: str
    text: str
    storage_path: str | None = None


def extract_text(filename: str, raw_bytes: bytes) -> str:
    """Best-effort text extraction. TODO(Person 4): PDF/DOCX parsers."""
    for encoding in ("utf-8", "latin-1"):
        try:
            return raw_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw_bytes.decode("utf-8", errors="replace")


def ingest_upload(
    *,
    material_id: str,
    filename: str,
    raw_bytes: bytes,
    storage_path: str | None = None,
) -> IngestedMaterial:
    text = extract_text(filename, raw_bytes)
    return IngestedMaterial(
        material_id=material_id,
        material_name=filename,
        text=text,
        storage_path=storage_path,
    )
