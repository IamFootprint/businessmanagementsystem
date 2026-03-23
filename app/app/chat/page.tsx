"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  text: string;
  atIso: string;
};

type ChatThread = {
  id: string;
  messages: ChatMessage[];
};

export default function AppChatPage() {
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadThread() {
    try {
      const res = await fetch("/api/app/chat");
      const raw = await res.json();
      const data = raw.data ?? raw;
      setThread(data.thread || null);
    } catch {
      setError("Unable to load chat.");
    }
  }

  useEffect(() => {
    loadThread();
  }, []);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/app/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, threadId: thread?.id })
      });
      if (!res.ok) {
        setError("Unable to send message.");
        return;
      }
      const raw = await res.json();
      const data = raw.data ?? raw;
      setThread(data.thread || null);
      setMessage("");
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h1 className="font-display font-bold text-foreground text-lg mb-1">Service Assistant</h1>
      <p className="text-sm text-muted-foreground mb-4">Ask about service options, then proceed to booking when ready.</p>
      {error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}

      <div className="flex flex-col gap-3 mb-4">
        {(thread?.messages || []).map((item) => (
          <div
            key={item.id}
            className={`rounded-lg p-3 text-sm ${
              item.role === "USER"
                ? "bg-primary/10 ml-8"
                : "bg-muted mr-8"
            }`}
          >
            <strong className="text-xs text-muted-foreground">{item.role === "USER" ? "You" : "CycleDesk"}</strong>
            <div className="mt-0.5">{item.text}</div>
          </div>
        ))}
        {!thread?.messages?.length ? <p className="text-sm text-muted-foreground">No messages yet. Ask your first question.</p> : null}
      </div>

      <form onSubmit={send} className="flex flex-col gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Message</label>
          <textarea
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="I ride MTB and need a major service. What do you suggest?"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button disabled={loading || !message.trim()}>
            {loading ? "Sending..." : "Send"}
          </Button>
          <a href="/app/book">
            <Button variant="outline">Go to booking</Button>
          </a>
        </div>
      </form>
    </div>
  );
}
