"""
In-memory store for local demo when Supabase env vars are empty.
Person 7 replaces call sites with Postgres via supabase_client.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from src.api.schemas import (
    Concept,
    ConceptMastery,
    LearningPreferences,
    StudentProgress,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class StudentRecord:
    id: str
    display_name: str
    preferences: LearningPreferences = field(default_factory=LearningPreferences)
    auth_user_id: str | None = None


@dataclass
class MaterialRecord:
    id: str
    course_id: str
    name: str
    text: str
    storage_path: str | None
    kind: str  # syllabus | notes
    chunks: list[dict] = field(default_factory=list)


@dataclass
class PendingTeaching:
    """Last Learning Manager decision for the next Tutor stage."""

    action: str = "reteach"
    reason: str = ""
    difficulty: str = "easy"
    misconception: str | None = None
    concept_id: str | None = None


@dataclass
class QuestionKey:
    """Server-only answer key / rubric for a generated practice question."""

    question_id: str
    expected_answer: str
    rubric: str = ""
    concept_id: str = ""
    course_id: str = ""


@dataclass
class CourseRecord:
    id: str
    student_id: str
    course_name: str
    concepts: list[Concept] = field(default_factory=list)
    materials: list[MaterialRecord] = field(default_factory=list)
    current_concept_id: str | None = None
    pending_teaching: PendingTeaching | None = None


@dataclass
class MasteryRecord:
    student_id: str
    concept_id: str
    mastery_score: float = 0.0
    attempts: int = 0
    correct_attempts: int = 0
    last_reviewed: datetime | None = None


class MemoryStore:
    def __init__(self) -> None:
        self.students: dict[str, StudentRecord] = {}
        self.courses: dict[str, CourseRecord] = {}
        self.mastery: dict[tuple[str, str], MasteryRecord] = {}
        self.attempts: list[dict[str, Any]] = []
        self.question_keys: dict[str, QuestionKey] = {}

    def save_question_key(self, key: QuestionKey) -> None:
        self.question_keys[key.question_id] = key

    def get_question_key(self, question_id: str) -> QuestionKey | None:
        return self.question_keys.get(question_id)

    def set_pending_teaching(self, course_id: str, pending: PendingTeaching) -> None:
        course = self.courses[course_id]
        course.pending_teaching = pending

    def create_student(self, display_name: str, auth_user_id: str | None = None) -> StudentRecord:
        student = StudentRecord(
            id=f"stu_{uuid4().hex[:8]}",
            display_name=display_name,
            auth_user_id=auth_user_id,
        )
        self.students[student.id] = student
        return student

    def get_student(self, student_id: str) -> StudentRecord | None:
        return self.students.get(student_id)

    def update_preferences(self, student_id: str, preferences: LearningPreferences) -> StudentRecord:
        student = self.students[student_id]
        student.preferences = preferences
        return student

    def create_course(self, student_id: str, course_name: str) -> CourseRecord:
        course = CourseRecord(
            id=f"course_{uuid4().hex[:8]}",
            student_id=student_id,
            course_name=course_name,
        )
        self.courses[course.id] = course
        return course

    def get_course(self, course_id: str) -> CourseRecord | None:
        return self.courses.get(course_id)

    def set_concepts(self, course_id: str, concepts: list[Concept]) -> None:
        course = self.courses[course_id]
        course.concepts = concepts
        if concepts:
            course.current_concept_id = concepts[0].id
            for c in concepts:
                key = (course.student_id, c.id)
                if key not in self.mastery:
                    self.mastery[key] = MasteryRecord(
                        student_id=course.student_id,
                        concept_id=c.id,
                    )

    def apply_mastery_update(
        self,
        *,
        student_id: str,
        concept_id: str,
        estimated_mastery: float,
        correct: bool,
    ) -> MasteryRecord:
        """Single persistence path for mastery — agents must not write directly."""
        key = (student_id, concept_id)
        rec = self.mastery.get(key) or MasteryRecord(student_id=student_id, concept_id=concept_id)
        rec.attempts += 1
        if correct:
            rec.correct_attempts += 1
        # Blend prior score with evaluation estimate
        rec.mastery_score = round(min(1.0, 0.4 * rec.mastery_score + 0.6 * estimated_mastery), 3)
        rec.last_reviewed = _now()
        self.mastery[key] = rec
        return rec

    def build_progress(self, student_id: str, course_id: str) -> StudentProgress:
        course = self.courses[course_id]
        concept_masteries: list[ConceptMastery] = []
        for c in sorted(course.concepts, key=lambda x: x.order):
            rec = self.mastery.get((student_id, c.id)) or MasteryRecord(
                student_id=student_id, concept_id=c.id
            )
            if rec.mastery_score >= 0.85:
                status = "mastered"
            elif rec.attempts > 0:
                status = "in_progress" if rec.mastery_score >= 0.4 else "needs_review"
            elif c.order == 0 or all(
                (self.mastery.get((student_id, p)) or MasteryRecord(student_id, p)).mastery_score
                >= 0.5
                for p in c.prerequisite_ids
            ):
                status = "available"
            else:
                status = "locked"
            concept_masteries.append(
                ConceptMastery(
                    concept_id=c.id,
                    concept_name=c.name,
                    mastery_score=rec.mastery_score,
                    attempts=rec.attempts,
                    correct_attempts=rec.correct_attempts,
                    last_reviewed=rec.last_reviewed,
                    status=status,
                )
            )
        overall = (
            sum(m.mastery_score for m in concept_masteries) / len(concept_masteries)
            if concept_masteries
            else 0.0
        )
        reviews = [m.concept_id for m in concept_masteries if m.status == "needs_review"]
        return StudentProgress(
            student_id=student_id,
            course_id=course_id,
            course_name=course.course_name,
            concepts=concept_masteries,
            overall_mastery=round(overall, 3),
            recommended_reviews=reviews,
        )


_STORE: MemoryStore | None = None


def get_store() -> MemoryStore:
    global _STORE
    if _STORE is None:
        _STORE = MemoryStore()
    return _STORE


def reset_store() -> MemoryStore:
    global _STORE
    _STORE = MemoryStore()
    return _STORE
