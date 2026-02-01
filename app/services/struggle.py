"""
Struggle Detection Service

Focused solely on identifying when students need help.
Separate from coverage analysis to ensure clean separation of concerns.
"""

from datetime import datetime
from typing import Optional
import json

from uuid_extensions import uuid7

from app.database import get_db
from app.models.domain import (
    StruggleEvent,
    StruggleType,
    Severity,
    TranscriptEntry,
)
from app.services.llm_client import get_llm_client


DETECT_STRUGGLE_SYSTEM_PROMPT = """You are an expert at identifying when students are struggling during oral exams.

Your task is to analyze a student's response and determine if they are having difficulty.

Signs of struggle include:
- CONFUSION: Asking for clarification, expressing uncertainty ("I don't understand", "What do you mean?")
- OFF_TOPIC: Response doesn't address the question at all, completely unrelated content
- SILENCE: Very short responses, "I don't know", minimal engagement
- INCORRECT: Factually wrong information that shows misunderstanding
- REPETITION: Repeating the same points without adding new information

Severity levels:
- LOW: Minor hesitation or slight confusion, student can likely recover
- MEDIUM: Clear difficulty, but student is still engaged
- HIGH: Significant struggle, student needs immediate help

If NO struggle is detected, return {"struggle_detected": false}

If struggle IS detected, return:
{
    "struggle_detected": true,
    "struggle_type": "confusion|off_topic|silence|incorrect|repetition",
    "severity": "low|medium|high",
    "reasoning": "Brief explanation of why this indicates struggle"
}

Be fair - normal pauses or minor uncertainties are not struggles.
Only flag genuine difficulties that would benefit from intervention.
"""

ADAPT_QUESTION_SYSTEM_PROMPT = """You are an expert at rephrasing exam questions to help struggling students.

Your task is to adapt a question based on the type of struggle detected.

Adaptation strategies by struggle type:
- CONFUSION: Simplify language, provide more context, break into smaller parts
- OFF_TOPIC: Clarify what the question is asking, provide a hint about the expected topic
- SILENCE: Make the question more specific, reduce scope, provide starting points
- INCORRECT: Rephrase to guide toward correct thinking without giving the answer
- REPETITION: Ask from a different angle, request specific examples

Guidelines:
- Maintain the educational value of the question
- Don't make it too easy - help them think, not give away answers
- Keep the adapted question concise
- Be encouraging in tone

Return only the adapted question text, nothing else.
"""


async def detect_struggle(
    response: str,
    question: str,
    history: list[TranscriptEntry],
) -> Optional[StruggleEvent]:
    """
    Analyze a student response for signs of struggling.

    Args:
        response: Student's response text
        question: The question that was asked
        history: Previous transcript entries for context

    Returns:
        StruggleEvent if struggle detected, None otherwise
    """
    client = get_llm_client()

    # Build history context (last 4 exchanges)
    recent_history = history[-8:] if len(history) > 8 else history
    history_text = "\n".join([
        f"[{e.entry_type.value}]: {e.content[:200]}..."
        if len(e.content) > 200 else f"[{e.entry_type.value}]: {e.content}"
        for e in recent_history
    ]) or "No previous history"

    prompt = f"""Analyze this student response for signs of struggle:

QUESTION ASKED:
{question}

STUDENT RESPONSE:
{response}

RECENT CONVERSATION HISTORY:
{history_text}

Determine if the student is struggling and classify the type and severity."""

    result = await client.complete_json(
        prompt=prompt,
        system_prompt=DETECT_STRUGGLE_SYSTEM_PROMPT,
        temperature=0.3,
    )

    if not result.get("struggle_detected", False):
        return None

    struggle_type_str = result.get("struggle_type", "confusion")
    severity_str = result.get("severity", "medium")

    # Map string to enum
    struggle_type_map = {
        "confusion": StruggleType.CONFUSION,
        "off_topic": StruggleType.OFF_TOPIC,
        "silence": StruggleType.SILENCE,
        "incorrect": StruggleType.INCORRECT,
        "repetition": StruggleType.REPETITION,
    }

    severity_map = {
        "low": Severity.LOW,
        "medium": Severity.MEDIUM,
        "high": Severity.HIGH,
    }

    return StruggleEvent(
        id="",  # Will be set when persisted
        session_id="",  # Will be set when persisted
        transcript_entry_id="",  # Will be set when persisted
        struggle_type=struggle_type_map.get(struggle_type_str, StruggleType.CONFUSION),
        severity=severity_map.get(severity_str, Severity.MEDIUM),
        llm_reasoning=result.get("reasoning", ""),
        question_adapted=False,
        teacher_notified=False,
    )


async def generate_adapted_question(
    original_question: str,
    struggle_event: StruggleEvent,
    history: list[TranscriptEntry],
) -> str:
    """
    Generate an adapted version of a question for a struggling student.

    Args:
        original_question: The question that caused difficulty
        struggle_event: Details about the struggle
        history: Conversation history for context

    Returns:
        Adapted question text
    """
    client = get_llm_client()

    recent_history = history[-4:] if len(history) > 4 else history
    history_text = "\n".join([
        f"[{e.entry_type.value}]: {e.content[:150]}..."
        if len(e.content) > 150 else f"[{e.entry_type.value}]: {e.content}"
        for e in recent_history
    ]) or "No previous history"

    prompt = f"""Adapt this question for a struggling student:

ORIGINAL QUESTION:
{original_question}

STRUGGLE TYPE: {struggle_event.struggle_type.value}
SEVERITY: {struggle_event.severity.value}
ANALYSIS: {struggle_event.llm_reasoning}

RECENT CONVERSATION:
{history_text}

Provide an adapted version of the question that helps the student engage better."""

    adapted = await client.complete(
        prompt=prompt,
        system_prompt=ADAPT_QUESTION_SYSTEM_PROMPT,
        temperature=0.5,
    )

    return adapted.strip()


