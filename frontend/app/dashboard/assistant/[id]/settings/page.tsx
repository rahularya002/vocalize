import { assistantService } from "@/lib/api";

export default async function AssistantSettingsPage({
  params
}: {
  params: { id: string };
}) {
  const assistant = await assistantService.get(params.id);

  return (
    <div className="h-full p-6">
      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold text-white">Assistant Settings</h2>
        <p className="text-zinc-400 mt-2 text-sm">
          In this MVP, model/voice settings are applied at assistant creation time.
        </p>

        <div className="mt-6 space-y-3 text-sm text-zinc-300">
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-500">Use case</span>
            <span className="font-medium">{assistant.use_case}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-500">LLM model</span>
            <span className="font-medium">{assistant.llm_model}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-500">Embedding model</span>
            <span className="font-medium">{assistant.embedding_model}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-500">Voice</span>
            <span className="font-medium">{assistant.voice}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

