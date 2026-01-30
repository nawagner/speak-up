"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth as api } from "@/lib/api";
import { setToken, setUsername } from "@/lib/auth";

interface LoginFormProps {
  onSuccess: () => void;
  onRegisterClick?: () => void;
}

export function LoginForm({ onSuccess, onRegisterClick }: LoginFormProps) {
  const [username, setUsernameState] = useState("");
  const [password, setPasswordState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    onSuccess();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Use your teacher account</CardDescription>
      </CardHeader>
      <CardContent>
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
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          {onRegisterClick && (
            <Button type="button" variant="ghost" className="w-full" onClick={onRegisterClick}>
              Create an account
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
