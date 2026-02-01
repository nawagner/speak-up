'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { student } from '@/lib/api'
import { QuestionResponse, StudentTranscriptEntryResponse } from '@/lib/types'
import { TranscriptHistory } from './transcript-history'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { useQuestionAudio } from '@/hooks/use-question-audio'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Mic, Loader2, CheckCircle2, MessageSquare, AlertCircle, Volume2, VolumeX, SkipForward } from 'lucide-react'
import { toast } from 'sonner'

interface SessionInfo {
  session_id: string
  exam_title: string
  first_question: string
  student_name: string
  language: string
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  zh: 'Chinese',
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

// Recording indicator with pulse animation - now interactive
function RecordingIndicator({
  isRecording,
  isSubmitting,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
}: {
  isRecording: boolean
  isSubmitting: boolean
  onMouseDown: () => void
  onMouseUp: () => void
  onMouseLeave: () => void
  onTouchStart: () => void
  onTouchEnd: () => void
}) {
  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      {isRecording && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-destructive/20" />
          <span className="absolute inset-2 animate-pulse rounded-full bg-destructive/30" />
        </>
      )}
      <button
        type="button"
        className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-colors select-none ${
          isRecording
            ? 'bg-destructive/20'
            : isSubmitting
              ? 'bg-muted cursor-not-allowed opacity-50'
              : 'bg-muted hover:bg-muted/80 cursor-pointer active:scale-95'
        }`}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        ) : (
          <Mic
            className={`h-10 w-10 transition-colors ${
              isRecording ? 'text-destructive' : 'text-muted-foreground'
            }`}
          />
        )}
      </button>
    </div>
  )
}

export default function StudentExamPage() {
  const router = useRouter()
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<string>('')
  const [questionNumber, setQuestionNumber] = useState(1)
  const [isComplete, setIsComplete] = useState(false)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [isReadyToSubmit, setIsReadyToSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [teacherMessage, setTeacherMessage] = useState<string | null>(null)
  const [estimatedProgress, setEstimatedProgress] = useState(0)
  const [translatedQuestion, setTranslatedQuestion] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [transcriptEntries, setTranscriptEntries] = useState<StudentTranscriptEntryResponse[]>([])
  const [hasSubmittedInSession, setHasSubmittedInSession] = useState(false)
  const [isCurrentQuestionAdapted, setIsCurrentQuestionAdapted] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)

  const { isRecording, audioBlob, error, startRecording, stopRecording, clearRecording } =
    useAudioRecorder()

  const {
    isPlaying: isAudioPlaying,
    isLoading: isAudioLoading,
    error: audioError,
    playQuestion,
    replay: replayAudio,
    stop: stopAudio,
  } = useQuestionAudio()

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializedRef = useRef(false)
  const isSpaceHeldRef = useRef(false)

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

  // Auto-play audio when question changes
  useEffect(() => {
    if (currentQuestion && sessionInfo && !isComplete) {
      playQuestion(sessionInfo.session_id, currentQuestion, sessionInfo.language)
    }
  }, [currentQuestion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch translation when question changes (for non-English languages)
  useEffect(() => {
    if (!currentQuestion || !sessionInfo || isComplete) return
    if (sessionInfo.language === 'en') {
      setTranslatedQuestion(null)
      return
    }

    const fetchTranslation = async () => {
      setIsTranslating(true)
      try {
        const response = await student.translateQuestion(
          sessionInfo.session_id,
          currentQuestion,
          sessionInfo.language
        )
        setTranslatedQuestion(response.translated_text)
      } catch {
        // Silently fail - translation is a nice-to-have
        setTranslatedQuestion(null)
      } finally {
        setIsTranslating(false)
      }
    }

    fetchTranslation()
  }, [currentQuestion, sessionInfo, isComplete])

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

  // Poll for transcript updates
  useEffect(() => {
    if (!sessionInfo || isComplete) return

    const pollTranscript = async () => {
      try {
        const response = await student.getTranscript(sessionInfo.session_id)
        setTranscriptEntries(response.entries)
      } catch {
        // Silently ignore polling errors
      }
    }

    // Initial fetch
    pollTranscript()

    // Set up interval (same as teacher messages: 5 seconds)
    const intervalId = setInterval(pollTranscript, 5000)

    return () => clearInterval(intervalId)
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

      // Mark that we've submitted at least once in this session (enables skip button)
      setHasSubmittedInSession(true)

      if (response.is_final) {
        // Mark as ready to submit and show confirmation dialog
        setIsReadyToSubmit(true)
        setShowCompletionDialog(true)
      } else {
        setIsReadyToSubmit(false)
        setShowCompletionDialog(false)
        setCurrentQuestion(response.question_text)
        setQuestionNumber(response.question_number)
        // Estimate progress (rough estimate based on typical exam length)
        setEstimatedProgress(Math.min(95, response.question_number * 15))

        // Track if the new question is adapted
        setIsCurrentQuestionAdapted(response.is_adapted)

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
    // If ready to submit, show the dialog instead of recording
    if (isReadyToSubmit) {
      setShowCompletionDialog(true)
      return
    }
    await startRecording()
  }, [startRecording, isSubmitting, isReadyToSubmit])

  const handleRecordingStop = useCallback(() => {
    stopRecording()
  }, [stopRecording])

  const isKeyboardTargetBlocked = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false
    if (target.isContentEditable) return true

    const tagName = target.tagName
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return true

    if (target.closest('button, [role="button"], a, [role="link"]')) return true

    return false
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') return
      if (event.repeat) return
      if (isSubmitting || isRecording) return
      if (isKeyboardTargetBlocked(event.target)) return
      if (isSpaceHeldRef.current) return

      event.preventDefault()
      isSpaceHeldRef.current = true
      void handleRecordingStart()
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') return
      if (!isSpaceHeldRef.current) return

      event.preventDefault()
      isSpaceHeldRef.current = false
      handleRecordingStop()
    }

    const handleWindowBlur = () => {
      if (!isSpaceHeldRef.current) return
      isSpaceHeldRef.current = false
      handleRecordingStop()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [handleRecordingStart, handleRecordingStop, isRecording, isSubmitting])

  const dismissTeacherMessage = () => {
    setTeacherMessage(null)
  }

  const handleConfirmCompletion = () => {
    setIsComplete(true)
    sessionStorage.removeItem('exam_session')
    setShowCompletionDialog(false)
    toast.success('Exam completed successfully!')
  }

  const handleSkipQuestion = async () => {
    if (!sessionInfo || isSkipping) return

    setIsSkipping(true)
    try {
      const response = await student.skipQuestion(sessionInfo.session_id)

      if (response.is_final) {
        setIsReadyToSubmit(true)
        setShowCompletionDialog(true)
      } else {
        setCurrentQuestion(response.question_text)
        setQuestionNumber(response.question_number)
        setIsCurrentQuestionAdapted(response.is_adapted)
        setHasSubmittedInSession(true)

        // Show appropriate toast based on what happened
        if (response.is_adapted) {
          toast.info("Here's an easier version of the question")
        } else {
          toast.info('Moving to a new topic')
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to skip question'
      toast.error(message)
    } finally {
      setIsSkipping(false)
    }
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
            <span className="text-muted-foreground">
              {isReadyToSubmit ? 'Completed' : 'Estimated Progress'}
            </span>
            <span className="font-medium text-foreground">
              {isReadyToSubmit ? '100' : estimatedProgress}%
            </span>
          </div>
          <Progress value={isReadyToSubmit ? 100 : estimatedProgress} className="h-2" />
        </div>

        {/* Transcript history */}
        {transcriptEntries.length > 0 && (
          <TranscriptHistory entries={transcriptEntries} className="mb-6" />
        )}

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{isReadyToSubmit ? 'Exam Complete' : 'Current Question'}</CardTitle>
                <CardDescription>
                  {isReadyToSubmit
                    ? 'You have answered all questions'
                    : 'Hold the mic below to record your response'}
                </CardDescription>
              </div>
              {/* Audio controls - hide when ready to submit */}
              {!isReadyToSubmit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (isAudioPlaying) {
                      stopAudio()
                    } else if (sessionInfo) {
                      playQuestion(sessionInfo.session_id, currentQuestion, sessionInfo.language)
                    }
                  }}
                  disabled={isAudioLoading}
                  title={isAudioPlaying ? 'Stop audio' : 'Read question aloud'}
                >
                  {isAudioLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isAudioPlaying ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isReadyToSubmit ? (
              <div className="flex items-center gap-3 text-chart-2">
                <CheckCircle2 className="h-6 w-6" />
                <p className="text-lg leading-relaxed">
                  Great job! Click the button below to submit your exam for review.
                </p>
              </div>
            ) : (
              <>
                {/* Adapted question indicator */}
                {isCurrentQuestionAdapted && (
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-600 dark:text-yellow-500">
                    <AlertCircle className="h-3 w-3" />
                    Simplified version
                  </div>
                )}
                <p className="text-lg text-foreground leading-relaxed">{currentQuestion}</p>
                {/* Show translation below English text when non-English language selected */}
                {sessionInfo.language !== 'en' && (
                  <div className="mt-4 border-t border-border pt-4">
                    {isTranslating ? (
                      <p className="text-sm text-muted-foreground italic">Translating...</p>
                    ) : translatedQuestion ? (
                      <>
                        <p className="text-xs text-muted-foreground mb-1">
                          In {LANGUAGE_NAMES[sessionInfo.language] || sessionInfo.language}:
                        </p>
                        <p className="text-base text-muted-foreground leading-relaxed">
                          {translatedQuestion}
                        </p>
                      </>
                    ) : null}
                  </div>
                )}
                {audioError && (
                  <p className="mt-2 text-sm text-muted-foreground">{audioError}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recording section */}
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center">
              {/* Recording indicator - hold to record */}
              <div className="mb-6">
                <RecordingIndicator
                  isRecording={isRecording}
                  isSubmitting={isSubmitting}
                  onMouseDown={handleRecordingStart}
                  onMouseUp={handleRecordingStop}
                  onMouseLeave={isRecording ? handleRecordingStop : () => {}}
                  onTouchStart={handleRecordingStart}
                  onTouchEnd={handleRecordingStop}
                />
              </div>

              {/* Status text */}
              <p className="text-sm text-muted-foreground">
                {isSubmitting
                  ? 'Submitting your response...'
                  : isSkipping
                    ? 'Skipping question...'
                    : isRecording
                      ? 'Release to stop recording'
                      : isReadyToSubmit
                        ? 'All questions answered'
                        : 'Hold the mic to record'}
              </p>

              {/* Skip button - only show after submission and not when ready to submit */}
              {hasSubmittedInSession && !isReadyToSubmit && !isSubmitting && !isRecording && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleSkipQuestion}
                  disabled={isSkipping}
                >
                  {isSkipping ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SkipForward className="mr-2 h-4 w-4" />
                  )}
                  {isCurrentQuestionAdapted ? 'Skip to New Topic' : 'Skip Question'}
                </Button>
              )}

              {/* Submit button when ready */}
              {isReadyToSubmit && !isSubmitting && (
                <Button
                  className="mt-4"
                  onClick={() => setShowCompletionDialog(true)}
                >
                  Submit Exam
                </Button>
              )}

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
            {isReadyToSubmit
              ? 'Your responses have been recorded. Submit your exam when you are ready.'
              : 'Speak clearly into your microphone. Your response will be transcribed and sent to your instructor for evaluation.'}
          </p>
        </div>
      </div>

      {/* Exam Completion Confirmation Dialog */}
      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered all questions. Are you ready to submit your exam? Once submitted,
              your responses will be sent to your instructor for review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCompletion}>Submit Exam</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
