"""
Ingestion — Person 4 plug point.

Extract text from uploaded syllabus/notes while preserving source locations.
Uses PyMuPDF (fitz) for PDF extraction, extracts TOC for chapters, and chunks text for RAG.
"""

from __future__ import annotations

import fitz  # PyMuPDF
from dataclasses import dataclass, field
import uuid


@dataclass
class PassageChunk:
    chunk_id: str
    material_id: str
    material_name: str
    location: str
    text: str
    chapter: str = "General"


@dataclass
class IngestedMaterial:
    material_id: str
    material_name: str
    text: str
    storage_path: str | None = None
    chunks: list[PassageChunk] = field(default_factory=list)


def recursive_split(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Splits text into chunks of `chunk_size` characters, overlapping by `overlap`."""
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = start + chunk_size
        if end < text_len:
            # Try to snap to the nearest period or space
            last_period = text.rfind('.', start, end)
            last_space = text.rfind(' ', start, end)
            if last_period > start + chunk_size // 2:
                end = last_period + 1
            elif last_space > start + chunk_size // 2:
                end = last_space + 1
        
        chunk_text = text[start:end].strip()
        if chunk_text:
            chunks.append(chunk_text)
            
        start = end - overlap
        if start < 0 or end >= text_len:
            break
            
    return chunks


def extract_pdf_chunks(material_id: str, filename: str, raw_bytes: bytes) -> tuple[str, list[PassageChunk]]:
    """Extract text from PDF using PyMuPDF, split recursively, and tag with TOC chapters."""
    doc = fitz.open(stream=raw_bytes, filetype="pdf")
    toc = doc.get_toc()
    top_level_toc = [t for t in toc if t[0] == 1]
    
    current_chapter = "Introduction"
    next_toc_idx = 0
    
    full_text = []
    chunks = []
    
    for page_num in range(len(doc)):
        # Update chapter if we've passed the page number of the next TOC entry (TOC pages are 1-indexed)
        while next_toc_idx < len(top_level_toc) and page_num + 1 >= top_level_toc[next_toc_idx][2]:
            current_chapter = top_level_toc[next_toc_idx][1]
            next_toc_idx += 1
            
        page = doc.load_page(page_num)
        text = page.get_text("text").strip()
        if not text:
            continue
            
        full_text.append(text)
        
        split_texts = recursive_split(text, chunk_size=800, overlap=150)
        for i, split_txt in enumerate(split_texts):
            chunks.append(PassageChunk(
                chunk_id=str(uuid.uuid4()),
                material_id=material_id,
                material_name=filename,
                location=f"Page {page_num+1}",
                text=split_txt,
                chapter=current_chapter
            ))
            
    return "\n\n".join(full_text), chunks


def extract_text_chunks(material_id: str, filename: str, raw_bytes: bytes) -> tuple[str, list[PassageChunk]]:
    """Fallback text extraction for non-PDFs with recursive splitting."""
    text = ""
    for encoding in ("utf-8", "latin-1"):
        try:
            text = raw_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    if not text:
        text = raw_bytes.decode("utf-8", errors="replace")
        
    split_texts = recursive_split(text, chunk_size=800, overlap=150)
    chunks = [
        PassageChunk(
            chunk_id=str(uuid.uuid4()),
            material_id=material_id,
            material_name=filename,
            location=f"Chunk {i+1}",
            text=chunk_txt,
            chapter="General"
        )
        for i, chunk_txt in enumerate(split_texts)
    ]
            
    return text, chunks


def ingest_upload(
    *,
    material_id: str,
    filename: str,
    raw_bytes: bytes,
    storage_path: str | None = None,
) -> IngestedMaterial:
    
    if filename.lower().endswith(".pdf"):
        try:
            text, chunks = extract_pdf_chunks(material_id, filename, raw_bytes)
        except Exception:
            text, chunks = extract_text_chunks(material_id, filename, raw_bytes)
    else:
        text, chunks = extract_text_chunks(material_id, filename, raw_bytes)
        
    return IngestedMaterial(
        material_id=material_id,
        material_name=filename,
        text=text,
        storage_path=storage_path,
        chunks=chunks
    )
