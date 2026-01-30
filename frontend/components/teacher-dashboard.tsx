'use client'

import React from "react"

import { useState } from 'react'
import { Upload, FileText, Eye, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ParsedRubric } from '@/lib/types'

export function TeacherDashboard() {
  const [rubricText, setRubricText] = useState('')
  const [examLink, setExamLink] = useState('')
  const [parsedRubric, setParsedRubric] = useState<ParsedRubric | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleParseRubric = async () => {
    if (!rubricText.trim()) {
      toast.error('Please enter a rubric')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch('/api/parse-rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rubricText }),
      })

      if (!response.ok) throw new Error('Failed to parse rubric')

      const data = await response.json()
      setParsedRubric(data.rubric)
      
      // Generate a shareable exam link
      const link = `${window.location.origin}/exam?rubric=${encodeURIComponent(JSON.stringify(data.rubric))}`
      setExamLink(link)
      
      toast.success('Rubric parsed successfully!')
    } catch (error) {
      console.error('[v0] Error parsing rubric:', error)
      toast.error('Failed to parse rubric')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setRubricText(text)
    }
    reader.readAsText(file)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(examLink)
    toast.success('Link copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Teacher Dashboard</h1>
          <p className="text-lg text-muted-foreground">Create and manage oral examinations with AI-powered evaluation</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Rubric Input */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Upload Rubric
              </CardTitle>
              <CardDescription>Paste or upload your evaluation rubric</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rubric-upload">Upload File</Label>
                <Input
                  id="rubric-upload"
                  type="file"
                  accept=".txt,.md"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rubric-text">Or Paste Text</Label>
                <Textarea
                  id="rubric-text"
                  placeholder="Enter your rubric here..."
                  value={rubricText}
                  onChange={(e) => setRubricText(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              <Button
                onClick={handleParseRubric}
                disabled={isProcessing || !rubricText.trim()}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Parse & Preview Rubric
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Rubric Preview */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-accent" />
                Rubric Preview
              </CardTitle>
              <CardDescription>Structured view of your rubric</CardDescription>
            </CardHeader>
            <CardContent>
              {parsedRubric ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{parsedRubric.examTitle}</h3>
                      <Badge variant="secondary">
                        {parsedRubric.criteria.length} Criteria
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{parsedRubric.examDescription}</p>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {parsedRubric.criteria.map((criterion, idx) => (
                      <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{criterion.name}</p>
                          <Badge variant="outline" className="shrink-0">
                            {criterion.maxPoints} pts
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{criterion.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-center space-y-2">
                  <Upload className="h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No rubric loaded yet</p>
                  <p className="text-sm text-muted-foreground/70">Upload a rubric to see the preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Exam Link */}
        {examLink && (
          <Card className="bg-card border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Student Exam Link
              </CardTitle>
              <CardDescription>Share this link with your students</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={examLink}
                  className="font-mono text-sm"
                />
                <Button onClick={copyLink} variant="secondary">
                  Copy Link
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Students will use this link to access the exam and record their responses
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
