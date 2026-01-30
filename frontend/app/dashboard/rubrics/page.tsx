"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getToken } from "@/lib/auth";
import { rubrics as rubricsApi } from "@/lib/api";
import type { RubricResponse } from "@/lib/types";

export default function RubricsPage() {
  const router = useRouter();
  const [list, setList] = useState<RubricResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [parseLoading, setParseLoading] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    (async () => {
      setLoading(true);
      const res = await rubricsApi.list(token);
      if (res.data) setList(res.data);
      if (res.error) setError(res.error);
      setLoading(false);
    })();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || !createTitle.trim() || !createContent.trim()) return;
    setCreateLoading(true);
    setError(null);
    const res = await rubricsApi.create(token, { title: createTitle.trim(), content: createContent.trim() });
    setCreateLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCreateTitle("");
    setCreateContent("");
    if (res.data) setList((prev) => [res.data!, ...prev]);
  }

  async function handleParse(id: string) {
    const token = getToken();
    if (!token) return;
    setParseLoading(id);
    setError(null);
    const res = await rubricsApi.parse(token, id);
    setParseLoading(null);
    if (res.error) setError(res.error);
    else {
      const listRes = await rubricsApi.list(token);
      if (listRes.data) setList(listRes.data);
    }
  }

  async function handleDelete(id: string) {
    const token = getToken();
    if (!token) return;
    const res = await rubricsApi.delete(token, id);
    if (!res.error) setList((prev) => prev.filter((r) => r.id !== id));
    else setError(res.error ?? "Delete failed");
  }

  function useForExam(id: string) {
    router.push(`/dashboard/start-exam?rubric=${id}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rubrics</h1>
        <p className="text-muted-foreground">Create and manage rubrics (Markdown). Parsed criteria are used for exams.</p>
      </div>

      {error && (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      )}

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Your rubrics</TabsTrigger>
          <TabsTrigger value="create">Create new</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create rubric</CardTitle>
              <CardDescription>Title and Markdown content. Criteria are parsed by the LLM.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Biology Midterm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content (Markdown)</Label>
                  <Textarea
                    id="content"
                    value={createContent}
                    onChange={(e) => setCreateContent(e.target.value)}
                    placeholder="## Understanding (30 pts)\n- Explain..."
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? "Creating…" : "Create rubric"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="list">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground">No rubrics yet. Create one in the Create new tab.</p>
          ) : (
            <div className="space-y-4">
              {list.map((r) => (
                <Card key={r.id}>
                  <CardHeader>
                    <CardTitle>{r.title}</CardTitle>
                    <CardDescription>Created {new Date(r.created_at).toLocaleString()}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">{r.content}</pre>
                    {r.parsed_criteria ? (
                      <>
                        <Separator />
                        <p className="font-medium">Parsed criteria</p>
                        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                          {r.parsed_criteria.criteria.map((c) => (
                            <li key={c.id}>
                              <span className="font-medium text-foreground">{c.name}</span>: {c.description}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">Not parsed yet.</p>
                    )}
                    <div className="flex gap-2">
                      {!r.parsed_criteria && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={parseLoading === r.id}
                          onClick={() => handleParse(r.id)}
                        >
                          {parseLoading === r.id ? "Parsing…" : "Parse now"}
                        </Button>
                      )}
                      {r.parsed_criteria && (
                        <Button size="sm" onClick={() => useForExam(r.id)}>
                          Use for exam
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(r.id)}>
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
