import ChatPlayground from "@/components/chat-playground";
import { assistantService } from "@/lib/api";

export default async function AssistantPlaygroundPage({
  params
}: {
  params: { id: string };
}) {
  const assistant = await assistantService.get(params.id);
  return (
    <div className="h-full">
      <ChatPlayground
        assistantId={assistant.assistant_id}
        voiceEnabled={Boolean(assistant.voice_enabled)}
        assistantVoice={assistant.voice}
      />
    </div>
  );
}

