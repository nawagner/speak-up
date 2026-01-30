import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'

export async function POST(req: NextRequest) {
  try {
    const { rubricText } = await req.json()

    const { text } = await generateText({
      model: 'anthropic/claude-opus-4',
      prompt: `Parse this rubric and extract structured information.

Return ONLY valid JSON (no markdown code blocks) in this exact format:
{
  "examTitle": "string",
  "examDescription": "string",
  "criteria": [
    {
      "name": "string",
      "description": "string",
      "maxPoints": number
    }
  ]
}

Rubric:
${rubricText}`,
    })

    const rubric = JSON.parse(text.trim())
    return NextResponse.json({ rubric })
  } catch (error) {
    console.error('[v0] Parse rubric error:', error)
    return NextResponse.json(
      { error: 'Failed to parse rubric' },
      { status: 500 }
    )
  }
}
