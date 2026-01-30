"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getToken } from "@/lib/auth";
import { exams, analyticsOverview } from "@/lib/api";
import type { ExamResponse, AnalyticsOverview } from "@/lib/types";

export default function DashboardPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [activeExam, setActiveExam] = useState<ExamResponse | null>(null);
  const [examList, setExamList] = useState<ExamResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    (async () => {
      setLoading(true);
      setError(null);
      const [overviewRes, activeRes, examsRes] = await Promise.all([
        analyticsOverview(token),
        exams.active(token),
        exams.list(token),
      ]);
      if (overviewRes.data) setOverview(overviewRes.data);
      if (activeRes.data) setActiveExam(activeRes.data);
      if (examsRes.data) setExamList(examsRes.data);
      if (overviewRes.error) setError(overviewRes.error);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your oral exams</p>
      </div>

      {error && (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Metrics */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total exams</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{overview.total_exams}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{overview.completed_exams}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{overview.active_exams}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total students</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{overview.total_student_sessions}</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active exam */}
      {activeExam && (
        <Card>
          <CardHeader>
            <CardTitle>Active exam</CardTitle>
            <CardDescription>Room code: {activeExam.room_code}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/monitor">Go to Monitor</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!activeExam && overview && overview.total_exams > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No active exam. Start one from Start Exam.</p>
          </CardContent>
        </Card>
      )}

      {/* Recent exams */}
      <Card>
        <CardHeader>
          <CardTitle>Recent exams</CardTitle>
          <CardDescription>Latest exams</CardDescription>
        </CardHeader>
        <CardContent>
          {examList.length === 0 ? (
            <p className="text-muted-foreground">No exams yet. Create a rubric and start your first exam.</p>
          ) : (
            <ul className="space-y-2">
              {examList.slice(0, 5).map((exam) => (
                <li key={exam.id} className="flex items-center justify-between rounded-md border p-3">
                  <span>
                    Room {exam.room_code} – {exam.status}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {exam.started_at ? new Date(exam.started_at).toLocaleString() : "N/A"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
