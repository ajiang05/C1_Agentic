"""Pydantic models aligned with shared/contracts/types.ts."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SourceReference(BaseModel):
    material_id: str
    material_name: str
    location: str
    excerpt: str


class Concept(BaseModel):
    id: str
    course_id: str
    name: str
    description: str
    prerequisite_ids: list[str] = Field(default_factory=list)
    order: int


Difficulty = Literal["easy", "medium", "hard"]
QuestionType = Literal[
    "multiple_choice", "true_false", "short_answer", "explain", "apply"
]
TeachingFormat = Literal[
    "explanation", "worked_example", "analogy", "visual", "step_by_step"
]
Understanding = Literal[
    "strong", "partial", "misconception", "missing_prerequisite", "guessing"
]
NextActionType = Literal[
    "advance",
    "retry_same",
    "remediate",
    "review_prerequisite",
    "easier_question",
    "harder_question",
]
MasteryStatus = Literal[
    "locked", "available", "in_progress", "mastered", "needs_review"
]
ExplanationLength = Literal["short", "moderate", "detailed"]


class LessonQuestion(BaseModel):
    id: str
    prompt: str
    question_type: QuestionType
    options: list[str] | None = None
    difficulty: Difficulty
    source_references: list[SourceReference]


class Lesson(BaseModel):
    id: str
    concept_id: str
    course_id: str
    title: str
    teaching_content: str
    teaching_format: TeachingFormat
    question: LessonQuestion
    source_references: list[SourceReference]


class Evaluation(BaseModel):
    correct: bool
    understanding: Understanding
    feedback: str
    identified_misconception: str | None = None
    estimated_mastery: float
    source_references: list[SourceReference]


class NextAction(BaseModel):
    action: NextActionType
    reason: str
    next_concept_id: str
    suggested_difficulty: Difficulty


class Attempt(BaseModel):
    id: str
    student_id: str
    course_id: str
    concept_id: str
    question_id: str
    question_prompt: str
    student_answer: str
    correct: bool
    identified_misconception: str | None = None
    created_at: datetime


class LearningPreferences(BaseModel):
    example_first: bool = True
    prefers_visuals: bool = False
    explanation_length: ExplanationLength = "moderate"
    preferred_session_length: int = 10
    hint_before_solution: bool = True


class ConceptMastery(BaseModel):
    concept_id: str
    concept_name: str
    mastery_score: float
    attempts: int
    correct_attempts: int
    last_reviewed: datetime | None = None
    status: MasteryStatus


class StudentProgress(BaseModel):
    student_id: str
    course_id: str
    course_name: str
    concepts: list[ConceptMastery]
    overall_mastery: float
    recommended_reviews: list[str]


class JourneyNode(BaseModel):
    concept: Concept
    status: MasteryStatus
    mastery_score: float


class LearningJourney(BaseModel):
    course_id: str
    course_name: str
    student_id: str
    nodes: list[JourneyNode]
    current_concept_id: str | None


class CreateStudentRequest(BaseModel):
    display_name: str


class CreateStudentResponse(BaseModel):
    student_id: str
    display_name: str


class UpdatePreferencesRequest(BaseModel):
    preferences: LearningPreferences


class UploadCourseResponse(BaseModel):
    course_id: str
    course_name: str
    material_ids: list[str]
    message: str


class GenerateJourneyRequest(BaseModel):
    student_id: str


class GenerateJourneyResponse(BaseModel):
    journey: LearningJourney


class SubmitAttemptRequest(BaseModel):
    student_id: str
    course_id: str
    concept_id: str
    question_id: str
    question_prompt: str
    student_answer: str


class SubmitAttemptResponse(BaseModel):
    attempt: Attempt
    evaluation: Evaluation
    next_action: NextAction
    progress: StudentProgress


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    persistence: Literal["memory", "supabase"]
    version: str
    openai: bool = False
