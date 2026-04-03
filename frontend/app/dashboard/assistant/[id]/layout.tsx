import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import AssistantHeader from "@/components/assistant/assistant-header";

export default async function AssistantLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex items-start justify-between shrink-0">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assistants
          </Link>

          <AssistantHeader assistantId={resolvedParams.id} />
        </div>
      </div>

      <div className="flex-1 mt-6 bg-card border border-border rounded-2xl overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}

