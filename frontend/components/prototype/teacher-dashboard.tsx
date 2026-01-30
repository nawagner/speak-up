"use client"

import type { Screen } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FileText, Users, Clock, BarChart3, ChevronRight, LogOut } from "lucide-react"

interface TeacherDashboardProps {
  onNavigate: (screen: Screen) => void
}

const recentExams = [
  { id: 1, name: "Midterm Oral Exam", students: 32, date: "Jan 15, 2026", status: "Active" },
  { id: 2, name: "Unit 3 Assessment", students: 28, date: "Jan 10, 2026", status: "Completed" },
  { id: 3, name: "Final Project Defense", students: 15, date: "Jan 8, 2026", status: "Completed" },
]

export function TeacherDashboard({ onNavigate }: TeacherDashboardProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, Dr. Johnson</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => onNavigate("rubric-upload")} className="gap-2">
              <Plus className="h-4 w-4" />
              New Exam
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("role-selection")}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Exams
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">12</div>
              <p className="text-xs text-muted-foreground">+2 this month</p>
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
              <div className="text-2xl font-bold text-foreground">284</div>
              <p className="text-xs text-muted-foreground">+45 this month</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Now
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">8</div>
              <p className="text-xs text-muted-foreground">students taking exams</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Score
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">78%</div>
              <p className="text-xs text-muted-foreground">across all exams</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Recent Exams</CardTitle>
            <CardDescription>Your most recent oral examinations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentExams.map((exam) => (
                <button
                  key={exam.id}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-background p-4 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{exam.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {exam.students} students | {exam.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        exam.status === "Active"
                          ? "bg-chart-2/10 text-chart-2"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {exam.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
