from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.domain import ExamStatus, SessionStatus, StruggleType, Severity


# Authentication Schemas

class TeacherCreate(BaseModel):
    username: str
    password: str
    display_name: Optional[str] = None


class TeacherLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TeacherResponse(BaseModel):
    id: str
    username: str
    display_name: Optional[str]
    created_at: datetime


# Rubric Schemas

class RubricCreate(BaseModel):
    title: str
    content: str


class RubricUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class RubricResponse(BaseModel):
    id: str
    teacher_id: str
    title: str
    content: str
    parsed_criteria: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime]


# Exam Schemas

class ExamCreate(BaseModel):
    rubric_id: str


class ExamResponse(BaseModel):
    id: str
    teacher_id: str
    rubric_id: str
    room_code: str
    status: ExamStatus
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    created_at: datetime


# Student-facing Schemas

class JoinExamRequest(BaseModel):
    room_code: str
    student_name: str
    student_id: str


class JoinExamResponse(BaseModel):
    session_id: str
    exam_title: str
    first_question: str


class SubmitResponseRequest(BaseModel):
    """Student response body: transcript of speech. session_id comes from path."""
    transcript: str
    question: Optional[str] = None


class QuestionResponse(BaseModel):
    question_text: str
    question_number: int
    is_final: bool
    is_adapted: bool
    message: Optional[str] = None


class SessionStatusResponse(BaseModel):
    session_id: str
    status: SessionStatus
    question_number: int
    rubric_coverage_pct: float


# Transcript Schemas

class TranscriptEntryResponse(BaseModel):
    id: str
    entry_type: str
    content: str
    timestamp: datetime


class SessionTranscriptResponse(BaseModel):
    session_id: str
    student_name: str
    student_id: str
    status: SessionStatus
    entries: list[TranscriptEntryResponse]
    coverage_pct: float
    struggle_count: int


# Struggle Event Schemas

class StruggleEventResponse(BaseModel):
    id: str
    struggle_type: StruggleType
    severity: Severity
    llm_reasoning: str
    question_adapted: bool
    timestamp: datetime


# Teacher Intervention Schemas

class SendMessageRequest(BaseModel):
    message: str


class OverrideQuestionRequest(BaseModel):
    question: str


# Analytics Schemas

class ExamAnalytics(BaseModel):
    exam_id: str
    total_students: int
    completed_students: int
    average_coverage_pct: float
    average_duration_minutes: Optional[float]
    struggle_frequency: dict[str, int]
