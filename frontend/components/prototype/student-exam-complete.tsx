"use client"

import type { Screen } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Download, RotateCcw } from "lucide-react"

interface StudentExamCompleteProps {
  onNavigate: (screen: Screen) => void
}

const mockFeedback = [
  { criterion: "Content Knowledge", score: 22, maxScore: 25, feedback: "Demonstrated strong understanding of core concepts." },
  { criterion: "Critical Thinking", score: 20, maxScore: 25, feedback: "Good analysis with room for deeper exploration." },
  { criterion: "Communication", score: 18, maxScore: 20, feedback: "Clear and articulate delivery throughout." },
  { criterion: "Organization", score: 13, maxScore: 15, feedback: "Well-structured response with logical flow." },
  { criterion: "Professional Delivery", score: 14, maxScore: 15, feedback: "Confident presentation with appropriate pace." },
]

export function StudentExamComplete({ onNavigate }: StudentExamCompleteProps) {
  const totalScore = mockFeedback.reduce((sum, f) => sum + f.score, 0)
  const maxScore = mockFeedback.reduce((sum, f) => sum + f.maxScore, 0)
  const percentage = Math.round((totalScore / maxScore) * 100)

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Exam Complete</h1>
            <p className="text-sm text-muted-foreground">Midterm Oral Assessment</p>
          </div>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-chart-2/10 text-chart-2">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground text-balance">
            Your Results Are Ready
          </h2>
          <p className="mt-2 text-muted-foreground">
            Your oral exam has been evaluated. Review your detailed feedback below.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-card lg:col-span-1">
            <CardHeader>
              <CardTitle>Overall Score</CardTitle>
              <CardDescription>Based on all criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <div className="relative mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-chart-2/10">
                  <div className="text-center">
                    <span className="text-4xl font-bold text-foreground">{percentage}</span>
                    <span className="text-xl text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-chart-2">B+</p>
                  <p className="text-sm text-muted-foreground">
                    {totalScore} / {maxScore} points
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card lg:col-span-2">
            <CardHeader>
              <CardTitle>Detailed Feedback</CardTitle>
              <CardDescription>Performance breakdown by criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockFeedback.map((item, index) => (
                  <div key={index} className="rounded-lg border border-border bg-background p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-foreground">{item.criterion}</span>
                      <span className="rounded-lg bg-muted px-2 py-1 text-sm font-medium text-foreground">
                        {item.score} / {item.maxScore}
                      </span>
                    </div>
                    <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-chart-2 transition-all"
                        style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{item.feedback}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 bg-card">
          <CardHeader>
            <CardTitle>Overall Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              Excellent performance overall. You demonstrated a solid grasp of the material with
              clear articulation of key concepts. Your response was well-organized and delivered
              with confidence. To improve further, consider exploring alternative perspectives
              and providing more specific examples to support your arguments.
            </p>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={() => onNavigate("role-selection")}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
