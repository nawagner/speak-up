import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import type { ParsedRubric, EvaluationResult } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const { transcript, rubric, studentName, studentId } = await req.json() as {
      transcript: string
      rubric: ParsedRubric
      studentName: string
      studentId: string
    }

    // Evaluate against each criterion
    const { text } = await generateText({
      model: 'anthropic/claude-opus-4',
      prompt: `Evaluate this oral exam response against the provided rubric.

Exam: ${rubric.examTitle}
Description: ${rubric.examDescription}

Criteria:
${rubric.criteria.map((c, i) => `${i + 1}. ${c.name} (${c.maxPoints} points): ${c.description}`).join('\n')}

Student Response (Transcript):
${transcript}

For each criterion, provide a score (0 to maxPoints) and specific feedback. Also calculate the total score and letter grade (A, B, C, D, F).

Return ONLY valid JSON (no markdown code blocks) in this exact format:
{
  "feedback": [
    {
      "criterion": "string (criterion name)",
      "score": number,
      "maxScore": number,
      "feedback": "string (specific feedback about this criterion)"
    }
  ],
  "totalScore": number,
  "maxScore": number,
  "letterGrade": "string (A, B, C, D, or F)",
  "overallComments": "string (2-3 sentences of overall feedback)"
}`,
    })

    const evaluation = JSON.parse(text.trim())
    
    const result: EvaluationResult = {
      ...evaluation,
      transcript,
      studentName,
      studentId,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[v0] Evaluation error:', error)
    return NextResponse.json(
      { error: 'Failed to evaluate response' },
      { status: 500 }
    )
  }
}
