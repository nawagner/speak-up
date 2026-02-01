import os

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import close_connection
from app.main import app
from app.services import auth as auth_service
from app.services import exam as exam_service
from app.services import rubric as rubric_service
from app.services import transcript as transcript_service


@pytest.fixture(autouse=True)
def _use_temp_db(tmp_path, monkeypatch):
    monkeypatch.setenv("DUCKDB_PATH", str(tmp_path / "test.duckdb"))
    get_settings.cache_clear()
    close_connection()
    yield
    close_connection()


def test_student_transcript_allows_completed_session():
    teacher = auth_service.register_teacher("teacher1", "password")
    rubric = rubric_service.create_rubric(teacher.id, "Title", "Content")
    exam = exam_service.create_exam(teacher.id, rubric.id)
    session = exam_service.create_student_session(exam.id, "Student", "S1")

    exam_service.complete_session(session.id)

    transcript_service.add_question(session.id, "Question 1")
    transcript_service.add_response(session.id, "Answer 1")
    transcript_service.add_system_note(session.id, "internal note")

    client = TestClient(app)
    response = client.get(f"/api/v1/session/{session.id}/transcript")

    assert response.status_code == 200
    payload = response.json()
    assert payload["session_id"] == session.id
    entry_types = [entry["entry_type"] for entry in payload["entries"]]
    assert entry_types == ["question", "response"]
