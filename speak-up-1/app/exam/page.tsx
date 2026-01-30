'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, FileText, Send, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AudioRecorder } from '@/components/audio-recorder'
import { toast } from 'sonner'
import type { ParsedRubric, EvaluationResult } from '@/lib/types'

function ExamContent() {
  const searchParams = useSearchParams()
  const [rubric, setRubric] = useState<ParsedRubric | null>(null)
  const [studentName, setStudentName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [step, setStep] = useState<'info' | 'record' | 'submit' | 'result'>('info')

  useEffect(() => {
    const rubricParam = searchParams.get('rubric')
    if (rubricParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(rubricParam))
        setRubric(parsed)
      } catch (error) {
        console.error('[v0] Error parsing rubric:', error)
        toast.error('Invalid exam link')
      }
    }
  }, [searchParams])

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    setAudioBlob(blob)
    setAudioDuration(duration)
  }

  const handleStartExam = () => {
    if (!studentName.trim() || !studentId.trim()) {
      toast.error('Please enter your name and student ID')
      return
    }
    setStep('record')
  }

  const handleSubmit = async () => {
    if (!audioBlob || !rubric) {
      toast.error('Please record your response first')
      return
    }

    setIsSubmitting(true)
    setStep('submit')

    try {
      // Step 1: Transcribe audio
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!transcribeResponse.ok) throw new Error('Transcription failed')

      const { transcript } = await transcribeResponse.json()

      // Step 2: Evaluate against rubric
      const evaluateResponse = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          rubric,
          studentName,
          studentId,
        }),
      })

      if (!evaluateResponse.ok) throw new Error('Evaluation failed')

      const evaluation = await evaluateResponse.json()
      setResult(evaluation)
      setStep('result')
      toast.success('Exam submitted successfully!')
    } catch (error) {
      console.error('[v0] Error submitting exam:', error)
      toast.error('Failed to submit exam')
      setStep('record')
    } finally {
      setIsSubmitting(false)
    }
  }

  const downloadReport = () => {
    if (!result) return

    const report = `
OralExam Report
===============

Student: ${studentName}
Student ID: ${studentId}
Exam: ${rubric?.examTitle}
Date: ${new Date().toLocaleString()}

Overall Score: ${result.totalScore} / ${result.maxScore}
Grade: ${result.letterGrade}

Transcript:
${result.transcript}

Detailed Feedback:
${result.feedback.map((f, i) => `
${i + 1}. ${f.criterion}
   Score: ${f.score} / ${f.maxScore}
   Feedback: ${f.feedback}
`).join('\n')}

Overall Comments:
${result.overallComments}
    `.trim()

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${studentId}_${rubric?.examTitle.replace(/\s+/g, '_')}_Report.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!rubric) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Exam Header */}
        <Card className="bg-card border-primary/50">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              {rubric.examTitle}
            </CardTitle>
            <CardDescription>{rubric.examDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{rubric.criteria.length} Criteria</Badge>
              <Badge variant="outline">
                Total Points: {rubric.criteria.reduce((sum, c) => sum + c.maxPoints, 0)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Student Info */}
        {step === 'info' && (
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
              <CardDescription>Enter your details to begin the exam</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id">Student ID</Label>
                <Input
                  id="id"
                  placeholder="Enter your student ID"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </div>
              <Button onClick={handleStartExam} className="w-full" size="lg">
                Start Exam
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recording Interface */}
        {step === 'record' && (
          <>
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Exam Criteria</CardTitle>
                <CardDescription>Your response will be evaluated on these criteria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {rubric.criteria.map((criterion, idx) => (
                    <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{criterion.name}</p>
                          <p className="text-xs text-muted-foreground">{criterion.description}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {criterion.maxPoints} pts
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <AudioRecorder onRecordingComplete={handleRecordingComplete} />
              
              {audioBlob && (
                <Button onClick={handleSubmit} className="w-full" size="lg">
                  <Send className="mr-2 h-4 w-4" />
                  Submit Exam
                </Button>
              )}
            </div>
          </>
        )}

        {/* Submission Progress */}
        {step === 'submit' && (
          <Card className="bg-card">
            <CardContent className="pt-12 pb-12 text-center space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Processing Your Exam</h3>
                <p className="text-muted-foreground">Transcribing audio and evaluating your response...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {step === 'result' && result && (
          <>
            <Card className="bg-card border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  Exam Complete
                </CardTitle>
                <CardDescription>Your results are ready</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Score</p>
                    <p className="text-4xl font-bold text-foreground">
                      {result.totalScore} / {result.maxScore}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Letter Grade</p>
                    <p className="text-4xl font-bold text-primary">{result.letterGrade}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Detailed Feedback</h4>
                  {result.feedback.map((item, idx) => (
                    <div key={idx} className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{item.criterion}</p>
                        <Badge variant="secondary">
                          {item.score} / {item.maxScore} pts
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.feedback}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Overall Comments</h4>
                  <p className="text-sm text-muted-foreground rounded-lg border border-border bg-muted/30 p-4">
                    {result.overallComments}
                  </p>
                </div>

                <Button onClick={downloadReport} className="w-full" variant="secondary">
                  Download Full Report
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Your Response Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-64 overflow-y-auto p-4 rounded-lg bg-muted/30">
                  {result.transcript}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

export default function ExamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <ExamContent />
    </Suspense>
  )
}
