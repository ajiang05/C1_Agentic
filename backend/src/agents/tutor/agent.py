"""
Tutor Agent — Person 5 plug point (Feature: grounded lessons & practice).

Stage rule: ONE OpenAI call for teach + question generation (single completion).
Must include source_references grounded in the provided passage pack.
Does not write mastery (Person 7) or choose journey progression (Person 6).
"""

from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from src.agents.tutor.actions import (
    TutorAction,
    resolve_tutor_action,
    teaching_format_from_preferences,
    validate_tutor_action,
)
from src.agents.tutor.prompt import LESSON_SCHEMA_HINT, TUTOR_SYSTEM_PROMPT
from src.api.schemas import (
    Difficulty,
    LearningPreferences,
    Lesson,
    LessonQuestion,
    NextActionType,
    SourceReference,
    TeachingFormat,
)
from src.llm.openai_client import complete_json, is_openai_available


class LessonGenerationResult(BaseModel):
    """Student-facing lesson plus server-only grading context."""

    lesson: Lesson
    expected_answer: str = ""
    rubric: str = ""
    tutor_action: TutorAction = "EXPLAIN_CONCEPT"


class _LlmLesson(BaseModel):
    tutor_action: str = "EXPLAIN_CONCEPT"
    guidance: str = ""
    next_step: str = ""
    title: str = ""
    teaching_content: str = ""
    teaching_format: TeachingFormat = "explanation"
    question: dict[str, Any] = Field(default_factory=dict)
    source_references: list[dict[str, Any]] = Field(default_factory=list)
    expected_answer: str = ""
    rubric: str = ""


def _default_sources(
    sources: list[SourceReference],
    *,
    concept_name: str,
) -> list[SourceReference]:
    return sources or [
        SourceReference(
            material_id="mat_notes",
            material_name="Chapter notes — Graph Algorithms",
            location="p. 11–12",
            excerpt=(
                f"{concept_name}: Breadth-first search visits vertices in order of "
                "increasing distance from the source using a FIFO queue."
            ),
        )
    ]


def _parse_refs(
    raw_list: list[Any] | None,
    fallback: list[SourceReference],
) -> list[SourceReference]:
    refs: list[SourceReference] = []
    for item in raw_list or []:
        try:
            refs.append(SourceReference.model_validate(item))
        except (ValidationError, TypeError, ValueError):
            continue
    return refs or list(fallback)


def _compose_teaching_content(
    *,
    body: str,
    guidance: str,
    next_step: str,
    tutor_action: TutorAction,
) -> str:
    """
    Student-facing block. Uses Action / Guidance / Next Step when useful,
    without exposing internal chain-of-thought.
    """
    parts = [body.strip()] if body.strip() else []
    if guidance.strip():
        parts.append(f"Guidance: {guidance.strip()}")
    if next_step.strip():
        parts.append(f"Next Step: {next_step.strip()}")
    if not parts:
        parts.append(f"Action: {tutor_action.replace('_', ' ').title()}")
    elif guidance.strip() or next_step.strip():
        # Lead with Action label only when Guidance/Next Step are present
        parts.insert(0, f"Action: {tutor_action.replace('_', ' ').title()}")
    return "\n\n".join(parts)


