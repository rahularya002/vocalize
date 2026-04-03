import ChatPlayground from "@/components/chat-playground";

export default function AssistantPlaygroundPage({
  params
}: {
  params: { id: string };
}) {
  return (
    <div className="h-full">
      <ChatPlayground assistantId={params.id} />
    </div>
  );
}

