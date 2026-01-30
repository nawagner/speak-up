"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getToken } from "@/lib/auth";
import { exams, sessions } from "@/lib/api";
import type { ExamResponse, SessionTranscriptResponse } from "@/lib/types";

export default function TranscriptsPage() {
  const searchParams = useSearchParams();
  const preselectedExam = searchParams.get("exam");
  const preselectedSession = searchParams.get("session");
  const [examList, setExamList] = useState<ExamResponse[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(preselectedExam);
  const [sessionList, setSessionList] = useState<SessionTranscriptResponse[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(preselectedSession);
  const [transcript, setTranscript] = useState<SessionTranscriptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    (async () => {
      const res = await exams.list(token);
      if (res.data) setExamList(res.data);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedExamId) {
      setSessionList([]);
      setSelectedSessionId(null);
      setTranscript(null);
      return;
    }
    const token = getToken();
    if (!token) return;
    (async () => {
      const res = await exams.sessions(token, selectedExamId);
      if (res.data) {
        setSessionList(res.data);
        if (preselectedSession && res.data.some((s) => s.session_id === preselectedSession)) {
          setSelectedSessionId(preselectedSession);
        } else {
          setSelectedSessionId(null);
        }
      }
      setTranscript(null);
    })();
  }, [selectedExamId]);

  useEffect(() => {
    if (!selectedSessionId) {
      setTranscript(null);
      return;
    }
    const token = getToken();
    if (!token) return;
    (async () => {
      const res = await sessions.transcript(token, selectedSessionId);
      if (res.data) setTranscript(res.data);
      else if (res.error) setError(res.error);
    })();
  }, [selectedSessionId]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transcripts</h1>
        <p className="text-muted-foreground">View full Q&A and teacher messages per session</p>
      </div>

      {error && (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Select exam</CardTitle>
            <CardDescription>Then choose a student session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedExamId ?? ""}
              onChange={(e) => setSelectedExamId(e.target.value || null)}
            >
              <option value="">—</option>
              {examList.map((e) => (
                <option key={e.id} value={e.id}>
                  Room {e.room_code} – {e.status}
                </option>
              ))}
            </select>
            {sessionList.length > 0 && (
              <>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedSessionId ?? ""}
                  onChange={(e) => setSelectedSessionId(e.target.value || null)}
                >
                  <option value="">—</option>
                  {sessionList.map((s) => (
                    <option key={s.session_id} value={s.session_id}>
                      {s.student_name} ({s.student_id}) – {s.status}
                    </option>
                  ))}
                </select>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
            {transcript && (
              <CardDescription>
                {transcript.student_name} · Coverage {(transcript.coverage_pct * 100).toFixed(0)}% ·{" "}
                {transcript.struggle_count} struggle(s)
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!transcript ? (
              <p className="text-muted-foreground">Select an exam and a student to view the transcript.</p>
            ) : (
              <div className="space-y-4">
                {transcript.entries.map((entry) => (
                  <div key={entry.id} className="rounded-md border p-3">
                    <p className="text-muted-foreground text-xs">
                      {entry.entry_type} · {new Date(entry.timestamp).toLocaleString()}
                    </p>
                    {entry.entry_type === "question" && (
                      <p className="mt-1 font-medium text-primary">Q: {entry.content}</p>
                    )}
                    {entry.entry_type === "response" && (
                      <p className="mt-1 text-foreground">A: {entry.content}</p>
                    )}
                    {entry.entry_type === "teacher_message" && (
                      <p className="mt-1 text-amber-600 dark:text-amber-400">Teacher: {entry.content}</p>
                    )}
                    {entry.entry_type === "system_note" && (
                      <p className="mt-1 text-muted-foreground italic">{entry.content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
