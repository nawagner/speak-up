import os
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import close_connection
from app.main import app
from app.services import auth as auth_service


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "test.duckdb"
    monkeypatch.setenv("DUCKDB_PATH", str(db_path))

    get_settings.cache_clear()
    close_connection()

    teacher = auth_service.register_teacher(
        username="test_teacher",
        password="test_password",
        display_name="Test Teacher",
    )
    token = auth_service.create_token(teacher.id)

    with TestClient(app) as test_client:
        test_client.headers.update({"Authorization": f"Bearer {token}"})
        yield test_client

    close_connection()
    get_settings.cache_clear()
