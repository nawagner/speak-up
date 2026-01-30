#!/usr/bin/env python3
"""
Seed script to import sample rubrics into the database.

This script creates a demo teacher account (if it doesn't exist) and imports
the sample rubrics from data/rubrics/ into the database.

Usage:
    python scripts/seed_rubrics.py

Options:
    --teacher-username  Username for the demo teacher (default: demo_teacher)
    --teacher-password  Password for the demo teacher (default: demo123)
    --force            Re-import rubrics even if they already exist
    --db-path          Path to the DuckDB database file (default: from .env)

Note: If the database is locked by another process (e.g., running Streamlit app),
      you may need to stop that process first, or specify a different --db-path.
"""

import argparse
import os
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

RUBRICS_DIR = project_root / "data" / "rubrics"

RUBRIC_METADATA = {
    "french_oral_exam_rubric.md": {
        "title": "French Oral Exam Rubric",
    },
    "hemingway_literature_rubric.md": {
        "title": "Ernest Hemingway Literature Oral Exam Rubric",
    },
    "wwii_oral_exam_rubric.md": {
        "title": "World War II Oral Exam Rubric",
    },
}


def main():
    parser = argparse.ArgumentParser(
        description="Seed the database with sample rubrics"
    )
    parser.add_argument(
        "--teacher-username",
        default="demo_teacher",
        help="Username for the demo teacher (default: demo_teacher)"
    )
    parser.add_argument(
        "--teacher-password",
        default="demo123",
        help="Password for the demo teacher (default: demo123)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-import rubrics even if they already exist"
    )
    parser.add_argument(
        "--db-path",
        default=None,
        help="Path to the DuckDB database file (overrides .env setting)"
    )

    args = parser.parse_args()

    # Override database path if specified (must be done before importing app modules)
    if args.db_path:
        os.environ["DUCKDB_PATH"] = args.db_path
        print(f"Using database: {args.db_path}")

    # Import app modules after setting environment
    from app.database import get_db, get_connection, close_connection
    from app.services.auth import register_teacher
    from app.services.rubric import create_rubric, list_rubrics

    print("=== Speak Up Rubric Seed Script ===\n")

    # Initialize database connection
    get_connection()

    try:
        # Get or create demo teacher
        teacher_id = get_or_create_demo_teacher(
            args.teacher_username,
            args.teacher_password,
            get_db,
            register_teacher,
        )

        print(f"Teacher ID: {teacher_id}\n")

        # Import rubrics
        import_rubrics(
            teacher_id,
            args.force,
            get_db,
            create_rubric,
            list_rubrics,
        )

    finally:
        close_connection()

    print("\nDone!")


def get_or_create_demo_teacher(username: str, password: str, get_db, register_teacher) -> str:
    """Get or create the demo teacher account, returning the teacher ID."""
    with get_db() as conn:
        # Check if teacher exists
        result = conn.execute(
            "SELECT id FROM teachers WHERE username = ?",
            [username]
        ).fetchone()

        if result:
            print(f"Using existing teacher: {username}")
            return result[0]

    # Create new teacher
    teacher = register_teacher(
        username=username,
        password=password,
        display_name="Demo Teacher"
    )
    print(f"Created new teacher: {username} (password: {password})")
    return teacher.id


def import_rubrics(teacher_id: str, force: bool, get_db, create_rubric, list_rubrics) -> None:
    """Import rubric markdown files into the database."""
    # Get existing rubric titles
    rubrics = list_rubrics(teacher_id)
    existing_titles = {r.title for r in rubrics}

    if not RUBRICS_DIR.exists():
        print(f"Error: Rubrics directory not found: {RUBRICS_DIR}")
        sys.exit(1)

    rubric_files = list(RUBRICS_DIR.glob("*.md"))

    if not rubric_files:
        print(f"No rubric files found in {RUBRICS_DIR}")
        return

    imported_count = 0
    skipped_count = 0

    for rubric_file in rubric_files:
        filename = rubric_file.name
        metadata = RUBRIC_METADATA.get(filename, {})
        title = metadata.get("title", rubric_file.stem.replace("_", " ").title())

        if title in existing_titles and not force:
            print(f"Skipped (already exists): {title}")
            skipped_count += 1
            continue

        # Delete existing rubric if force is enabled
        if title in existing_titles and force:
            with get_db() as conn:
                conn.execute(
                    "DELETE FROM rubrics WHERE teacher_id = ? AND title = ?",
                    [teacher_id, title]
                )
                print(f"Deleted existing rubric: {title}")

        content = rubric_file.read_text(encoding="utf-8")

        rubric = create_rubric(
            teacher_id=teacher_id,
            title=title,
            content=content,
        )

        print(f"Imported: {title} (ID: {rubric.id})")
        imported_count += 1

    print(f"\nSummary: {imported_count} imported, {skipped_count} skipped")


if __name__ == "__main__":
    main()
