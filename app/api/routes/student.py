import os
import tempfile

import requests
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response

from app.api.schemas import (
    JoinExamRequest,
    JoinExamResponse,
    SubmitResponseRequest,
    QuestionResponse,
    SessionStatusResponse,
    TranslateResponse,
)
from app.models.domain import SessionStatus
from app.services import exam as exam_service
from app.services import rubric as rubric_service
from app.services import transcript as transcript_service
from app.services import orchestrator
from app.services import tts as tts_service

router = APIRouter()


@router.post("/join", response_model=JoinExamResponse)
async def join_exam(request: JoinExamRequest):
    """
    Join an exam with room code, student name, and student ID.
    Returns the session ID and first question.
    """
    # Find the exam by room code
    exam = exam_service.get_exam_by_room_code(request.room_code)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found or not active")

    # Check if can join
    if not exam_service.can_join_exam(exam.id):
        raise HTTPException(status_code=400, detail="Exam is full or not accepting students")

    # Get the rubric
    rubric = rubric_service.get_rubric(exam.rubric_id)
    if rubric is None:
        raise HTTPException(status_code=500, detail="Exam rubric not found")

    if rubric.parsed_criteria is None:
        raise HTTPException(status_code=500, detail="Exam rubric not parsed")

    # Create student session
    session = exam_service.create_student_session(
        exam_id=exam.id,
        student_name=request.student_name,
        student_id=request.student_id,
    )

    # Generate first question
    first_question = await orchestrator.start_student_session(
        session_id=session.id,
        rubric=rubric.parsed_criteria,
    )

    return JoinExamResponse(
        session_id=session.id,
        exam_title=rubric.title,
        first_question=first_question,
    )


@router.get("/session/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(session_id: str):
    """Get current session status."""
    session = exam_service.get_student_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    question_count = transcript_service.count_questions(session_id)

    # Calculate coverage percentage
    coverage_pct = 0.0
    if session.rubric_coverage.covered_criteria:
        coverage_pct = sum(session.rubric_coverage.covered_criteria.values()) / max(
            len(session.rubric_coverage.covered_criteria), 1
        )

    return SessionStatusResponse(
        session_id=session.id,
        status=session.status,
        question_number=question_count,
        rubric_coverage_pct=coverage_pct,
    )


@router.post("/session/{session_id}/response", response_model=QuestionResponse)
async def submit_response(session_id: str, request: SubmitResponseRequest):
    """
    Submit transcript response for current question.
    Returns next question or completion signal.
    """
    # Verify session exists and is active
    session = exam_service.get_student_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != SessionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Session is not active")

    # Process the response
    try:
        result = await orchestrator.process_student_response(
            session_id=session_id,
            response_text=request.response,
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return QuestionResponse(
        question_text=result.next_question,
        question_number=result.question_number,
        is_final=result.is_final,
        is_adapted=result.is_adapted,
        message=result.teacher_message,
    )


# ElevenLabs Speech-to-Text constants
ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
ELEVENLABS_MODEL_ID = "scribe_v1"


@router.post("/session/{session_id}/audio", response_model=QuestionResponse)
async def submit_audio_response(
    session_id: str,
    audio: UploadFile = File(...),
    question: str = Form(...),
):
    """
    Accept audio file, transcribe via ElevenLabs, then process as response.
    """
    # Verify session exists and is active
    session = exam_service.get_student_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != SessionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Session is not active")

    # Get ElevenLabs API key
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="ELEVENLABS_API_KEY is not configured",
        )

    # Save uploaded audio to a temp file
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            content = await audio.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save audio file: {str(e)}",
        )

    # Transcribe audio via ElevenLabs
    try:
        with open(tmp_path, "rb") as f:
            files = {"file": (audio.filename or "audio.wav", f, "audio/wav")}
            data = {"model_id": ELEVENLABS_MODEL_ID}
            headers = {"xi-api-key": api_key}

            response = requests.post(
                ELEVENLABS_STT_URL,
                headers=headers,
                data=data,
                files=files,
                timeout=60,
            )

        if response.status_code != 200:
            msg = response.text or response.reason
            raise HTTPException(
                status_code=502,
                detail=f"ElevenLabs STT failed ({response.status_code}): {msg}",
            )

        body = response.json()
        transcript = body.get("text")
        if transcript is None:
            raise HTTPException(
                status_code=502,
                detail="ElevenLabs response missing 'text' field",
            )
        transcript = transcript.strip()

    except HTTPException:
        raise
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to ElevenLabs: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription error: {str(e)}",
        )
    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    # Process the transcribed response (same as submit_response)
    try:
        result = await orchestrator.process_student_response(
            session_id=session_id,
            response_text=transcript,
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return QuestionResponse(
        question_text=result.next_question,
        question_number=result.question_number,
        is_final=result.is_final,
        is_adapted=result.is_adapted,
        message=result.teacher_message,
    )


@router.get("/session/{session_id}/question", response_model=QuestionResponse)
async def get_current_question(session_id: str):
    """Get current/pending question for the session."""
    session = exam_service.get_student_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != SessionStatus.ACTIVE:
        return QuestionResponse(
            question_text="",
            question_number=transcript_service.count_questions(session_id),
            is_final=True,
            is_adapted=False,
            message="Exam has ended",
        )

    # Get pending question
    pending = await orchestrator.get_pending_question(session_id)
    if pending is None:
        raise HTTPException(status_code=400, detail="No pending question")

    return QuestionResponse(
        question_text=pending,
        question_number=transcript_service.count_questions(session_id),
        is_final=False,
        is_adapted=False,
        message=None,
    )


@router.post("/session/{session_id}/leave")
async def leave_exam(session_id: str):
    """Student leaves the exam early."""
    session = exam_service.get_student_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != SessionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Session is not active")

    # Terminate the session
    exam_service.terminate_session(session_id)

    return {"status": "left", "message": "You have left the exam"}


@router.get("/session/{session_id}/tts")
async def get_question_audio(
    session_id: str,
    text: str = Query(..., description="Question text to convert to speech"),
    language: str = Query("en", description="Language code for TTS (en, es, fr, de, zh)"),
):
    """
    Convert question text to speech using ElevenLabs TTS.
    Returns MP3 audio data.
    """
    # Verify session exists and is active
    session = exam_service.get_student_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != SessionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Session is not active")

    # Generate speech with language
    audio_bytes = await tts_service.generate_speech(text, language=language)

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "private, max-age=3600",
        },
    )


@router.get("/session/{session_id}/translate", response_model=TranslateResponse)
async def translate_question(
    session_id: str,
    text: str = Query(..., description="Text to translate"),
    language: str = Query("en", description="Target language code (en, es, fr, de, zh)"),
):
    """
    Translate question text to the specified language.
    Returns original and translated text.
    """
    # Verify session exists and is active
    session = exam_service.get_student_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != SessionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Session is not active")

    # If English or unsupported, return original text unchanged
    if language == "en":
        return TranslateResponse(
            original_text=text,
            translated_text=text,
            language=language,
        )

    # Translate using TTS service's translate function
    translated = await tts_service.translate_text(text, language)

    return TranslateResponse(
        original_text=text,
        translated_text=translated,
        language=language,
    )
