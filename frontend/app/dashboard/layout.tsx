"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getUsername, clearToken, isAuthenticated } from "@/lib/auth";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/rubrics", label: "Rubrics" },
  { href: "/dashboard/start-exam", label: "Start Exam" },
  { href: "/dashboard/monitor", label: "Monitor Exam" },
  { href: "/dashboard/transcripts", label: "Transcripts" },
  { href: "/dashboard/analytics", label: "Analytics" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [username, setUsernameState] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/");
      return;
    }
    setUsernameState(getUsername());
  }, [mounted, router]);

  function handleLogout() {
    clearToken();
    router.replace("/");
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r bg-card p-4">
        <div className="mb-4">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight">
            Speak-Up
          </Link>
        </div>
        <p className="text-muted-foreground text-sm">Welcome, {username ?? "Teacher"}</p>
        <Separator className="my-4" />
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={cn("w-full justify-start", pathname === item.href && "bg-muted")}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
        <Separator className="my-4" />
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          Logout
        </Button>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
