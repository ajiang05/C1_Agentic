"""
Evaluation Agent — Person 6 plug point.

Stage rule: ONE OpenAI call to grade the answer + estimate mastery.
Proposes mastery; does NOT write to the database (Person 7 service does).
"""

from __future__ import annotations

from src.api.schemas import Evaluation, SourceReference
from src.llm.openai_client import complete_json, is_openai_available


def _demo_evaluation(
    student_answer: str,
    sources: list[SourceReference],
) -> Evaluation:
    answer = student_answer.strip().lower()
    correct = answer in {"queue", "b", "b) queue"} or "queue" in answer
    refs = sources or [
        SourceReference(
            material_id="mat_notes",
            material_name="Chapter notes — Graph Algorithms",
            location="p. 12",
            excerpt="BFS uses a FIFO queue to expand the frontier one layer at a time.",
        )
    ]
    if correct:
        return Evaluation(
            correct=True,
            understanding="strong",
            feedback="Correct — a FIFO queue matches BFS level-order expansion.",
            identified_misconception=None,
            estimated_mastery=0.75,
            source_references=refs,
        )
    return Evaluation(
        correct=False,
        understanding="misconception",
        feedback="Not quite. BFS uses a queue (FIFO), not a stack (that is closer to DFS).",
        identified_misconception="Confusing BFS frontier with DFS stack",
        estimated_mastery=0.35,
        source_references=refs,
    )


def evaluate_answer(
    *,
    question_prompt: str,
    student_answer: str,
    concept_name: str,
    source_passages: list[SourceReference],
) -> Evaluation:
    """Grade one answer — single LLM invocation when enabled."""
    if not is_openai_available():
        return _demo_evaluation(student_answer, source_passages)

    # TODO(Person 6): add rubric fields / partial-credit nuances
    system = (
        "You are the Evaluation Agent. Judge the student answer against the question "
        "and source passages. Return JSON: "
        '{"correct":bool,"understanding":"strong|partial|misconception|missing_prerequisite|guessing",'
        '"feedback":"...","identified_misconception":null|"...","estimated_mastery":0.0,'
        '"source_references":[{"material_id","material_name","location","excerpt"}]}'
    )
    user = (
        f"concept={concept_name}\nquestion={question_prompt}\n"
        f"answer={student_answer}\npassages={[s.model_dump() for s in source_passages]}"
    )
    try:
        raw = complete_json(system=system, user=user)
    except Exception:
        return _demo_evaluation(student_answer, source_passages)
    refs = [
        SourceReference.model_validate(r) for r in raw.get("source_references", [])
    ] or source_passages
    return Evaluation(
        correct=bool(raw.get("correct", False)),
        understanding=raw.get("understanding", "partial"),
        feedback=raw.get("feedback", ""),
        identified_misconception=raw.get("identified_misconception"),
        estimated_mastery=float(raw.get("estimated_mastery", 0.5)),
        source_references=refs,
    )
