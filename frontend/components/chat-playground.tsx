"use client";

import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Play, Square, Loader2, Mic, MicOff } from "lucide-react";
import { assistantService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export default function ChatPlayground({
  assistantId,
  voiceEnabled = true,
}: {
  assistantId: string;
  voiceEnabled?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(false);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<any>(null);
  const didAutoSpeakRef = useRef(false);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (messageOverride?: string) => {
    const message = (messageOverride ?? input).trim();
    if (!message || isStreaming) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: message };

    // Snapshot history for the backend prompt (avoid relying on React state timing).
    const historyPayload = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message }
    ];

    setMessages(prev => [...prev, userMsg]);
    if (!messageOverride) setInput("");
    setIsStreaming(true);
    
    const assistantIdStr = Date.now().toString() + "-ai";
    didAutoSpeakRef.current = false;
    setMessages(prev => [...prev, { id: assistantIdStr, role: "assistant", content: "" }]);

    try {
      // Setup fetch for streaming response
      const response = await fetch(assistantService.streamUrl(assistantId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: historyPayload }),
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullResponse = "";
      let sseBuffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          sseBuffer += decoder.decode(value, { stream: true });

          // SSE events are separated by a blank line: "\n\n"
          const events = sseBuffer.split("\n\n");
          sseBuffer = events.pop() || "";

          for (const evt of events) {
            const dataLine = evt
              .split("\n")
              .find((l) => l.startsWith("data: "));
            if (!dataLine) continue;

            const parsed = JSON.parse(dataLine.replace("data: ", ""));
            const token: string = parsed.token || "";
            const isDone: boolean = Boolean(parsed.done);
            const parsedSources: string[] | undefined = parsed.sources;

            if (token) {
              fullResponse += token;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantIdStr
                    ? { ...m, content: fullResponse }
                    : m
                )
              );
            }

            if (isDone) {
              // The server signals completion; continue draining the stream safely.
              // (We still rely on readerDone to fully end.)
              if (parsedSources && Array.isArray(parsedSources) && parsedSources.length) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantIdStr ? { ...m, sources: parsedSources } : m
                  )
                );
              }

              if (voiceEnabled && autoPlayVoice && !didAutoSpeakRef.current) {
                didAutoSpeakRef.current = true;
                // Fire-and-forget to keep streaming smooth.
                void handleTTS(fullResponse);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => 
        prev.map(m => m.id === assistantIdStr ? { ...m, content: "[Error communicating with agent]" } : m)
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleTTS = async (text: string) => {
    if (!text || isPlaying) return;
    
    // Simplistic integration of TTS endpoint, fetching stream 
    // For large audio we can just set src as an Object URL
    try {
      setIsPlaying(true);
      const res = await fetch(assistantService.ttsUrl(assistantId), {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ text }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        audioRef.current.onended = () => setIsPlaying(false);
      }
    } catch (err) {
      console.error(err);
      setIsPlaying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startListening = () => {
    if (!voiceEnabled) return;
    if (isListening || isStreaming) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) {
        void handleSend(transcript);
      }
    };

    speechRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    const recognition = speechRef.current;
    if (recognition && typeof recognition.stop === "function") {
      recognition.stop();
    }
    setIsListening(false);
  };

  return (
    <div className="flex h-full min-h-[520px] w-full flex-col bg-transparent">
      <audio ref={audioRef} className="hidden" />
      
      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center opacity-80 min-h-[240px]">
            <div className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center mb-4">
              <Bot className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              Ask a question about the knowledge base.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full space-y-4">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={isUser ? "flex justify-end" : "flex justify-start"}
                >
                  <div className={isUser ? "max-w-[85%]" : "max-w-[85%] w-full"}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-muted-foreground">
                        {isUser ? "You" : "Agent"}
                      </span>
                      {!isUser && voiceEnabled && m.content && !isStreaming && (
                        <button
                          onClick={() => handleTTS(m.content)}
                          disabled={isPlaying}
                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Play voice"
                        >
                          {isPlaying ? (
                            <Square className="w-3 h-3 fill-current" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                        </button>
                      )}
                    </div>

                    <div
                      className={[
                        "rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed border",
                        isUser
                          ? "bg-primary text-primary-foreground border-transparent"
                          : "bg-card text-foreground border-border",
                      ].join(" ")}
                    >
                      {m.content ||
                        (isStreaming && !isUser && (
                          <span className="inline-flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Thinking…
                          </span>
                        ))}
                    </div>

                    {!isUser && m.sources && m.sources.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Sources: {m.sources.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="px-4 md:px-8 py-5 bg-background/40 border-t border-border">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-2">
          {voiceEnabled && (
            <label className="flex items-center gap-2 text-[11px] text-zinc-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoPlayVoice}
                onChange={(e) => setAutoPlayVoice(e.target.checked)}
              />
              Auto-play voice response
            </label>
          )}
          <div className="w-full relative bg-card border border-border rounded-xl p-2 focus-within:ring-2 focus-within:ring-ring/30 transition-colors text-foreground">
            <Textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the uploaded documents..."
              className="resize-none border-0 shadow-none focus-visible:ring-0 min-h-[44px] bg-transparent text-sm"
              rows={1}
            />
            <div className="flex items-center justify-end px-2 pb-1 pt-1">
              {voiceEnabled && (
                <Button
                  type="button"
                  onClick={() => (isListening ? stopListening() : startListening())}
                  disabled={isStreaming}
                  size="icon"
                  className="w-9 h-9 rounded-lg bg-muted hover:bg-muted/70 text-foreground mr-2"
                >
                  {isListening ? (
                    <MicOff className="w-3.5 h-3.5" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
              <Button 
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming}
                size="icon" 
                className="w-9 h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground w-full mt-1">
            Tips: upload docs in Knowledge, then ask exact questions for best results.
          </p>
        </div>
      </div>
    </div>
  );
}
