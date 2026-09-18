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


def remove_cycles(concepts: list[Concept]) -> list[Concept]:
    """Detects and breaks prerequisite cycles using DFS."""
    graph = {c.id: c.prerequisite_ids.copy() for c in concepts}
    visited = {}  # 0: unvisited, 1: visiting, 2: visited
    
    def dfs(node_id: str, path: set[str]):
        if visited.get(node_id) == 1:
            return True
        if visited.get(node_id) == 2:
            return False
            
        visited[node_id] = 1
        path.add(node_id)
        
        for prereq in list(graph.get(node_id, [])):
            if prereq in path:
                # Cycle found: drop the edge
                graph[node_id].remove(prereq)
                for c in concepts:
                    if c.id == node_id and prereq in c.prerequisite_ids:
                        c.prerequisite_ids.remove(prereq)
                continue
            dfs(prereq, path)
                
        visited[node_id] = 2
        path.remove(node_id)
        return False

    for c in concepts:
        if visited.get(c.id) != 2:
            dfs(c.id, set())
            
    return concepts


def generate_concepts(course_id: str, syllabus_text: str, notes_text: str) -> list[Concept]:
    """Extract ordered concepts from materials — single LLM invocation when enabled."""
    if not is_openai_available():
        return _demo_concepts(course_id)

    system = (
        "You are the Curriculum Agent. Your job is to extract major concepts, their descriptions, "
        "and their prerequisites from the syllabus and notes. \n"
        "CRITICAL RULES:\n"
        "1. Do not create cycles in prerequisites (e.g. A requires B, and B requires A).\n"
        "2. Only include concepts that are actually covered in the provided notes.\n"
        "3. Output MUST be topologically sorted (prerequisites must appear before the concepts that require them).\n\n"
        "Return valid JSON strictly matching this schema: "
        '{"concepts":[{"temp_id":"c1","name":"...","description":"...","prerequisite_temp_ids":[],"order":0}]}'
    )
    user = (
        f"COURSE_ID: {course_id}\n\n"
        f"SYLLABUS:\n{syllabus_text[:8000]}\n\n"
        f"NOTES/TOC:\n{notes_text[:12000]}"
    )
    try:
        raw = complete_json(system=system, user=user)
    except Exception:
        # One-shot failed (network/key) — keep the pipeline runnable with demo data.
        return _demo_concepts(course_id)
        
    concepts: list[Concept] = []
    temp_to_id: dict[str, str] = {}
    for item in raw.get("concepts", []):
        temp_id = str(item.get("temp_id")) if item.get("temp_id") else str(uuid.uuid4())
        real_id = f"concept_{uuid.uuid4().hex[:8]}"
        temp_to_id[temp_id] = real_id
        
    for item in sorted(raw.get("concepts", []), key=lambda x: int(x.get("order", 0))):
        temp_id = str(item.get("temp_id")) if item.get("temp_id") else ""
        concepts.append(
            Concept(
                id=temp_to_id.get(temp_id, f"concept_{uuid.uuid4().hex[:8]}"),
                course_id=course_id,
                name=str(item.get("name", "Untitled concept")),
                description=str(item.get("description", "")),
                prerequisite_ids=[
                    temp_to_id[str(p)]
                    for p in item.get("prerequisite_temp_ids", [])
                    if str(p) in temp_to_id
                ],
                order=int(item.get("order", len(concepts))),
            )
        )
        
    if not concepts:
        return _demo_concepts(course_id)
        
    return remove_cycles(concepts)

