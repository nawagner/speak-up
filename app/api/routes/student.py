from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    JoinExamRequest,
    JoinExamResponse,
    SubmitResponseRequest,
    QuestionResponse,
    SessionStatusResponse,
)

router = APIRouter()


@router.post("/join", response_model=JoinExamResponse)
async def join_exam(request: JoinExamRequest):
    """
    Join an exam with room code, student name, and student ID.
    Returns the session ID and first question.
    """
    # TODO: Implement with exam service
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/session/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(session_id: str):
    """Get current session status."""
    # TODO: Implement with exam service
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/session/{session_id}/response", response_model=QuestionResponse)
async def submit_response(session_id: str, request: SubmitResponseRequest):
    """
    Submit transcript response for current question.
    Returns next question or completion signal.
    """
    # TODO: Implement with response orchestration
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/session/{session_id}/question", response_model=QuestionResponse)
async def get_current_question(session_id: str):
    """Get current/pending question for the session."""
    # TODO: Implement with exam service
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/session/{session_id}/leave")
async def leave_exam(session_id: str):
    """Student leaves the exam early."""
    # TODO: Implement with exam service
    raise HTTPException(status_code=501, detail="Not implemented")
