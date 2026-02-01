'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { rubrics } from '@/lib/api'
import type { RubricResponse, RubricCreate, ParsedRubric } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ArrowLeft, Plus, Trash2, Sparkles, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

const MAX_RUBRIC_TITLE_LENGTH = 200

export default function TeacherRubricsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [rubricsList, setRubricsList] = useState<RubricResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newRubric, setNewRubric] = useState<RubricCreate>({ title: '', content: '' })
  const [parsingId, setParsingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/teacher/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchRubrics = async () => {
      try {
        const data = await rubrics.list()
        setRubricsList(data)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load rubrics'
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRubrics()
  }, [isAuthenticated])

  const handleCreateRubric = async () => {
    if (!newRubric.title.trim() || !newRubric.content.trim()) {
      toast.error('Please fill in both title and content')
      return
    }

    setIsCreating(true)
    try {
      const created = await rubrics.create(newRubric)
      setRubricsList((prev) => [created, ...prev])
      setNewRubric({ title: '', content: '' })
      setIsCreateDialogOpen(false)
      toast.success('Rubric created successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create rubric'
      toast.error(message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteRubric = async (id: string) => {
    setDeletingId(id)
    try {
      await rubrics.delete(id)
      setRubricsList((prev) => prev.filter((r) => r.id !== id))
      toast.success('Rubric deleted successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete rubric'
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleParseRubric = async (id: string) => {
    setParsingId(id)
    try {
      const parsed = await rubrics.parse(id)
      setRubricsList((prev) =>
        prev.map((r) => (r.id === id ? { ...r, parsed_criteria: parsed } : r))
      )
      setExpandedId(id)
      toast.success('Rubric parsed successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse rubric'
      toast.error(message)
    } finally {
      setParsingId(null)
    }
  }

  const handleGenerateContent = async () => {
    if (!newRubric.title.trim()) {
      toast.error('Please enter a title first')
      return
    }

    setIsGenerating(true)
    try {
      const result = await rubrics.generate(newRubric.title)
      setNewRubric((prev) => ({ ...prev, content: result.content }))
      toast.success('Rubric content generated')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate rubric'
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/teacher/dashboard">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Rubrics</h1>
              <p className="text-sm text-muted-foreground">Manage your assessment rubrics</p>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Rubric
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Rubric</DialogTitle>
                <DialogDescription>
                  Add a title and paste your rubric content in markdown format.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Biology Oral Exam Rubric"
                    maxLength={MAX_RUBRIC_TITLE_LENGTH}
                    value={newRubric.title}
                    onChange={(e) => setNewRubric((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content">Content (Markdown)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={handleGenerateContent}
                      disabled={isGenerating || !newRubric.title.trim()}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    id="content"
                    placeholder="Paste your rubric content here..."
                    className="min-h-[200px]"
                    value={newRubric.content}
                    onChange={(e) => setNewRubric((prev) => ({ ...prev, content: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRubric} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Rubric'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : rubricsList.length === 0 ? (
          <Card className="bg-card">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-4 text-lg font-medium">No rubrics yet</p>
                <p className="text-sm">Create your first rubric to get started</p>
                <Button className="mt-6 gap-2" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create Rubric
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rubricsList.map((rubric) => (
              <Card key={rubric.id} className="bg-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{rubric.title}</CardTitle>
                      <CardDescription>Created {formatDate(rubric.created_at)}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleParseRubric(rubric.id)}
                        disabled={parsingId === rubric.id}
                      >
                        {parsingId === rubric.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Parsing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Parse
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDeleteRubric(rubric.id)}
                        disabled={deletingId === rubric.id}
                      >
                        {deletingId === rubric.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {rubric.content.length > 300
                        ? `${rubric.content.slice(0, 300)}...`
                        : rubric.content}
                    </pre>
                  </div>

                  {rubric.parsed_criteria && (
                    <div className="mt-4">
                      <button
                        className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                        onClick={() => setExpandedId(expandedId === rubric.id ? null : rubric.id)}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Sparkles className="h-4 w-4 text-chart-1" />
                          Parsed Criteria ({rubric.parsed_criteria.criteria.length} criteria
                          {rubric.parsed_criteria.total_points !== undefined &&
                            `, ${rubric.parsed_criteria.total_points} total points`}
                          )
                        </span>
                        {expandedId === rubric.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>

                      {expandedId === rubric.id && (
                        <div className="mt-2 space-y-2 rounded-lg border border-border bg-background p-4">
                          {rubric.parsed_criteria.criteria.map((criterion) => (
                            <div
                              key={criterion.id}
                              className="rounded-md border border-border bg-muted/20 p-3"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h4 className="font-medium text-foreground">{criterion.name}</h4>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {criterion.description}
                                  </p>
                                </div>
                                {criterion.points !== undefined && (
                                  <span className="shrink-0 rounded-full bg-chart-1/10 px-2.5 py-0.5 text-xs font-medium text-chart-1">
                                    {criterion.points} pts
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
