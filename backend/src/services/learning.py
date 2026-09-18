"""
Learning workflow + mastery persistence — Person 7 primary plug point.

Agents propose evaluation / next_action; THIS module is the only path that
records attempts and applies mastery updates.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from src.agents import curriculum, evaluation, learning_manager, tutor
from src.api.schemas import (
    Attempt,
    CreateStudentResponse,
    Difficulty,
    GenerateJourneyResponse,
    JourneyNode,
    LearningJourney,
    LearningPreferences,
    Lesson,
    NextActionType,
    StudentProgress,
    SubmitAttemptRequest,
    SubmitAttemptResponse,
    UploadCourseResponse,
)
from src.db.memory_store import PendingTeaching, QuestionKey, get_store
from src.db.supabase_client import upload_to_storage
from src.ingestion.pipeline import ingest_upload
from src.retrieval.passages import select_passages

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"


def create_student(display_name: str, auth_user_id: str | None = None) -> CreateStudentResponse:
    student = get_store().create_student(display_name, auth_user_id=auth_user_id)
    # TODO(Person 7): upsert into profiles when persistence_mode == supabase
    return CreateStudentResponse(student_id=student.id, display_name=student.display_name)


def update_preferences(student_id: str, preferences: LearningPreferences) -> LearningPreferences:
    store = get_store()
    if store.get_student(student_id) is None:
        raise KeyError(f"Unknown student_id: {student_id}")
    return store.update_preferences(student_id, preferences).preferences


async def upload_course(
    *,
    student_id: str,
    course_name: str,
    syllabus_name: str,
    syllabus_bytes: bytes,
    notes_name: str,
    notes_bytes: bytes,
) -> UploadCourseResponse:
    store = get_store()
    if store.get_student(student_id) is None:
        raise KeyError(f"Unknown student_id: {student_id}")

    course = store.create_course(student_id, course_name or "Untitled course")
    material_ids: list[str] = []

    for kind, filename, raw in (
        ("syllabus", syllabus_name, syllabus_bytes),
        ("notes", notes_name, notes_bytes),
    ):
        material_id = f"mat_{uuid4().hex[:8]}"
        storage_rel = f"{course.id}/{material_id}_{filename}"
        storage_path = upload_to_storage(
            path=storage_rel,
            data=raw,
            content_type="text/plain",
        )
        # Always keep a local copy for demo/retrieval when Storage is stubbed
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        local_path = UPLOAD_DIR / storage_rel.replace("/", "_")
        local_path.write_bytes(raw)

        ingested = ingest_upload(
            material_id=material_id,
            filename=filename,
            raw_bytes=raw,
            storage_path=storage_path,
        )
        from src.db.memory_store import MaterialRecord

        course.materials.append(
            MaterialRecord(
                id=material_id,
                course_id=course.id,
                name=ingested.material_name,
                text=ingested.text,
                storage_path=storage_path,
                kind=kind,
            )
        )
        material_ids.append(material_id)

    return UploadCourseResponse(
        course_id=course.id,
        course_name=course.course_name,
        material_ids=material_ids,
        message="Materials uploaded. Call POST /courses/{id}/journey to generate the path.",
    )


def generate_journey(course_id: str, student_id: str) -> GenerateJourneyResponse:
    store = get_store()
    course = store.get_course(course_id)
    if course is None:
        raise KeyError(f"Unknown course_id: {course_id}")
    if course.student_id != student_id:
        raise PermissionError("student_id does not own this course")

    syllabus = next((m for m in course.materials if m.kind == "syllabus"), None)
    notes = next((m for m in course.materials if m.kind == "notes"), None)
    concepts = curriculum.generate_concepts(
        course_id,
        syllabus.text if syllabus else "",
        notes.text if notes else "",
    )
    store.set_concepts(course_id, concepts)
    progress = store.build_progress(student_id, course_id)
    nodes = [
        JourneyNode(
            concept=c,
            status=next(m.status for m in progress.concepts if m.concept_id == c.id),
            mastery_score=next(m.mastery_score for m in progress.concepts if m.concept_id == c.id),
        )
        for c in concepts
    ]
    journey = LearningJourney(
        course_id=course_id,
        course_name=course.course_name,
        student_id=student_id,
        nodes=nodes,
        current_concept_id=course.current_concept_id,
    )
    return GenerateJourneyResponse(journey=journey)


def get_journey(course_id: str, student_id: str) -> LearningJourney:
    store = get_store()
    course = store.get_course(course_id)
    if course is None:
        raise KeyError(f"Unknown course_id: {course_id}")
    progress = store.build_progress(student_id, course_id)
    nodes = [
        JourneyNode(
            concept=c,
            status=next(m.status for m in progress.concepts if m.concept_id == c.id),
            mastery_score=next(m.mastery_score for m in progress.concepts if m.concept_id == c.id),
        )
        for c in course.concepts
    ]
    return LearningJourney(
        course_id=course_id,
        course_name=course.course_name,
        student_id=student_id,
        nodes=nodes,
        current_concept_id=course.current_concept_id,
    )


def open_lesson(
    course_id: str,
    concept_id: str,
    student_id: str,
    *,
    teaching_action: NextActionType | str | None = None,
    difficulty: Difficulty | None = None,
) -> Lesson:
    """
    Tutor stage: grounded lesson + one practice question (one LLM call).

    Uses Learning Manager pending_teaching when present so adaptive actions
    (hint / reteach / prerequisite review) shape the next lesson.
    """
    store = get_store()
    course = store.get_course(course_id)
    student = store.get_student(student_id)
    if course is None or student is None:
        raise KeyError("Unknown course or student")
    concept = next((c for c in course.concepts if c.id == concept_id), None)
    if concept is None:
        raise KeyError(f"Unknown concept_id: {concept_id}")

    pending = course.pending_teaching
    action = teaching_action or (pending.action if pending else None) or "reteach"
    diff: Difficulty = difficulty or (  # type: ignore[assignment]
        pending.difficulty if pending and pending.difficulty in {"easy", "medium", "hard"} else "easy"
    )
    misconception = pending.misconception if pending else None
    reason = pending.reason if pending else ""

    mastery_rec = store.mastery.get((student_id, concept_id))
    mastery_score = mastery_rec.mastery_score if mastery_rec else 0.0
    prior_raw = [
        a
        for a in store.attempts
        if a.get("student_id") == student_id and a.get("concept_id") == concept_id
    ]
    recent_outcomes = [
        "correct" if a.get("correct") else "incorrect" for a in prior_raw[-5:]
    ]
    # Light frustration signal: trailing misses without a recent success
    frustrated = len(recent_outcomes) >= 2 and all(
        o == "incorrect" for o in recent_outcomes[-2:]
    )

    prereq_names = {
        c.id: c.name for c in course.concepts if c.id in concept.prerequisite_ids
    }
    materials = [{"id": m.id, "name": m.name, "text": m.text} for m in course.materials]
    passages = select_passages(concept_name=concept.name, materials=materials)

    result = tutor.generate_lesson(
        course_id=course_id,
        concept_id=concept.id,
        concept_name=concept.name,
        concept_description=concept.description,
        preferences=student.preferences,
        source_passages=passages,
        difficulty=diff,
        teaching_action=action,
        teaching_reason=reason,
        prerequisite_ids=list(concept.prerequisite_ids),
        prerequisite_names=prereq_names,
        misconception=misconception,
        recent_outcomes=recent_outcomes,
        mastery_score=mastery_score,
        frustrated=frustrated,
    )
    store.save_question_key(
        QuestionKey(
            question_id=result.lesson.question.id,
            expected_answer=result.expected_answer,
            rubric=result.rubric,
            concept_id=concept.id,
            course_id=course_id,
        )
    )
    return result.lesson


def submit_attempt(payload: SubmitAttemptRequest) -> SubmitAttemptResponse:
    store = get_store()
    course = store.get_course(payload.course_id)
    student = store.get_student(payload.student_id)
    if course is None or student is None:
        raise KeyError("Unknown course or student")
    concept = next((c for c in course.concepts if c.id == payload.concept_id), None)
    if concept is None:
        raise KeyError(f"Unknown concept_id: {payload.concept_id}")

    materials = [{"id": m.id, "name": m.name, "text": m.text} for m in course.materials]
    passages = select_passages(concept_name=concept.name, materials=materials)

    mastery_key = (payload.student_id, payload.concept_id)
    mastery_rec = store.mastery.get(mastery_key)
    current_mastery = mastery_rec.mastery_score if mastery_rec else 0.0

    prior_raw = [
        a
        for a in store.attempts
        if a.get("student_id") == payload.student_id
        and a.get("concept_id") == payload.concept_id
    ]
    # TODO(Person 5/7): persist outcome + difficulty on Attempt for richer history
    prior_attempts = [
        evaluation.PriorAttemptSummary(
            student_answer=str(a.get("student_answer", "")),
            outcome="correct" if a.get("correct") else "incorrect",
            misconception_codes=[],
        )
        for a in prior_raw
    ]
    prior_outcomes = [p.outcome for p in prior_attempts]
    prereq_names = {
        c.id: c.name for c in course.concepts if c.id in concept.prerequisite_ids
    }

    q_key = store.get_question_key(payload.question_id)
    pending = course.pending_teaching
    current_difficulty: Difficulty = "easy"
    if pending and pending.difficulty in {"easy", "medium", "hard"}:
        current_difficulty = pending.difficulty  # type: ignore[assignment]

    # Stage: Evaluation (one LLM call inside agent when enabled)
    ev = evaluation.evaluate_answer(
        question_prompt=payload.question_prompt,
        student_answer=payload.student_answer,
        concept_id=concept.id,
        concept_name=concept.name,
        concept_description=concept.description,
        prerequisite_ids=list(concept.prerequisite_ids),
        prerequisite_names=prereq_names,
        source_passages=passages,
        question_id=payload.question_id,
        expected_answer=q_key.expected_answer if q_key else None,
        current_difficulty=current_difficulty,
        current_mastery=current_mastery,
        prior_attempts=prior_attempts,
    )

    progress_before = store.build_progress(payload.student_id, payload.course_id)

    # Stage: Learning Manager (explicit rules — no LLM)
    next_action, mastery_delta = learning_manager.decide_next_action(
        concepts=course.concepts,
        current_concept_id=payload.concept_id,
        evaluation=ev,
        progress=progress_before,
        current_difficulty=current_difficulty,
        current_mastery=current_mastery,
        prior_outcomes=prior_outcomes,
    )
    estimated = max(0.0, min(1.0, current_mastery + mastery_delta))
    ev = ev.model_copy(
        update={
            "mastery_delta": mastery_delta,
            "estimated_mastery": estimated,
        }
    )

    # Single persistence path for mastery
    store.apply_mastery_update(
        student_id=payload.student_id,
        concept_id=payload.concept_id,
        estimated_mastery=estimated,
        correct=ev.correct,
    )
    progress = store.build_progress(payload.student_id, payload.course_id)
    course.current_concept_id = next_action.next_concept_id
    store.set_pending_teaching(
        payload.course_id,
        PendingTeaching(
            action=next_action.action,
            reason=next_action.reason,
            difficulty=next_action.suggested_difficulty,
            misconception=ev.identified_misconception,
            concept_id=next_action.next_concept_id,
        ),
    )

    attempt = Attempt(
        id=f"att_{uuid4().hex[:8]}",
        student_id=payload.student_id,
        course_id=payload.course_id,
        concept_id=payload.concept_id,
        question_id=payload.question_id,
        question_prompt=payload.question_prompt,
        student_answer=payload.student_answer,
        correct=ev.correct,
        identified_misconception=ev.identified_misconception,
        created_at=datetime.now(timezone.utc),
    )
    store.attempts.append(attempt.model_dump(mode="json"))
    # TODO(Person 7): insert into attempts + student_concept_mastery via Supabase
    # Persist outcome/score/next_action/mastery_delta alongside the attempt when schema lands.

    return SubmitAttemptResponse(
        attempt=attempt,
        evaluation=ev,
        next_action=next_action,
        progress=progress,
    )


def get_progress(student_id: str, course_id: str) -> StudentProgress:
    store = get_store()
    if store.get_course(course_id) is None:
        raise KeyError(f"Unknown course_id: {course_id}")
    return store.build_progress(student_id, course_id)
