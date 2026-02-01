"""
Question Generation Service

Handles dynamic question generation based on rubric and conversation context.
"""

from typing import Optional

from app.models.domain import (
    Criterion,
    ParsedRubric,
    CoverageMap,
    TranscriptEntry,
)
from app.services.llm_client import get_llm_client


GENERATE_QUESTION_SYSTEM_PROMPT = """You are an expert oral examiner conducting an academic assessment.

Your task is to generate the next question for a student based on:
1. The rubric criteria that haven't been covered yet
2. The conversation history
3. Natural flow of the examination

Guidelines:
- Target criteria that have low or no coverage
- Build on previous responses when possible
- Keep questions clear and focused
- Vary question types (explain, compare, apply, analyze)
- Maintain a professional but encouraging tone
- Questions should be open-ended to allow demonstration of knowledge

Return only the question text, nothing else. Do not include prefixes like "Question:" or numbers.
"""

GENERATE_FIRST_QUESTION_SYSTEM_PROMPT = """You are an expert oral examiner starting an academic assessment.

Your task is to generate an opening question based on the rubric criteria.

Guidelines:
- Start with a foundational topic from the rubric
- The opening question should be accessible but substantive
- It should help the student settle in while demonstrating knowledge
- Keep it clear and focused
- Maintain a professional but welcoming tone

Return only the question text, nothing else. Do not include prefixes like "Question:" or numbers.
"""


async def generate_question(
    rubric: ParsedRubric,
    transcript: list[TranscriptEntry],
    coverage: CoverageMap,
) -> str:
    """
    Generate the next contextual question based on rubric and progress.

    Args:
        rubric: Parsed rubric with criteria
        transcript: Conversation history
        coverage: Current coverage state

    Returns:
        Generated question text
    """
    client = get_llm_client()

    target_criteria = select_target_criteria(rubric, coverage)

    criteria_text = "\n".join([
        f"- {c.name}: {c.description} (coverage: {coverage.covered_criteria.get(c.id, 0)*100:.0f}%)"
        for c in target_criteria[:5]  # Limit to top 5
    ])

    # Build recent transcript context
    recent = transcript[-6:] if len(transcript) > 6 else transcript
    transcript_text = "\n".join([
        f"[{e.entry_type.value}]: {e.content[:200]}..."
        if len(e.content) > 200 else f"[{e.entry_type.value}]: {e.content}"
        for e in recent
    ]) or "This is the start of the exam."

    prompt = f"""Generate the next question for this oral exam.

TARGET CRITERIA (prioritize these):
{criteria_text}

RECENT CONVERSATION:
{transcript_text}

Generate a natural follow-up question that targets the uncovered criteria while building on the conversation."""

    question = await client.complete(
        prompt=prompt,
        system_prompt=GENERATE_QUESTION_SYSTEM_PROMPT,
        temperature=0.7,
    )

    return question.strip()


async def generate_first_question(rubric: ParsedRubric) -> str:
    """
    Generate the opening question for an exam.

    Args:
        rubric: Parsed rubric with criteria

    Returns:
        Opening question text
    """
    client = get_llm_client()

    criteria_text = "\n".join([
        f"- {c.name}: {c.description}"
        for c in rubric.criteria
    ])

    prompt = f"""Generate an opening question for this oral exam.

RUBRIC CRITERIA:
{criteria_text}

Generate a welcoming but substantive opening question that starts the assessment."""

    question = await client.complete(
        prompt=prompt,
        system_prompt=GENERATE_FIRST_QUESTION_SYSTEM_PROMPT,
        temperature=0.6,
    )

    return question.strip()


async def generate_synthesis_question(
    rubric: ParsedRubric,
    transcript: list[TranscriptEntry],
) -> str:
    """
    Generate a synthesis question that ties together multiple criteria.
    Used when individual criteria are mostly covered.

    Args:
        rubric: Parsed rubric with criteria
        transcript: Conversation history

    Returns:
        Synthesis question text
    """
    client = get_llm_client()

    criteria_names = [c.name for c in rubric.criteria]

    prompt = f"""The student has demonstrated good coverage of individual topics.
Generate a synthesis question that asks them to connect multiple concepts.

TOPICS COVERED:
{', '.join(criteria_names)}

Generate a question that requires integrating knowledge from multiple areas."""

    question = await client.complete(
        prompt=prompt,
        system_prompt=GENERATE_QUESTION_SYSTEM_PROMPT,
        temperature=0.7,
    )

    return question.strip()


async def generate_question_excluding_criteria(
    rubric: ParsedRubric,
    transcript: list[TranscriptEntry],
    coverage: CoverageMap,
    exclude_criteria: list[str],
) -> str:
    """
    Generate a question that targets criteria NOT in the exclude list.
    Used when a student has skipped a criterion entirely and needs a new topic.

    Args:
        rubric: Parsed rubric with criteria
        transcript: Conversation history
        coverage: Current coverage state
        exclude_criteria: List of criterion IDs to exclude (skipped criteria)

    Returns:
        Generated question text for a different topic
    """
    client = get_llm_client()

    target_criteria = select_target_criteria(
        rubric,
        coverage,
        exclude_criteria=exclude_criteria,
    )

    if not target_criteria:
        # All criteria excluded - ask a general wrap-up question
        return await generate_synthesis_question(rubric, transcript)

    criteria_text = "\n".join([
        f"- {c.name}: {c.description} (coverage: {coverage.covered_criteria.get(c.id, 0)*100:.0f}%)"
        for c in target_criteria[:5]
    ])

    excluded_text = ", ".join(exclude_criteria) if exclude_criteria else "None"

    # Build recent transcript context
    recent = transcript[-6:] if len(transcript) > 6 else transcript
    transcript_text = "\n".join([
        f"[{e.entry_type.value}]: {e.content[:200]}..."
        if len(e.content) > 200 else f"[{e.entry_type.value}]: {e.content}"
        for e in recent
    ]) or "This is the start of the exam."

    prompt = f"""Generate a NEW question on a DIFFERENT topic than the previous questions.
The student has chosen to skip the previous topic.

TARGET CRITERIA (focus on these new topics):
{criteria_text}

SKIPPED CRITERIA (do NOT ask about these):
{excluded_text}

RECENT CONVERSATION:
{transcript_text}

Generate a question that explores a new area of the rubric, moving away from the previous topic."""

    question = await client.complete(
        prompt=prompt,
        system_prompt=GENERATE_QUESTION_SYSTEM_PROMPT,
        temperature=0.7,
    )

    return question.strip()


def select_target_criteria(
    rubric: ParsedRubric,
    coverage: CoverageMap,
    exclude_criteria: Optional[list[str]] = None,
) -> list[Criterion]:
    exclude = set(exclude_criteria or [])
    available_criteria = [c for c in rubric.criteria if c.id not in exclude]

    if not available_criteria:
        return []

    uncovered = []
    partially_covered = []

    for criterion in available_criteria:
        cov = coverage.covered_criteria.get(criterion.id, 0.0)
        if cov < 0.3:
            uncovered.append(criterion)
        elif cov < 0.7:
            partially_covered.append(criterion)

    target_criteria = uncovered if uncovered else partially_covered
    if not target_criteria:
        target_criteria = available_criteria

    return target_criteria
