"""
TutorAgent teaching actions and preference → format helpers.

Learning Manager owns progression decisions (NextActionType). TutorAgent
maps those into a pedagogical TutorAction that shapes the single lesson
completion.
"""

from __future__ import annotations

from typing import Literal

from src.api.schemas import LearningPreferences, NextActionType, TeachingFormat

TutorAction = Literal[
    "ASK_QUESTION",
    "GIVE_HINT",
    "EXPLAIN_CONCEPT",
    "REVIEW_PREREQUISITE",
    "ADVANCE_TOPIC",
    "REMEDIATE_MISCONCEPTION",
    "ENCOURAGE_STUDENT",
    "CLARIFY_REQUEST",
]

TUTOR_ACTIONS: tuple[TutorAction, ...] = (
    "ASK_QUESTION",
    "GIVE_HINT",
    "EXPLAIN_CONCEPT",
    "REVIEW_PREREQUISITE",
    "ADVANCE_TOPIC",
    "REMEDIATE_MISCONCEPTION",
    "ENCOURAGE_STUDENT",
    "CLARIFY_REQUEST",
)

# Learning-manager next_action → TutorAgent pedagogical action
_NEXT_TO_TUTOR: dict[NextActionType, TutorAction] = {
    "advance": "ADVANCE_TOPIC",
    "hint": "GIVE_HINT",
    "retry": "ASK_QUESTION",
    "retry_same": "ASK_QUESTION",
    "reteach": "EXPLAIN_CONCEPT",
    "review_prerequisite": "REVIEW_PREREQUISITE",
    "remediate": "REMEDIATE_MISCONCEPTION",
    "easier_question": "ENCOURAGE_STUDENT",
    "harder_question": "ASK_QUESTION",
}


def resolve_tutor_action(
    teaching_action: NextActionType | TutorAction | str | None,
    *,
    misconception: str | None = None,
    frustrated: bool = False,
) -> TutorAction:
    """Map an upstream teaching intent to a TutorAction."""
    if teaching_action in TUTOR_ACTIONS:
        action: TutorAction = teaching_action  # type: ignore[assignment]
    elif teaching_action in _NEXT_TO_TUTOR:
        action = _NEXT_TO_TUTOR[teaching_action]  # type: ignore[index]
    else:
        action = "EXPLAIN_CONCEPT"

    if misconception and action == "EXPLAIN_CONCEPT":
        return "REMEDIATE_MISCONCEPTION"
    if frustrated and action not in {"REVIEW_PREREQUISITE", "ADVANCE_TOPIC", "GIVE_HINT"}:
        return "ENCOURAGE_STUDENT"
    return action


def teaching_format_from_preferences(
    preferences: LearningPreferences,
    tutor_action: TutorAction,
) -> TeachingFormat:
    """Pick a default teaching format before / without the LLM."""
    if tutor_action == "GIVE_HINT":
        return "step_by_step"
    if tutor_action == "REMEDIATE_MISCONCEPTION":
        return "analogy" if preferences.prefers_visuals else "explanation"
    if tutor_action == "ENCOURAGE_STUDENT":
        return "worked_example" if preferences.example_first else "step_by_step"
    if preferences.prefers_visuals:
        return "visual"
    if preferences.example_first:
        return "worked_example"
    if preferences.explanation_length == "detailed":
        return "step_by_step"
    return "explanation"


def validate_tutor_action(raw: str | None, fallback: TutorAction) -> TutorAction:
    if raw in TUTOR_ACTIONS:
        return raw  # type: ignore[return-value]
    return fallback
