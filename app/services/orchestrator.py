"""
Response Orchestration Service

Orchestrates the parallel processing of student responses:
1. Coverage analysis (runs in parallel with struggle detection)
2. Struggle detection (runs in parallel with coverage analysis)
3. Question generation (based on results of above)
"""

import asyncio
from dataclasses import dataclass
from typing import Optional

from app.models.domain import (
    ParsedRubric,
    CoverageMap,
    CoverageResult,
    StruggleEvent,
    StruggleType,
    Severity,
    TranscriptEntry,
    EntryType,
)
from app.services import coverage as coverage_service
from app.services import struggle as struggle_service
from app.services import questions as question_service
from app.services import exam as exam_service
from app.services import transcript as transcript_service
from app.services import rubric as rubric_service


@dataclass
class ProcessedResponse:
    """Result of processing a student response."""
    next_question: str
    question_number: int
    is_final: bool
    is_adapted: bool
    coverage_pct: float
    struggle_event: Optional[StruggleEvent]
    teacher_message: Optional[str]


async def process_student_response(
    session_id: str,
    response_text: str,
) -> ProcessedResponse:
    """
    Process a student response through parallel analysis pipelines.

    Args:
        session_id: Student session ID
        response_text: The student's transcribed response

    Returns:
        ProcessedResponse with next question and analysis results
    """
    # Get session and related data
    session = exam_service.get_student_session(session_id)
    if session is None:
        raise ValueError("Session not found")

    exam = exam_service.get_exam(session.exam_id)
    if exam is None:
        raise ValueError("Exam not found")

    rubric = rubric_service.get_rubric(exam.rubric_id)
    if rubric is None or rubric.parsed_criteria is None:
        raise ValueError("Rubric not found or not parsed")

    # Get transcript history and last question
    transcript = transcript_service.get_session_transcript(session_id)
    last_question_entry = transcript_service.get_last_question(session_id)
    last_question = last_question_entry.content if last_question_entry else ""

    # Add the response to the transcript
    response_entry = transcript_service.add_response(session_id, response_text)

    # Run coverage analysis and struggle detection in parallel
    coverage_task = asyncio.create_task(
        coverage_service.analyze_coverage(
            response=response_text,
            question=last_question,
            rubric=rubric.parsed_criteria,
            current_coverage=session.rubric_coverage,
        )
    )

    struggle_task = asyncio.create_task(
        struggle_service.detect_struggle(
            response=response_text,
            question=last_question,
            history=transcript,
        )
    )

    # Wait for both to complete
    coverage_result, struggle_event = await asyncio.gather(coverage_task, struggle_task)

    # Store coverage analysis
    coverage_service.create_coverage_analysis(
        transcript_entry_id=response_entry.id,
        criteria_covered=coverage_result.newly_covered,
        coverage_reasoning=coverage_result.reasoning,
        total_coverage_pct=coverage_result.total_coverage_pct,
    )

    # Update session coverage
    exam_service.update_session_coverage(session_id, coverage_result.updated_coverage)

    # Handle struggle event if detected
    teacher_message: Optional[str] = None
    is_adapted = False

    if struggle_event is not None:
        # Create and persist the struggle event
        persisted_event = struggle_service.create_struggle_event(
            session_id=session_id,
            transcript_entry_id=response_entry.id,
            struggle_type=struggle_event.struggle_type,
            severity=struggle_event.severity,
            llm_reasoning=struggle_event.llm_reasoning,
        )
        struggle_event = persisted_event

    # Check if exam should be complete
    completion_result = await coverage_service.check_completion(
        rubric=rubric.parsed_criteria,
        coverage=coverage_result.updated_coverage,
    )

    if completion_result.is_complete:
        # Exam is complete for this student
        exam_service.complete_session(session_id)

        return ProcessedResponse(
            next_question="",
            question_number=transcript_service.count_questions(session_id),
            is_final=True,
            is_adapted=False,
            coverage_pct=coverage_result.total_coverage_pct,
            struggle_event=struggle_event,
            teacher_message=None,
        )

    # Generate next question
    # Get updated transcript with the response we just added
    updated_transcript = transcript_service.get_session_transcript(session_id)

    if struggle_event is not None:
        # Generate adapted question
        next_question = await struggle_service.generate_adapted_question(
            original_question=last_question,
            struggle_event=struggle_event,
            history=updated_transcript,
        )
        is_adapted = True

        # Mark that question was adapted
        struggle_service.mark_question_adapted(struggle_event.id)
    else:
        # Generate normal next question
        next_question = await question_service.generate_question(
            rubric=rubric.parsed_criteria,
            transcript=updated_transcript,
            coverage=coverage_result.updated_coverage,
        )

    # Add the question to the transcript
    transcript_service.add_question(session_id, next_question)
    question_number = transcript_service.count_questions(session_id)

    # Update skip state for the newly generated question
    skip_state = session.skip_state.copy()
    skip_state["has_submitted_in_session"] = True
    if struggle_event is not None and skip_state.get("current_criteria"):
        current_criteria = skip_state.get("current_criteria", [])
    else:
        current_criteria = [
            c.id for c in question_service.select_target_criteria(
                rubric=rubric.parsed_criteria,
                coverage=coverage_result.updated_coverage,
            )[:5]
        ]
    skip_state["current_criteria"] = current_criteria
    skip_state["has_submitted_for_current"] = False
    skip_state["current_question_is_adapted"] = is_adapted
    exam_service.update_session_skip_state(session_id, skip_state)

    return ProcessedResponse(
        next_question=next_question,
        question_number=question_number,
        is_final=False,
        is_adapted=is_adapted,
        coverage_pct=coverage_result.total_coverage_pct,
        struggle_event=struggle_event,
        teacher_message=teacher_message,
    )


