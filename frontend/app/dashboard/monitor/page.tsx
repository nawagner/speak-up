"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getToken } from "@/lib/auth";
import { exams, sessions } from "@/lib/api";
import type { ExamResponse, SessionTranscriptResponse, StruggleEventResponse } from "@/lib/types";

export default function MonitorPage() {
  const [activeExam, setActiveExam] = useState<ExamResponse | null>(null);
  const [sessionList, setSessionList] = useState<SessionTranscriptResponse[]>([]);
  const [struggles, setStruggles] = useState<StruggleEventResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageSessionId, setMessageSessionId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    const activeRes = await exams.active(token);
    if (activeRes.error || !activeRes.data) {
      setActiveExam(null);
      setSessionList([]);
      setStruggles([]);
      setLoading(false);
      return;
    }
    setActiveExam(activeRes.data);
    const [sessionsRes, strugglesRes] = await Promise.all([
      exams.sessions(token, activeRes.data.id),
      exams.struggles(token, activeRes.data.id),
    ]);
    if (sessionsRes.data) setSessionList(sessionsRes.data);
    if (strugglesRes.data) setStruggles(strugglesRes.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleEndExam() {
    const token = getToken();
    if (!token || !activeExam) return;
    const res = await exams.end(token, activeExam.id);
    if (!res.error) {
      setActiveExam(null);
      setSessionList([]);
      setStruggles([]);
    } else setError(res.error);
  }

  async function handleSendMessage() {
    const token = getToken();
    if (!token || !messageSessionId || !messageText.trim()) return;
    setSendingMessage(true);
    const res = await sessions.message(token, messageSessionId, messageText.trim());
    setSendingMessage(false);
    if (!res.error) {
      setMessageSessionId(null);
      setMessageText("");
      load();
    } else setError(res.error);
  }

  async function handleTerminate(sessionId: string) {
    const token = getToken();
    if (!token) return;
    const res = await sessions.terminate(token, sessionId);
    if (!res.error) load();
    else setError(res.error);
  }

  if (loading && !activeExam) return <p className="text-muted-foreground">Loading…</p>;

  if (!activeExam) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Monitor Exam</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No active exam. Start an exam to monitor it.</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/start-exam">Start exam</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitor Exam</h1>
          <p className="text-muted-foreground">Room code: {activeExam.room_code}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load()}>
            Refresh
          </Button>
          <Button variant="secondary" onClick={handleEndExam}>
            End exam
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      )}

      {struggles.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Struggle alerts</CardTitle>
            <CardDescription>{struggles.length} student(s) need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {struggles.map((s) => (
                <li key={s.id} className="rounded-md bg-destructive/10 p-3 text-sm">
                  <span className="font-medium uppercase">{s.struggle_type}</span> ({s.severity}): {s.reasoning?.slice(0, 120)}…
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Students ({sessionList.length})</CardTitle>
          <CardDescription>Active sessions for this exam</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionList.length === 0 ? (
            <p className="text-muted-foreground">No students have joined yet.</p>
          ) : (
            <div className="space-y-4">
              {sessionList.map((session) => (
                <Card key={session.session_id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {session.student_name} ({session.student_id}) – {session.status}
                    </CardTitle>
                    <CardDescription>
                      Coverage: {(session.coverage_pct * 100).toFixed(0)}% · Struggles: {session.struggle_count}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={session.coverage_pct * 100} className="h-2" />
                    {session.entries.length > 0 && (
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">Recent activity</p>
                        {session.entries.slice(-4).map((e) => (
                          <p key={e.id} className="text-muted-foreground">
                            {e.entry_type === "question" ? "Q:" : "A:"} {e.content.slice(0, 80)}…
                          </p>
                        ))}
                      </div>
                    )}
                    <Separator />
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/transcripts?exam=${activeExam.id}&session=${session.session_id}`}>
                          View full transcript
                        </Link>
                      </Button>
                      {session.status === "active" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setMessageSessionId((id) => (id === session.session_id ? null : session.session_id))
                            }
                          >
                            {messageSessionId === session.session_id ? "Cancel" : "Message"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleTerminate(session.session_id)}
                          >
                            Terminate
                          </Button>
                        </>
                      )}
                    </div>
                    {messageSessionId === session.session_id && (
                      <div className="space-y-2 rounded-md border p-3">
                        <Label htmlFor="msg">Message to student</Label>
                        <Input
                          id="msg"
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Type a message..."
                        />
                        <Button size="sm" disabled={sendingMessage} onClick={handleSendMessage}>
                          {sendingMessage ? "Sending…" : "Send"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
