"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { assistantService, modelsService, type ModelsResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALLOWED_LLM_MODELS = ["qwen2.5:7b", "llama3.1:8b", "qwen2.5:14b"];
const ALLOWED_EMBEDDING_MODELS = ["nomic-embed-text", "bge-m3"];

export default function CreateAssistantPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [models, setModels] = useState<ModelsResponse | null>(null);

  const RUNPOD_VOICE_PRESETS = [
    { label: "English • Female", value: "en-US-AriaNeural" },
    { label: "English • Male", value: "en-US-GuyNeural" },
    { label: "Hindi • Female", value: "hi-IN-KajalNeural" },
    { label: "Hindi • Male", value: "hi-IN-AryanNeural" },
  ] as const;

  const [formData, setFormData] = useState({
    name: "",
    use_case: "support",
    provider: "local" as "local" | "runpod",
    llm_model: "",
    embedding_model: "",
    voice: "en-US-AriaNeural",
    voice_enabled: false,
  });

  useEffect(() => {
    async function loadModels() {
      try {
        const res = await modelsService.list();
        setModels(res);

        const preferredLlm = res.llm_models.find((m) => m.available)?.name ?? "";
        const preferredEmbedding =
          res.embedding_models.find((m) => m.available)?.name ?? "";

        setFormData((prev) => ({
          ...prev,
          llm_model: preferredLlm,
          embedding_model: preferredEmbedding,
        }));

        if (!preferredLlm || !preferredEmbedding) {
          toast.error(
            "Ollama doesn't have the required allowed models pulled. Pull an allowed LLM + embedding model first."
          );
        }
      } catch (err) {
        console.error("Failed to load models", err);
        toast.error("Failed to fetch models from Ollama. Is Ollama running?");

        // Fallback: still render the dropdowns with disabled options.
        // This prevents the UI from being stuck on "Loading models..."
        const fallback: ModelsResponse = {
          llm_models: ALLOWED_LLM_MODELS.map((name) => ({ name, available: false })),
          embedding_models: ALLOWED_EMBEDDING_MODELS.map((name) => ({ name, available: false }))
        };
        setModels(fallback);
        setFormData((prev) => ({ ...prev, llm_model: "", embedding_model: "" }));
      }
    }

    loadModels();
  }, []);

  useEffect(() => {
    if (formData.provider === "runpod") {
      setFormData((prev) => ({
        ...prev,
        llm_model: prev.llm_model || "remote",
        embedding_model: prev.embedding_model || "remote",
        voice_enabled: prev.voice_enabled ?? true,
        voice: RUNPOD_VOICE_PRESETS.some((v) => v.value === prev.voice)
          ? prev.voice
          : "en-US-AriaNeural",
      }));
      return;
    }

    // Switching back to local: if we were using placeholders, pick available models.
    if (formData.provider === "local" && models) {
      const preferredLlm = models.llm_models.find((m) => m.available)?.name ?? "";
      const preferredEmbedding =
        models.embedding_models.find((m) => m.available)?.name ?? "";

      setFormData((prev) => ({
        ...prev,
        llm_model: prev.llm_model === "remote" ? preferredLlm : prev.llm_model,
        embedding_model:
          prev.embedding_model === "remote" ? preferredEmbedding : prev.embedding_model,
      }));
    }
  }, [formData.provider, models]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter an assistant name");
      return;
    }

    try {
      setIsSubmitting(true);
      const newAssistant = await assistantService.create(formData);
      toast.success("Agent deployed successfully.");
      router.push(`/dashboard/assistant/${newAssistant.assistant_id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Deployment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div>
        <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Agents
        </Link>
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">Deploy Agent</h1>
        <p className="text-base text-muted-foreground mt-1.5">Configure cognitive models and persona settings.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />
        
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-8 space-y-8">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-medium text-card-foreground">Agent Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Sales Copilot" 
                className="bg-background border-border text-foreground placeholder:text-muted-foreground h-11 px-4 focus-visible:ring-ring focus-visible:border-ring shadow-none"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-card-foreground">Model Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      provider: (val as "local" | "runpod") || "local",
                    }))
                  }
                >
                  <SelectTrigger className="bg-background border-border text-card-foreground h-11 px-4 shadow-none rounded-lg w-full">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-card-foreground">
                    <SelectItem value="local">Local (Ollama)</SelectItem>
                    <SelectItem value="runpod">Cloud Demo (Runpod)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Cloud Demo proxies chat + TTS to your Runpod backend.
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="llm_model" className="text-sm font-medium text-card-foreground">LLM Engine</Label>
                <Select
                  disabled={!models || formData.provider !== "local"}
                  value={formData.llm_model}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, llm_model: val || "" }))}
                >
                  <SelectTrigger className="bg-background border-border text-card-foreground h-11 px-4 shadow-none rounded-lg w-full">
                    <SelectValue placeholder={!models ? "Loading models..." : "Select LLM"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-card-foreground">
                    {models?.llm_models.map((m) => (
                      <SelectItem key={m.name} value={m.name} disabled={!m.available}>
                        {m.name} {m.available ? "" : "(not pulled)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground font-medium">
                  Uses Ollama local models (disabled if not pulled).
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="embedding_model" className="text-sm font-medium text-card-foreground">Vector Embeddings</Label>
                <Select
                  disabled={!models || formData.provider !== "local"}
                  value={formData.embedding_model}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, embedding_model: val || "" }))}
                >
                  <SelectTrigger className="bg-background border-border text-card-foreground h-11 px-4 shadow-none rounded-lg w-full">
                    <SelectValue placeholder={!models ? "Loading models..." : "Select Embedding"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-card-foreground">
                    {models?.embedding_models.map((m) => (
                      <SelectItem key={m.name} value={m.name} disabled={!m.available}>
                        {m.name} {m.available ? "" : "(not pulled)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground font-medium">
                  Only allowed embeddings are shown (Ollama local models).
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="use_case" className="text-sm font-medium text-card-foreground">Use Case</Label>
              <Select
                value={formData.use_case}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, use_case: val || "" }))}
              >
                <SelectTrigger className="bg-background border-border text-card-foreground h-11 px-4 shadow-none rounded-lg w-full">
                  <SelectValue placeholder="Select Use Case" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-card-foreground">
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="internal">Internal Ops</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-card-foreground">Assistant Type</Label>
              <div className="flex items-center gap-6 text-sm">
                <label className="flex items-center gap-2 cursor-pointer select-none text-card-foreground">
                  <input
                    type="radio"
                    name="assistant_type"
                    checked={!formData.voice_enabled}
                    onChange={() => setFormData((prev) => ({ ...prev, voice_enabled: false }))}
                  />
                  Text-based
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none text-card-foreground">
                  <input
                    type="radio"
                    name="assistant_type"
                    checked={Boolean(formData.voice_enabled)}
                    onChange={() => setFormData((prev) => ({ ...prev, voice_enabled: true }))}
                  />
                  Voice-based
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Voice-based assistants can speak responses and accept microphone input in the playground.
              </p>
            </div>
            
            {formData.voice_enabled && (
              <div className="space-y-3">
                {formData.provider === "runpod" ? (
                  <>
                    <Label htmlFor="runpod_voice" className="text-sm font-medium text-card-foreground">
                      Runpod Voice (Language + Gender)
                    </Label>
                    <Select
                      value={formData.voice}
                      onValueChange={(val) => setFormData((prev) => ({ ...prev, voice: val }))}
                    >
                      <SelectTrigger className="bg-background border-border text-card-foreground h-11 px-4 shadow-none rounded-lg w-full">
                        <SelectValue placeholder="Select voice" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-card-foreground">
                        {RUNPOD_VOICE_PRESETS.map((v) => (
                          <SelectItem key={v.value} value={v.value}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground font-medium">
                      This voice id is passed to your Runpod backend (supports Hindi + male/female).
                    </p>
                  </>
                ) : (
                  <>
                    <Label htmlFor="voice" className="text-sm font-medium text-card-foreground">
                      Voice Persona
                    </Label>
                    <Input
                      id="voice"
                      className="bg-background border-border text-card-foreground h-11 px-4 shadow-none w-full"
                      value={formData.voice}
                      onChange={(e) => setFormData((prev) => ({ ...prev, voice: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground font-medium">
                      Edge TTS voice (e.g. en-US-AriaNeural).
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="px-8 py-5 border-t border-border bg-muted/40 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Model capabilities are limited by API restrictions.</span>
            <div className="flex items-center gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => router.push("/dashboard")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 font-medium shadow-sm transition-all"
                disabled={
                  isSubmitting ||
                  (formData.provider === "local" &&
                    (!formData.llm_model || !formData.embedding_model))
                }
              >
                {isSubmitting ? (
                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Initialize Agent
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
