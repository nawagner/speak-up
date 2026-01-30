from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ExamStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SessionStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    TERMINATED = "terminated"


class EntryType(str, Enum):
    QUESTION = "question"
    RESPONSE = "response"
    SYSTEM_NOTE = "system_note"
    TEACHER_MESSAGE = "teacher_message"


class StruggleType(str, Enum):
    CONFUSION = "confusion"
    OFF_TOPIC = "off_topic"
    SILENCE = "silence"
    INCORRECT = "incorrect"
    REPETITION = "repetition"


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# Domain Models

class Teacher(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Criterion(BaseModel):
    id: str
    name: str
    description: str
    points: Optional[float] = None


class ParsedRubric(BaseModel):
    criteria: list[Criterion]
    total_points: Optional[float] = None


class Rubric(BaseModel):
    id: str
    teacher_id: str
    title: str
    content: str
    parsed_criteria: Optional[ParsedRubric] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class Exam(BaseModel):
    id: str
    teacher_id: str
    rubric_id: str
    room_code: str
    status: ExamStatus = ExamStatus.PENDING
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CoverageMap(BaseModel):
    """Tracks which criteria have been covered and to what degree."""
    covered_criteria: dict[str, float] = Field(default_factory=dict)  # criterion_id -> coverage %


class StudentSession(BaseModel):
    id: str
    exam_id: str
    student_name: str
    student_id: str
    status: SessionStatus = SessionStatus.ACTIVE
    rubric_coverage: CoverageMap = Field(default_factory=CoverageMap)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None


class TranscriptEntry(BaseModel):
    id: str
    session_id: str
    entry_type: EntryType
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CoverageAnalysis(BaseModel):
    id: str
    transcript_entry_id: str
    criteria_covered: list[str]  # List of criterion IDs
    coverage_reasoning: str
    total_coverage_pct: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class StruggleEvent(BaseModel):
    id: str
    session_id: str
    transcript_entry_id: str
    struggle_type: StruggleType
    severity: Severity
    llm_reasoning: str
    question_adapted: bool = False
    teacher_notified: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CoverageResult(BaseModel):
    """Result from coverage analysis."""
    newly_covered: list[str]  # Criterion IDs
    updated_coverage: CoverageMap
    reasoning: str
    total_coverage_pct: float


class CompletionResult(BaseModel):
    """Result from completion check."""
    is_complete: bool
    missing_criteria: list[str]
    coverage_summary: str
