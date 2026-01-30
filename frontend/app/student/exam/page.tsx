'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { student } from '@/lib/api'
import { QuestionResponse } from '@/lib/types'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Mic, Loader2, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface SessionInfo {
  session_id: string
  exam_title: string
  first_question: string
  student_name: string
}

// Completion component
function ExamComplete({ studentName }: { studentName: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-chart-2/10">
            <CheckCircle2 className="h-10 w-10 text-chart-2" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Exam Complete</h1>
          <p className="mb-6 text-muted-foreground">
            Great job, {studentName}! You have successfully completed your oral exam.
          </p>
          <p className="text-sm text-muted-foreground">
            Your responses have been recorded and will be reviewed by your instructor.
            You may now close this window.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Teacher message display
function TeacherMessage({ message }: { message: string }) {
  return (
    <div className="mb-6 rounded-lg border-2 border-chart-2 bg-chart-2/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-chart-2/20">
          <MessageSquare className="h-4 w-4 text-chart-2" />
        </div>
        <div>
          <p className="text-sm font-medium text-chart-2">Message from Instructor</p>
          <p className="mt-1 text-foreground">{message}</p>
        </div>
      </div>
    </div>
  )
}

// Recording indicator with pulse animation
function RecordingIndicator({ isRecording }: { isRecording: boolean }) {
  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      {isRecording && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-destructive/20" />
          <span className="absolute inset-2 animate-pulse rounded-full bg-destructive/30" />
        </>
      )}
      <div
        className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-colors ${
          isRecording ? 'bg-destructive/20' : 'bg-muted'
        }`}
      >
        <Mic
          className={`h-10 w-10 transition-colors ${
            isRecording ? 'text-destructive' : 'text-muted-foreground'
          }`}
        />
      </div>
    </div>
  )
}

export default function StudentExamPage() {
  const router = useRouter()
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<string>('')
  const [questionNumber, setQuestionNumber] = useState(1)
  const [isComplete, setIsComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [teacherMessage, setTeacherMessage] = useState<string | null>(null)
  const [estimatedProgress, setEstimatedProgress] = useState(0)

  const { isRecording, audioBlob, error, startRecording, stopRecording, clearRecording } =
    useAudioRecorder()

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializedRef = useRef(false)

  // Load session from sessionStorage
  useEffect(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    const stored = sessionStorage.getItem('exam_session')
    if (!stored) {
      toast.error('No active session found')
      router.push('/student/join')
      return
    }

    try {
      const info: SessionInfo = JSON.parse(stored)
      setSessionInfo(info)
      setCurrentQuestion(info.first_question)
    } catch {
      toast.error('Invalid session data')
      router.push('/student/join')
    }
  }, [router])

  // Poll for teacher messages
  useEffect(() => {
    if (!sessionInfo || isComplete) return

    const pollTeacherMessages = async () => {
      try {
        const response = await student.getTeacherResponse(sessionInfo.session_id)
        if (response.message) {
          setTeacherMessage(response.message)
        }
      } catch {
        // Silently ignore polling errors
      }
    }

    // Initial poll
    pollTeacherMessages()

    // Set up interval
    pollIntervalRef.current = setInterval(pollTeacherMessages, 5000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [sessionInfo, isComplete])

  // Handle audio blob when recording stops
  useEffect(() => {
    if (audioBlob && sessionInfo && !isSubmitting) {
      submitAudio(audioBlob)
    }
  }, [audioBlob]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle audio recorder errors
  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  const submitAudio = async (blob: Blob) => {
    if (!sessionInfo) return

    setIsSubmitting(true)
    try {
      const response: QuestionResponse = await student.submitAudio(
        sessionInfo.session_id,
        blob,
        currentQuestion
      )

      if (response.is_final) {
        setIsComplete(true)
        sessionStorage.removeItem('exam_session')
        toast.success('Exam completed successfully!')
      } else {
        setCurrentQuestion(response.question_text)
        setQuestionNumber(response.question_number)
        // Estimate progress (rough estimate based on typical exam length)
        setEstimatedProgress(Math.min(95, response.question_number * 15))

        if (response.message) {
          toast.info(response.message)
        }
      }

      clearRecording()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit response'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRecordingStart = useCallback(async () => {
    if (isSubmitting) return
    await startRecording()
  }, [startRecording, isSubmitting])

  const handleRecordingStop = useCallback(() => {
    stopRecording()
  }, [stopRecording])

  const dismissTeacherMessage = () => {
    setTeacherMessage(null)
  }

  // Show loading state while session loads
  if (!sessionInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show completion screen
  if (isComplete) {
    return <ExamComplete studentName={sessionInfo.student_name} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{sessionInfo.exam_title}</h1>
            <p className="text-sm text-muted-foreground">Question {questionNumber}</p>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-destructive">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
              <span className="text-sm font-medium">RECORDING</span>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated Progress</span>
            <span className="font-medium text-foreground">{estimatedProgress}%</span>
          </div>
          <Progress value={estimatedProgress} className="h-2" />
        </div>

        {/* Teacher message */}
        {teacherMessage && (
          <div className="relative">
            <TeacherMessage message={teacherMessage} />
            <button
              onClick={dismissTeacherMessage}
              className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss message"
            >
              <span className="text-xs">Dismiss</span>
            </button>
          </div>
        )}

        {/* Current question */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Question</CardTitle>
            <CardDescription>Hold the button below to record your response</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-foreground leading-relaxed">{currentQuestion}</p>
          </CardContent>
        </Card>

        {/* Recording section */}
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center">
              {/* Recording indicator */}
              <div className="mb-6">
                <RecordingIndicator isRecording={isRecording} />
              </div>

              {/* Status text */}
              <p className="mb-6 text-sm text-muted-foreground">
                {isSubmitting
                  ? 'Submitting your response...'
                  : isRecording
                    ? 'Release to stop recording'
                    : 'Hold the button to record'}
              </p>

              {/* Push-to-talk button */}
              <Button
                size="lg"
                variant={isRecording ? 'destructive' : 'default'}
                className="h-16 px-8 text-lg"
                onMouseDown={handleRecordingStart}
                onMouseUp={handleRecordingStop}
                onMouseLeave={isRecording ? handleRecordingStop : undefined}
                onTouchStart={handleRecordingStart}
                onTouchEnd={handleRecordingStop}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : isRecording ? (
                  <>
                    <Mic className="mr-2 h-5 w-5" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-5 w-5" />
                    Hold to Record
                  </>
                )}
              </Button>

              {/* Microphone permission warning */}
              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <div className="mt-6 rounded-lg bg-muted/50 p-4">
          <p className="text-center text-sm text-muted-foreground">
            Speak clearly into your microphone. Your response will be transcribed and sent to your
            instructor for evaluation.
          </p>
        </div>
      </div>
    </div>
  )
}
