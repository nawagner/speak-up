"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleSelection } from "@/components/role-selection";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const token = localStorage.getItem("speak-up-token");
    if (token) {
      router.replace("/dashboard");
      return;
    }
  }, [mounted, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return <RoleSelection />;
}
