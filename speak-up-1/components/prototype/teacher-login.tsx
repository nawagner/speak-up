"use client"

import type { Screen } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Users } from "lucide-react"

interface TeacherLoginProps {
  onNavigate: (screen: Screen) => void
}

export function TeacherLogin({ onNavigate }: TeacherLoginProps) {
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
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-chart-1/10 text-chart-1">
            <Users className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Teacher Sign In
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your credentials to access the teacher dashboard.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onNavigate("teacher-dashboard")
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="teacher@school.edu"
              className="bg-input"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
                Forgot password?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="bg-input"
            />
          </div>

          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {"Don't have an account? "}
          <button className="text-foreground underline-offset-4 hover:underline">
            Contact administrator
          </button>
        </p>
      </div>
    </div>
  )
}
