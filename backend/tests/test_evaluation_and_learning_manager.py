"""Focused Person 6 tests: evaluation demos + learning-manager policy."""

from __future__ import annotations

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import pytest

from src.agents import evaluation, learning_manager
from src.api.schemas import (
    Concept,
    Evaluation,
    SourceReference,
    StudentProgress,
)
from src.config import get_settings

_POLICY_PATH = (
    Path(__file__).resolve().parents[1]
    / "src"
    / "agents"
    / "learning-manager"
    / "policy.py"
)
_spec = spec_from_file_location("test_lm_policy", _POLICY_PATH)
assert _spec and _spec.loader
_policy = module_from_spec(_spec)
import sys

sys.modules[_spec.name] = _policy
_spec.loader.exec_module(_policy)


def _concepts() -> list[Concept]:
    return [
        Concept(
            id="concept_repr",
            course_id="course_demo",
            name="Graph Representation",
            description="Adjacency lists and matrices.",
            prerequisite_ids=[],
            order=0,
        ),
        Concept(
            id="concept_bfs",
            course_id="course_demo",
            name="Breadth-First Search",
            description="Level-order traversal using a queue.",
            prerequisite_ids=["concept_repr"],
            order=1,
        ),
        Concept(
            id="concept_dfs",
            course_id="course_demo",
            name="Depth-First Search",
            description="Stack/recursive deep exploration.",
            prerequisite_ids=["concept_repr"],
            order=2,
        ),
    ]


def _sources() -> list[SourceReference]:
    return [
        SourceReference(
            material_id="mat_notes",
            material_name="Chapter notes — Graph Algorithms",
            location="p. 12",
            excerpt="BFS uses a FIFO queue to expand the frontier one layer at a time.",
        )
    ]


def _progress() -> StudentProgress:
    return StudentProgress(
        student_id="stu_demo",
        course_id="course_demo",
        course_name="Graph Algorithms",
        concepts=[],
        overall_mastery=0.0,
        recommended_reviews=[],
    )


@pytest.fixture(autouse=True)
def _force_demo_mode(monkeypatch):
    """Keep Person 6 unit tests on deterministic stubs regardless of local .env."""
    get_settings.cache_clear()
    monkeypatch.setenv("OPENAI_API_KEY", "")
    get_settings.cache_clear()
    monkeypatch.setattr(evaluation, "is_openai_available", lambda: False)



def test_empty_answer_is_no_attempt():
    ev = evaluation.evaluate_answer(
        question_prompt="Which structure does BFS use?",
        student_answer="   ",
        concept_id="concept_bfs",
        concept_name="Breadth-First Search",
        source_passages=_sources(),
        prerequisite_ids=["concept_repr"],
    )
    assert ev.outcome == "no_attempt"
    assert ev.correct is False
    assert ev.score == 0.0

    action, delta = learning_manager.decide_next_action(
        concepts=_concepts(),
        current_concept_id="concept_bfs",
        evaluation=ev,
        progress=_progress(),
        current_mastery=0.2,
        prior_outcomes=[],
    )
    assert action.action == "hint"
    assert action.next_concept_id == "concept_bfs"
    assert delta == 0.0
    assert action.suggested_difficulty == "easy"


def test_correct_answer_advances():
    ev = evaluation.evaluate_answer(
        question_prompt="Which structure does BFS use?",
        student_answer="Queue",
        concept_id="concept_bfs",
        concept_name="Breadth-First Search",
        source_passages=_sources(),
        prerequisite_ids=["concept_repr"],
        current_mastery=0.75,
    )
    assert ev.outcome == "correct"
    assert ev.correct is True
    assert ev.confidence >= 0.75

    action, delta = learning_manager.decide_next_action(
        concepts=_concepts(),
        current_concept_id="concept_bfs",
        evaluation=ev,
        progress=_progress(),
        current_difficulty="easy",
        current_mastery=0.75,
        prior_outcomes=[],
    )
    assert action.action == "advance"
    assert action.next_concept_id == "concept_dfs"
    assert delta > 0
    assert action.suggested_difficulty == "medium"


