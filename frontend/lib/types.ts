/**
 * TypeScript types aligned with backend app/api/schemas.py and README.
 * Adapt v0 components to use these fields so the frontend stays in sync with the API.
 */

// Auth
export interface TeacherCreate {
  username: string;
  password: string;
  display_name?: string | null;
}

export interface TeacherLogin {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type?: string;
}

export interface TeacherResponse {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
}

// Rubrics
export interface RubricCreate {
  title: string;
  content: string;
}

export interface RubricUpdate {
  title?: string | null;
  content?: string | null;
}

export interface Criterion {
  id: string;
  name: string;
  description: string;
  points?: number | null;
}

export interface ParsedCriteria {
  criteria: Criterion[];
  total_points?: number | null;
}

export interface RubricResponse {
  id: string;
  teacher_id: string;
  title: string;
  content: string;
  parsed_criteria: ParsedCriteria | null;
  created_at: string;
  updated_at: string | null;
}

// Exams
export type ExamStatus = "pending" | "active" | "completed" | "cancelled";
export type SessionStatus = "active" | "completed" | "terminated";

export interface ExamCreate {
  rubric_id: string;
}

export interface ExamResponse {
  id: string;
  teacher_id: string;
  rubric_id: string;
  room_code: string;
  status: ExamStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

// Sessions / Transcripts
export interface TranscriptEntryResponse {
  id: string;
  entry_type: string;
  content: string;
  timestamp: string;
}

export interface SessionTranscriptResponse {
  session_id: string;
  student_name: string;
  student_id: string;
  status: SessionStatus;
  entries: TranscriptEntryResponse[];
  coverage_pct: number;
  struggle_count: number;
}

// Struggle
export interface StruggleEventResponse {
  id: string;
  session_id: string;
  struggle_type: string;
  severity: string;
  reasoning: string;
  question_adapted: boolean;
  timestamp: string;
}

// Teacher actions
export interface SendMessageRequest {
  message: string;
}

export interface OverrideQuestionRequest {
  question: string;
}

// Analytics
export interface ExamAnalytics {
  exam_id: string;
  total_students: number;
  completed_students: number;
  average_coverage_pct: number;
  average_duration_minutes: number | null;
  struggle_frequency: Record<string, number>;
}

export interface AnalyticsOverview {
  total_exams: number;
  completed_exams: number;
  active_exams: number;
  total_student_sessions: number;
  completed_student_sessions: number;
}

// Student API (no auth)
export interface JoinExamRequest {
  room_code: string;
  student_name: string;
  student_id: string;
}

export interface JoinExamResponse {
  session_id: string;
  exam_title: string;
  first_question: string;
}

export interface QuestionResponse {
  question_text: string;
  question_number: number;
  is_final: boolean;
  is_adapted: boolean;
  message: string | null;
}

export interface SessionStatusResponse {
  session_id: string;
  status: SessionStatus;
  question_number: number;
  rubric_coverage_pct: number;
}
