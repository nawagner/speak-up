'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { exams, analytics } from '@/lib/api'
import type { ExamResponse, AnalyticsOverview } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, FileText, Users, Clock, BarChart3, ChevronRight, LogOut, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function TeacherDashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth()
  const [examsList, setExamsList] = useState<ExamResponse[]>([])
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [activeExam, setActiveExam] = useState<ExamResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/teacher/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchData = async () => {
      try {
        const [examsData, overviewData, active] = await Promise.all([
          exams.list(),
          analytics.overview(),
          exams.getActive(),
        ])
        setExamsList(examsData)
        setOverview(overviewData)
        setActiveExam(active)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load dashboard data'
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user?.display_name || user?.username}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/teacher/rubrics">
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Rubrics
              </Button>
            </Link>
            <Link href="/teacher/exam/start">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Exam
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Exams
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {overview?.total_exams ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {overview?.completed_exams ?? 0} completed
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Students Assessed
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {overview?.total_student_sessions ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {overview?.completed_student_sessions ?? 0} completed
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Exams
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {overview?.active_exams ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">currently running</p>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg. Coverage
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">--</div>
                  <p className="text-xs text-muted-foreground">rubric coverage</p>
                </CardContent>
              </Card>
            </div>

            {activeExam && (
              <Card className="mb-8 border-chart-2/50 bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-chart-2" />
                        Active Exam
                      </CardTitle>
                      <CardDescription>Room Code: {activeExam.room_code}</CardDescription>
                    </div>
                    <Link href={`/teacher/exam/monitor?id=${activeExam.id}`}>
                      <Button>Go to Monitor</Button>
                    </Link>
                  </div>
                </CardHeader>
              </Card>
            )}

            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Recent Exams</CardTitle>
                <CardDescription>Your most recent oral examinations</CardDescription>
              </CardHeader>
              <CardContent>
                {examsList.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 opacity-50" />
                    <p className="mt-4">No exams yet</p>
                    <p className="text-sm">Create a rubric and start your first exam</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {examsList.slice(0, 5).map((exam) => (
                      <Link
                        key={exam.id}
                        href={
                          exam.status === 'active'
                            ? `/teacher/exam/monitor?id=${exam.id}`
                            : `/teacher/exam/monitor?id=${exam.id}`
                        }
                        className="flex w-full items-center justify-between rounded-lg border border-border bg-background p-4 text-left transition-colors hover:bg-muted"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              Room: {exam.room_code}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(exam.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              exam.status === 'active'
                                ? 'bg-chart-2/10 text-chart-2'
                                : exam.status === 'completed'
                                  ? 'bg-muted text-muted-foreground'
                                  : 'bg-yellow-500/10 text-yellow-500'
                            }`}
                          >
                            {exam.status}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
