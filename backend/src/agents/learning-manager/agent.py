"""
Learning Manager Agent — Person 6 plug point.

Stage rule: ONE OpenAI call to choose the next action.
Proposes next_action only; mastery writes go through services/ (Person 7).
"""

from __future__ import annotations

from src.api.schemas import Concept, Evaluation, NextAction, StudentProgress
from src.llm.openai_client import complete_json, is_openai_available


def _demo_next_action(
    *,
    concepts: list[Concept],
    current_concept_id: str,
    evaluation: Evaluation,
) -> NextAction:
    ordered = sorted(concepts, key=lambda c: c.order)
    idx = next((i for i, c in enumerate(ordered) if c.id == current_concept_id), 0)
    if evaluation.correct and evaluation.estimated_mastery >= 0.7:
        nxt = ordered[min(idx + 1, len(ordered) - 1)]
        return NextAction(
            action="advance",
            reason="Strong understanding; advance along the journey.",
            next_concept_id=nxt.id,
            suggested_difficulty="medium",
        )
    if evaluation.understanding == "missing_prerequisite":
        current = ordered[idx]
        prereq = current.prerequisite_ids[0] if current.prerequisite_ids else current_concept_id
        return NextAction(
            action="review_prerequisite",
            reason="Missing prerequisite detected; review earlier concept.",
            next_concept_id=prereq,
            suggested_difficulty="easy",
        )
    return NextAction(
        action="remediate",
        reason="Needs remediation on the current concept before advancing.",
        next_concept_id=current_concept_id,
        suggested_difficulty="easy",
    )


def decide_next_action(
    *,
    concepts: list[Concept],
    current_concept_id: str,
    evaluation: Evaluation,
    progress: StudentProgress,
) -> NextAction:
    """Choose next teaching action — single LLM invocation when enabled."""
    if not is_openai_available():
        return _demo_next_action(
            concepts=concepts,
            current_concept_id=current_concept_id,
            evaluation=evaluation,
        )

    # TODO(Person 6): incorporate spaced-repetition schedule into context pack
    system = (
        "You are the Learning Manager. Given evaluation + progress, choose ONE next action. "
        "Return JSON: "
        '{"action":"advance|retry_same|remediate|review_prerequisite|easier_question|harder_question",'
        '"reason":"...","next_concept_id":"...","suggested_difficulty":"easy|medium|hard"}'
    )
    user = (
        f"current_concept_id={current_concept_id}\n"
        f"concepts={[c.model_dump() for c in concepts]}\n"
        f"evaluation={evaluation.model_dump()}\n"
        f"progress={progress.model_dump(mode='json')}"
    )
    try:
        raw = complete_json(system=system, user=user)
    except Exception:
        return _demo_next_action(
            concepts=concepts,
            current_concept_id=current_concept_id,
            evaluation=evaluation,
        )
    return NextAction(
        action=raw.get("action", "remediate"),
        reason=raw.get("reason", ""),
        next_concept_id=raw.get("next_concept_id", current_concept_id),
        suggested_difficulty=raw.get("suggested_difficulty", "easy"),
    )
