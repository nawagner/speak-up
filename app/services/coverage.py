"""
Coverage Analysis Service

Focused solely on evaluating rubric criteria coverage.
Separate from struggle detection to ensure clean separation of concerns.
"""

from typing import Optional
from uuid7 import uuid7

from app.models.domain import (
    ParsedRubric,
    Criterion,
    CoverageMap,
    CoverageResult,
    CompletionResult,
    CoverageAnalysis,
    TranscriptEntry,
)
from app.services.llm_client import get_llm_client


PARSE_RUBRIC_SYSTEM_PROMPT = """You are an expert at analyzing educational rubrics and extracting structured criteria.

Your task is to parse a markdown rubric and extract all assessment criteria into a structured format.

For each criterion, identify:
1. A unique identifier (use snake_case, e.g., "understanding_concepts")
2. The name/title of the criterion
3. A description of what the student should demonstrate
4. Optional point value if specified

Return your response as valid JSON with this structure:
{
    "criteria": [
        {
            "id": "criterion_id",
            "name": "Criterion Name",
            "description": "What the student should demonstrate",
            "points": null or number
        }
    ],
    "total_points": null or number
}

Be thorough - extract ALL criteria mentioned in the rubric, even implicit ones.
"""

ANALYZE_COVERAGE_SYSTEM_PROMPT = """You are an expert at evaluating student oral exam responses against rubric criteria.

Your task is to analyze a student's response and determine which rubric criteria it addresses.

Consider:
- Partial coverage is valid (student may partially address a criterion)
- Look for both explicit and implicit demonstrations of knowledge
- Be fair but rigorous in your assessment

Return your response as valid JSON with this structure:
{
    "newly_covered": ["criterion_id_1", "criterion_id_2"],
    "coverage_updates": {
        "criterion_id": 0.75
    },
    "reasoning": "Explanation of your analysis"
}

Where:
- newly_covered: list of criterion IDs that were addressed in this response
- coverage_updates: dict mapping criterion ID to coverage percentage (0.0 to 1.0)
- reasoning: brief explanation of your assessment
"""

CHECK_COMPLETION_SYSTEM_PROMPT = """You are evaluating whether a student has sufficiently covered all rubric criteria.

Review the current coverage status and determine if the exam can be considered complete.

Criteria for completion:
- All major criteria should have at least 70% coverage
- Minor criteria can have lower coverage if major ones are well covered
- Consider the overall demonstration of knowledge

Return your response as valid JSON with this structure:
{
    "is_complete": true or false,
    "missing_criteria": ["criterion_id_1"],
    "coverage_summary": "Brief summary of coverage status"
}
"""


async def parse_rubric(rubric_text: str) -> ParsedRubric:
    """
    Parse a markdown rubric into structured criteria.

    Args:
        rubric_text: Raw markdown rubric content

    Returns:
        ParsedRubric with extracted criteria
    """
    client = get_llm_client()

    prompt = f"""Please parse the following rubric and extract all assessment criteria:

---
{rubric_text}
---

Extract the criteria as JSON."""

    result = await client.complete_json(
        prompt=prompt,
        system_prompt=PARSE_RUBRIC_SYSTEM_PROMPT,
        temperature=0.2,
    )

    criteria = [
        Criterion(
            id=c["id"],
            name=c["name"],
            description=c["description"],
            points=c.get("points"),
        )
        for c in result.get("criteria", [])
    ]

    return ParsedRubric(
        criteria=criteria,
        total_points=result.get("total_points"),
    )


