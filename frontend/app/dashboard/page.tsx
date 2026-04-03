"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { assistantService, AssistantConfig } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, Bot, ChevronRight, Activity, Cpu, Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function DashboardPage() {
  const [assistants, setAssistants] = useState<AssistantConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTargetId, setDeleteTargetId] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await assistantService.list();
        setAssistants(data);
        setDeleteTargetId(data[0]?.assistant_id ?? "");
      } catch (err) {
        console.error("Failed to load assistants", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  async function handleDeleteAssistant() {
    if (!deleteTargetId || isDeleting) return;
    try {
      setIsDeleting(true);
      await assistantService.delete(deleteTargetId);
      const updated = assistants.filter((a) => a.assistant_id !== deleteTargetId);
      setAssistants(updated);
      setDeleteTargetId(updated[0]?.assistant_id ?? "");
      toast.success("Assistant deleted.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to delete assistant.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <h1 className="text-2xl font-medium text-zinc-100 tracking-tight">Agents</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage and train your retrieval-augmented autonomous agents.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={deleteTargetId}
            onChange={(e) => setDeleteTargetId(e.target.value)}
            className="h-9 min-w-[220px] rounded-md border border-border bg-card text-card-foreground px-2 text-sm"
            disabled={assistants.length === 0}
          >
            {assistants.length === 0 ? (
              <option value="">No assistants</option>
            ) : (
              assistants.map((assistant) => (
                <option key={assistant.assistant_id} value={assistant.assistant_id}>
                  {assistant.name}
                </option>
              ))
            )}
          </select>
          <Button
            variant="outline"
            className="h-9 px-3 rounded-md border-border text-foreground hover:text-accent-foreground hover:bg-accent text-sm"
            onClick={handleDeleteAssistant}
            disabled={!deleteTargetId || isDeleting || assistants.length === 0}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
          <Link href="/dashboard/create">
            <Button className="h-9 px-4 font-medium rounded-md shadow-sm transition-all text-sm">
              Deploy Agent
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : assistants.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-24 text-center flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mb-4 bg-muted">
            <Bot className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium text-foreground">No agents deployed</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            You haven't configured any voice assistants yet.
          </p>
          <Link href="/dashboard/create" className="mt-6">
            <Button variant="outline" className="h-9 px-4 rounded-md border-border text-foreground hover:text-accent-foreground hover:bg-accent text-sm">
              Deploy Agent
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assistants.map((assistant) => (
            <Link
              key={assistant.assistant_id}
              href={`/dashboard/assistant/${assistant.assistant_id}/knowledge`}
            >
              <div className="group h-full flex flex-col rounded-xl border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200">
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-background border border-border">
                        <Bot className="w-4 h-4 text-foreground" />
                      </div>
                      <h3 className="text-base font-medium text-foreground">{assistant.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground text-[11px] font-medium tracking-wide">
                      <Activity className="w-3 h-3 text-emerald-500" />
                      Ready
                    </div>
                  </div>
                  
                  <div className="space-y-2.5 mt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">ID</span>
                      <span className="font-mono text-card-foreground tracking-tight">{assistant.assistant_id.split("-")[0]}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Engine</span>
                      <span className="text-card-foreground">{assistant.llm_model}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
