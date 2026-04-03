import { redirect } from "next/navigation";

export default function AssistantRootPage({
  params
}: {
  params: { id: string };
}) {
  redirect(`/dashboard/assistant/${params.id}/knowledge`);
}
