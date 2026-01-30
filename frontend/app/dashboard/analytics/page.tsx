"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getToken } from "@/lib/auth";
import { exams, analyticsOverview } from "@/lib/api";
import type { ExamResponse, ExamAnalytics, AnalyticsOverview } from "@/lib/types";

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [examList, setExamList] = useState<ExamResponse[]>([]);
  const [analyticsByExam, setAnalyticsByExam] = useState<Record<string, ExamAnalytics>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    (async () => {
      setLoading(true);
      const [overviewRes, examsRes] = await Promise.all([
        analyticsOverview(token),
        exams.list(token),
      ]);
      if (overviewRes.data) setOverview(overviewRes.data);
      if (overviewRes.error) setError(overviewRes.error);
      if (examsRes.data) {
        setExamList(examsRes.data);
        const completed = examsRes.data.filter((e) => e.status === "completed");
        const analytics: Record<string, ExamAnalytics> = {};
        for (const exam of completed) {
          const res = await exams.analytics(token, exam.id);
          if (res.data) analytics[exam.id] = res.data;
        }
        setAnalyticsByExam(analytics);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Overview and per-exam metrics</p>
      </div>

      {error && (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      )}

      {overview && (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>All exams and sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-muted-foreground text-sm">Total exams</p>
                <p className="text-2xl font-bold">{overview.total_exams}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Completed exams</p>
                <p className="text-2xl font-bold">{overview.completed_exams}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Active exams</p>
                <p className="text-2xl font-bold">{overview.active_exams}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total students</p>
                <p className="text-2xl font-bold">{overview.total_student_sessions}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Completed students</p>
                <p className="text-2xl font-bold">{overview.completed_student_sessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Per-exam details</CardTitle>
          <CardDescription>Completed exams only</CardDescription>
        </CardHeader>
        <CardContent>
          {examList.filter((e) => e.status === "completed").length === 0 ? (
            <p className="text-muted-foreground">No completed exams yet.</p>
          ) : (
            <div className="space-y-4">
              {examList
                .filter((e) => e.status === "completed")
                .map((exam) => {
                  const a = analyticsByExam[exam.id];
                  return (
                    <Card key={exam.id}>
                      <CardHeader>
                        <CardTitle className="text-base">Room {exam.room_code}</CardTitle>
                        <CardDescription>
                          {exam.started_at && new Date(exam.started_at).toLocaleString()} –{" "}
                          {exam.ended_at && new Date(exam.ended_at).toLocaleString()}
                        </CardDescription>
                      </CardHeader>
                      {a && (
                        <CardContent>
                          <div className="grid gap-4 md:grid-cols-4">
                            <div>
                              <p className="text-muted-foreground text-sm">Students</p>
                              <p className="font-bold">{a.total_students}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-sm">Completed</p>
                              <p className="font-bold">{a.completed_students}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-sm">Avg coverage</p>
                              <p className="font-bold">{(a.average_coverage_pct * 100).toFixed(0)}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-sm">Avg duration</p>
                              <p className="font-bold">
                                {a.average_duration_minutes != null
                                  ? `${a.average_duration_minutes.toFixed(1)} min`
                                  : "—"}
                              </p>
                            </div>
                          </div>
                          {a.struggle_frequency && Object.keys(a.struggle_frequency).length > 0 && (
                            <div className="mt-4">
                              <p className="text-muted-foreground text-sm">Struggle types</p>
                              <ul className="mt-1 list-inside list-disc text-sm">
                                {Object.entries(a.struggle_frequency).map(([type, count]) => (
                                  <li key={type}>
                                    {type}: {count}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
