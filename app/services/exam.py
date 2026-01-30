"""
Exam Management Service

Handles exam lifecycle: creation, room codes, student sessions, and intervention.
"""

import random
import string
from datetime import datetime
from typing import Optional
import json

from uuid7 import uuid7

from app.config import get_settings
from app.database import get_db
from app.models.domain import (
    Exam,
    ExamStatus,
    StudentSession,
    SessionStatus,
    CoverageMap,
)


def generate_room_code() -> str:
    """Generate a unique room code for an exam."""
    settings = get_settings()
    length = settings.room_code_length

    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

        # Check uniqueness
        with get_db() as conn:
            existing = conn.execute(
                "SELECT id FROM exams WHERE room_code = ? AND status = 'active'",
                [code]
            ).fetchone()

            if existing is None:
                return code


def create_exam(teacher_id: str, rubric_id: str) -> Exam:
    """
    Create a new exam and generate its room code.

    Args:
        teacher_id: Teacher ID
        rubric_id: Rubric to use for the exam

    Returns:
        Created Exam object with room code
    """
    exam_id = str(uuid7())
    room_code = generate_room_code()
    created_at = datetime.utcnow()
    started_at = datetime.utcnow()

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO exams (id, teacher_id, rubric_id, room_code, status, started_at, created_at)
            VALUES (?, ?, ?, ?, 'active', ?, ?)
            """,
            [exam_id, teacher_id, rubric_id, room_code, started_at, created_at]
        )

    return Exam(
        id=exam_id,
        teacher_id=teacher_id,
        rubric_id=rubric_id,
        room_code=room_code,
        status=ExamStatus.ACTIVE,
        started_at=started_at,
        created_at=created_at,
    )


def get_exam(exam_id: str, teacher_id: Optional[str] = None) -> Optional[Exam]:
    """Get an exam by ID."""
    with get_db() as conn:
        query = """
            SELECT id, teacher_id, rubric_id, room_code, status, started_at, ended_at, created_at
            FROM exams WHERE id = ?
        """
        params = [exam_id]

        if teacher_id:
            query += " AND teacher_id = ?"
            params.append(teacher_id)

        result = conn.execute(query, params).fetchone()

        if result is None:
            return None

        return Exam(
            id=result[0],
            teacher_id=result[1],
            rubric_id=result[2],
            room_code=result[3],
            status=ExamStatus(result[4]),
            started_at=result[5],
            ended_at=result[6],
            created_at=result[7],
        )


def get_exam_by_room_code(room_code: str) -> Optional[Exam]:
    """Get an active exam by room code."""
    with get_db() as conn:
        result = conn.execute(
            """
            SELECT id, teacher_id, rubric_id, room_code, status, started_at, ended_at, created_at
            FROM exams WHERE room_code = ? AND status = 'active'
            """,
            [room_code]
        ).fetchone()

        if result is None:
            return None

        return Exam(
            id=result[0],
            teacher_id=result[1],
            rubric_id=result[2],
            room_code=result[3],
            status=ExamStatus(result[4]),
            started_at=result[5],
            ended_at=result[6],
            created_at=result[7],
        )


def list_exams(teacher_id: str, status: Optional[ExamStatus] = None) -> list[Exam]:
    """List all exams for a teacher."""
    with get_db() as conn:
        query = """
            SELECT id, teacher_id, rubric_id, room_code, status, started_at, ended_at, created_at
            FROM exams WHERE teacher_id = ?
        """
        params = [teacher_id]

        if status:
            query += " AND status = ?"
            params.append(status.value)

        query += " ORDER BY created_at DESC"

        results = conn.execute(query, params).fetchall()

        return [
            Exam(
                id=r[0],
                teacher_id=r[1],
                rubric_id=r[2],
                room_code=r[3],
                status=ExamStatus(r[4]),
                started_at=r[5],
                ended_at=r[6],
                created_at=r[7],
            )
            for r in results
        ]


def get_active_exam(teacher_id: str) -> Optional[Exam]:
    """Get the current active exam for a teacher (if any)."""
    exams = list_exams(teacher_id, ExamStatus.ACTIVE)
    return exams[0] if exams else None


def end_exam(exam_id: str, teacher_id: str) -> bool:
    """
    End an active exam.

    Args:
        exam_id: Exam ID
        teacher_id: Teacher ID (for ownership verification)

    Returns:
        True if ended, False if not found or already ended
    """
    with get_db() as conn:
        result = conn.execute(
            """
            UPDATE exams SET status = 'completed', ended_at = ?
            WHERE id = ? AND teacher_id = ? AND status = 'active'
            """,
            [datetime.utcnow(), exam_id, teacher_id]
        )
        return result.rowcount > 0


def cancel_exam(exam_id: str, teacher_id: str) -> bool:
    """Cancel an exam."""
    with get_db() as conn:
        result = conn.execute(
            """
            UPDATE exams SET status = 'cancelled', ended_at = ?
            WHERE id = ? AND teacher_id = ? AND status IN ('pending', 'active')
            """,
            [datetime.utcnow(), exam_id, teacher_id]
        )
        return result.rowcount > 0


# Student Session Management

def create_student_session(
    exam_id: str,
    student_name: str,
    student_id: str,
) -> StudentSession:
    """
    Create a new student session when they join an exam.

    Args:
        exam_id: Exam ID
        student_name: Student's name
        student_id: Student's ID

    Returns:
        Created StudentSession
    """
    session_id = str(uuid7())
    started_at = datetime.utcnow()
    coverage = CoverageMap()

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO student_sessions
            (id, exam_id, student_name, student_id, status, rubric_coverage, started_at)
            VALUES (?, ?, ?, ?, 'active', ?, ?)
            """,
            [session_id, exam_id, student_name, student_id, coverage.model_dump_json(), started_at]
        )

    return StudentSession(
        id=session_id,
        exam_id=exam_id,
        student_name=student_name,
        student_id=student_id,
        status=SessionStatus.ACTIVE,
        rubric_coverage=coverage,
        started_at=started_at,
    )


