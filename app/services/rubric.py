from datetime import datetime
from typing import Optional
import json

from uuid7 import uuid7

from app.database import get_db
from app.models.domain import Rubric, ParsedRubric


def create_rubric(
    teacher_id: str,
    title: str,
    content: str,
    parsed_criteria: Optional[ParsedRubric] = None,
) -> Rubric:
    """
    Create a new rubric.

    Args:
        teacher_id: ID of the teacher creating the rubric
        title: Rubric title
        content: Raw markdown content
        parsed_criteria: Optional pre-parsed criteria

    Returns:
        Created Rubric object
    """
    with get_db() as conn:
        rubric_id = str(uuid7())
        created_at = datetime.utcnow()

        parsed_json = None
        if parsed_criteria:
            parsed_json = parsed_criteria.model_dump_json()

        conn.execute(
            """
            INSERT INTO rubrics (id, teacher_id, title, content, parsed_criteria, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [rubric_id, teacher_id, title, content, parsed_json, created_at]
        )

        return Rubric(
            id=rubric_id,
            teacher_id=teacher_id,
            title=title,
            content=content,
            parsed_criteria=parsed_criteria,
            created_at=created_at,
        )


def get_rubric(rubric_id: str, teacher_id: Optional[str] = None) -> Optional[Rubric]:
    """
    Get a rubric by ID.

    Args:
        rubric_id: Rubric ID
        teacher_id: Optional teacher ID to verify ownership

    Returns:
        Rubric object or None if not found
    """
    with get_db() as conn:
        query = """
            SELECT id, teacher_id, title, content, parsed_criteria, created_at, updated_at
            FROM rubrics WHERE id = ?
        """
        params = [rubric_id]

        if teacher_id:
            query += " AND teacher_id = ?"
            params.append(teacher_id)

        result = conn.execute(query, params).fetchone()

        if result is None:
            return None

        parsed = None
        if result[4]:
            parsed_data = json.loads(result[4]) if isinstance(result[4], str) else result[4]
            parsed = ParsedRubric(**parsed_data)

        return Rubric(
            id=result[0],
            teacher_id=result[1],
            title=result[2],
            content=result[3],
            parsed_criteria=parsed,
            created_at=result[5],
            updated_at=result[6],
        )


def list_rubrics(teacher_id: str) -> list[Rubric]:
    """
    List all rubrics for a teacher.

    Args:
        teacher_id: Teacher ID

    Returns:
        List of Rubric objects
    """
    with get_db() as conn:
        results = conn.execute(
            """
            SELECT id, teacher_id, title, content, parsed_criteria, created_at, updated_at
            FROM rubrics WHERE teacher_id = ?
            ORDER BY created_at DESC
            """,
            [teacher_id]
        ).fetchall()

        rubrics = []
        for result in results:
            parsed = None
            if result[4]:
                parsed_data = json.loads(result[4]) if isinstance(result[4], str) else result[4]
                parsed = ParsedRubric(**parsed_data)

            rubrics.append(Rubric(
                id=result[0],
                teacher_id=result[1],
                title=result[2],
                content=result[3],
                parsed_criteria=parsed,
                created_at=result[5],
                updated_at=result[6],
            ))

        return rubrics


def update_rubric(
    rubric_id: str,
    teacher_id: str,
    title: Optional[str] = None,
    content: Optional[str] = None,
    parsed_criteria: Optional[ParsedRubric] = None,
) -> Optional[Rubric]:
    """
    Update a rubric.

    Args:
        rubric_id: Rubric ID
        teacher_id: Teacher ID (for ownership verification)
        title: New title (optional)
        content: New content (optional)
        parsed_criteria: New parsed criteria (optional)

    Returns:
        Updated Rubric object or None if not found
    """
    # First verify ownership and get current data
    rubric = get_rubric(rubric_id, teacher_id)
    if rubric is None:
        return None

    with get_db() as conn:
        updated_at = datetime.utcnow()

        # Build update query dynamically
        updates = ["updated_at = ?"]
        params = [updated_at]

        if title is not None:
            updates.append("title = ?")
            params.append(title)

        if content is not None:
            updates.append("content = ?")
            params.append(content)

        if parsed_criteria is not None:
            updates.append("parsed_criteria = ?")
            params.append(parsed_criteria.model_dump_json())

        params.extend([rubric_id, teacher_id])

        conn.execute(
            f"""
            UPDATE rubrics SET {', '.join(updates)}
            WHERE id = ? AND teacher_id = ?
            """,
            params
        )

    return get_rubric(rubric_id, teacher_id)


def delete_rubric(rubric_id: str, teacher_id: str) -> bool:
    """
    Delete a rubric.

    Args:
        rubric_id: Rubric ID
        teacher_id: Teacher ID (for ownership verification)

    Returns:
        True if deleted, False if not found
    """
    with get_db() as conn:
        result = conn.execute(
            "DELETE FROM rubrics WHERE id = ? AND teacher_id = ?",
            [rubric_id, teacher_id]
        )
        return result.rowcount > 0


def update_rubric_parsed_criteria(rubric_id: str, parsed_criteria: ParsedRubric) -> None:
    """
    Update only the parsed criteria for a rubric.
    Used after LLM parsing is complete.

    Args:
        rubric_id: Rubric ID
        parsed_criteria: Parsed criteria to save
    """
    with get_db() as conn:
        conn.execute(
            """
            UPDATE rubrics SET parsed_criteria = ?, updated_at = ?
            WHERE id = ?
            """,
            [parsed_criteria.model_dump_json(), datetime.utcnow(), rubric_id]
        )
