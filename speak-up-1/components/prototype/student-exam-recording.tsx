"use client"

import type { Screen } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, Square, Pause, Play, Clock } from "lucide-react"
import { useState, useEffect } from "react"

interface StudentExamRecordingProps {
  onNavigate: (screen: Screen) => void
}

export function StudentExamRecording({ onNavigate }: StudentExamRecordingProps) {
  const [isRecording, setIsRecording] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording, isPaused])

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Midterm Oral Assessment</h1>
            <p className="text-sm text-muted-foreground">Recording in progress</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-destructive">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
            </span>
            <span className="text-sm font-medium">LIVE</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <Card className="bg-card">
          <CardContent className="py-12">
            <div className="flex flex-col items-center">
              <div
                className={`relative mb-8 flex h-32 w-32 items-center justify-center rounded-full ${
                  isPaused ? "bg-muted" : "bg-destructive/10"
                }`}
              >
                {!isPaused && (
                  <>
                    <span className="absolute inset-0 animate-ping rounded-full bg-destructive/20" />
                    <span className="absolute inset-2 animate-pulse rounded-full bg-destructive/10" />
                  </>
                )}
                <Mic
                  className={`h-12 w-12 ${isPaused ? "text-muted-foreground" : "text-destructive"}`}
                />
              </div>

              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Recording Time</span>
              </div>
              <div className="mb-8 font-mono text-5xl font-bold tracking-tight text-foreground">
                {formatTime(seconds)}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsPaused(!isPaused)}
                  className="gap-2"
                >
                  {isPaused ? (
                    <>
                      <Play className="h-4 w-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => {
                    setIsRecording(false)
                    onNavigate("student-exam-complete")
                  }}
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop Recording
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold text-foreground">Grading Criteria</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Content Knowledge",
              "Critical Thinking",
              "Communication",
              "Organization",
              "Professional Delivery",
            ].map((criterion) => (
              <div key={criterion} className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {criterion}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-muted/50 p-4">
          <p className="text-center text-sm text-muted-foreground">
            Speak clearly and address all the criteria above. Your response will be automatically
            transcribed and evaluated.
          </p>
        </div>
      </div>
    </div>
  )
}