def get_student_session(session_id: str) -> Optional[StudentSession]:
    """Get a student session by ID."""
    with get_db() as conn:
        result = conn.execute(
            """
            SELECT id, exam_id, student_name, student_id, status, rubric_coverage, started_at, ended_at
            FROM student_sessions WHERE id = ?
            """,
            [session_id]
        ).fetchone()

        if result is None:
            return None

        coverage_data = json.loads(result[5]) if result[5] else {}
        coverage = CoverageMap(**coverage_data)

        return StudentSession(
            id=result[0],
            exam_id=result[1],
            student_name=result[2],
            student_id=result[3],
            status=SessionStatus(result[4]),
            rubric_coverage=coverage,
            started_at=result[6],
            ended_at=result[7],
        )


def list_exam_sessions(exam_id: str) -> list[StudentSession]:
    """List all student sessions for an exam."""
    with get_db() as conn:
        results = conn.execute(
            """
            SELECT id, exam_id, student_name, student_id, status, rubric_coverage, started_at, ended_at
            FROM student_sessions WHERE exam_id = ?
            ORDER BY started_at ASC
            """,
            [exam_id]
        ).fetchall()

        sessions = []
        for r in results:
            coverage_data = json.loads(r[5]) if r[5] else {}
            coverage = CoverageMap(**coverage_data)

            sessions.append(StudentSession(
                id=r[0],
                exam_id=r[1],
                student_name=r[2],
                student_id=r[3],
                status=SessionStatus(r[4]),
                rubric_coverage=coverage,
                started_at=r[6],
                ended_at=r[7],
            ))

        return sessions


def update_session_coverage(session_id: str, coverage: CoverageMap) -> None:
    """Update the rubric coverage for a session."""
    with get_db() as conn:
        conn.execute(
            "UPDATE student_sessions SET rubric_coverage = ? WHERE id = ?",
            [coverage.model_dump_json(), session_id]
        )


def complete_session(session_id: str) -> None:
    """Mark a student session as completed."""
    with get_db() as conn:
        conn.execute(
            "UPDATE student_sessions SET status = 'completed', ended_at = ? WHERE id = ?",
            [datetime.utcnow(), session_id]
        )


def terminate_session(session_id: str) -> None:
    """Terminate a student session (teacher intervention)."""
    with get_db() as conn:
        conn.execute(
            "UPDATE student_sessions SET status = 'terminated', ended_at = ? WHERE id = ?",
            [datetime.utcnow(), session_id]
        )


def get_active_sessions_count(exam_id: str) -> int:
    """Get count of active sessions for an exam."""
    with get_db() as conn:
        result = conn.execute(
            "SELECT COUNT(*) FROM student_sessions WHERE exam_id = ? AND status = 'active'",
            [exam_id]
        ).fetchone()
        return result[0] if result else 0


def can_join_exam(exam_id: str) -> bool:
    """Check if a new student can join the exam."""
    settings = get_settings()

    exam = get_exam(exam_id)
    if exam is None or exam.status != ExamStatus.ACTIVE:
        return False

    current_count = get_active_sessions_count(exam_id)
    return current_count < settings.max_students_per_exam
