"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { student as studentApi } from "@/lib/api";

export default function StudentExamPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");
  const initialQuestion = searchParams.get("q");
  const [question, setQuestion] = useState(initialQuestion ?? "");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [isFinal, setIsFinal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coveragePct, setCoveragePct] = useState(0);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      router.replace("/student");
      return;
    }
    studentApi.getStatus(sessionId).then((res) => {
      if (res.data) {
        setCoveragePct(res.data.rubric_coverage_pct * 100);
        setQuestionNumber(res.data.question_number);
      }
    });
    if (initialQuestion) {
      setQuestion(initialQuestion);
      studentApi.getStatus(sessionId).then((res) => {
        if (res.data) {
          setCoveragePct(res.data.rubric_coverage_pct * 100);
          setQuestionNumber(res.data.question_number);
        }
      });
      setInitialized(true);
      return;
    }
    studentApi.getQuestion(sessionId).then((res) => {
      if (res.data) {
        setQuestion(res.data.question_text);
        setQuestionNumber(res.data.question_number);
        setIsFinal(res.data.is_final);
        setMessage(res.data.message ?? null);
      } else if (res.error) setError(res.error);
      setInitialized(true);
    });
  }, [sessionId, router, initialQuestion]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !transcript.trim()) return;
    setLoading(true);
    setError(null);
    const res = await studentApi.submitResponse(sessionId, transcript.trim());
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.data) {
      setQuestion(res.data.question_text);
      setQuestionNumber(res.data.question_number);
      setIsFinal(res.data.is_final);
      setMessage(res.data.message ?? null);
      setTranscript("");
      studentApi.getStatus(sessionId).then((s) => {
        if (s.data) setCoveragePct(s.data.rubric_coverage_pct * 100);
      });
    }
  }

  async function handleLeave() {
    if (!sessionId) return;
    await studentApi.leave(sessionId);
    router.replace("/student");
  }

  if (!sessionId) return null;
  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading exam…</p>
      </div>
    );
  }

  if (isFinal && !question) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Exam complete</CardTitle>
            <CardDescription>
              You have completed this exam. Thank you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Return home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Oral Exam</h1>
            <p className="text-sm text-muted-foreground">
              Question {questionNumber} · Coverage {coveragePct.toFixed(0)}%
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLeave} className="text-muted-foreground">
            Leave exam
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <Progress value={coveragePct} className="mb-6 h-2" />

        {message && (
          <Card className="mb-6 border-chart-2/30 bg-chart-2/5">
            <CardContent className="py-4">
              <p className="text-sm text-foreground">{message}</p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Question</CardTitle>
            <CardDescription>Answer in your own words. You can type or paste your response.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-wrap">{question || "No question yet."}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your response</CardTitle>
            <CardDescription>Type or paste your spoken response (e.g. from a speech-to-text tool).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Enter your response..."
                rows={6}
                className="resize-none bg-background"
              />
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={loading || isFinal}>
                {loading ? "Submitting…" : isFinal ? "Done" : "Submit and next question"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
