"use client"

import type { Screen } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Check, Copy, Share2 } from "lucide-react"
import { useState } from "react"

interface RubricPreviewProps {
  onNavigate: (screen: Screen) => void
}

const mockCriteria = [
  {
    name: "Content Knowledge",
    description: "Demonstrates understanding of key concepts and terminology",
    maxPoints: 25,
  },
  {
    name: "Critical Thinking",
    description: "Analyzes information and draws logical conclusions",
    maxPoints: 25,
  },
  {
    name: "Communication",
    description: "Articulates ideas clearly and effectively",
    maxPoints: 20,
  },
  {
    name: "Organization",
    description: "Presents information in a structured, coherent manner",
    maxPoints: 15,
  },
  {
    name: "Professional Delivery",
    description: "Maintains appropriate pace, tone, and confidence",
    maxPoints: 15,
  },
]

export function RubricPreview({ onNavigate }: RubricPreviewProps) {
  const [copied, setCopied] = useState(false)
  const examCode = "ABC123"

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate("rubric-upload")}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="h-4 w-px bg-border" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">Preview Rubric</h1>
              <p className="text-sm text-muted-foreground">
                Review your exam before publishing
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Midterm Oral Assessment</CardTitle>
                <CardDescription>
                  Comprehensive oral examination covering Units 1-4
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <span className="text-sm text-muted-foreground">Total Points</span>
                    <span className="font-semibold text-foreground">100</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <span className="text-sm text-muted-foreground">Criteria Count</span>
                    <span className="font-semibold text-foreground">{mockCriteria.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Grading Criteria</CardTitle>
                <CardDescription>
                  AI will evaluate responses based on these criteria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockCriteria.map((criterion, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between rounded-lg border border-border bg-background p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-1/10 text-xs font-medium text-chart-1">
                            {index + 1}
                          </div>
                          <p className="font-medium text-foreground">{criterion.name}</p>
                        </div>
                        <p className="mt-1 pl-8 text-sm text-muted-foreground">
                          {criterion.description}
                        </p>
                      </div>
                      <div className="ml-4 rounded-lg bg-muted px-3 py-1">
                        <span className="text-sm font-medium text-foreground">
                          {criterion.maxPoints} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Exam Code</CardTitle>
                <CardDescription>Share this code with your students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg bg-muted p-3 text-center font-mono text-2xl font-bold tracking-widest text-foreground">
                    {examCode}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0 bg-transparent"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-chart-2" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button variant="outline" className="mt-3 w-full gap-2 bg-transparent">
                  <Share2 className="h-4 w-4" />
                  Share Link
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={() => onNavigate("teacher-dashboard")}>
                  Publish Exam
                </Button>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => onNavigate("rubric-upload")}
                >
                  Edit Rubric
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
