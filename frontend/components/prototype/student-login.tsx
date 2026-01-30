"use client"

import type { Screen } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, GraduationCap } from "lucide-react"

interface StudentLoginProps {
  onNavigate: (screen: Screen) => void
}

export function StudentLogin({ onNavigate }: StudentLoginProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button
          onClick={() => onNavigate("role-selection")}
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to role selection
        </button>

        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-chart-2/10 text-chart-2">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Student Sign In
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your exam code to begin your assessment.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onNavigate("student-exam-start")
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="studentId">Student ID</Label>
            <Input
              id="studentId"
              type="text"
              placeholder="e.g., STU-2024-001"
              className="bg-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="examCode">Exam Code</Label>
            <Input
              id="examCode"
              type="text"
              placeholder="Enter 6-digit code"
              className="bg-input font-mono tracking-widest"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              className="bg-input"
            />
          </div>

          <Button type="submit" className="w-full">
            Start Exam
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Need help?{" "}
          <button className="text-foreground underline-offset-4 hover:underline">
            Contact your instructor
          </button>
        </p>
      </div>
    </div>
  )
}
