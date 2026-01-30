import duckdb
from pathlib import Path
from contextlib import contextmanager
from typing import Generator, Optional

from app.config import get_settings

_connection: Optional[duckdb.DuckDBPyConnection] = None


def get_connection() -> duckdb.DuckDBPyConnection:
    """Get the database connection, creating it if needed."""
    global _connection
    if _connection is None:
        settings = get_settings()
        db_path = Path(settings.duckdb_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        _connection = duckdb.connect(str(db_path))
        init_tables(_connection)
    return _connection


@contextmanager
def get_db() -> Generator[duckdb.DuckDBPyConnection, None, None]:
    """Context manager for database operations."""
    conn = get_connection()
    try:
        yield conn
    finally:
        pass  # DuckDB handles transactions automatically


def init_tables(conn: duckdb.DuckDBPyConnection) -> None:
    """Initialize all database tables."""

    # Teachers table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS teachers (
            id VARCHAR PRIMARY KEY,
            username VARCHAR UNIQUE NOT NULL,
            password_hash VARCHAR NOT NULL,
            display_name VARCHAR,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Rubrics table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS rubrics (
            id VARCHAR PRIMARY KEY,
            teacher_id VARCHAR NOT NULL,
            title VARCHAR NOT NULL,
            content TEXT NOT NULL,
            parsed_criteria JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            FOREIGN KEY (teacher_id) REFERENCES teachers(id)
        )
    """)

    # Exams table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS exams (
            id VARCHAR PRIMARY KEY,
            teacher_id VARCHAR NOT NULL,
            rubric_id VARCHAR NOT NULL,
            room_code VARCHAR UNIQUE NOT NULL,
            status VARCHAR DEFAULT 'pending',
            started_at TIMESTAMP,
            ended_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (teacher_id) REFERENCES teachers(id),
            FOREIGN KEY (rubric_id) REFERENCES rubrics(id)
        )
    """)

    # Student sessions table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS student_sessions (
            id VARCHAR PRIMARY KEY,
            exam_id VARCHAR NOT NULL,
            student_name VARCHAR NOT NULL,
            student_id VARCHAR NOT NULL,
            status VARCHAR DEFAULT 'active',
            rubric_coverage JSON,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP,
            FOREIGN KEY (exam_id) REFERENCES exams(id)
        )
    """)

    # Transcript entries table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS transcript_entries (
            id VARCHAR PRIMARY KEY,
            session_id VARCHAR NOT NULL,
            entry_type VARCHAR NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES student_sessions(id)
        )
    """)

    # Coverage analyses table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS coverage_analyses (
            id VARCHAR PRIMARY KEY,
            transcript_entry_id VARCHAR NOT NULL,
            criteria_covered JSON,
            coverage_reasoning TEXT,
            total_coverage_pct FLOAT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (transcript_entry_id) REFERENCES transcript_entries(id)
        )
    """)

    # Struggle events table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS struggle_events (
            id VARCHAR PRIMARY KEY,
            session_id VARCHAR NOT NULL,
            transcript_entry_id VARCHAR NOT NULL,
            struggle_type VARCHAR,
            severity VARCHAR,
            llm_reasoning TEXT,
            question_adapted BOOLEAN DEFAULT FALSE,
            teacher_notified BOOLEAN DEFAULT FALSE,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES student_sessions(id),
            FOREIGN KEY (transcript_entry_id) REFERENCES transcript_entries(id)
        )
    """)

    # Analytics snapshots table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS analytics_snapshots (
            id VARCHAR PRIMARY KEY,
            exam_id VARCHAR NOT NULL,
            snapshot_type VARCHAR,
            data JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (exam_id) REFERENCES exams(id)
        )
    """)


def close_connection() -> None:
    """Close the database connection."""
    global _connection
    if _connection is not None:
        _connection.close()
        _connection = None
