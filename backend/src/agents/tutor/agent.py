"""
Tutor Agent — Person 5 plug point.

Stage rule: ONE OpenAI call for teach + question generation (single completion).
Must include source_references grounded in the provided passage pack.
"""

from __future__ import annotations

import uuid

from src.api.schemas import (
    Difficulty,
    LearningPreferences,
    Lesson,
    LessonQuestion,
    SourceReference,
)
from src.llm.openai_client import complete_json, is_openai_available


def _demo_lesson(
    *,
    course_id: str,
    concept_id: str,
    concept_name: str,
    sources: list[SourceReference],
    difficulty: Difficulty,
) -> Lesson:
    refs = sources or [
        SourceReference(
            material_id="mat_notes",
            material_name="Chapter notes — Graph Algorithms",
            location="p. 11–12",
            excerpt="Breadth-first search visits vertices in order of increasing distance from the source.",
        )
    ]
    return Lesson(
        id=f"lesson_{uuid.uuid4().hex[:8]}",
        concept_id=concept_id,
        course_id=course_id,
        title=concept_name,
        teaching_content=(
            f"{concept_name}: explore the idea with a short worked example. "
            "BFS expands a FIFO frontier level by level using a queue."
        ),
        teaching_format="worked_example",
        question=LessonQuestion(
            id=f"q_{uuid.uuid4().hex[:8]}",
            prompt=f"Which data structure does {concept_name} typically rely on for its frontier?",
            question_type="multiple_choice",
            options=["Stack", "Queue", "Priority queue", "Hash set only"],
            difficulty=difficulty,
            source_references=refs,
        ),
        source_references=refs,
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
) -> Lesson:
    """Build teach content + one practice question — single LLM invocation when enabled."""
    if not is_openai_available():
        return _demo_lesson(
            course_id=course_id,
            concept_id=concept_id,
            concept_name=concept_name,
            sources=source_passages,
            difficulty=difficulty,
        )

    # TODO(Person 5): refine teaching_format selection from preferences
    # TODO(Person 5): refine teaching_format selection from preferences
    system_rules = [
        "You are the Tutor Agent. Produce ONE lesson JSON with teaching_content, ",
        "teaching_format, and one question. Every lesson and question MUST include ",
        "source_references drawn only from the provided passages. ",
        'Shape: {"title","teaching_content","teaching_format","question":',
        '{"prompt","question_type","options","difficulty","source_references":[...]},',
        '"source_references":[...]}'
    ]
    
    if preferences.information_density == "bulleted_summary":
        system_rules.append("CRITICAL: The student loses focus with long paragraphs. You MUST format your lesson exclusively in short, punchy bullet points. Keep engagement extremely high.")
    elif preferences.information_density == "simple_bolded":
        system_rules.append("CRITICAL: Use simple, highly-decodable vocabulary. Avoid complex sentence structures and double-negatives. Bold the most important keywords to guide the student's eyes.")
        
    if preferences.engagement_style == "gamified":
        system_rules.append("Adopt an energetic, gamified tone. Celebrate small wins wildly. Use emojis strategically to hold attention.")

    system = " ".join(system_rules)
    prefs = preferences.model_dump_json()
    passages = [s.model_dump() for s in source_passages]
    user = (
        f"concept_id={concept_id}\nname={concept_name}\n"
        f"description={concept_description}\ndifficulty={difficulty}\n"
        f"preferences={prefs}\npassages={passages}"
    )
    try:
        raw = complete_json(system=system, user=user)
    except Exception:
        return _demo_lesson(
            course_id=course_id,
            concept_id=concept_id,
            concept_name=concept_name,
            sources=source_passages,
            difficulty=difficulty,
        )
    refs = [
        SourceReference.model_validate(r)
        for r in raw.get("source_references", source_passages and [source_passages[0].model_dump()])
    ] or source_passages
    q_raw = raw.get("question", {})
    q_refs = [
        SourceReference.model_validate(r)
        for r in q_raw.get("source_references", refs and [refs[0].model_dump()])
    ] or refs
    return Lesson(
        id=f"lesson_{uuid.uuid4().hex[:8]}",
        concept_id=concept_id,
        course_id=course_id,
        title=raw.get("title", concept_name),
        teaching_content=raw.get("teaching_content", concept_description),
        teaching_format=raw.get("teaching_format", "explanation"),
        question=LessonQuestion(
            id=f"q_{uuid.uuid4().hex[:8]}",
            prompt=q_raw.get("prompt", f"Explain {concept_name} briefly."),
            question_type=q_raw.get("question_type", "short_answer"),
            options=q_raw.get("options"),
            difficulty=q_raw.get("difficulty", difficulty),
            source_references=q_refs,
        ),
        source_references=refs,
    )
