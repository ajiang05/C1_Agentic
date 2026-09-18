"""
Learning Manager decision policy — Person 6.

Pure, testable rules (no LLM). Thresholds are named constants for demo tuning.
"""

from __future__ import annotations

from dataclasses import dataclass

from src.api.schemas import (
    Concept,
    Difficulty,
    Evaluation,
    EvaluationOutcome,
    Misconception,
    NextAction,
    NextActionType,
)

# --- Tunable thresholds (demo knobs) ---

HIGH_CONFIDENCE = 0.75
STRONG_MASTERY = 0.7
MEANINGFUL_PARTIAL_SCORE = 0.45
REPEATED_FAILURE_THRESHOLD = 2
PREREQ_MISCONCEPTION_CONFIDENCE = 0.6

MASTERY_DELTA_CORRECT = 0.15
MASTERY_DELTA_PARTIAL_FIRST = 0.05
MASTERY_DELTA_PARTIAL_REPEAT = 0.0
MASTERY_DELTA_INCORRECT = -0.05
MASTERY_DELTA_NO_ATTEMPT = 0.0
MASTERY_DELTA_PREREQ = -0.08
MASTERY_DELTA_RETEACH = -0.03

DIFFICULTY_ORDER: tuple[Difficulty, ...] = ("easy", "medium", "hard")


@dataclass(frozen=True)
class PolicyDecision:
    action: NextActionType
    reason: str
    next_concept_id: str
    suggested_difficulty: Difficulty
    mastery_delta: float


def clamp_mastery_delta(delta: float) -> float:
    return max(-0.25, min(0.25, float(delta)))


def shift_difficulty(current: Difficulty, steps: int) -> Difficulty:
    idx = DIFFICULTY_ORDER.index(current)
    return DIFFICULTY_ORDER[max(0, min(len(DIFFICULTY_ORDER) - 1, idx + steps))]


def _next_concept_id(concepts: list[Concept], current_concept_id: str) -> str:
    ordered = sorted(concepts, key=lambda c: c.order)
    idx = next((i for i, c in enumerate(ordered) if c.id == current_concept_id), 0)
    if not ordered:
        return current_concept_id
    return ordered[min(idx + 1, len(ordered) - 1)].id


def _current_concept(concepts: list[Concept], current_concept_id: str) -> Concept | None:
    return next((c for c in concepts if c.id == current_concept_id), None)


def _strong_prereq_misconception(
    misconceptions: list[Misconception],
) -> Misconception | None:
    candidates = [
        m
        for m in misconceptions
        if m.related_prerequisite_id
        and m.confidence >= PREREQ_MISCONCEPTION_CONFIDENCE
        and m.evidence.strip()
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda m: m.confidence)


def _count_recent_failures(prior_outcomes: list[EvaluationOutcome]) -> int:
    """Count trailing incorrect / no_attempt outcomes on this concept."""
    count = 0
    for outcome in reversed(prior_outcomes):
        if outcome in {"incorrect", "no_attempt"}:
            count += 1
        else:
            break
    return count


