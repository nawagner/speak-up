import pytest

from app.models.domain import Criterion, ParsedRubric, CoverageMap, CoverageResult, CompletionResult
from app.services import auth as auth_service
from app.services import exam as exam_service
from app.services import rubric as rubric_service
from app.services import transcript as transcript_service
from app.services import orchestrator
from app.services import coverage as coverage_service
from app.services import struggle as struggle_service
from app.services import questions as question_service


@pytest.mark.asyncio
async def test_process_student_response_resets_skip_state_for_new_question(client, monkeypatch):
    token = client.headers["Authorization"].split(" ")[1]
    teacher_id = auth_service.decode_token(token)
    assert teacher_id is not None

    parsed = ParsedRubric(
        criteria=[
            Criterion(id="c1", name="Criterion 1", description="Desc 1"),
            Criterion(id="c2", name="Criterion 2", description="Desc 2"),
        ]
    )
    rubric = rubric_service.create_rubric(teacher_id, "Title", "Content", parsed_criteria=parsed)
    exam = exam_service.create_exam(teacher_id, rubric.id)
    session = exam_service.create_student_session(exam.id, "Student", "S1")

    transcript_service.add_question(session.id, "Question 1")

    async def _fake_analyze_coverage(**_kwargs):
        return CoverageResult(
            newly_covered=[],
            updated_coverage=CoverageMap(),
            reasoning="",
            total_coverage_pct=0.0,
        )

    async def _fake_check_completion(**_kwargs):
        return CompletionResult(is_complete=False, missing_criteria=[], coverage_summary="")

    async def _fake_generate_question(**_kwargs):
        return "Question 2"

    async def _fake_detect_struggle(**_kwargs):
        return None

    monkeypatch.setattr(coverage_service, "analyze_coverage", _fake_analyze_coverage)
    monkeypatch.setattr(coverage_service, "check_completion", _fake_check_completion)
    monkeypatch.setattr(question_service, "generate_question", _fake_generate_question)
    monkeypatch.setattr(struggle_service, "detect_struggle", _fake_detect_struggle)

    await orchestrator.process_student_response(session.id, "Answer 1")

    updated_session = exam_service.get_student_session(session.id)
    assert updated_session is not None
    skip_state = updated_session.skip_state

    assert skip_state.get("has_submitted_for_current") is False
    assert skip_state.get("has_submitted_in_session") is True
    assert skip_state.get("current_question_is_adapted") is False
    assert skip_state.get("current_criteria") == ["c1", "c2"]


@pytest.mark.asyncio
async def test_process_skip_request_second_skip_excludes_current_criteria(client, monkeypatch):
    token = client.headers["Authorization"].split(" ")[1]
    teacher_id = auth_service.decode_token(token)
    assert teacher_id is not None

    parsed = ParsedRubric(
        criteria=[
            Criterion(id="c1", name="Criterion 1", description="Desc 1"),
            Criterion(id="c2", name="Criterion 2", description="Desc 2"),
        ]
    )
    rubric = rubric_service.create_rubric(teacher_id, "Title", "Content", parsed_criteria=parsed)
    exam = exam_service.create_exam(teacher_id, rubric.id)
    session = exam_service.create_student_session(exam.id, "Student", "S1")

    transcript_service.add_question(session.id, "Question 1")

    exam_service.update_session_skip_state(
        session.id,
        {
            "has_submitted_for_current": True,
            "current_question_is_adapted": True,
            "current_criteria": ["c1"],
            "skipped_criteria": [],
        },
    )

    captured = {}

    async def _fake_generate_question_excluding_criteria(**kwargs):
        captured["exclude_criteria"] = kwargs.get("exclude_criteria")
        return "Question 2"

    async def _fake_check_completion_with_exclusions(**_kwargs):
        return CompletionResult(is_complete=False, missing_criteria=[], coverage_summary="")

    monkeypatch.setattr(
        question_service, "generate_question_excluding_criteria", _fake_generate_question_excluding_criteria
    )
    monkeypatch.setattr(
        coverage_service,
        "check_completion_with_exclusions",
        _fake_check_completion_with_exclusions,
    )

    await orchestrator.process_skip_request(session.id)

    assert captured.get("exclude_criteria") == ["c1"]

    updated_session = exam_service.get_student_session(session.id)
    assert updated_session is not None
    updated_skip_state = updated_session.skip_state
    assert "c1" in updated_skip_state.get("skipped_criteria", [])
