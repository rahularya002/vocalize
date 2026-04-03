"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { assistantService, type AssistantConfig } from "@/lib/api";

export default function AssistantHeader({ assistantId }: { assistantId: string }) {
  const [assistant, setAssistant] = useState<AssistantConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await assistantService.get(assistantId);
        if (mounted) setAssistant(data);
      } catch {
        if (mounted) setAssistant(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [assistantId]);

  return (
    <div>
      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading assistant...
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              {assistant?.name ?? "Assistant"}
            </h1>
            <span className="px-2.5 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-semibold uppercase tracking-wider">
              Ready
            </span>
          </div>

          <div className="flex flex-wrap gap-4 mt-3 text-sm text-zinc-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="text-zinc-500">Agent ID:</span>{" "}
              {assistant?.assistant_id ?? assistantId}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-zinc-500">LLM:</span>{" "}
              {assistant?.llm_model ?? "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-zinc-500">Voice:</span>{" "}
              {assistant?.voice ?? "—"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

