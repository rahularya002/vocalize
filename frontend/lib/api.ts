import axios from "axios";

// Standard local backend port for FastAPI
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_URL,
});

export interface AssistantConfig {
  assistant_id: string;
  name: string;
  use_case: string;
  llm_model: string;
  embedding_model: string;
  voice: string;
  voice_enabled?: boolean;
}

export interface CreateAssistantRequest {
  name: string;
  use_case: string;
  provider?: "local" | "runpod";
  llm_model: string;
  embedding_model: string;
  voice: string;
  voice_enabled?: boolean;
}

export interface ModelOption {
  name: string;
  available: boolean;
}

export interface ModelsResponse {
  llm_models: ModelOption[];
  embedding_models: ModelOption[];
}

export interface UploadJobCreateResponse {
  assistant_id: string;
  job_id: string;
}

export interface UploadJobStatusResponse {
  job_id: string;
  assistant_id: string;
  status: "processing" | "done" | "error";
  progress: number;
  ingested_chunks: number | null;
  error: string | null;
}

export const assistantService = {
  // Create an assistant
  create: async (data: CreateAssistantRequest): Promise<AssistantConfig> => {
    const res = await api.post("/assistant/create", data);
    return res.data;
  },

  // List all assistants
  list: async (): Promise<AssistantConfig[]> => {
    const res = await api.get("/assistant");
    return res.data;
  },

  // Get a single assistant
  get: async (assistantId: string): Promise<AssistantConfig> => {
    const res = await api.get(`/assistant/${assistantId}`);
    return res.data;
  },

  delete: async (assistantId: string): Promise<{ assistant_id: string; deleted: boolean }> => {
    const res = await api.delete(`/assistant/${assistantId}`);
    return res.data;
  },

  // Upload files to an assistant's knowledge base
  uploadFiles: async (
    assistantId: string, 
    files: File[],
    onProgress?: (progressEvent: any) => void
  ) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await api.post(`/assistant/${assistantId}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
    });
    return res.data; // { assistant_id, job_id }
  },

  uploadStatus: async (
    assistantId: string,
    jobId: string
  ): Promise<UploadJobStatusResponse> => {
    const res = await api.get(
      `/assistant/${assistantId}/upload/status/${jobId}`
    );
    return res.data;
  },

  // Streaming endpoint helper (returns URL)
  streamUrl: (assistantId: string) => `${API_URL}/assistant/${assistantId}/stream`,
  
  // TTS endpoint path
  ttsUrl: (assistantId: string) => `${API_URL}/assistant/${assistantId}/tts`,
};

export const modelsService = {
  list: async (): Promise<ModelsResponse> => {
    const res = await api.get("/models");
    return res.data;
  }
};

export default api;
