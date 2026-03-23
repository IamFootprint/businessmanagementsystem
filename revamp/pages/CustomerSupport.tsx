import { useEffect, useMemo, useState } from "react";
import { CustomerShell } from "@/revamp/components/CustomerShell";
import { Button } from "@/revamp/components/ui/button";
import { Textarea } from "@/revamp/components/ui/textarea";
import { MessageSquare, Phone, Mail } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { formatDateTimeCompactZA } from "@/revamp/lib/formatters";

type ThreadMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  text: string;
  atIso: string;
};

type Thread = {
  id: string;
  messages: ThreadMessage[];
};

export default function CustomerSupport() {
  const [thread, setThread] = useState<Thread | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadThread() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ thread: Thread }>("/api/app/chat");
      setThread(data.thread || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load support chat.");
      setThread(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadThread();
  }, []);

  async function sendMessage() {
    if (!message.trim() || !thread) return;
    setSending(true);
    setError(null);
    try {
      const data = await apiFetch<{ thread: Thread }>("/api/app/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: thread.id, message: message.trim() }),
      });
      setThread(data.thread || null);
      setMessage("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send support message.");
    } finally {
      setSending(false);
    }
  }

  const orderedMessages = useMemo(() => {
    return (thread?.messages || []).slice().sort((a, b) => a.atIso.localeCompare(b.atIso));
  }, [thread]);

  return (
    <CustomerShell title="Support">
      <div className="stack-lg">
        <div className="grid grid-cols-2 gap-3">
          <a href="tel:+27110000001" className="panel-padded flex flex-col items-center gap-2 hover:bg-muted/30 transition-colors">
            <Phone className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Call Us</span>
            <span className="text-[11px] text-muted-foreground">Mon-Sat 8-5</span>
          </a>
          <a href="mailto:help@cycledesk.co.za" className="panel-padded flex flex-col items-center gap-2 hover:bg-muted/30 transition-colors">
            <Mail className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Email</span>
            <span className="text-[11px] text-muted-foreground">help@cycledesk.co.za</span>
          </a>
        </div>

        {loading ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">Loading support history...</p>
          </div>
        ) : null}
        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled">{error}</p>
          </div>
        ) : null}

        <section>
          <div className="section-heading">
            <h2 className="text-base">Support Chat</h2>
          </div>
          <div className="panel divide-y divide-border">
            {orderedMessages.length === 0 ? (
              <div className="p-4">
                <p className="text-sm text-muted-foreground">No messages yet. Send a note and we will reply here.</p>
              </div>
            ) : (
              orderedMessages.map((chat) => (
                <div key={chat.id} className="p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {chat.role === "USER" ? "You" : "CycleDesk Support"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{formatDateTimeCompactZA(chat.atIso)}</p>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{chat.text}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="section-heading">
            <h2 className="text-base">Send a Message</h2>
          </div>
          <div className="panel-padded stack">
            <Textarea
              placeholder="Describe your issue or question..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
            />
            <Button onClick={() => void sendMessage()} disabled={!message.trim() || sending || !thread}>
              <MessageSquare className="w-4 h-4" /> {sending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </section>
      </div>
    </CustomerShell>
  );
}
