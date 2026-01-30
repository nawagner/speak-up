'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { student } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, GraduationCap, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function StudentJoinPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    room_code: '',
    student_id: '',
    student_name: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await student.join({
        room_code: formData.room_code.toUpperCase(),
        student_id: formData.student_id,
        student_name: formData.student_name,
      })

      // Store session info in sessionStorage for the exam page
      sessionStorage.setItem('exam_session', JSON.stringify({
        session_id: response.session_id,
        exam_title: response.exam_title,
        first_question: response.first_question,
        student_name: formData.student_name,
      }))

      toast.success(`Joined exam: ${response.exam_title}`)
      router.push('/student/exam')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join exam'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to role selection
        </Link>

        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-chart-2/10 text-chart-2">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Join Exam
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your exam code to begin your assessment.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room_code">Room Code</Label>
            <Input
              id="room_code"
              type="text"
              placeholder="Enter 6-character code"
              className="bg-input font-mono tracking-widest uppercase"
              value={formData.room_code}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, room_code: e.target.value.toUpperCase() }))
              }
              maxLength={6}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="student_id">Student ID</Label>
            <Input
              id="student_id"
              type="text"
              placeholder="e.g., STU-2024-001"
              className="bg-input"
              value={formData.student_id}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, student_id: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="student_name">Full Name</Label>
            <Input
              id="student_name"
              type="text"
              placeholder="Enter your full name"
              className="bg-input"
              value={formData.student_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, student_name: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining exam...
              </>
            ) : (
              'Start Exam'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Need help?{' '}
          <span className="text-foreground">Contact your instructor</span>
        </p>
      </div>
    </div>
  )
}