def create_struggle_event(
    session_id: str,
    transcript_entry_id: str,
    struggle_type: StruggleType,
    severity: Severity,
    llm_reasoning: str,
    question_adapted: bool = False,
) -> StruggleEvent:
    """
    Create and persist a struggle event.

    Args:
        session_id: Student session ID
        transcript_entry_id: Associated transcript entry
        struggle_type: Type of struggle
        severity: Severity level
        llm_reasoning: LLM's explanation
        question_adapted: Whether question was adapted

    Returns:
        Created StruggleEvent with ID
    """
    event_id = str(uuid7())
    timestamp = datetime.utcnow()

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO struggle_events
            (id, session_id, transcript_entry_id, struggle_type, severity,
             llm_reasoning, question_adapted, teacher_notified, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                event_id,
                session_id,
                transcript_entry_id,
                struggle_type.value,
                severity.value,
                llm_reasoning,
                question_adapted,
                False,  # teacher_notified starts as False
                timestamp,
            ]
        )

    return StruggleEvent(
        id=event_id,
        session_id=session_id,
        transcript_entry_id=transcript_entry_id,
        struggle_type=struggle_type,
        severity=severity,
        llm_reasoning=llm_reasoning,
        question_adapted=question_adapted,
        teacher_notified=False,
        timestamp=timestamp,
    )


def mark_teacher_notified(event_id: str) -> None:
    """Mark a struggle event as having notified the teacher."""
    with get_db() as conn:
        conn.execute(
            "UPDATE struggle_events SET teacher_notified = TRUE WHERE id = ?",
            [event_id]
        )


def mark_question_adapted(event_id: str) -> None:
    """Mark a struggle event as having an adapted question."""
    with get_db() as conn:
        conn.execute(
            "UPDATE struggle_events SET question_adapted = TRUE WHERE id = ?",
            [event_id]
        )


def get_struggle_events_for_session(session_id: str) -> list[StruggleEvent]:
    """Get all struggle events for a session."""
    with get_db() as conn:
        results = conn.execute(
            """
            SELECT id, session_id, transcript_entry_id, struggle_type, severity,
                   llm_reasoning, question_adapted, teacher_notified, timestamp
            FROM struggle_events
            WHERE session_id = ?
            ORDER BY timestamp ASC
            """,
            [session_id]
        ).fetchall()

        return [
            StruggleEvent(
                id=r[0],
                session_id=r[1],
                transcript_entry_id=r[2],
                struggle_type=StruggleType(r[3]),
                severity=Severity(r[4]),
                llm_reasoning=r[5],
                question_adapted=r[6],
                teacher_notified=r[7],
                timestamp=r[8],
            )
            for r in results
        ]


def get_unnotified_struggles_for_exam(exam_id: str) -> list[StruggleEvent]:
    """Get all unnotified struggle events for an exam."""
    with get_db() as conn:
        results = conn.execute(
            """
            SELECT se.id, se.session_id, se.transcript_entry_id, se.struggle_type,
                   se.severity, se.llm_reasoning, se.question_adapted,
                   se.teacher_notified, se.timestamp
            FROM struggle_events se
            JOIN student_sessions ss ON se.session_id = ss.id
            WHERE ss.exam_id = ? AND se.teacher_notified = FALSE
            ORDER BY se.timestamp ASC
            """,
            [exam_id]
        ).fetchall()

        return [
            StruggleEvent(
                id=r[0],
                session_id=r[1],
                transcript_entry_id=r[2],
                struggle_type=StruggleType(r[3]),
                severity=Severity(r[4]),
                llm_reasoning=r[5],
                question_adapted=r[6],
                teacher_notified=r[7],
                timestamp=r[8],
            )
            for r in results
        ]


def get_all_struggles_for_exam(exam_id: str) -> list[StruggleEvent]:
    """Get all struggle events for an exam."""
    with get_db() as conn:
        results = conn.execute(
            """
            SELECT se.id, se.session_id, se.transcript_entry_id, se.struggle_type,
                   se.severity, se.llm_reasoning, se.question_adapted,
                   se.teacher_notified, se.timestamp
            FROM struggle_events se
            JOIN student_sessions ss ON se.session_id = ss.id
            WHERE ss.exam_id = ?
            ORDER BY se.timestamp DESC
            """,
            [exam_id]
        ).fetchall()

        return [
            StruggleEvent(
                id=r[0],
                session_id=r[1],
                transcript_entry_id=r[2],
                struggle_type=StruggleType(r[3]),
                severity=Severity(r[4]),
                llm_reasoning=r[5],
                question_adapted=r[6],
                teacher_notified=r[7],
                timestamp=r[8],
            )
            for r in results
        ]
