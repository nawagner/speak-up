import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import TeacherRubricsPage from '@/app/teacher/rubrics/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
  }),
}))

vi.mock('@/lib/api', () => ({
  rubrics: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    delete: vi.fn(),
    parse: vi.fn(),
    generate: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))


test('title input enforces max length', async () => {
  render(<TeacherRubricsPage />)

  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /new rubric/i }))

  const input = await screen.findByLabelText('Title')

  expect(input).toHaveAttribute('maxlength', '200')
})