def choose_policy(
    *,
    outcome: EvaluationOutcome,
    score: float,
    confidence: float,
    misconceptions: list[Misconception],
    current_difficulty: Difficulty,
    current_mastery: float,
    prior_outcomes: list[EvaluationOutcome],
    hint_count: int,
    concepts: list[Concept],
    current_concept_id: str,
) -> PolicyDecision:
    """
    Default decision rules (see Person 6 brief / adaptive-teaching feature doc).

    1. no_attempt → hint, same difficulty, no mastery gain
    2. correct + high confidence → advance; raise difficulty if mastery already strong
    3. partially_correct first attempt → hint; small mastery bump if meaningful
    4. partially_correct after hint/repeat → reteach; reduce or retain difficulty
    5. incorrect first, no clear prereq gap → retry (retain/reduce difficulty)
    6. repeatedly incorrect → reteach; reduce difficulty
    7. incorrect + strong prereq evidence → review_prerequisite; reduce difficulty
    """
    current = _current_concept(concepts, current_concept_id)
    prior_failures = _count_recent_failures(prior_outcomes)
    attempt_number = len(prior_outcomes) + 1
    had_prior_partial_or_hint = hint_count > 0 or any(
        o == "partially_correct" for o in prior_outcomes
    )
    prereq_gap = _strong_prereq_misconception(misconceptions)

    if outcome == "no_attempt":
        return PolicyDecision(
            action="hint",
            reason="Empty/no meaningful attempt; offer a hint without changing mastery.",
            next_concept_id=current_concept_id,
            suggested_difficulty=current_difficulty,
            mastery_delta=clamp_mastery_delta(MASTERY_DELTA_NO_ATTEMPT),
        )

    if outcome == "correct" and confidence >= HIGH_CONFIDENCE:
        raise_diff = current_mastery >= STRONG_MASTERY
        return PolicyDecision(
            action="advance",
            reason=(
                "High-confidence correct answer; advance along the journey"
                + (" and raise difficulty." if raise_diff else ".")
            ),
            next_concept_id=_next_concept_id(concepts, current_concept_id),
            suggested_difficulty=(
                shift_difficulty(current_difficulty, 1)
                if raise_diff
                else current_difficulty
            ),
            mastery_delta=clamp_mastery_delta(MASTERY_DELTA_CORRECT),
        )

    if outcome == "correct":
        # Correct but lower confidence — still advance gently
        return PolicyDecision(
            action="advance",
            reason="Correct answer with moderate confidence; advance carefully.",
            next_concept_id=_next_concept_id(concepts, current_concept_id),
            suggested_difficulty=current_difficulty,
            mastery_delta=clamp_mastery_delta(MASTERY_DELTA_CORRECT * 0.7),
        )

    if outcome == "partially_correct":
        if attempt_number == 1 and not had_prior_partial_or_hint:
            delta = (
                MASTERY_DELTA_PARTIAL_FIRST
                if score >= MEANINGFUL_PARTIAL_SCORE
                else 0.0
            )
            return PolicyDecision(
                action="hint",
                reason="First partially correct attempt; hint without revealing the full answer.",
                next_concept_id=current_concept_id,
                suggested_difficulty=current_difficulty,
                mastery_delta=clamp_mastery_delta(delta),
            )
        return PolicyDecision(
            action="reteach",
            reason="Partial understanding persists after a hint/retry; reteach the concept.",
            next_concept_id=current_concept_id,
            suggested_difficulty=shift_difficulty(current_difficulty, -1),
            mastery_delta=clamp_mastery_delta(MASTERY_DELTA_PARTIAL_REPEAT),
        )

    # incorrect
    if prereq_gap is not None:
        target = prereq_gap.related_prerequisite_id or current_concept_id
        if current and target not in current.prerequisite_ids and target != current_concept_id:
            # Prefer a known prerequisite when the model id is unknown
            target = current.prerequisite_ids[0] if current.prerequisite_ids else current_concept_id
        return PolicyDecision(
            action="review_prerequisite",
            reason=(
                f"Strong evidence of a prerequisite gap ({prereq_gap.code}); "
                "review the earlier concept."
            ),
            next_concept_id=target,
            suggested_difficulty=shift_difficulty(current_difficulty, -1),
            mastery_delta=clamp_mastery_delta(MASTERY_DELTA_PREREQ),
        )

    if prior_failures + 1 >= REPEATED_FAILURE_THRESHOLD and attempt_number > 1:
        return PolicyDecision(
            action="reteach",
            reason="Repeated incorrect answers on this concept; reteach at easier difficulty.",
            next_concept_id=current_concept_id,
            suggested_difficulty=shift_difficulty(current_difficulty, -1),
            mastery_delta=clamp_mastery_delta(MASTERY_DELTA_RETEACH),
        )

    if attempt_number == 1:
        return PolicyDecision(
            action="retry",
            reason="First incorrect attempt without a clear prerequisite gap; retry same concept.",
            next_concept_id=current_concept_id,
            suggested_difficulty=current_difficulty,
            mastery_delta=clamp_mastery_delta(MASTERY_DELTA_INCORRECT),
        )

    return PolicyDecision(
        action="hint",
        reason="Incorrect after prior work; offer a hint before reteaching.",
        next_concept_id=current_concept_id,
        suggested_difficulty=shift_difficulty(current_difficulty, -1),
        mastery_delta=clamp_mastery_delta(MASTERY_DELTA_INCORRECT),
    )


def decision_from_evaluation(
    *,
    evaluation: Evaluation,
    concepts: list[Concept],
    current_concept_id: str,
    current_difficulty: Difficulty,
    current_mastery: float,
    prior_outcomes: list[EvaluationOutcome],
    hint_count: int = 0,
) -> tuple[NextAction, float]:
    policy = choose_policy(
        outcome=evaluation.outcome,
        score=evaluation.score,
        confidence=evaluation.confidence,
        misconceptions=list(evaluation.misconceptions),
        current_difficulty=current_difficulty,
        current_mastery=current_mastery,
        prior_outcomes=prior_outcomes,
        hint_count=hint_count,
        concepts=concepts,
        current_concept_id=current_concept_id,
    )
    return (
        NextAction(
            action=policy.action,
            reason=policy.reason,
            next_concept_id=policy.next_concept_id,
            suggested_difficulty=policy.suggested_difficulty,
        ),
        policy.mastery_delta,
    )
