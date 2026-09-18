"""
Curriculum Agent — Person 4 plug point.

Stage rule: ONE OpenAI call (context pack → JSON concepts). No multi-step loops.
Falls back to demo Graph Algorithms path when OPENAI_API_KEY is missing.
"""

from __future__ import annotations

import uuid

from src.api.schemas import Concept
from src.llm.openai_client import complete_json, is_openai_available

_DEMO_CONCEPTS: list[tuple[str, str, str, list[str]]] = [
    ("concept_repr", "Graph Representation", "Adjacency lists, matrices, and basic graph vocabulary.", []),
    ("concept_bfs", "Breadth-First Search", "Level-order traversal using a queue.", ["concept_repr"]),
    ("concept_dfs", "Depth-First Search", "Recursive/stack-based deep exploration.", ["concept_repr"]),
    ("concept_cycle", "Cycle Detection", "Detecting cycles with DFS coloring or parent tracking.", ["concept_dfs"]),
    ("concept_topo", "Topological Sorting", "Ordering DAGs using DFS finish times or Kahn's algorithm.", ["concept_bfs", "concept_cycle"]),
]


def _demo_concepts(course_id: str) -> list[Concept]:
    concepts: list[Concept] = []
    for order, (cid, name, description, prereqs) in enumerate(_DEMO_CONCEPTS):
        concepts.append(
            Concept(
                id=cid,
                course_id=course_id,
                name=name,
                description=description,
                prerequisite_ids=list(prereqs),
                order=order,
            )
        )
    return concepts


def generate_concepts(course_id: str, syllabus_text: str, notes_text: str) -> list[Concept]:
    """Extract ordered concepts from materials — single LLM invocation when enabled."""
    if not is_openai_available():
        return _demo_concepts(course_id)

    # TODO(Person 4): tighten prompt + validate prerequisite DAG
    system = (
        "You are the Curriculum Agent. Extract major concepts, prerequisites, and order "
        "from the syllabus and notes. Return JSON: "
        '{"concepts":[{"temp_id":"c1","name":"...","description":"...","prerequisite_temp_ids":[],"order":0}]}'
    )
    user = (
        f"COURSE_ID: {course_id}\n\n"
        f"SYLLABUS:\n{syllabus_text[:8000]}\n\n"
        f"NOTES:\n{notes_text[:12000]}"
    )
    try:
        raw = complete_json(system=system, user=user)
    except Exception:
        # One-shot failed (network/key) — keep the pipeline runnable with demo data.
        return _demo_concepts(course_id)
    concepts: list[Concept] = []
    temp_to_id: dict[str, str] = {}
    for item in raw.get("concepts", []):
        temp_id = item.get("temp_id") or str(uuid.uuid4())
        real_id = f"concept_{uuid.uuid4().hex[:8]}"
        temp_to_id[temp_id] = real_id
    for item in sorted(raw.get("concepts", []), key=lambda x: x.get("order", 0)):
        temp_id = item.get("temp_id") or ""
        concepts.append(
            Concept(
                id=temp_to_id.get(temp_id, f"concept_{uuid.uuid4().hex[:8]}"),
                course_id=course_id,
                name=item.get("name", "Untitled concept"),
                description=item.get("description", ""),
                prerequisite_ids=[
                    temp_to_id[p]
                    for p in item.get("prerequisite_temp_ids", [])
                    if p in temp_to_id
                ],
                order=int(item.get("order", len(concepts))),
            )
        )
    return concepts or _demo_concepts(course_id)
