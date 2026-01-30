"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth as api } from "@/lib/api";
import { setToken, setUsername } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsernameState] = useState("");
  const [password, setPasswordState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("speak-up-token");
    if (token) router.replace("/dashboard");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Please enter username and password.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await api.login(username.trim(), password);
    setLoading(false);
    if (err || !data) {
      setError(err || "Invalid credentials");
      return;
    }
    setToken(data.access_token);
    setUsername(username.trim());
    router.replace("/dashboard");
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
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-chart-1/10 text-chart-1">
            <Users className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Teacher Sign In
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your credentials to access the teacher dashboard.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsernameState(e.target.value)}
                  placeholder="Username"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPasswordState(e.target.value)}
                  placeholder="Password"
                  className="bg-background"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-foreground underline-offset-4 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
