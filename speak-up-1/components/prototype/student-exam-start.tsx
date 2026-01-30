"use client"

import type { Screen } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, Clock, AlertCircle, CheckCircle2, LogOut } from "lucide-react"

interface StudentExamStartProps {
  onNavigate: (screen: Screen) => void
}

const instructions = [
  "Find a quiet location with minimal background noise",
  "Ensure your microphone is working properly",
  "Speak clearly and at a moderate pace",
  "Take a moment to organize your thoughts before answering",
  "You can pause briefly during your response if needed",
]

export function StudentExamStart({ onNavigate }: StudentExamStartProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Midterm Oral Assessment</h1>
            <p className="text-sm text-muted-foreground">Dr. Johnson | CS 301</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("student-login")}
            className="gap-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Exit
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-chart-2/10 text-chart-2">
            <Mic className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground text-balance">
            Ready to Begin Your Oral Exam
          </h2>
          <p className="mt-2 text-muted-foreground text-pretty">
            Review the instructions below before starting your assessment.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Exam Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="font-medium text-foreground">15 minutes max</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Questions</span>
                <span className="font-medium text-foreground">Single response</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Points</span>
                <span className="font-medium text-foreground">100 points</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Criteria</span>
                <span className="font-medium text-foreground">5 areas</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-chart-2" />
                    <span className="text-muted-foreground">{instruction}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 bg-card border-chart-1/20">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1">
                <Mic className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">Microphone Access Required</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your browser will ask for permission to use your microphone. Please allow access to
                  proceed with the exam.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-col items-center gap-4">
          <Button
            size="lg"
            className="w-full max-w-sm"
            onClick={() => onNavigate("student-exam-recording")}
          >
            Begin Exam
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By clicking Begin Exam, you confirm you have read and understood the instructions.
          </p>
        </div>
      </div>
    </div>
  )
}