def _demo_lesson_payload(
    *,
    course_id: str,
    concept_id: str,
    concept_name: str,
    concept_description: str,
    sources: list[SourceReference],
    difficulty: Difficulty,
    preferences: LearningPreferences,
    tutor_action: TutorAction,
    misconception: str | None,
    prerequisite_name: str | None,
) -> LessonGenerationResult:
    refs = _default_sources(sources, concept_name=concept_name)
    fmt = teaching_format_from_preferences(preferences, tutor_action)
    prereq = prerequisite_name or "the earlier prerequisite concept"

    if tutor_action == "GIVE_HINT":
        body = (
            f"Hint for {concept_name}: think about the order of exploration. "
            "BFS expands one layer at a time — which structure gives FIFO order?"
        )
        guidance = "Use this hint, then try again without looking up the answer."
        next_step = "Answer the practice question with one clear choice or short phrase."
        prompt = f"After the hint: which structure does {concept_name} typically use for its frontier?"
        expected = "Queue"
    elif tutor_action == "REVIEW_PREREQUISITE":
        body = (
            f"Before returning to {concept_name}, quickly review {prereq}. "
            "Graphs need a representation (adjacency list/matrix) before traversal."
        )
        guidance = f"Solidify {prereq}, then we will bridge back to {concept_name}."
        next_step = f"Answer a short check on {prereq}."
        prompt = f"What does an adjacency list store for each vertex (related to {concept_name})?"
        expected = "A list (or set) of neighboring vertices"
        fmt = "explanation"
    elif tutor_action == "REMEDIATE_MISCONCEPTION":
        myth = misconception or "confusing BFS with DFS frontier behavior"
        body = (
            f"Let's clear up a common mix-up about {concept_name}: {myth}. "
            "BFS needs FIFO expansion (queue); DFS is closer to LIFO/stack or recursion."
        )
        guidance = "Compare FIFO vs LIFO, then try a fresh check question."
        next_step = "Choose the structure that matches BFS layer-by-layer search."
        prompt = f"To avoid the misconception ({myth}), what frontier does BFS use?"
        expected = "Queue"
        fmt = "analogy"
    elif tutor_action == "ADVANCE_TOPIC":
        body = (
            f"Nice progress on {concept_name}. "
            f"{concept_description or 'You are ready for a slightly richer check.'}"
        )
        guidance = "Stretch a little — same idea, a bit more precision."
        next_step = "Answer the harder practice question."
        prompt = (
            f"Why does a FIFO queue (not a stack) fit {concept_name}'s level-order expansion?"
        )
        expected = "FIFO expands nodes in the order discovered, so closer nodes finish before farther ones"
        difficulty = "medium" if difficulty == "easy" else difficulty
    elif tutor_action == "ENCOURAGE_STUDENT":
        body = (
            f"You are still learning {concept_name} — that takes practice. "
            "We will keep this step small and concrete."
        )
        guidance = "One small step is enough right now."
        next_step = "Try this easier question."
        prompt = f"True or false: {concept_name} explores neighbors level by level."
        expected = "True"
        difficulty = "easy"
        fmt = "worked_example"
    elif tutor_action == "ASK_QUESTION":
        body = (
            f"Quick check on {concept_name}. "
            f"{concept_description or 'Use the notes, then answer in your own words.'}"
        )
        guidance = "Recall first — then confirm against the source excerpt."
        next_step = "Submit one answer."
        prompt = f"Which data structure does {concept_name} typically rely on for its frontier?"
        expected = "Queue"
    else:  # EXPLAIN_CONCEPT / CLARIFY_REQUEST
        body = (
            f"{concept_name}: {concept_description or 'explore the idea with a short worked example.'} "
            "BFS expands a FIFO frontier level by level using a queue."
        )
        guidance = "Read the short explanation, then try the practice item."
        next_step = "Answer the question using the idea above."
        prompt = f"Which data structure does {concept_name} typically rely on for its frontier?"
        expected = "Queue"
        tutor_action = "EXPLAIN_CONCEPT" if tutor_action == "CLARIFY_REQUEST" else tutor_action

    teaching = _compose_teaching_content(
        body=body,
        guidance=guidance,
        next_step=next_step,
        tutor_action=tutor_action,
    )
    q_type = "true_false" if tutor_action == "ENCOURAGE_STUDENT" else "multiple_choice"
    options = (
        ["True", "False"]
        if q_type == "true_false"
        else ["Stack", "Queue", "Priority queue", "Hash set only"]
    )
    lesson = Lesson(
        id=f"lesson_{uuid.uuid4().hex[:8]}",
        concept_id=concept_id,
        course_id=course_id,
        title=concept_name,
        teaching_content=teaching,
        teaching_format=fmt,
        question=LessonQuestion(
            id=f"q_{uuid.uuid4().hex[:8]}",
            prompt=prompt,
            question_type=q_type,  # type: ignore[arg-type]
            options=options,
            difficulty=difficulty,
            source_references=refs,
        ),
        source_references=refs,
        tutor_action=tutor_action,
        guidance=guidance,
        next_step=next_step,
    )
    return LessonGenerationResult(
        lesson=lesson,
        expected_answer=expected,
        rubric=f"Accept answers equivalent to: {expected}",
        tutor_action=tutor_action,
    )


