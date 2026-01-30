/**
 * API client for Speak-Up backend (http://localhost:8000).
 * Matches internal routes from README and streamlit_app/app.py.
 */

import type {
  TokenResponse,
  TeacherResponse,
  RubricResponse,
  ExamResponse,
  SessionTranscriptResponse,
  StruggleEventResponse,
  ExamAnalytics,
  AnalyticsOverview,
} from "./types";

const getBaseUrl = () =>
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "")
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getApiUrl(path: string): string {
  const base = getBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export type ApiOptions = {
  token?: string | null;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
};

export async function api<T>(
  path: string,
  options: ApiOptions = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const { token, method = "GET", body } = options;
  const url = getApiUrl(path);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      ...(body != null && { body: JSON.stringify(body) }),
    });
    const text = await res.text();
    let data: T | undefined;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        // non-JSON response
      }
    }
    if (!res.ok) {
      const err =
        data && typeof data === "object" && "detail" in data
          ? String((data as { detail?: unknown }).detail)
          : res.statusText || "Request failed";
      return { error: err, status: res.status };
    }
    return { data, status: res.status };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Network error",
      status: 0,
    };
  }
}

// Auth
export const auth = {
  login: (username: string, password: string) =>
    api<TokenResponse>("/internal/auth/login", {
      method: "POST",
      body: { username, password },
    }),
  register: (body: { username: string; password: string; display_name?: string | null }) =>
    api<TeacherResponse>("/internal/auth/register", { method: "POST", body }),
  me: (token: string) =>
    api<TeacherResponse>("/internal/auth/me", { method: "GET", token }),
};

// Rubrics
export const rubrics = {
  list: (token: string) =>
    api<RubricResponse[]>("/internal/rubrics", { method: "GET", token }),
  create: (token: string, body: { title: string; content: string }) =>
    api<RubricResponse>("/internal/rubrics", { method: "POST", token, body }),
  get: (token: string, id: string) =>
    api<RubricResponse>(`/internal/rubrics/${id}`, { method: "GET", token }),
  update: (token: string, id: string, body: { title?: string; content?: string }) =>
    api<RubricResponse>(`/internal/rubrics/${id}`, { method: "PUT", token, body }),
  delete: (token: string, id: string) =>
    api<unknown>(`/internal/rubrics/${id}`, { method: "DELETE", token }),
  parse: (token: string, id: string) =>
    api<{ status: string; criteria_count: number }>(`/internal/rubrics/${id}/parse`, {
      method: "POST",
      token,
    }),
};

// Exams
export const exams = {
  list: (token: string, status?: string) =>
    api<ExamResponse[]>(
      status ? `/internal/exams?status=${status}` : "/internal/exams",
      { method: "GET", token }
    ),
  active: (token: string) =>
    api<ExamResponse | null>("/internal/exams/active", { method: "GET", token }),
  get: (token: string, id: string) =>
    api<ExamResponse>(`/internal/exams/${id}`, { method: "GET", token }),
  create: (token: string, rubric_id: string) =>
    api<ExamResponse>("/internal/exams", {
      method: "POST",
      token,
      body: { rubric_id },
    }),
  end: (token: string, id: string) =>
    api<{ status: string }>(`/internal/exams/${id}/end`, { method: "POST", token }),
  sessions: (token: string, examId: string) =>
    api<SessionTranscriptResponse[]>(`/internal/exams/${examId}/sessions`, {
      method: "GET",
      token,
    }),
  struggles: (token: string, examId: string) =>
    api<StruggleEventResponse[]>(`/internal/exams/${examId}/struggles`, {
      method: "GET",
      token,
    }),
  analytics: (token: string, examId: string) =>
    api<ExamAnalytics>(`/internal/exams/${examId}/analytics`, { method: "GET", token }),
};

// Sessions (teacher actions)
export const sessions = {
  transcript: (token: string, sessionId: string) =>
    api<SessionTranscriptResponse>(`/internal/sessions/${sessionId}/transcript`, {
      method: "GET",
      token,
    }),
  message: (token: string, sessionId: string, message: string) =>
    api<{ status: string; entry_id: string }>(`/internal/sessions/${sessionId}/message`, {
      method: "POST",
      token,
      body: { message },
    }),
  overrideQuestion: (token: string, sessionId: string, question: string) =>
    api<{ status: string; entry_id: string }>(
      `/internal/sessions/${sessionId}/override-question`,
      { method: "POST", token, body: { question } }
    ),
  terminate: (token: string, sessionId: string) =>
    api<{ status: string }>(`/internal/sessions/${sessionId}/terminate`, {
      method: "POST",
      token,
    }),
};

// Analytics overview
export const analyticsOverview = (token: string) =>
  api<AnalyticsOverview>("/internal/analytics/overview", { method: "GET", token });

