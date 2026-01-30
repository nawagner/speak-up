"use client"

import type { Screen } from "@/app/page"
import { Button } from "@/components/ui/button"
import { GraduationCap, Users } from "lucide-react"

interface RoleSelectionProps {
  onNavigate: (screen: Screen) => void
}

export function RoleSelection({ onNavigate }: RoleSelectionProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <div className="mb-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">OE</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">
            Welcome to OralExam
          </h1>
          <p className="mt-3 text-muted-foreground text-pretty">
            AI-powered oral examination platform. Select your role to continue.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => onNavigate("teacher-login")}
            className="group relative flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 transition-all hover:border-chart-1/50 hover:bg-card/80"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-chart-1/10 text-chart-1 transition-colors group-hover:bg-chart-1/20">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Teacher</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create exams and review results
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate("student-login")}
            className="group relative flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 transition-all hover:border-chart-2/50 hover:bg-card/80"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-chart-2/10 text-chart-2 transition-colors group-hover:bg-chart-2/20">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Student</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Take exams and view feedback
              </p>
            </div>
          </button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
