import { render, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const startRecording = vi.fn<[], Promise<void>>(() => Promise.resolve())
const stopRecording = vi.fn()
const clearRecording = vi.fn()

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
    isRecording: false,
    audioBlob: null,
    error: null,
    hasPermission: true,
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
    translateQuestion: vi.fn(),
    submitAudio: vi.fn(),
    getQuestionAudio: vi.fn(),
  },
}))

import StudentExamPage from '@/app/student/exam/page'

describe('StudentExamPage spacebar recording', () => {
  beforeEach(() => {
    startRecording.mockClear()
    stopRecording.mockClear()
    clearRecording.mockClear()
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
})
