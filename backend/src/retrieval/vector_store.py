"""
Lightweight in-memory vector store using OpenAI embeddings and numpy.
Caches embeddings to avoid re-generating them for the same chunks.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import openai

try:
    client = openai.Client()
except Exception:
    client = None

CACHE_FILE = Path(".embeddings_cache.json")


class VectorStore:
    def __init__(self):
        self.cache: dict[str, list[float]] = {}
        self._load_cache()

    def _load_cache(self):
        if CACHE_FILE.exists():
            try:
                with open(CACHE_FILE, "r") as f:
                    self.cache = json.load(f)
            except Exception:
                self.cache = {}

    def _save_cache(self):
        with open(CACHE_FILE, "w") as f:
            json.dump(self.cache, f)

    def get_embedding(self, text: str) -> np.ndarray:
        # Avoid caching small queries for now to keep cache small, unless it's a chunk.
        # But we can just cache by hash.
        import hashlib
        h = hashlib.sha256(text.encode("utf-8")).hexdigest()
        
        if h in self.cache:
            return np.array(self.cache[h])
            
        if not client:
            # Fallback to random if no API key
            vec = np.random.rand(1536)
            vec = vec / np.linalg.norm(vec)
            return vec

        try:
            res = client.embeddings.create(
                input=[text],
                model="text-embedding-3-small"
            )
            vec = res.data[0].embedding
            self.cache[h] = vec
            self._save_cache()
            return np.array(vec)
        except Exception as e:
            print(f"Embedding error: {e}")
            vec = np.random.rand(1536)
            return vec / np.linalg.norm(vec)

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

    def search(self, query: str, chunks: list[dict], top_k: int = 3) -> list[dict]:
        """
        Search for top_k chunks matching the query.
        chunks: list of dicts with 'text', 'chunk_id', 'location', 'material_name', etc.
        """
        if not chunks:
            return []

        query_emb = self.get_embedding(query)
        scored_chunks = []
        
        for chunk in chunks:
            text = chunk.get("text", "")
            if not text.strip():
                continue
            chunk_emb = self.get_embedding(text)
            score = self.cosine_similarity(query_emb, chunk_emb)
            scored_chunks.append((score, chunk))
            
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        return [c for score, c in scored_chunks[:top_k]]

# Global singleton
vector_store = VectorStore()
