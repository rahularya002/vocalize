"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { assistantService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function KnowledgeBaseManager({ assistantId }: { assistantId: string }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [textDraft, setTextDraft] = useState(
    `# Example Knowledge
\nThis is a sample knowledge snippet for your assistant.\n\n- If the user asks about pricing, respond with pricing details from the documents.\n- If you don't have enough information in the knowledge base, say: "I do not have enough information in the knowledge base."\n`
  );
  const [isTextIngesting, setIsTextIngesting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const res = await assistantService.uploadFiles(assistantId, files, (evt) => {
        if (evt.total) {
          const percent = Math.round((evt.loaded * 100) / evt.total);
          setUploadProgress(percent);
        }
      });
      toast.success("Upload received. Indexing in background...");

      // Poll backend job status until done.
      const jobId: string = res.job_id;
      while (true) {
        const status = await assistantService.uploadStatus(assistantId, jobId);
        setUploadProgress(status.progress);

        if (status.status === "done") {
          toast.success(
            `Successfully uploaded and ingested ${
              status.ingested_chunks ?? 0
            } chunks.`
          );
          setFiles([]);
          break;
        }

        if (status.status === "error") {
          toast.error(status.error || "Upload job failed.");
          break;
        }

        // Wait a bit before polling again.
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Upload failed.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const ingestText = async () => {
    const trimmed = textDraft.trim();
    if (!trimmed) return;

    setIsTextIngesting(true);
    setUploadProgress(0);

    try {
      const file = new File([trimmed], "pasted_text.txt", { type: "text/plain" });
      const res = await assistantService.uploadFiles(assistantId, [file], (evt) => {
        if (evt.total) {
          const percent = Math.round((evt.loaded * 100) / evt.total);
          setUploadProgress(percent);
        }
      });

      toast.success("Text received. Indexing in background...");
      const jobId: string = res.job_id;
      while (true) {
        const status = await assistantService.uploadStatus(assistantId, jobId);
        setUploadProgress(status.progress);

        if (status.status === "done") {
          toast.success(
            `Successfully ingested ${status.ingested_chunks ?? 0} chunks.`
          );
          break;
        }

        if (status.status === "error") {
          toast.error(status.error || "Text ingestion job failed.");
          break;
        }

        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Text ingestion failed.");
    } finally {
      setIsTextIngesting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full h-full overflow-y-auto px-6 py-6">
      {/* Quick Ingest Block */}
      <div className="w-full">
        <h3 className="text-base font-medium text-zinc-100 mb-1">Paste Knowledge</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Add a snippet directly—useful for testing. You can also upload files below.
        </p>
        <textarea
          value={textDraft}
          onChange={(e) => setTextDraft(e.target.value)}
          rows={6}
          className="w-full bg-[#0a0a0a] border border-white/[0.08] text-zinc-100 rounded-md p-3 text-sm outline-none focus-visible:border-white/[0.2] transition-colors resize-y"
          placeholder="Paste raw text here..."
        />
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button
            variant="ghost"
            className="text-zinc-400 h-9 px-4 text-sm hover:text-white hover:bg-white/[0.05]"
            onClick={() => setTextDraft("")}
            disabled={isTextIngesting}
          >
            Clear
          </Button>
          <Button
            className="bg-white text-black hover:bg-zinc-200 h-9 px-4 font-medium rounded-md shadow-sm transition-all text-sm"
            onClick={ingestText}
            disabled={isTextIngesting || !textDraft.trim()}
          >
            {isTextIngesting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {isTextIngesting ? "Ingesting..." : "Save Selection"}
          </Button>
        </div>
        {isTextIngesting && (
          <div className="mt-4">
            <Progress value={uploadProgress} className="h-1 bg-white/[0.05]" />
          </div>
        )}
      </div>

      <div className="w-full h-px bg-white/[0.08] my-2" />

      {/* Upload Documents Block */}
      <div className="w-full">
        <h3 className="text-base font-medium text-zinc-100 mb-1">Upload Documents</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Bulk index `.pdf`, `.txt`, `.md`, or `.json` files.
        </p>
        
        <div 
          className={`w-full transition-all duration-200 border border-dashed rounded-lg flex items-center justify-between gap-4 p-4 cursor-pointer ${
            isDragActive 
              ? "border-zinc-500 bg-white/[0.02]" 
              : "border-white/[0.1] bg-[#0a0a0a] hover:bg-white/[0.02]"
          } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md border border-white/[0.08] flex items-center justify-center bg-black/20 shrink-0">
              <UploadCloud className={`w-4 h-4 ${isDragActive ? "text-zinc-200" : "text-zinc-500"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">
                Drop files here, or click to browse
              </p>
              <p className="text-xs text-zinc-500">
                PDF, TXT, MD, JSON • up to 50MB
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-9 px-3 rounded-md border-white/[0.1] text-zinc-300 hover:text-white hover:bg-white/[0.05] text-sm shrink-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Browse
          </Button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            onChange={handleFileSelect} 
            accept=".pdf,.txt,.md,.json"
          />
        </div>

        {files.length > 0 && (
          <div className="w-full mt-6 bg-[#0a0a0a] rounded-xl border border-white/[0.08] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.08] bg-transparent">
              <span className="text-sm font-medium text-zinc-300">Selected Files ({files.length})</span>
            </div>
            <ul className="divide-y divide-white/[0.05] max-h-[250px] overflow-y-auto">
              {files.map((file, idx) => (
                <li key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span className="text-sm font-medium text-zinc-300 truncate">{file.name}</span>
                  </div>
                  <span className="text-xs text-zinc-500 shrink-0 tabular-nums">{(file.size / 1024).toFixed(1)} KB</span>
                </li>
              ))}
            </ul>
            <div className="p-4 border-t border-white/[0.05] flex flex-col gap-4">
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-zinc-400 tabular-nums">
                    <span>Uploading & Indexing...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-1 bg-white/[0.05]" />
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="ghost" className="text-zinc-400 h-9 px-4 text-sm hover:text-white" onClick={() => setFiles([])} disabled={isUploading}>
                  Cancel
                </Button>
                <Button className="bg-white text-black hover:bg-zinc-200 h-9 px-4 font-medium rounded-md shadow-sm transition-all text-sm" onClick={uploadFiles} disabled={isUploading}>
                  {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                  {isUploading ? 'Processing...' : 'Upload & Train'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
