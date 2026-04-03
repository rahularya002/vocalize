export default function DashboardSettingsPage() {
  return (
    <div className="h-full p-6">
      <h2 className="text-2xl font-semibold text-white">Settings</h2>
      <p className="text-zinc-400 mt-2">
        Assistant settings (models, embeddings, voice) are configured when you
        deploy an assistant.
      </p>
      <p className="text-zinc-500 mt-4 text-sm">
        For now, use an assistant’s sidebar “Settings” to view the active
        configuration.
      </p>
    </div>
  );
}

