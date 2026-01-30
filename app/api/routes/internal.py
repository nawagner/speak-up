from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from app.api.schemas import (
    TeacherCreate,
    TeacherLogin,
    TeacherResponse,
    TokenResponse,
    RubricCreate,
    RubricUpdate,
    RubricResponse,
    ExamCreate,
    ExamResponse,
    SessionTranscriptResponse,
    TranscriptEntryResponse,
    SendMessageRequest,
    OverrideQuestionRequest,
    ExamAnalytics,
)
from app.models.domain import ExamStatus
from app.services import auth as auth_service
from app.services import rubric as rubric_service
from app.services import exam as exam_service
from app.services import transcript as transcript_service
from app.services import coverage as coverage_service
from app.services import struggle as struggle_service

router = APIRouter()


# Authentication endpoints

@router.post("/auth/register", response_model=TeacherResponse)
async def register_teacher(request: TeacherCreate):
    """Register a new teacher."""
    try:
        teacher = auth_service.register_teacher(
            username=request.username,
            password=request.password,
            display_name=request.display_name,
        )
        return TeacherResponse(
            id=teacher.id,
            username=teacher.username,
            display_name=teacher.display_name,
            created_at=teacher.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/login", response_model=TokenResponse)
async def login_teacher(request: TeacherLogin):
    """Login and receive JWT token."""
    try:
        teacher, token = auth_service.login_teacher(
            username=request.username,
            password=request.password,
        )
        return TokenResponse(access_token=token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/auth/me", response_model=TeacherResponse)
async def get_current_user(teacher_id: str = Depends(auth_service.get_current_teacher)):
    """Get current authenticated teacher."""
    teacher = auth_service.get_teacher_by_id(teacher_id)
    if teacher is None:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return TeacherResponse(
        id=teacher.id,
        username=teacher.username,
        display_name=teacher.display_name,
        created_at=teacher.created_at,
    )


# Rubric endpoints

@router.post("/rubrics", response_model=RubricResponse)
async def create_rubric(
    request: RubricCreate,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """Create a new rubric and parse it with LLM."""
    # Create the rubric
    rubric = rubric_service.create_rubric(
        teacher_id=teacher_id,
        title=request.title,
        content=request.content,
    )

    # Parse the rubric content with LLM
    try:
        parsed = await coverage_service.parse_rubric(request.content)
        rubric_service.update_rubric_parsed_criteria(rubric.id, parsed)
        rubric = rubric_service.get_rubric(rubric.id)
    except Exception as e:
        # Continue even if parsing fails - can be retried later
        pass

    return RubricResponse(
        id=rubric.id,
        teacher_id=rubric.teacher_id,
        title=rubric.title,
        content=rubric.content,
        parsed_criteria=rubric.parsed_criteria.model_dump() if rubric.parsed_criteria else None,
        created_at=rubric.created_at,
        updated_at=rubric.updated_at,
    )


@router.get("/rubrics", response_model=list[RubricResponse])
async def list_rubrics(teacher_id: str = Depends(auth_service.get_current_teacher)):
    """List all rubrics for the current teacher."""
    rubrics = rubric_service.list_rubrics(teacher_id)
    return [
        RubricResponse(
            id=r.id,
            teacher_id=r.teacher_id,
            title=r.title,
            content=r.content,
            parsed_criteria=r.parsed_criteria.model_dump() if r.parsed_criteria else None,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rubrics
    ]


@router.get("/rubrics/{rubric_id}", response_model=RubricResponse)
async def get_rubric(
    rubric_id: str,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """Get a specific rubric."""
    rubric = rubric_service.get_rubric(rubric_id, teacher_id)
    if rubric is None:
        raise HTTPException(status_code=404, detail="Rubric not found")

    return RubricResponse(
        id=rubric.id,
        teacher_id=rubric.teacher_id,
        title=rubric.title,
        content=rubric.content,
        parsed_criteria=rubric.parsed_criteria.model_dump() if rubric.parsed_criteria else None,
        created_at=rubric.created_at,
        updated_at=rubric.updated_at,
    )


@router.put("/rubrics/{rubric_id}", response_model=RubricResponse)
async def update_rubric(
    rubric_id: str,
    request: RubricUpdate,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """Update a rubric."""
    rubric = rubric_service.update_rubric(
        rubric_id=rubric_id,
        teacher_id=teacher_id,
        title=request.title,
        content=request.content,
    )

    if rubric is None:
        raise HTTPException(status_code=404, detail="Rubric not found")

    # Re-parse if content changed
    if request.content:
        try:
            parsed = await coverage_service.parse_rubric(request.content)
            rubric_service.update_rubric_parsed_criteria(rubric.id, parsed)
            rubric = rubric_service.get_rubric(rubric.id)
        except Exception:
            pass

    return RubricResponse(
        id=rubric.id,
        teacher_id=rubric.teacher_id,
        title=rubric.title,
        content=rubric.content,
        parsed_criteria=rubric.parsed_criteria.model_dump() if rubric.parsed_criteria else None,
        created_at=rubric.created_at,
        updated_at=rubric.updated_at,
    )


@router.delete("/rubrics/{rubric_id}")
async def delete_rubric(
    rubric_id: str,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """Delete a rubric."""
    if not rubric_service.delete_rubric(rubric_id, teacher_id):
        raise HTTPException(status_code=404, detail="Rubric not found")
    return {"status": "deleted"}


@router.post("/rubrics/{rubric_id}/parse")
async def parse_rubric(
    rubric_id: str,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """Re-parse a rubric with LLM."""
    rubric = rubric_service.get_rubric(rubric_id, teacher_id)
    if rubric is None:
        raise HTTPException(status_code=404, detail="Rubric not found")

    try:
        parsed = await coverage_service.parse_rubric(rubric.content)
        rubric_service.update_rubric_parsed_criteria(rubric.id, parsed)
        return parsed.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse rubric: {str(e)}")


# Exam endpoints

@router.post("/exams", response_model=ExamResponse)
async def create_exam(
    request: ExamCreate,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """Create and start a new exam."""
    # Verify rubric exists and is parsed
    rubric = rubric_service.get_rubric(request.rubric_id, teacher_id)
    if rubric is None:
        raise HTTPException(status_code=404, detail="Rubric not found")

    if rubric.parsed_criteria is None:
        raise HTTPException(status_code=400, detail="Rubric must be parsed before starting exam")

    # Check if teacher already has an active exam
    active = exam_service.get_active_exam(teacher_id)
    if active is not None:
        raise HTTPException(status_code=400, detail="You already have an active exam")

    exam = exam_service.create_exam(teacher_id, request.rubric_id)

    return ExamResponse(
        id=exam.id,
        teacher_id=exam.teacher_id,
        rubric_id=exam.rubric_id,
        room_code=exam.room_code,
        status=exam.status,
        started_at=exam.started_at,
        ended_at=exam.ended_at,
        created_at=exam.created_at,
    )


@router.get("/exams", response_model=list[ExamResponse])
async def list_exams(
    status: Optional[str] = None,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """List all exams for the current teacher."""
    status_filter = ExamStatus(status) if status else None
    exams = exam_service.list_exams(teacher_id, status_filter)

    return [
        ExamResponse(
            id=e.id,
            teacher_id=e.teacher_id,
            rubric_id=e.rubric_id,
            room_code=e.room_code,
            status=e.status,
            started_at=e.started_at,
            ended_at=e.ended_at,
            created_at=e.created_at,
        )
        for e in exams
    ]


@router.get("/exams/active", response_model=Optional[ExamResponse])
async def get_active_exam(teacher_id: str = Depends(auth_service.get_current_teacher)):
    """Get the current active exam if any."""
    exam = exam_service.get_active_exam(teacher_id)
    if exam is None:
        return None

    return ExamResponse(
        id=exam.id,
        teacher_id=exam.teacher_id,
        rubric_id=exam.rubric_id,
        room_code=exam.room_code,
        status=exam.status,
        started_at=exam.started_at,
        ended_at=exam.ended_at,
        created_at=exam.created_at,
    )


@router.get("/exams/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: str,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """Get a specific exam."""
    exam = exam_service.get_exam(exam_id, teacher_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")

    return ExamResponse(
        id=exam.id,
        teacher_id=exam.teacher_id,
        rubric_id=exam.rubric_id,
        room_code=exam.room_code,
        status=exam.status,
        started_at=exam.started_at,
        ended_at=exam.ended_at,
        created_at=exam.created_at,
    )


@router.post("/exams/{exam_id}/start", response_model=ExamResponse)
async def start_exam(
    exam_id: str,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """Start an exam (exams are started on creation, this just returns the exam)."""
    exam = exam_service.get_exam(exam_id, teacher_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")

    return ExamResponse(
        id=exam.id,
        teacher_id=exam.teacher_id,
        rubric_id=exam.rubric_id,
        room_code=exam.room_code,
        status=exam.status,
        started_at=exam.started_at,
        ended_at=exam.ended_at,
        created_at=exam.created_at,
    )


@router.post("/exams/{exam_id}/end")
async def end_exam(
    exam_id: str,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """End an active exam."""
    if not exam_service.end_exam(exam_id, teacher_id):
        raise HTTPException(status_code=404, detail="Exam not found or already ended")
    return {"status": "ended"}


# Session monitoring endpoints

@router.get("/exams/{exam_id}/sessions", response_model=list[SessionTranscriptResponse])
async def list_exam_sessions(
    exam_id: str,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """List all student sessions for an exam."""
    # Verify exam ownership
    exam = exam_service.get_exam(exam_id, teacher_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")

    sessions = exam_service.list_exam_sessions(exam_id)

    results = []
    for session in sessions:
        transcript = transcript_service.get_session_transcript(session.id)
        struggles = struggle_service.get_struggle_events_for_session(session.id)

        coverage_pct = 0.0
        if session.rubric_coverage.covered_criteria:
            coverage_pct = sum(session.rubric_coverage.covered_criteria.values()) / max(
                len(session.rubric_coverage.covered_criteria), 1
            )

        results.append(SessionTranscriptResponse(
            session_id=session.id,
            student_name=session.student_name,
            student_id=session.student_id,
            status=session.status,
            entries=[
                TranscriptEntryResponse(
                    id=e.id,
                    entry_type=e.entry_type.value,
                    content=e.content,
                    timestamp=e.timestamp,
                )
                for e in transcript
            ],
            coverage_pct=coverage_pct,
            struggle_count=len(struggles),
        ))

    return results


@router.get("/sessions/{session_id}/transcript", response_model=SessionTranscriptResponse)
async def get_session_transcript(
    session_id: str,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """Get full transcript for a student session."""
    session = exam_service.get_student_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify teacher owns the exam
    exam = exam_service.get_exam(session.exam_id, teacher_id)
    if exam is None:
        raise HTTPException(status_code=403, detail="Not authorized")

    transcript = transcript_service.get_session_transcript(session_id)
    struggles = struggle_service.get_struggle_events_for_session(session_id)

    coverage_pct = 0.0
    if session.rubric_coverage.covered_criteria:
        coverage_pct = sum(session.rubric_coverage.covered_criteria.values()) / max(
            len(session.rubric_coverage.covered_criteria), 1
        )

    return SessionTranscriptResponse(
        session_id=session.id,
        student_name=session.student_name,
        student_id=session.student_id,
        status=session.status,
        entries=[
            TranscriptEntryResponse(
                id=e.id,
                entry_type=e.entry_type.value,
                content=e.content,
                timestamp=e.timestamp,
            )
            for e in transcript
        ],
        coverage_pct=coverage_pct,
        struggle_count=len(struggles),
    )


@router.get("/exams/{exam_id}/struggles")
async def get_exam_struggles(
    exam_id: str,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """Get all unnotified struggle events for an exam."""
    exam = exam_service.get_exam(exam_id, teacher_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")

    struggles = struggle_service.get_unnotified_struggles_for_exam(exam_id)

    # Mark as notified
    for s in struggles:
        struggle_service.mark_teacher_notified(s.id)

    return [
        {
            "id": s.id,
            "session_id": s.session_id,
            "struggle_type": s.struggle_type.value,
            "severity": s.severity.value,
            "reasoning": s.llm_reasoning,
            "question_adapted": s.question_adapted,
            "timestamp": s.timestamp.isoformat(),
        }
        for s in struggles
    ]


# Teacher intervention endpoints

@router.post("/sessions/{session_id}/message")
async def send_message_to_student(
    session_id: str,
    request: SendMessageRequest,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """Send a message to a specific student."""
    session = exam_service.get_student_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify teacher owns the exam
    exam = exam_service.get_exam(session.exam_id, teacher_id)
    if exam is None:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Add message to transcript
    entry = transcript_service.add_teacher_message(session_id, request.message)

    return {"status": "sent", "entry_id": entry.id}


@router.post("/sessions/{session_id}/override-question")
async def override_next_question(
    session_id: str,
    request: OverrideQuestionRequest,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """Override the next question for a student."""
    session = exam_service.get_student_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify teacher owns the exam
    exam = exam_service.get_exam(session.exam_id, teacher_id)
    if exam is None:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Add a system note about the override
    transcript_service.add_system_note(
        session_id,
        f"Teacher overrode next question"
    )

    # Add the question to transcript
    entry = transcript_service.add_question(session_id, request.question)

    return {"status": "overridden", "entry_id": entry.id}


@router.post("/sessions/{session_id}/terminate")
async def terminate_session(
    session_id: str,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """Terminate a student's exam early."""
    session = exam_service.get_student_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify teacher owns the exam
    exam = exam_service.get_exam(session.exam_id, teacher_id)
    if exam is None:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Add system note and terminate
    transcript_service.add_system_note(session_id, "Session terminated by teacher")
    exam_service.terminate_session(session_id)

    return {"status": "terminated"}


# Analytics endpoints

@router.get("/exams/{exam_id}/analytics", response_model=ExamAnalytics)
async def get_exam_analytics(
    exam_id: str,
    teacher_id: str = Depends(auth_service.get_current_teacher)
):
    """Get analytics for a specific exam."""
    exam = exam_service.get_exam(exam_id, teacher_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")

    sessions = exam_service.list_exam_sessions(exam_id)

    total = len(sessions)
    completed = sum(1 for s in sessions if s.status.value == "completed")

    # Calculate average coverage
    coverages = []
    for s in sessions:
        if s.rubric_coverage.covered_criteria:
            cov = sum(s.rubric_coverage.covered_criteria.values()) / len(s.rubric_coverage.covered_criteria)
            coverages.append(cov)
    avg_coverage = sum(coverages) / len(coverages) if coverages else 0.0

    # Calculate average duration for completed sessions
    durations = []
    for s in sessions:
        if s.ended_at and s.started_at:
            duration = (s.ended_at - s.started_at).total_seconds() / 60
            durations.append(duration)
    avg_duration = sum(durations) / len(durations) if durations else None

    # Count struggle types
    struggle_counts = {}
    for s in sessions:
        struggles = struggle_service.get_struggle_events_for_session(s.id)
        for struggle in struggles:
            st = struggle.struggle_type.value
            struggle_counts[st] = struggle_counts.get(st, 0) + 1

    return ExamAnalytics(
        exam_id=exam_id,
        total_students=total,
        completed_students=completed,
        average_coverage_pct=avg_coverage,
        average_duration_minutes=avg_duration,
        struggle_frequency=struggle_counts,
    )


@router.get("/analytics/overview")
async def get_analytics_overview(teacher_id: str = Depends(auth_service.get_current_teacher)):
    """Get overall analytics for all exams."""
    exams = exam_service.list_exams(teacher_id)

    total_exams = len(exams)
    completed_exams = sum(1 for e in exams if e.status == ExamStatus.COMPLETED)
    active_exams = sum(1 for e in exams if e.status == ExamStatus.ACTIVE)

    total_sessions = 0
    total_completed_sessions = 0

    for e in exams:
        sessions = exam_service.list_exam_sessions(e.id)
        total_sessions += len(sessions)
        total_completed_sessions += sum(1 for s in sessions if s.status.value == "completed")

    return {
        "total_exams": total_exams,
        "completed_exams": completed_exams,
        "active_exams": active_exams,
        "total_student_sessions": total_sessions,
        "completed_student_sessions": total_completed_sessions,
    }