def _build_user_pack(
    *,
    concept_id: str,
    concept_name: str,
    concept_description: str,
    preferences: LearningPreferences,
    source_passages: list[SourceReference],
    difficulty: Difficulty,
    tutor_action: TutorAction,
    teaching_reason: str,
    prerequisite_ids: list[str],
    prerequisite_names: dict[str, str],
    misconception: str | None,
    recent_outcomes: list[str],
    mastery_score: float,
    frustrated: bool,
) -> str:
    prereq_lines = [
        f"- {pid}: {prerequisite_names.get(pid, pid)}" for pid in prerequisite_ids
    ] or ["- (none)"]
    return (
        f"requested_tutor_action={tutor_action}\n"
        f"teaching_reason={teaching_reason or '(none)'}\n"
        f"concept_id={concept_id}\n"
        f"concept_name={concept_name}\n"
        f"concept_description={concept_description}\n"
        f"difficulty={difficulty}\n"
        f"mastery_score={mastery_score}\n"
        f"frustrated={frustrated}\n"
        f"identified_misconception={misconception or '(none)'}\n"
        f"recent_outcomes={recent_outcomes[-5:] or ['(none)']}\n"
        f"preferences={preferences.model_dump_json()}\n"
        f"prerequisites:\n" + "\n".join(prereq_lines) + "\n"
        f"passages={ [s.model_dump() for s in source_passages] }\n"
        "Produce ONE grounded lesson + ONE practice question for this turn."
    )


def _lesson_from_llm(
    raw: dict[str, Any],
    *,
    course_id: str,
    concept_id: str,
    concept_name: str,
    concept_description: str,
    sources: list[SourceReference],
    difficulty: Difficulty,
    fallback_action: TutorAction,
    preferences: LearningPreferences,
) -> LessonGenerationResult:
    parsed = _LlmLesson.model_validate(raw)
    tutor_action = validate_tutor_action(parsed.tutor_action, fallback_action)
    refs = _parse_refs(parsed.source_references, sources)
    q_raw = parsed.question or {}
    q_refs = _parse_refs(q_raw.get("source_references"), refs)
    fmt_raw = parsed.teaching_format
    if fmt_raw not in {
        "explanation",
        "worked_example",
        "analogy",
        "visual",
        "step_by_step",
    }:
        fmt_raw = teaching_format_from_preferences(preferences, tutor_action)

    guidance = (parsed.guidance or "").strip()
    next_step = (parsed.next_step or "").strip()
    body = (parsed.teaching_content or concept_description or concept_name).strip()
    teaching = _compose_teaching_content(
        body=body,
        guidance=guidance,
        next_step=next_step,
        tutor_action=tutor_action,
    )
    q_difficulty = q_raw.get("difficulty", difficulty)
    if q_difficulty not in {"easy", "medium", "hard"}:
        q_difficulty = difficulty
    q_type = q_raw.get("question_type") or "short_answer"
    if q_type not in {
        "multiple_choice",
        "true_false",
        "short_answer",
        "explain",
        "apply",
    }:
        q_type = "short_answer"

    lesson = Lesson(
        id=f"lesson_{uuid.uuid4().hex[:8]}",
        concept_id=concept_id,
        course_id=course_id,
        title=parsed.title.strip() or concept_name,
        teaching_content=teaching,
        teaching_format=fmt_raw,
        question=LessonQuestion(
            id=f"q_{uuid.uuid4().hex[:8]}",
            prompt=q_raw.get("prompt") or f"Explain {concept_name} briefly.",
            question_type=q_type,
            options=q_raw.get("options"),
            difficulty=q_difficulty,
            source_references=q_refs,
        ),
        source_references=refs,
        tutor_action=tutor_action,
        guidance=guidance or None,
        next_step=next_step or None,
    )
    return LessonGenerationResult(
        lesson=lesson,
        expected_answer=(parsed.expected_answer or "").strip(),
        rubric=(parsed.rubric or "").strip(),
        tutor_action=tutor_action,
    )


