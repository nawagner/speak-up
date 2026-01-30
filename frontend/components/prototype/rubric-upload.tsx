"use client"

import type { Screen } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, FileText, X } from "lucide-react"
import { useState } from "react"

interface RubricUploadProps {
  onNavigate: (screen: Screen) => void
}

export function RubricUpload({ onNavigate }: RubricUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => onNavigate("teacher-dashboard")}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="h-4 w-px bg-border" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Create New Exam</h1>
            <p className="text-sm text-muted-foreground">Upload your rubric to get started</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Exam Details</CardTitle>
              <CardDescription>Basic information about your oral examination</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="examName">Exam Name</Label>
                <Input
                  id="examName"
                  placeholder="e.g., Midterm Oral Assessment"
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this exam covers..."
                  className="bg-input min-h-[80px] resize-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Upload Rubric</CardTitle>
              <CardDescription>
                Upload a Markdown file containing your grading rubric
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`relative rounded-lg border-2 border-dashed transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : fileName
                      ? "border-chart-2 bg-chart-2/5"
                      : "border-border hover:border-muted-foreground"
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  const file = e.dataTransfer.files[0]
                  if (file) setFileName(file.name)
                }}
              >
                <input
                  type="file"
                  accept=".md,.markdown"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setFileName(file.name)
                  }}
                />
                <div className="flex flex-col items-center justify-center py-12">
                  {fileName ? (
                    <>
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                        <FileText className="h-6 w-6" />
                      </div>
                      <p className="font-medium text-foreground">{fileName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        File ready for upload
                      </p>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          setFileName(null)
                        }}
                        className="mt-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                        Remove file
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="font-medium text-foreground">
                        Drop your rubric file here
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        or click to browse (.md files)
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium text-foreground">Rubric Format Tips</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>Use headings (# or ##) to define criteria categories</li>
                  <li>Include point values in parentheses, e.g., (10 points)</li>
                  <li>Describe expectations for each score level</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => onNavigate("teacher-dashboard")}>
              Cancel
            </Button>
            <Button onClick={() => onNavigate("rubric-preview")}>
              Preview Rubric
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
