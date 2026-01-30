import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // ElevenLabs Speech-to-Text API
    const ELEVENLABS_API_KEY = "psk_eb258a0a125776ff718a0cc603f40052211abfb73dcfab16"
    
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      )
    }

    const elevenLabsFormData = new FormData()
    elevenLabsFormData.append('audio', audioFile)

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: elevenLabsFormData,
    })

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json({ transcript: data.text })
  } catch (error) {
    console.error('[v0] Transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}
