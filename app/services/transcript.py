"""
Transcript Management Service

Handles storage and retrieval of transcript entries.
"""

from datetime import datetime
from typing import Optional

from uuid7 import uuid7

from app.database import get_db
from app.models.domain import TranscriptEntry, EntryType


def add_transcript_entry(
    session_id: str,
    entry_type: EntryType,
    content: str,
) -> TranscriptEntry:
    """
    Add a new transcript entry.

    Args:
        session_id: Student session ID
        entry_type: Type of entry (question, response, etc.)
        content: Entry content

    Returns:
        Created TranscriptEntry
    """
    entry_id = str(uuid7())
    timestamp = datetime.utcnow()

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO transcript_entries (id, session_id, entry_type, content, timestamp)
            VALUES (?, ?, ?, ?, ?)
            """,
            [entry_id, session_id, entry_type.value, content, timestamp]
        )

    return TranscriptEntry(
        id=entry_id,
        session_id=session_id,
        entry_type=entry_type,
        content=content,
        timestamp=timestamp,
    )


def get_transcript_entry(entry_id: str) -> Optional[TranscriptEntry]:
    """Get a transcript entry by ID."""
    with get_db() as conn:
        result = conn.execute(
            "SELECT id, session_id, entry_type, content, timestamp FROM transcript_entries WHERE id = ?",
            [entry_id]
        ).fetchone()

        if result is None:
            return None

        return TranscriptEntry(
            id=result[0],
            session_id=result[1],
            entry_type=EntryType(result[2]),
            content=result[3],
            timestamp=result[4],
        )


def get_session_transcript(session_id: str) -> list[TranscriptEntry]:
    """
    Get all transcript entries for a session in chronological order.

    Args:
        session_id: Student session ID

    Returns:
        List of TranscriptEntry objects
    """
    with get_db() as conn:
        results = conn.execute(
            """
            SELECT id, session_id, entry_type, content, timestamp
            FROM transcript_entries
            WHERE session_id = ?
            ORDER BY timestamp ASC
            """,
            [session_id]
        ).fetchall()

        return [
            TranscriptEntry(
                id=r[0],
                session_id=r[1],
                entry_type=EntryType(r[2]),
                content=r[3],
                timestamp=r[4],
            )
            for r in results
        ]


def get_last_question(session_id: str) -> Optional[TranscriptEntry]:
    """Get the most recent question for a session."""
    with get_db() as conn:
        result = conn.execute(
            """
            SELECT id, session_id, entry_type, content, timestamp
            FROM transcript_entries
            WHERE session_id = ? AND entry_type = 'question'
            ORDER BY timestamp DESC
            LIMIT 1
            """,
            [session_id]
        ).fetchone()

        if result is None:
            return None

        return TranscriptEntry(
            id=result[0],
            session_id=result[1],
            entry_type=EntryType(result[2]),
            content=result[3],
            timestamp=result[4],
        )


def count_questions(session_id: str) -> int:
    """Count the number of questions asked in a session."""
    with get_db() as conn:
        result = conn.execute(
            "SELECT COUNT(*) FROM transcript_entries WHERE session_id = ? AND entry_type = 'question'",
            [session_id]
        ).fetchone()
        return result[0] if result else 0


def add_question(session_id: str, question: str) -> TranscriptEntry:
    """Add a question to the transcript."""
    return add_transcript_entry(session_id, EntryType.QUESTION, question)


def add_response(session_id: str, response: str) -> TranscriptEntry:
    """Add a student response to the transcript."""
    return add_transcript_entry(session_id, EntryType.RESPONSE, response)


def add_system_note(session_id: str, note: str) -> TranscriptEntry:
    """Add a system note to the transcript."""
    return add_transcript_entry(session_id, EntryType.SYSTEM_NOTE, note)


def add_teacher_message(session_id: str, message: str) -> TranscriptEntry:
    """Add a teacher message to the transcript."""
    return add_transcript_entry(session_id, EntryType.TEACHER_MESSAGE, message)


def get_recent_entries(session_id: str, limit: int = 10) -> list[TranscriptEntry]:
    """Get the most recent transcript entries for a session."""
    with get_db() as conn:
        results = conn.execute(
            """
            SELECT id, session_id, entry_type, content, timestamp
            FROM transcript_entries
            WHERE session_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            [session_id, limit]
        ).fetchall()

        # Reverse to get chronological order
        return [
            TranscriptEntry(
                id=r[0],
                session_id=r[1],
                entry_type=EntryType(r[2]),
                content=r[3],
                timestamp=r[4],
            )
            for r in reversed(results)
        ]
