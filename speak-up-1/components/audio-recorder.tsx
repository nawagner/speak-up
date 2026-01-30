'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { recordAudio } from '@/lib/audio'

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const mediaRecorderRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const startRecording = async () => {
    try {
      const recorder = await recordAudio()
      mediaRecorderRef.current = recorder

      recorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      recorder.ondataavailable = (event: BlobEvent) => {
        const blob = event.data
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        onRecordingComplete(blob, recordingTime)
      }

      recorder.onerror = () => {
        toast.error('Recording error occurred')
        stopRecording()
      }

      toast.success('Recording started')
    } catch (error) {
      console.error('[v0] Error starting recording:', error)
      toast.error('Failed to start recording. Please check microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      toast.success('Recording stopped')
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume()
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1)
        }, 1000)
      } else {
        mediaRecorderRef.current.pause()
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }
      setIsPaused(!isPaused)
    }
  }

  const resetRecording = () => {
    setAudioBlob(null)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setRecordingTime(0)
    setIsPlaying(false)
  }

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="bg-card">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className={`absolute inset-0 rounded-full ${isRecording ? 'animate-pulse bg-primary/20' : ''}`} />
            <div className="relative rounded-full bg-muted p-8">
              <Mic className={`h-12 w-12 ${isRecording ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-foreground">
            {formatTime(recordingTime)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isRecording ? (isPaused ? 'Paused' : 'Recording...') : audioBlob ? 'Recording complete' : 'Ready to record'}
          </p>
        </div>

        <div className="flex justify-center gap-2">
          {!isRecording && !audioBlob && (
            <Button onClick={startRecording} size="lg" className="gap-2">
              <Mic className="h-4 w-4" />
              Start Recording
            </Button>
          )}

          {isRecording && (
            <>
              <Button onClick={pauseRecording} variant="secondary" size="lg">
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </>
          )}

          {audioBlob && !isRecording && (
            <>
              <Button onClick={togglePlayback} variant="secondary" size="lg" className="gap-2">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button onClick={resetRecording} variant="outline" size="lg" className="gap-2 bg-transparent">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </>
          )}
        </div>

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}
      </CardContent>
    </Card>
  )
}