async def analyze_coverage(
    response: str,
    question: str,
    rubric: ParsedRubric,
    current_coverage: CoverageMap,
) -> CoverageResult:
    """
    Analyze which rubric criteria a student response addresses.

    Args:
        response: Student's response text
        question: The question that was asked
        rubric: Parsed rubric with criteria
        current_coverage: Current coverage state

    Returns:
        CoverageResult with updated coverage information
    """
    client = get_llm_client()

    criteria_text = "\n".join([
        f"- {c.id}: {c.name} - {c.description}"
        for c in rubric.criteria
    ])

    current_coverage_text = "\n".join([
        f"- {cid}: {pct*100:.0f}% covered"
        for cid, pct in current_coverage.covered_criteria.items()
    ]) or "No criteria covered yet"

    prompt = f"""Analyze the following student response for rubric coverage:

QUESTION:
{question}

STUDENT RESPONSE:
{response}

RUBRIC CRITERIA:
{criteria_text}

CURRENT COVERAGE STATUS:
{current_coverage_text}

Determine which criteria this response addresses and to what degree."""

    result = await client.complete_json(
        prompt=prompt,
        system_prompt=ANALYZE_COVERAGE_SYSTEM_PROMPT,
        temperature=0.3,
    )

    # Build updated coverage map
    updated_coverage = CoverageMap(
        covered_criteria=dict(current_coverage.covered_criteria)
    )

    for cid, pct in result.get("coverage_updates", {}).items():
        # Take the maximum of current and new coverage
        current = updated_coverage.covered_criteria.get(cid, 0.0)
        updated_coverage.covered_criteria[cid] = max(current, float(pct))

    # Calculate total coverage percentage
    total_criteria = len(rubric.criteria)
    if total_criteria > 0:
        total_pct = sum(updated_coverage.covered_criteria.values()) / total_criteria
    else:
        total_pct = 0.0

    return CoverageResult(
        newly_covered=result.get("newly_covered", []),
        updated_coverage=updated_coverage,
        reasoning=result.get("reasoning", ""),
        total_coverage_pct=total_pct,
    )


async def check_completion(
    rubric: ParsedRubric,
    coverage: CoverageMap,
) -> CompletionResult:
    """
    Determine if the exam should end based on rubric coverage.

    Args:
        rubric: Parsed rubric with criteria
        coverage: Current coverage state

    Returns:
        CompletionResult indicating if exam is complete
    """
    client = get_llm_client()

    criteria_text = "\n".join([
        f"- {c.id}: {c.name} (covered: {coverage.covered_criteria.get(c.id, 0)*100:.0f}%)"
        for c in rubric.criteria
    ])

    prompt = f"""Evaluate if this oral exam should be considered complete:

CRITERIA COVERAGE STATUS:
{criteria_text}

Determine if the student has sufficiently covered all criteria."""

    result = await client.complete_json(
        prompt=prompt,
        system_prompt=CHECK_COMPLETION_SYSTEM_PROMPT,
        temperature=0.2,
    )

    return CompletionResult(
        is_complete=result.get("is_complete", False),
        missing_criteria=result.get("missing_criteria", []),
        coverage_summary=result.get("coverage_summary", ""),
    )


def create_coverage_analysis(
    transcript_entry_id: str,
    criteria_covered: list[str],
    coverage_reasoning: str,
    total_coverage_pct: float,
) -> CoverageAnalysis:
    """
    Create and store a coverage analysis record.

    Args:
        transcript_entry_id: ID of the transcript entry analyzed
        criteria_covered: List of criterion IDs covered
        coverage_reasoning: LLM's reasoning
        total_coverage_pct: Total coverage percentage

    Returns:
        Created CoverageAnalysis object
    """
    from datetime import datetime
    from app.database import get_db
    import json

    analysis_id = str(uuid7())
    timestamp = datetime.utcnow()

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO coverage_analyses
            (id, transcript_entry_id, criteria_covered, coverage_reasoning, total_coverage_pct, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                analysis_id,
                transcript_entry_id,
                json.dumps(criteria_covered),
                coverage_reasoning,
                total_coverage_pct,
                timestamp,
            ]
        )

    return CoverageAnalysis(
        id=analysis_id,
        transcript_entry_id=transcript_entry_id,
        criteria_covered=criteria_covered,
        coverage_reasoning=coverage_reasoning,
        total_coverage_pct=total_coverage_pct,
        timestamp=timestamp,
    )
