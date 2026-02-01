// Enums matching backend domain models
export type ExamStatus = 'pending' | 'active' | 'completed' | 'cancelled'
export type SessionStatus = 'active' | 'completed' | 'terminated'
export type EntryType = 'question' | 'response' | 'system_note' | 'teacher_message'
export type StruggleType = 'confusion' | 'off_topic' | 'silence' | 'incorrect' | 'repetition'
export type Severity = 'low' | 'medium' | 'high'

// Authentication
export interface TeacherCreate {
  username: string
  password: string
  display_name?: string
}

export interface TeacherLogin {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface TeacherResponse {
  id: string
  username: string
  display_name?: string
  created_at: string
}

// Rubric
export interface Criterion {
  id: string
  name: string
  description: string
  points?: number
}

export interface ParsedRubric {
  criteria: Criterion[]
  total_points?: number
}

export interface RubricCreate {
  title: string
  content: string
}

export interface RubricResponse {
  id: string
  teacher_id: string
  title: string
  content: string
  parsed_criteria?: ParsedRubric
  created_at: string
  updated_at?: string
}

// Exam
export interface ExamCreate {
  rubric_id: string
}

export interface ExamResponse {
  id: string
  teacher_id: string
  rubric_id: string
  room_code: string
  status: ExamStatus
  started_at?: string
  ended_at?: string
  created_at: string
}

// Student-facing
export interface JoinExamRequest {
  room_code: string
  student_name: string
  student_id: string
}

export interface JoinExamResponse {
  session_id: string
  exam_title: string
  first_question: string
}

export interface SubmitResponseRequest {
  session_id: string
  question: string
  response: string
}

export interface QuestionResponse {
  question_text: string
  question_number: number
  is_final: boolean
  is_adapted: boolean
  message?: string
}

export interface SessionStatusResponse {
  session_id: string
  status: SessionStatus
  question_number: number
  rubric_coverage_pct: number
}

// Transcript
export interface TranscriptEntryResponse {
  id: string
  entry_type: EntryType
  content: string
  timestamp: string
}

export interface SessionTranscriptResponse {
  session_id: string
  student_name: string
  student_id: string
  status: SessionStatus
  entries: TranscriptEntryResponse[]
  coverage_pct: number
  struggle_count: number
}

// Student transcript (filtered view - excludes system notes)
export interface StudentTranscriptEntryResponse {
  id: string
  entry_type: 'question' | 'response' | 'teacher_message'
  content: string
  timestamp: string
}

export interface StudentTranscriptResponse {
  session_id: string
  entries: StudentTranscriptEntryResponse[]
}

// Session summary for monitoring
export interface SessionSummary {
  session_id: string
  student_name: string
  student_id: string
  status: SessionStatus
  coverage_pct: number
  struggle_count: number
  entries?: TranscriptEntryResponse[]
}

// Struggle events
export interface StruggleEventResponse {
  id: string
  struggle_type: StruggleType
  severity: Severity
  llm_reasoning: string
  question_adapted: boolean
  timestamp: string
}

// Teacher intervention
export interface SendMessageRequest {
  message: string
}

export interface OverrideQuestionRequest {
  question: string
}

// Analytics
export interface ExamAnalytics {
  exam_id: string
  total_students: number
  completed_students: number
  average_coverage_pct: number
  average_duration_minutes?: number
  struggle_frequency: Record<string, number>
}

export interface AnalyticsOverview {
  total_exams: number
  completed_exams: number
  active_exams: number
  total_student_sessions: number
  completed_student_sessions: number
}

// Translation
export interface TranslateResponse {
  original_text: string
  translated_text: string
  language: string
}

// Voice Preferences
export interface VoiceOption {
  voice_id: string
  name: string
  description?: string
  preview_url?: string
}

export interface VoicePreference {
  language_code: string
  voice_id: string
  voice_name?: string
}

export interface VoicePreferencesResponse {
  preferences: Record<string, VoicePreference>
}

export interface VoicePreferencesUpdateRequest {
  preferences: VoicePreference[]
}

export interface CustomVoice {
  voice_id: string
  voice_name?: string
}

export interface CustomVoiceRequest {
  voice_id: string
  voice_name?: string
}
