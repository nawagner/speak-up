'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { exams, sessions } from '@/lib/api'
import type {
  ExamResponse,
  SessionSummary,
  StruggleEventResponse,
  SessionTranscriptResponse,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Loader2,
  AlertTriangle,
  MessageSquare,
  XCircle,
  Users,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

function ExamMonitorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const examId = searchParams.get('id')
  const { isLoading: authLoading, isAuthenticated } = useAuth()

  const [exam, setExam] = useState<ExamResponse | null>(null)
  const [sessionsList, setSessionsList] = useState<SessionSummary[]>([])
  const [struggles, setStruggles] = useState<StruggleEventResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState(false)

  // Dialog states
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null)
  const [transcript, setTranscript] = useState<SessionTranscriptResponse | null>(null)
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  const [transcriptDialogOpen, setTranscriptDialogOpen] = useState(false)

  const [messageDialogOpen, setMessageDialogOpen] = useState(false)
  const [messageTarget, setMessageTarget] = useState<SessionSummary | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false)
  const [terminateTarget, setTerminateTarget] = useState<SessionSummary | null>(null)
  const [terminating, setTerminating] = useState(false)

  const [endExamDialogOpen, setEndExamDialogOpen] = useState(false)
  const [endingExam, setEndingExam] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/teacher/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Redirect if no exam ID
  useEffect(() => {
    if (!examId && !authLoading) {
      router.push('/teacher/dashboard')
    }
  }, [examId, authLoading, router])

  // Fetch exam data
  const fetchExamData = useCallback(async () => {
    if (!examId || !isAuthenticated) return

    try {
      const [examData, sessionsData, strugglesData] = await Promise.all([
        exams.get(examId),
        exams.getSessions(examId),
        exams.getStruggles(examId),
      ])
      setExam(examData)
      setSessionsList(sessionsData)
      setStruggles(strugglesData)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load exam data'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [examId, isAuthenticated])

  // Initial fetch
  useEffect(() => {
    fetchExamData()
  }, [fetchExamData])

  // Poll for updates every 3 seconds
  useEffect(() => {
    if (!examId || !isAuthenticated || !exam || exam.status !== 'active') return

    const interval = setInterval(async () => {
      try {
        const [sessionsData, strugglesData] = await Promise.all([
          exams.getSessions(examId),
          exams.getStruggles(examId),
        ])
        setSessionsList(sessionsData)
        setStruggles(strugglesData)
      } catch (error) {
        console.error('Failed to poll exam data:', error)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [examId, isAuthenticated, exam])

  // Copy room code
  const handleCopyCode = async () => {
    if (!exam?.room_code) return
    try {
      await navigator.clipboard.writeText(exam.room_code)
      setCopiedCode(true)
      toast.success('Room code copied to clipboard')
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      toast.error('Failed to copy room code')
    }
  }

  // View transcript
  const handleViewTranscript = async (session: SessionSummary) => {
    setSelectedSession(session)
    setTranscriptDialogOpen(true)
    setTranscriptLoading(true)

    try {
      const transcriptData = await sessions.getTranscript(session.session_id)
      setTranscript(transcriptData)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load transcript'
      toast.error(message)
      setTranscriptDialogOpen(false)
    } finally {
      setTranscriptLoading(false)
    }
  }

  // Open send message dialog
  const handleOpenMessageDialog = (session: SessionSummary) => {
    setMessageTarget(session)
    setMessageText('')
    setMessageDialogOpen(true)
  }

  // Send message
  const handleSendMessage = async () => {
    if (!messageTarget || !messageText.trim()) return

    setSendingMessage(true)
    try {
      await sessions.sendMessage(messageTarget.session_id, { message: messageText.trim() })
      toast.success(`Message sent to ${messageTarget.student_name}`)
      setMessageDialogOpen(false)
      setMessageText('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message'
      toast.error(message)
    } finally {
      setSendingMessage(false)
    }
  }

  // Open terminate dialog
  const handleOpenTerminateDialog = (session: SessionSummary) => {
    setTerminateTarget(session)
    setTerminateDialogOpen(true)
  }

  // Terminate session
  const handleTerminateSession = async () => {
    if (!terminateTarget) return

    setTerminating(true)
    try {
      await sessions.terminate(terminateTarget.session_id)
      toast.success(`Session terminated for ${terminateTarget.student_name}`)
      setTerminateDialogOpen(false)
      // Refresh sessions
      if (examId) {
        const sessionsData = await exams.getSessions(examId)
        setSessionsList(sessionsData)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to terminate session'
      toast.error(message)
    } finally {
      setTerminating(false)
    }
  }

  // End exam
  const handleEndExam = async () => {
    if (!examId) return

    setEndingExam(true)
    try {
      await exams.end(examId)
      toast.success('Exam ended successfully')
      setEndExamDialogOpen(false)
      // Refresh exam data
      const examData = await exams.get(examId)
      setExam(examData)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to end exam'
      toast.error(message)
    } finally {
      setEndingExam(false)
    }
  }

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-500'
      case 'medium':
        return 'text-yellow-500'
      default:
        return 'text-blue-500'
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-chart-2/10 text-chart-2'
      case 'completed':
        return 'bg-muted text-muted-foreground'
      case 'terminated':
        return 'bg-red-500/10 text-red-500'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Exam not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/teacher/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/teacher/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Exam Monitor</h1>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    exam.status === 'active'
                      ? 'bg-chart-2/10 text-chart-2'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {exam.status}
                </span>
              </div>
            </div>
          </div>

          {/* Room Code */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
              <span className="text-sm text-muted-foreground">Room Code:</span>
              <span className="text-lg font-bold text-foreground">{exam.room_code}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyCode}
              >
                {copiedCode ? (
                  <Check className="h-4 w-4 text-chart-2" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {exam.status === 'active' && (
              <Button variant="destructive" onClick={() => setEndExamDialogOpen(true)}>
                End Exam
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Students List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Students
                    </CardTitle>
                    <CardDescription>
                      {sessionsList.length} student{sessionsList.length !== 1 ? 's' : ''} in session
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {sessionsList.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Users className="mx-auto h-12 w-12 opacity-50" />
                    <p className="mt-4">No students have joined yet</p>
                    <p className="text-sm">Share the room code to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessionsList.map((session) => (
                      <div
                        key={session.session_id}
                        className="flex items-center justify-between rounded-lg border border-border bg-background p-4"
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => handleViewTranscript(session)}
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium text-foreground">
                                {session.student_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                ID: {session.student_id}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadge(
                                session.status
                              )}`}
                            >
                              {session.status}
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Coverage</span>
                              <span className="font-medium text-foreground">
                                {session.coverage_pct}%
                              </span>
                            </div>
                            <Progress value={session.coverage_pct} className="mt-1" />
                          </div>
                          {session.struggle_count > 0 && (
                            <p className="mt-2 flex items-center gap-1 text-sm text-yellow-500">
                              <AlertTriangle className="h-3 w-3" />
                              {session.struggle_count} struggle event
                              {session.struggle_count !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>

                        {session.status === 'active' && (
                          <div className="ml-4 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenMessageDialog(session)
                              }}
                              title="Send message"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenTerminateDialog(session)
                              }}
                              title="Terminate session"
                              className="text-red-500 hover:text-red-600"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Struggle Events */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Struggle Events
                </CardTitle>
                <CardDescription>Recent student difficulties</CardDescription>
              </CardHeader>
              <CardContent>
                {struggles.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <AlertTriangle className="mx-auto h-8 w-8 opacity-50" />
                    <p className="mt-2 text-sm">No struggle events yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3 pr-4">
                      {struggles.map((struggle) => (
                        <div
                          key={struggle.id}
                          className="rounded-lg border border-border bg-background p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-medium capitalize ${getSeverityColor(
                                struggle.severity
                              )}`}
                            >
                              {struggle.struggle_type.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(struggle.timestamp)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {struggle.llm_reasoning}
                          </p>
                          {struggle.question_adapted && (
                            <p className="mt-1 text-xs text-chart-2">Question adapted</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Transcript Dialog */}
      <Dialog open={transcriptDialogOpen} onOpenChange={setTranscriptDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSession?.student_name} - Transcript
            </DialogTitle>
            <DialogDescription>
              Student ID: {selectedSession?.student_id} | Coverage:{' '}
              {transcript?.coverage_pct ?? selectedSession?.coverage_pct}%
            </DialogDescription>
          </DialogHeader>

          {transcriptLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transcript ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {transcript.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-lg p-3 ${
                      entry.entry_type === 'question'
                        ? 'bg-chart-1/10 text-foreground'
                        : entry.entry_type === 'response'
                          ? 'bg-muted text-foreground'
                          : entry.entry_type === 'teacher_message'
                            ? 'bg-chart-2/10 text-foreground'
                            : 'bg-yellow-500/10 text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase text-muted-foreground">
                        {entry.entry_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{entry.content}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No transcript available</p>
          )}

          <DialogFooter>
            {selectedSession?.status === 'active' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTranscriptDialogOpen(false)
                    if (selectedSession) handleOpenMessageDialog(selectedSession)
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setTranscriptDialogOpen(false)
                    if (selectedSession) handleOpenTerminateDialog(selectedSession)
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Terminate
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message to {messageTarget?.student_name}</DialogTitle>
            <DialogDescription>
              This message will be displayed to the student during their exam.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sendingMessage}
            >
              {sendingMessage ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="mr-2 h-4 w-4" />
              )}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate Session Dialog */}
      <Dialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to terminate the session for{' '}
              <strong>{terminateTarget?.student_name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminateSession}
              disabled={terminating}
            >
              {terminating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Terminate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Exam Dialog */}
      <Dialog open={endExamDialogOpen} onOpenChange={setEndExamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Exam</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this exam? All active student sessions will be
              terminated. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEndExamDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleEndExam} disabled={endingExam}>
              {endingExam ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              End Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ExamMonitorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ExamMonitorContent />
    </Suspense>
  )
}
