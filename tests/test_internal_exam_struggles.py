from app.models.domain import Severity, StruggleType
from app.services import auth as auth_service
from app.services import exam as exam_service
from app.services import rubric as rubric_service
from app.services import struggle as struggle_service
from app.services import transcript as transcript_service


def test_exam_struggles_includes_notified_events(client):
    token = client.headers["Authorization"].split(" ")[1]
    teacher_id = auth_service.decode_token(token)
    assert teacher_id is not None

    rubric = rubric_service.create_rubric(teacher_id, "Title", "Content")
    exam = exam_service.create_exam(teacher_id, rubric.id)
    session = exam_service.create_student_session(exam.id, "Student", "S1")

    entry_one = transcript_service.add_question(session.id, "Question 1")
    entry_two = transcript_service.add_question(session.id, "Question 2")

    notified = struggle_service.create_struggle_event(
        session.id,
        entry_one.id,
        StruggleType.CONFUSION,
        Severity.LOW,
        "needs clarification",
    )
    unnotified = struggle_service.create_struggle_event(
        session.id,
        entry_two.id,
        StruggleType.SILENCE,
        Severity.MEDIUM,
        "no response",
    )
    struggle_service.mark_teacher_notified(notified.id)

    response = client.get(f"/internal/exams/{exam.id}/struggles")

    assert response.status_code == 200
    payload = response.json()
    assert {item["id"] for item in payload} == {notified.id, unnotified.id}
