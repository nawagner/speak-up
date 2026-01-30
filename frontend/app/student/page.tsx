"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { student as studentApi } from "@/lib/api";

export default function StudentJoinPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = roomCode.trim().toUpperCase();
    const name = studentName.trim();
    const id = studentId.trim();
    if (!code || !name || !id) {
      setError("Please enter room code, your name, and student ID.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await studentApi.join({
      room_code: code,
      student_name: name,
      student_id: id,
    });
    setLoading(false);
    if (err || !data) {
      setError(err || "Could not join exam. Check the room code and try again.");
      return;
    }
    const params = new URLSearchParams({ session: data.session_id });
    if (data.first_question) params.set("q", data.first_question);
    router.push(`/student/exam?${params.toString()}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to role selection
        </Link>

        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-chart-2/10 text-chart-2">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Student Sign In
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your exam code to begin your assessment.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="examCode">Exam / Room Code</Label>
                <Input
                  id="examCode"
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  className="bg-background font-mono tracking-widest"
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Your full name"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. STU-2024-001"
                  className="bg-background"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Joining…" : "Start Exam"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Need help? Contact your instructor for the room code.
        </p>
      </div>
    </div>
  );
}
