import type {
  TeacherCreate,
  TeacherLogin,
  TokenResponse,
  TeacherResponse,
  RubricCreate,
  RubricResponse,
  ExamCreate,
  ExamResponse,
  JoinExamRequest,
  JoinExamResponse,
  SubmitResponseRequest,
  QuestionResponse,
  SessionStatusResponse,
  SessionTranscriptResponse,
  StudentTranscriptResponse,
  SessionSummary,
  StruggleEventResponse,
  SendMessageRequest,
  OverrideQuestionRequest,
  ExamAnalytics,
  AnalyticsOverview,
  ParsedRubric,
  TranslateResponse,
  VoiceOption,
  VoicePreferencesResponse,
  VoicePreferencesUpdateRequest,
  CustomVoice,
  CustomVoiceRequest,
} from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', token)
  }
}

function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token')
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      errorData.detail || `Request failed with status ${response.status}`
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

async function requestFormData<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {}

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      errorData.detail || `Request failed with status ${response.status}`
    )
  }

  return response.json()
}

// Authentication API
export const auth = {
  register: async (data: TeacherCreate): Promise<TeacherResponse> => {
    return request<TeacherResponse>('/internal/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  login: async (data: TeacherLogin): Promise<TokenResponse> => {
    const response = await request<TokenResponse>('/internal/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    setToken(response.access_token)
    return response
  },

  me: async (): Promise<TeacherResponse> => {
    return request<TeacherResponse>('/internal/auth/me')
  },

  logout: (): void => {
    clearToken()
  },
}

// Rubric API
export const rubrics = {
  list: async (): Promise<RubricResponse[]> => {
    return request<RubricResponse[]>('/internal/rubrics')
  },

  get: async (id: string): Promise<RubricResponse> => {
    return request<RubricResponse>(`/internal/rubrics/${id}`)
  },

  create: async (data: RubricCreate): Promise<RubricResponse> => {
    return request<RubricResponse>('/internal/rubrics', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (
    id: string,
    data: Partial<RubricCreate>
  ): Promise<RubricResponse> => {
    return request<RubricResponse>(`/internal/rubrics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string): Promise<void> => {
    return request<void>(`/internal/rubrics/${id}`, {
      method: 'DELETE',
    })
  },

  parse: async (id: string): Promise<ParsedRubric> => {
    return request<ParsedRubric>(`/internal/rubrics/${id}/parse`, {
      method: 'POST',
    })
  },

  generate: async (title: string): Promise<{ content: string }> => {
    return request<{ content: string }>('/internal/rubrics/generate', {
      method: 'POST',
      body: JSON.stringify({ title }),
    })
  },
}

// Exam API
export const exams = {
  list: async (): Promise<ExamResponse[]> => {
    return request<ExamResponse[]>('/internal/exams')
  },

  get: async (id: string): Promise<ExamResponse> => {
    return request<ExamResponse>(`/internal/exams/${id}`)
  },

  getActive: async (): Promise<ExamResponse | null> => {
    try {
      return await request<ExamResponse>('/internal/exams/active')
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null
      }
      throw error
    }
  },

  create: async (data: ExamCreate): Promise<ExamResponse> => {
    return request<ExamResponse>('/internal/exams', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  start: async (id: string): Promise<ExamResponse> => {
    return request<ExamResponse>(`/internal/exams/${id}/start`, {
      method: 'POST',
    })
  },

  end: async (id: string): Promise<ExamResponse> => {
    return request<ExamResponse>(`/internal/exams/${id}/end`, {
      method: 'POST',
    })
  },

  getSessions: async (id: string): Promise<SessionSummary[]> => {
    return request<SessionSummary[]>(`/internal/exams/${id}/sessions`)
  },

  getStruggles: async (id: string): Promise<StruggleEventResponse[]> => {
    return request<StruggleEventResponse[]>(`/internal/exams/${id}/struggles`)
  },

  getAnalytics: async (id: string): Promise<ExamAnalytics> => {
    return request<ExamAnalytics>(`/internal/exams/${id}/analytics`)
  },
}

// Session API (Teacher)
export const sessions = {
  getTranscript: async (id: string): Promise<SessionTranscriptResponse> => {
    return request<SessionTranscriptResponse>(
      `/internal/sessions/${id}/transcript`
    )
  },

  sendMessage: async (id: string, data: SendMessageRequest): Promise<void> => {
    return request<void>(`/internal/sessions/${id}/message`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  overrideQuestion: async (
    id: string,
    data: OverrideQuestionRequest
  ): Promise<void> => {
    return request<void>(`/internal/sessions/${id}/override`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  terminate: async (id: string): Promise<void> => {
    return request<void>(`/internal/sessions/${id}/terminate`, {
      method: 'POST',
    })
  },
}

// Student API
export const student = {
  join: async (data: JoinExamRequest): Promise<JoinExamResponse> => {
    return request<JoinExamResponse>('/api/v1/join', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getStatus: async (sessionId: string): Promise<SessionStatusResponse> => {
    return request<SessionStatusResponse>(`/api/v1/session/${sessionId}/status`)
  },

  getQuestion: async (sessionId: string): Promise<QuestionResponse> => {
    return request<QuestionResponse>(`/api/v1/session/${sessionId}/question`)
  },

  submitResponse: async (data: SubmitResponseRequest): Promise<QuestionResponse> => {
    return request<QuestionResponse>(`/api/v1/session/${data.session_id}/response`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  submitAudio: async (
    sessionId: string,
    audioBlob: Blob,
    question: string
  ): Promise<QuestionResponse> => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('question', question)
    return requestFormData<QuestionResponse>(
      `/api/v1/session/${sessionId}/audio`,
      formData
    )
  },

  getTeacherResponse: async (sessionId: string): Promise<{ message: string | null }> => {
    return request<{ message: string | null }>(`/api/v1/session/${sessionId}/teacher-response`)
  },

  getQuestionAudio: async (
    sessionId: string,
    questionText: string,
    language: string = 'en'
  ): Promise<Blob> => {
    const params = new URLSearchParams({ text: questionText, language })
    const response = await fetch(
      `${API_URL}/api/v1/session/${sessionId}/tts?${params}`,
      {
        headers: {},
      }
    )

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to generate audio')
    }

    return response.blob()
  },

  translateQuestion: async (
    sessionId: string,
    text: string,
    language: string
  ): Promise<TranslateResponse> => {
    const params = new URLSearchParams({ text, language })
    return request<TranslateResponse>(`/api/v1/session/${sessionId}/translate?${params}`)
  },

  getTranscript: async (sessionId: string): Promise<StudentTranscriptResponse> => {
    return request<StudentTranscriptResponse>(`/api/v1/session/${sessionId}/transcript`)
  },
}

// Analytics API
export const analytics = {
  overview: async (): Promise<AnalyticsOverview> => {
    return request<AnalyticsOverview>('/internal/analytics/overview')
  },
}

// Voice Preferences API
export const voice = {
  getOptions: async (): Promise<VoiceOption[]> => {
    return request<VoiceOption[]>('/internal/voice/options')
  },

  getPreferences: async (): Promise<VoicePreferencesResponse> => {
    return request<VoicePreferencesResponse>('/internal/voice/preferences')
  },

  updatePreferences: async (
    data: VoicePreferencesUpdateRequest
  ): Promise<VoicePreferencesResponse> => {
    return request<VoicePreferencesResponse>('/internal/voice/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  getCustomVoices: async (): Promise<CustomVoice[]> => {
    return request<CustomVoice[]>('/internal/voice/custom')
  },

  addCustomVoice: async (data: CustomVoiceRequest): Promise<CustomVoice> => {
    return request<CustomVoice>('/internal/voice/custom', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  removeCustomVoice: async (voiceId: string): Promise<void> => {
    return request<void>(`/internal/voice/custom/${voiceId}`, {
      method: 'DELETE',
    })
  },

  getPreviewUrl: (voiceId: string): string => {
    return `https://api.elevenlabs.io/v1/voices/${voiceId}/preview`
  },
}

export { ApiError, getToken, setToken, clearToken }
