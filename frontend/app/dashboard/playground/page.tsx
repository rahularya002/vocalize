"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { assistantService, type AssistantConfig } from "@/lib/api";
import ChatPlayground from "@/components/chat-playground";
import { Button } from "@/components/ui/button";

export default function DashboardPlaygroundPage() {
  const [assistants, setAssistants] = useState<AssistantConfig[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await assistantService.list();
        if (!mounted) return;
        setAssistants(data);
        const first = data[0]?.assistant_id ?? "";
        setSelectedAssistantId(first);
      } catch {
        if (!mounted) return;
        setAssistants([]);
        setSelectedAssistantId("");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedAssistant = useMemo(
    () => assistants.find((a) => a.assistant_id === selectedAssistantId) ?? null,
    [assistants, selectedAssistantId]
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-400">
        Loading assistants...
      </div>
    );
  }

  if (!selectedAssistant) {
    return (
      <div className="h-full flex flex-col items-start justify-start gap-4">
        <h2 className="text-xl font-semibold text-foreground">Test Playground</h2>
        <p className="text-muted-foreground">
          Create an assistant first, then come back to test its RAG chat.
        </p>
        <Link href="/dashboard/create">
          <Button className="rounded-lg">Create Assistant</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-medium text-foreground tracking-tight">Test Playground</h1>
          <p className="text-sm text-muted-foreground mt-1">Chat with your vectorized data safely.</p>
        </div>
        <div className="flex items-center gap-3 w-[260px]">
          <select
            value={selectedAssistantId}
            onChange={(e) => setSelectedAssistantId(e.target.value)}
            className="w-full bg-card border border-border text-card-foreground h-9 rounded-md shadow-sm text-sm px-2"
          >
            {assistants.map((a) => (
              <option key={a.assistant_id} value={a.assistant_id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatPlayground
          assistantId={selectedAssistant.assistant_id}
          voiceEnabled={Boolean(selectedAssistant.voice_enabled)}
        />
      </div>
    </div>
  );
}

