from app.services import coverage as coverage_service


MAX_TITLE_LENGTH = 200


def test_generate_rubric_rejects_long_title(client, monkeypatch):
    async def fail_generate(_: str) -> str:
        raise AssertionError("LLM should not be called")

    monkeypatch.setattr(coverage_service, "generate_rubric_content", fail_generate)

    response = client.post(
        "/internal/rubrics/generate",
        json={"title": "a" * (MAX_TITLE_LENGTH + 1)},
    )

    assert response.status_code == 400
    assert str(MAX_TITLE_LENGTH) in response.json()["detail"]


def test_generate_rubric_masks_internal_errors(client, monkeypatch):
    async def boom(_: str) -> str:
        raise RuntimeError("boom")

    monkeypatch.setattr(coverage_service, "generate_rubric_content", boom)

    response = client.post(
        "/internal/rubrics/generate",
        json={"title": "Valid Title"},
    )

    assert response.status_code == 500
    detail = response.json()["detail"]
    assert detail == "Failed to generate rubric"
    assert "boom" not in detail
