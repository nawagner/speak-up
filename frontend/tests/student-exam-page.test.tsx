import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const recorderState = vi.hoisted(() => ({
  isRecording: false,
  audioBlob: null as Blob | null,
  error: null as string | null,
  hasPermission: true,
}))

const startRecording = vi.hoisted(() => vi.fn<[], Promise<void>>(() => Promise.resolve()))
const stopRecording = vi.hoisted(() => vi.fn())
const clearRecording = vi.hoisted(() => vi.fn())
const submitAudio = vi.hoisted(() => vi.fn())

const setAudioBlob = (blob: Blob | null) => {
  recorderState.audioBlob = blob
}

startRecording.mockImplementation(() => {
  recorderState.isRecording = true
  return Promise.resolve()
})

stopRecording.mockImplementation(() => {
  recorderState.isRecording = false
})

clearRecording.mockImplementation(() => {
  recorderState.audioBlob = null
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/hooks/use-audio-recorder', () => ({
  useAudioRecorder: () => ({
    ...recorderState,
    startRecording,
    stopRecording,
    clearRecording,
  }),
}))

vi.mock('@/hooks/use-question-audio', () => ({
  useQuestionAudio: () => ({
    isPlaying: false,
    isLoading: false,
    error: null,
    playQuestion: vi.fn(),
    replay: vi.fn(),
    stop: vi.fn(),
  }),
}))

vi.mock('@/lib/api', () => ({
  student: {
    getTeacherResponse: vi.fn(async () => ({ message: null })),
    getTranscript: vi.fn(async () => ({ entries: [] })),
    translateQuestion: vi.fn(),
    submitAudio,
    getQuestionAudio: vi.fn(),
  },
}))

import StudentExamPage from '@/app/student/exam/page'

describe('StudentExamPage spacebar recording', () => {
  beforeEach(() => {
    startRecording.mockClear()
    stopRecording.mockClear()
    clearRecording.mockClear()
    submitAudio.mockReset()
    recorderState.isRecording = false
    recorderState.audioBlob = null
    recorderState.error = null
    recorderState.hasPermission = true
    sessionStorage.setItem(
      'exam_session',
      JSON.stringify({
        session_id: 'session-1',
        exam_title: 'Test Exam',
        first_question: 'What is your name?',
        student_name: 'Alex',
        language: 'en',
      })
    )
  })

  test('starts and stops recording while holding spacebar', async () => {
    render(<StudentExamPage />)

    fireEvent.keyDown(window, { key: ' ', code: 'Space' })
    await waitFor(() => expect(startRecording).toHaveBeenCalledTimes(1))

    fireEvent.keyUp(window, { key: ' ', code: 'Space' })
    await waitFor(() => expect(stopRecording).toHaveBeenCalledTimes(1))
  })

  test('shows completion UI after final response', async () => {
    submitAudio.mockResolvedValueOnce({
      question_text: 'Final question',
      question_number: 3,
      is_final: true,
      is_adapted: false,
    })

    const { rerender } = render(<StudentExamPage />)

    setAudioBlob(new Blob(['audio']))
    rerender(<StudentExamPage />)

    expect(await screen.findByText('Exam Complete')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit exam/i })).toBeInTheDocument()
  })

  test('clears completion state when a new question arrives after go back', async () => {
    submitAudio
      .mockResolvedValueOnce({
        question_text: 'Final question',
        question_number: 3,
        is_final: true,
        is_adapted: false,
      })
      .mockResolvedValueOnce({
        question_text: 'Next question',
        question_number: 4,
        is_final: false,
        is_adapted: false,
      })

    const { rerender } = render(<StudentExamPage />)

    setAudioBlob(new Blob(['audio-1']))
    rerender(<StudentExamPage />)

    const goBackButton = await screen.findByRole('button', { name: /go back/i })
    await userEvent.click(goBackButton)

    setAudioBlob(new Blob(['audio-2']))
    rerender(<StudentExamPage />)

    expect(await screen.findByText('Current Question')).toBeInTheDocument()
    expect(screen.getByText('Next question')).toBeInTheDocument()
  })
})
