import pytest

from app.services import coverage as coverage_service


MAX_TITLE_LENGTH = 200


class _FailClient:
    async def complete(self, **_kwargs):
        raise AssertionError("LLM should not be called")


class _FakeClient:
    def __init__(self, content: str):
        self._content = content

    async def complete(self, **_kwargs):
        return self._content


@pytest.mark.asyncio
async def test_generate_rubric_content_rejects_empty_title(monkeypatch):
    monkeypatch.setattr(coverage_service, "get_llm_client", lambda: _FailClient())

    with pytest.raises(ValueError):
        await coverage_service.generate_rubric_content("   ")


@pytest.mark.asyncio
async def test_generate_rubric_content_rejects_long_title(monkeypatch):
    monkeypatch.setattr(coverage_service, "get_llm_client", lambda: _FailClient())

    with pytest.raises(ValueError):
        await coverage_service.generate_rubric_content("a" * (MAX_TITLE_LENGTH + 1))


@pytest.mark.asyncio
async def test_generate_rubric_content_rejects_empty_llm_output(monkeypatch):
    monkeypatch.setattr(coverage_service, "get_llm_client", lambda: _FakeClient("  "))

    with pytest.raises(RuntimeError):
        await coverage_service.generate_rubric_content("Valid Title")