def generate_lesson(
    *,
    course_id: str,
    concept_id: str,
    concept_name: str,
    concept_description: str,
    preferences: LearningPreferences,
    source_passages: list[SourceReference],
    difficulty: Difficulty = "easy",
    teaching_action: NextActionType | TutorAction | str | None = None,
    teaching_reason: str = "",
    prerequisite_ids: list[str] | None = None,
    prerequisite_names: dict[str, str] | None = None,
    misconception: str | None = None,
    recent_outcomes: list[str] | None = None,
    mastery_score: float = 0.0,
    frustrated: bool = False,
) -> LessonGenerationResult:
    """
    Build teach content + one practice question — single LLM invocation when enabled.

    Returns LessonGenerationResult so services can persist expected_answer/rubric
    server-side without exposing them on the public Lesson response.
    """
    prereq_ids = list(prerequisite_ids or [])
    prereq_names = dict(prerequisite_names or {})
    tutor_action = resolve_tutor_action(
        teaching_action,
        misconception=misconception,
        frustrated=frustrated,
    )
    sources = _default_sources(source_passages, concept_name=concept_name)
    prereq_name = None
    if prereq_ids:
        prereq_name = prereq_names.get(prereq_ids[0], prereq_ids[0])

    if not is_openai_available():
        return _demo_lesson_payload(
            course_id=course_id,
            concept_id=concept_id,
            concept_name=concept_name,
            concept_description=concept_description,
            sources=sources,
            difficulty=difficulty,
            preferences=preferences,
            tutor_action=tutor_action,
            misconception=misconception,
            prerequisite_name=prereq_name,
        )

    user = _build_user_pack(
        concept_id=concept_id,
        concept_name=concept_name,
        concept_description=concept_description,
        preferences=preferences,
        source_passages=sources,
        difficulty=difficulty,
        tutor_action=tutor_action,
        teaching_reason=teaching_reason,
        prerequisite_ids=prereq_ids,
        prerequisite_names=prereq_names,
        misconception=misconception,
        recent_outcomes=list(recent_outcomes or []),
        mastery_score=mastery_score,
        frustrated=frustrated,
    )
    try:
        raw = complete_json(
            system=TUTOR_SYSTEM_PROMPT,
            user=user,
            schema_hint=LESSON_SCHEMA_HINT,
        )
        return _lesson_from_llm(
            raw,
            course_id=course_id,
            concept_id=concept_id,
            concept_name=concept_name,
            concept_description=concept_description,
            sources=sources,
            difficulty=difficulty,
            fallback_action=tutor_action,
            preferences=preferences,
        )
    except Exception:
        return _demo_lesson_payload(
            course_id=course_id,
            concept_id=concept_id,
            concept_name=concept_name,
            concept_description=concept_description,
            sources=sources,
            difficulty=difficulty,
            preferences=preferences,
            tutor_action=tutor_action,
            misconception=misconception,
            prerequisite_name=prereq_name,
        )


# Back-compat: callers that expect Lesson only
def generate_lesson_model(**kwargs: Any) -> Lesson:
    return generate_lesson(**kwargs).lesson
