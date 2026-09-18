"""HTTP API — Person 1 owns routes and validation."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile

from src.api.schemas import (
    CreateStudentRequest,
    CreateStudentResponse,
    GenerateJourneyRequest,
    GenerateJourneyResponse,
    HealthResponse,
    LearningJourney,
    LearningPreferences,
    Lesson,
    StudentProgress,
    SubmitAttemptRequest,
    SubmitAttemptResponse,
    UpdatePreferencesRequest,
    UploadCourseResponse,
)
from src.config import get_settings
from src.db.supabase_client import verify_access_token
from src.services import learning

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        persistence=settings.persistence_mode,
        version=settings.app_version,
        openai=settings.openai_enabled,
    )


@router.post("/students", response_model=CreateStudentResponse)
def create_student(
    body: CreateStudentRequest,
    authorization: str | None = Header(default=None),
) -> CreateStudentResponse:
    """Create a student profile. Optional Bearer token links Supabase Auth user."""
    auth_user = verify_access_token(authorization)
    auth_id = auth_user["id"] if auth_user else None
    return learning.create_student(body.display_name, auth_user_id=auth_id)


@router.put("/students/{student_id}/preferences", response_model=LearningPreferences)
def put_preferences(student_id: str, body: UpdatePreferencesRequest) -> LearningPreferences:
    try:
        return learning.update_preferences(student_id, body.preferences)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/courses/upload", response_model=UploadCourseResponse)
async def upload_course(
    student_id: str = Form(...),
    course_name: str = Form("Untitled course"),
    syllabus: UploadFile = File(...),
    notes: UploadFile = File(...),
) -> UploadCourseResponse:
    """Upload syllabus + notes. Files go to Supabase Storage when configured."""
    try:
        return await learning.upload_course(
            student_id=student_id,
            course_name=course_name,
            syllabus_name=syllabus.filename or "syllabus.txt",
            syllabus_bytes=await syllabus.read(),
            notes_name=notes.filename or "notes.txt",
            notes_bytes=await notes.read(),
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/courses/{course_id}/journey", response_model=GenerateJourneyResponse)
def post_journey(course_id: str, body: GenerateJourneyRequest) -> GenerateJourneyResponse:
    try:
        return learning.generate_journey(course_id, body.student_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.get("/courses/{course_id}/journey", response_model=LearningJourney)
def get_journey(course_id: str, student_id: str) -> LearningJourney:
    try:
        return learning.get_journey(course_id, student_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/courses/{course_id}/lessons/{concept_id}", response_model=Lesson)
def get_lesson(course_id: str, concept_id: str, student_id: str) -> Lesson:
    try:
        return learning.open_lesson(course_id, concept_id, student_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/attempts", response_model=SubmitAttemptResponse)
def post_attempt(body: SubmitAttemptRequest) -> SubmitAttemptResponse:
    """Answer → evaluate (1 LLM) → save mastery → next action (rules, no LLM)."""
    try:
        return learning.submit_attempt(body)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/students/{student_id}/progress", response_model=StudentProgress)
def get_progress(student_id: str, course_id: str) -> StudentProgress:
    try:
        return learning.get_progress(student_id, course_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
