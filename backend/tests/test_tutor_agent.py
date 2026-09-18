"""Person 5 TutorAgent: demo lessons, action mapping, preference formats."""

from __future__ import annotations

from src.agents import tutor
from src.agents.tutor.actions import (
    resolve_tutor_action,
    teaching_format_from_preferences,
)
from src.api.schemas import Concept, LearningPreferences, SourceReference
from src.db.memory_store import PendingTeaching, reset_store
from src.services import learning


def _prefs(**overrides: object) -> LearningPreferences:
    base = LearningPreferences()
    return base.model_copy(update=overrides)


def _sources() -> list[SourceReference]:
    return [
        SourceReference(
            material_id="mat_notes",
            material_name="Chapter notes — Graph Algorithms",
            location="p. 12",
            excerpt="BFS uses a FIFO queue to expand the frontier one layer at a time.",
        )
    ]


def _demo_concepts(course_id: str) -> list[Concept]:
    return [
        Concept(
            id="concept_repr",
            course_id=course_id,
            name="Graph Representation",
            description="Adjacency lists and matrices.",
            prerequisite_ids=[],
            order=0,
        ),
        Concept(
            id="concept_bfs",
            course_id=course_id,
            name="Breadth-First Search",
            description="Level-order traversal using a queue.",
            prerequisite_ids=["concept_repr"],
            order=1,
        ),
    ]


def test_resolve_tutor_action_maps_next_actions():
    assert resolve_tutor_action("hint") == "GIVE_HINT"
    assert resolve_tutor_action("advance") == "ADVANCE_TOPIC"
    assert resolve_tutor_action("review_prerequisite") == "REVIEW_PREREQUISITE"
    assert resolve_tutor_action("ASK_QUESTION") == "ASK_QUESTION"
    assert resolve_tutor_action(None) == "EXPLAIN_CONCEPT"


def test_resolve_tutor_action_remediates_on_reteach_with_misconception():
    assert (
        resolve_tutor_action("reteach", misconception="BFS/DFS mix-up")
        == "REMEDIATE_MISCONCEPTION"
    )
    # Hints stay hints even when a misconception was recorded
    assert resolve_tutor_action("hint", misconception="BFS/DFS mix-up") == "GIVE_HINT"


def test_teaching_format_respects_preferences():
    assert (
        teaching_format_from_preferences(_prefs(example_first=True), "EXPLAIN_CONCEPT")
        == "worked_example"
    )
    assert (
        teaching_format_from_preferences(_prefs(prefers_visuals=True), "EXPLAIN_CONCEPT")
        == "visual"
    )
    assert teaching_format_from_preferences(_prefs(), "GIVE_HINT") == "step_by_step"


def test_demo_generate_lesson_includes_sources_and_framing():
    result = tutor.generate_lesson(
        course_id="course_demo",
        concept_id="concept_bfs",
        concept_name="Breadth-First Search",
        concept_description="Level-order traversal using a queue.",
        preferences=_prefs(),
        source_passages=_sources(),
        difficulty="easy",
        teaching_action="reteach",
    )
    lesson = result.lesson
    assert lesson.source_references
    assert lesson.question.source_references
    assert lesson.tutor_action == "EXPLAIN_CONCEPT"
    assert "Guidance:" in lesson.teaching_content
    assert "Next Step:" in lesson.teaching_content
    assert result.expected_answer


def test_demo_hint_and_prerequisite_actions_differ():
    hint = tutor.generate_lesson(
        course_id="c",
        concept_id="concept_bfs",
        concept_name="Breadth-First Search",
        concept_description="BFS",
        preferences=_prefs(hint_before_solution=True),
        source_passages=_sources(),
        teaching_action="hint",
    )
    review = tutor.generate_lesson(
        course_id="c",
        concept_id="concept_bfs",
        concept_name="Breadth-First Search",
        concept_description="BFS",
        preferences=_prefs(),
        source_passages=_sources(),
        teaching_action="review_prerequisite",
        prerequisite_ids=["concept_repr"],
        prerequisite_names={"concept_repr": "Graph Representation"},
    )
    assert hint.tutor_action == "GIVE_HINT"
    assert review.tutor_action == "REVIEW_PREREQUISITE"
    assert hint.lesson.teaching_content != review.lesson.teaching_content
    assert "Graph Representation" in review.lesson.teaching_content


def test_open_lesson_persists_question_key_and_uses_pending_action():
    store = reset_store()
    student = learning.create_student("Tutor Demo")
    course = store.create_course(student.student_id, "Graph Algorithms")
    store.set_concepts(course.id, _demo_concepts(course.id))
    store.set_pending_teaching(
        course.id,
        PendingTeaching(
            action="hint",
            reason="partial credit",
            difficulty="easy",
        ),
    )

    lesson = learning.open_lesson(course.id, "concept_bfs", student.student_id)
    assert lesson.tutor_action == "GIVE_HINT"
    key = store.get_question_key(lesson.question.id)
    assert key is not None
    assert key.expected_answer
