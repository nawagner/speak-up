"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("speak-up-token");
    if (token) {
      router.replace("/dashboard");
    }
  }, [mounted, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Speak-Up</h1>
          <p className="mt-2 text-muted-foreground">Oral exam platform for teachers</p>
        </div>
        <LoginForm
          onSuccess={() => router.replace("/dashboard")}
          onRegisterClick={() => router.push("/register")}
        />
      </div>
    </div>
  );
}
