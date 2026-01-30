"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getToken } from "@/lib/auth";
import { exams, rubrics } from "@/lib/api";
import type { ExamResponse, RubricResponse } from "@/lib/types";

export default function StartExamPage() {
  const searchParams = useSearchParams();
  const preselectedRubric = searchParams.get("rubric");
  const [activeExam, setActiveExam] = useState<ExamResponse | null>(null);
  const [rubricList, setRubricList] = useState<RubricResponse[]>([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(preselectedRubric);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startLoading, setStartLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    (async () => {
      setLoading(true);
      const [activeRes, rubricsRes] = await Promise.all([
        exams.active(token),
        rubrics.list(token),
      ]);
      if (activeRes.data) setActiveExam(activeRes.data);
      if (rubricsRes.data) {
        const parsed = rubricsRes.data.filter((r) => r.parsed_criteria);
        setRubricList(parsed);
        if (preselectedRubric && parsed.some((r) => r.id === preselectedRubric)) {
          setSelectedRubricId(preselectedRubric);
        } else if (parsed.length && !selectedRubricId) {
          setSelectedRubricId(parsed[0].id);
        }
      }
      if (rubricsRes.error) setError(rubricsRes.error);
      setLoading(false);
    })();
  }, []);

  async function handleEndExam() {
    const token = getToken();
    if (!token || !activeExam) return;
    const res = await exams.end(token, activeExam.id);
    if (!res.error) setActiveExam(null);
    else setError(res.error ?? "Failed to end exam");
  }

  async function handleStartExam() {
    const token = getToken();
    if (!token || !selectedRubricId) return;
    setStartLoading(true);
    setError(null);
    const res = await exams.create(token, selectedRubricId);
    setStartLoading(false);
    if (res.error) setError(res.error ?? "Failed to start exam");
    else if (res.data) setActiveExam(res.data);
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Start Exam</h1>
        <p className="text-muted-foreground">Select a parsed rubric and start an exam. Share the room code with students.</p>
      </div>

      {error && (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      )}

      {activeExam && (
        <Card>
          <CardHeader>
            <CardTitle>Active exam</CardTitle>
            <CardDescription>Room code: {activeExam.room_code}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button asChild>
              <Link href="/dashboard/monitor">Go to Monitor</Link>
            </Button>
            <Button variant="secondary" onClick={handleEndExam}>
              End current exam
            </Button>
          </CardContent>
        </Card>
      )}

      {!activeExam && (
        <Card>
          <CardHeader>
            <CardTitle>Start new exam</CardTitle>
            <CardDescription>Choose a rubric that has been parsed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rubricList.length === 0 ? (
              <p className="text-muted-foreground">No parsed rubrics. Create and parse a rubric first.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rubric</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedRubricId ?? ""}
                    onChange={(e) => setSelectedRubricId(e.target.value || null)}
                  >
                    {rubricList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleStartExam} disabled={startLoading}>
                  {startLoading ? "Starting…" : "Start exam"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
