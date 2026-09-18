"""
Learning Manager Agent — Person 6 plug point.

Next-action selection is implemented as explicit, testable rules in `policy.py`
(not an LLM call). Agents propose; mastery writes go through services/ (Person 7).
"""

from __future__ import annotations

import sys
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from src.api.schemas import (
    Concept,
    Difficulty,
    Evaluation,
    EvaluationOutcome,
    NextAction,
    StudentProgress,
)

_POLICY_PATH = Path(__file__).resolve().parent / "policy.py"
_spec = spec_from_file_location("agents_learning_manager_policy", _POLICY_PATH)
if _spec is None or _spec.loader is None:
    raise ImportError(f"Cannot load learning-manager policy from {_POLICY_PATH}")
_policy = module_from_spec(_spec)
# Required before exec_module so @dataclass can resolve cls.__module__
sys.modules[_spec.name] = _policy
_spec.loader.exec_module(_policy)
decision_from_evaluation = _policy.decision_from_evaluation


def decide_next_action(
    *,
    concepts: list[Concept],
    current_concept_id: str,
    evaluation: Evaluation,
    progress: StudentProgress,
    current_difficulty: Difficulty = "easy",
    current_mastery: float | None = None,
    prior_outcomes: list[EvaluationOutcome] | None = None,
    hint_count: int = 0,
) -> tuple[NextAction, float]:
    """
    Choose next teaching action + mastery_delta from evaluation evidence.

    Returns
    -------
    (NextAction, mastery_delta)
    """
    mastery = current_mastery
    if mastery is None:
        match = next(
            (c for c in progress.concepts if c.concept_id == current_concept_id),
            None,
        )
        mastery = match.mastery_score if match else 0.0

    return decision_from_evaluation(
        evaluation=evaluation,
        concepts=concepts,
        current_concept_id=current_concept_id,
        current_difficulty=current_difficulty,
        current_mastery=mastery,
        prior_outcomes=list(prior_outcomes or []),
        hint_count=hint_count,
    )