async def start_student_session(
    session_id: str,
    rubric: ParsedRubric,
) -> str:
    """
    Start a student session by generating the first question.

    Args:
        session_id: Student session ID
        rubric: Parsed rubric for the exam

    Returns:
        The first question text
    """
    # Generate the first question
    first_question = await question_service.generate_first_question(rubric)

    # Add to transcript
    transcript_service.add_question(session_id, first_question)

    skip_state = {
        "has_submitted_for_current": False,
        "has_submitted_in_session": False,
        "current_question_is_adapted": False,
        "current_criteria": [c.id for c in question_service.select_target_criteria(
            rubric=rubric,
            coverage=CoverageMap(),
        )[:5]],
        "skipped_criteria": [],
    }
    exam_service.update_session_skip_state(session_id, skip_state)

    return first_question


async def get_pending_question(session_id: str) -> Optional[str]:
    """
    Get the pending question for a session (the last question without a response).

    Args:
        session_id: Student session ID

    Returns:
        Question text if there's a pending question, None otherwise
    """
    transcript = transcript_service.get_session_transcript(session_id)

    if not transcript:
        return None

    # Check if the last entry is a question (meaning no response yet)
    last_entry = transcript[-1]
    if last_entry.entry_type == EntryType.QUESTION:
        return last_entry.content

    return None


