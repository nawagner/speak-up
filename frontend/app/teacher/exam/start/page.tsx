'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { rubrics, exams } from '@/lib/api'
import type { RubricResponse, ExamResponse } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, Copy, Check, Monitor } from 'lucide-react'
import { toast } from 'sonner'

export default function ExamStartPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [rubricsList, setRubricsList] = useState<RubricResponse[]>([])
  const [selectedRubricId, setSelectedRubricId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [createdExam, setCreatedExam] = useState<ExamResponse | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/teacher/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchRubrics = async () => {
      try {
        const data = await rubrics.list()
        // Filter to only show parsed rubrics
        const parsedRubrics = data.filter((r) => r.parsed_criteria !== undefined && r.parsed_criteria !== null)
        setRubricsList(parsedRubrics)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load rubrics'
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRubrics()
  }, [isAuthenticated])

  const handleCreateExam = async () => {
    if (!selectedRubricId) {
      toast.error('Please select a rubric')
      return
    }

    setIsCreating(true)
    try {
      const exam = await exams.create({ rubric_id: selectedRubricId })
      await exams.start(exam.id)
      setCreatedExam(exam)
      toast.success('Exam created and started successfully')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create exam'
      toast.error(message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyRoomCode = async () => {
    if (!createdExam) return
    try {
      await navigator.clipboard.writeText(createdExam.room_code)
      setCopied(true)
      toast.success('Room code copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy room code')
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-6 py-4">
          <Link href="/teacher/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Start New Exam
            </h1>
            <p className="text-sm text-muted-foreground">
              Select a rubric and create an exam session
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : createdExam ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-chart-2" />
                Exam Started
              </CardTitle>
              <CardDescription>
                Share the room code with your students to begin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/50 p-8">
                <p className="mb-2 text-sm text-muted-foreground">Room Code</p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold tracking-widest text-foreground">
                    {createdExam.room_code}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyRoomCode}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-chart-2" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Link href={`/teacher/exam/monitor?id=${createdExam.id}`}>
                <Button className="w-full gap-2">
                  <Monitor className="h-4 w-4" />
                  Go to Monitor
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Create Exam</CardTitle>
              <CardDescription>
                Select a parsed rubric to create a new oral exam session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="rubric-select">Rubric</Label>
                {rubricsList.length === 0 ? (
                  <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No parsed rubrics available
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Create and parse a rubric first
                    </p>
                    <Link href="/teacher/rubrics">
                      <Button variant="link" className="mt-2">
                        Go to Rubrics
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Select
                    value={selectedRubricId}
                    onValueChange={setSelectedRubricId}
                  >
                    <SelectTrigger id="rubric-select" className="w-full">
                      <SelectValue placeholder="Select a rubric" />
                    </SelectTrigger>
                    <SelectContent>
                      {rubricsList.map((rubric) => (
                        <SelectItem key={rubric.id} value={rubric.id}>
                          {rubric.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {rubricsList.length > 0 && (
                <Button
                  onClick={handleCreateExam}
                  disabled={!selectedRubricId || isCreating}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Exam...
                    </>
                  ) : (
                    'Create & Start Exam'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
