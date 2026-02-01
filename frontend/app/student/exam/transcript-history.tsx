'use client'

import { useEffect, useRef } from 'react'
import { StudentTranscriptEntryResponse } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, User, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TranscriptHistoryProps {
  entries: StudentTranscriptEntryResponse[]
  className?: string
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function TranscriptEntry({ entry }: { entry: StudentTranscriptEntryResponse }) {
  const isQuestion = entry.entry_type === 'question'
  const isResponse = entry.entry_type === 'response'
  const isTeacherMessage = entry.entry_type === 'teacher_message'

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg',
        isQuestion && 'bg-muted/50',
        isResponse && 'bg-primary/5',
        isTeacherMessage && 'bg-chart-2/10 border border-chart-2/30'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isQuestion && 'bg-muted',
          isResponse && 'bg-primary/10',
          isTeacherMessage && 'bg-chart-2/20'
        )}
      >
        {isQuestion && <HelpCircle className="h-4 w-4 text-muted-foreground" />}
        {isResponse && <User className="h-4 w-4 text-primary" />}
        {isTeacherMessage && <MessageSquare className="h-4 w-4 text-chart-2" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              'text-xs font-medium',
              isQuestion && 'text-muted-foreground',
              isResponse && 'text-primary',
              isTeacherMessage && 'text-chart-2'
            )}
          >
            {isQuestion && 'Question'}
            {isResponse && 'Your Response'}
            {isTeacherMessage && 'Instructor Message'}
          </span>
          <span className="text-xs text-muted-foreground">{formatTime(entry.timestamp)}</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{entry.content}</p>
      </div>
    </div>
  )
}

export function TranscriptHistory({ entries, className }: TranscriptHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(entries.length)

  // Auto-scroll to bottom when new entries appear
  useEffect(() => {
    if (entries.length > prevLengthRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    prevLengthRef.current = entries.length
  }, [entries.length])

  if (entries.length === 0) {
    return null
  }

  return (
    <div className={cn('rounded-lg border border-border bg-card', className)}>
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Exam History</h3>
        <p className="text-xs text-muted-foreground">Previous questions and your responses</p>
      </div>
      <ScrollArea className="h-[300px]">
        <div className="p-4 space-y-3" ref={scrollRef}>
          {entries.map((entry) => (
            <TranscriptEntry key={entry.id} entry={entry} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
