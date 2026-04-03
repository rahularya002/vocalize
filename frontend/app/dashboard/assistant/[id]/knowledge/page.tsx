import KnowledgeBaseManager from "@/components/knowledge-base-manager";

export default function AssistantKnowledgePage({
  params
}: {
  params: { id: string };
}) {
  return (
    <div className="h-full">
      <KnowledgeBaseManager assistantId={params.id} />
    </div>
  );
}