async def process_skip_request(session_id: str) -> ProcessedResponse:
    """
    Process a skip request from a student.

    Two-stage skip logic:
    1. If current question is NOT adapted -> Generate adapted version of same question
    2. If current question IS already adapted -> Move to new topic, mark criterion as not covered

    Args:
        session_id: Student session ID

    Returns:
        ProcessedResponse with next question
    """
    # Get session and related data
    session = exam_service.get_student_session(session_id)
    if session is None:
        raise ValueError("Session not found")

    exam = exam_service.get_exam(session.exam_id)
    if exam is None:
        raise ValueError("Exam not found")

    rubric = rubric_service.get_rubric(exam.rubric_id)
    if rubric is None or rubric.parsed_criteria is None:
        raise ValueError("Rubric not found or not parsed")

    # Get skip state
    skip_state = session.skip_state.copy()
    current_is_adapted = skip_state.get("current_question_is_adapted", False)
    skipped_criteria = skip_state.get("skipped_criteria", [])
    current_criteria = skip_state.get("current_criteria", [])

    # Get transcript and last question
    transcript = transcript_service.get_session_transcript(session_id)
    last_question_entry = transcript_service.get_last_question(session_id)
    last_question = last_question_entry.content if last_question_entry else ""

    # Create a skip struggle event
    skip_event = struggle_service.create_struggle_event(
        session_id=session_id,
        transcript_entry_id=last_question_entry.id if last_question_entry else "",
        struggle_type=StruggleType.SKIP,
        severity=Severity.MEDIUM if current_is_adapted else Severity.LOW,
        llm_reasoning="Student skipped this question" + (
            " (second skip - moving to new topic)" if current_is_adapted else " (adapting question)"
        ),
        question_adapted=not current_is_adapted,
    )

    # Calculate current coverage percentage
    coverage_pct = 0.0
    if session.rubric_coverage.covered_criteria:
        total_criteria = len(rubric.parsed_criteria.criteria)
        if total_criteria > 0:
            coverage_pct = sum(session.rubric_coverage.covered_criteria.values()) / total_criteria

    if not current_is_adapted:
        # First skip: Generate adapted version of same question
        next_question = await struggle_service.generate_adapted_question(
            original_question=last_question,
            struggle_event=skip_event,
            history=transcript,
        )

        # Update skip state
        skip_state["current_question_is_adapted"] = True
        skip_state["has_submitted_for_current"] = False
        if not current_criteria:
            skip_state["current_criteria"] = [
                c.id for c in question_service.select_target_criteria(
                    rubric=rubric.parsed_criteria,
                    coverage=session.rubric_coverage,
                )[:5]
            ]
        exam_service.update_session_skip_state(session_id, skip_state)

        # Add adapted question to transcript with a system note
        transcript_service.add_system_note(session_id, "Student requested skip - question adapted")
        transcript_service.add_question(session_id, next_question)

        return ProcessedResponse(
            next_question=next_question,
            question_number=transcript_service.count_questions(session_id),
            is_final=False,
            is_adapted=True,
            coverage_pct=coverage_pct,
            struggle_event=skip_event,
            teacher_message="Question adapted after skip",
        )
    else:
        # Second skip: Move to new topic, mark as not covered
        transcript_service.add_system_note(
            session_id,
            "Student skipped twice - moving to new topic"
        )

        if current_criteria:
            for criterion_id in current_criteria:
                if criterion_id not in skipped_criteria:
                    skipped_criteria.append(criterion_id)

        # Generate question for a DIFFERENT topic (excluding skipped criteria)
        next_question = await question_service.generate_question_excluding_criteria(
            rubric=rubric.parsed_criteria,
            transcript=transcript,
            coverage=session.rubric_coverage,
            exclude_criteria=skipped_criteria,
        )

        # Update skip state
        skip_state["current_question_is_adapted"] = False
        skip_state["has_submitted_for_current"] = False
        skip_state["skipped_criteria"] = skipped_criteria
        skip_state["current_criteria"] = [
            c.id for c in question_service.select_target_criteria(
                rubric=rubric.parsed_criteria,
                coverage=session.rubric_coverage,
                exclude_criteria=skipped_criteria,
            )[:5]
        ]
        exam_service.update_session_skip_state(session_id, skip_state)

        # Add new question to transcript
        transcript_service.add_question(session_id, next_question)

        # Check if exam should be complete (with remaining criteria)
        completion_result = await coverage_service.check_completion_with_exclusions(
            rubric=rubric.parsed_criteria,
            coverage=session.rubric_coverage,
            excluded_criteria=skipped_criteria,
        )

        if completion_result.is_complete:
            exam_service.complete_session(session_id)
            return ProcessedResponse(
                next_question="",
                question_number=transcript_service.count_questions(session_id),
                is_final=True,
                is_adapted=False,
                coverage_pct=coverage_pct,
                struggle_event=skip_event,
                teacher_message=None,
            )

        return ProcessedResponse(
            next_question=next_question,
            question_number=transcript_service.count_questions(session_id),
            is_final=False,
            is_adapted=False,
            coverage_pct=coverage_pct,
            struggle_event=skip_event,
            teacher_message="Moving to a new topic",
        )