def test_partially_correct_first_attempt_gets_hint():
    ev = evaluation.evaluate_answer(
        question_prompt="Which structure does BFS use?",
        student_answer="It expands in FIFO level-order",
        concept_id="concept_bfs",
        concept_name="Breadth-First Search",
        source_passages=_sources(),
        prerequisite_ids=["concept_repr"],
    )
    assert ev.outcome == "partially_correct"

    action, delta = learning_manager.decide_next_action(
        concepts=_concepts(),
        current_concept_id="concept_bfs",
        evaluation=ev,
        progress=_progress(),
        prior_outcomes=[],
    )
    assert action.action == "hint"
    assert action.next_concept_id == "concept_bfs"
    assert delta >= 0


def test_repeated_incorrect_causes_reteach():
    ev = Evaluation(
        correct=False,
        understanding="misconception",
        feedback="Still off.",
        estimated_mastery=0.2,
        source_references=_sources(),
        outcome="incorrect",
        score=0.0,
        confidence=0.8,
        misconceptions=[],
    )
    action, _delta = learning_manager.decide_next_action(
        concepts=_concepts(),
        current_concept_id="concept_bfs",
        evaluation=ev,
        progress=_progress(),
        current_difficulty="medium",
        prior_outcomes=["incorrect"],
    )
    assert action.action == "reteach"
    assert action.suggested_difficulty == "easy"


def test_prerequisite_misconception_reviews_prereq():
    ev = evaluation.evaluate_answer(
        question_prompt="Which structure does BFS use?",
        student_answer="Just an adjacency matrix",
        concept_id="concept_bfs",
        concept_name="Breadth-First Search",
        source_passages=_sources(),
        prerequisite_ids=["concept_repr"],
    )
    assert ev.outcome == "incorrect"
    assert ev.understanding == "missing_prerequisite"
    assert any(m.related_prerequisite_id == "concept_repr" for m in ev.misconceptions)

    action, delta = learning_manager.decide_next_action(
        concepts=_concepts(),
        current_concept_id="concept_bfs",
        evaluation=ev,
        progress=_progress(),
        current_difficulty="medium",
        prior_outcomes=[],
    )
    assert action.action == "review_prerequisite"
    assert action.next_concept_id == "concept_repr"
    assert action.suggested_difficulty == "easy"
    assert delta < 0


def test_first_incorrect_retries():
    ev = Evaluation(
        correct=False,
        understanding="partial",
        feedback="Not quite.",
        estimated_mastery=0.2,
        source_references=_sources(),
        outcome="incorrect",
        score=0.0,
        confidence=0.7,
        misconceptions=[],
    )
    action, _delta = learning_manager.decide_next_action(
        concepts=_concepts(),
        current_concept_id="concept_bfs",
        evaluation=ev,
        progress=_progress(),
        prior_outcomes=[],
    )
    assert action.action == "retry"


def test_difficulty_shift_clamped():
    assert _policy.shift_difficulty("easy", -1) == "easy"
    assert _policy.shift_difficulty("hard", 1) == "hard"
    assert _policy.shift_difficulty("medium", 1) == "hard"
    assert _policy.shift_difficulty("medium", -1) == "easy"


def test_score_confidence_clamped_on_policy_mastery_delta():
    delta = _policy.clamp_mastery_delta(5.0)
    assert delta == 0.25
    delta_low = _policy.clamp_mastery_delta(-5.0)
    assert delta_low == -0.25


def test_evaluation_rejects_blank_via_outcome_contract():
    """Input validation: whitespace-only answers are handled as no_attempt."""
    for answer in ("", " ", "\n\t"):
        ev = evaluation.evaluate_answer(
            question_prompt="Q?",
            student_answer=answer,
            concept_id="concept_bfs",
            concept_name="BFS",
            source_passages=_sources(),
        )
        assert ev.outcome == "no_attempt"
