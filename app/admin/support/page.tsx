"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { useAdminUi } from "../admin-ui";
import ActionModal from "@/app/components/ActionModal";
import RecordActionButton from "@/app/components/RecordActionButton";
import { formatDateTimeZA, formatDateZA } from "@/lib/format/date";
type TicketNote = {
  id: string;
  authorName: string;
  text: string;
  createdAtIso: string;
};

type Ticket = {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  bookingId?: string;
  assigneeId?: string;
  notes: TicketNote[];
  createdAtIso: string;
  updatedAtIso: string;
  resolvedAtIso?: string;
};

const CATEGORIES = ["payment", "cancellation", "general", "complaint"] as const;
const PRIORITIES = ["low", "normal", "high"] as const;
const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ticketBadgeClass(status: string) {
  if (status === "open") return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  if (status === "resolved") return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (status === "closed") return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { canEdit, reason } = useAdminUi();

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // View mode
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // New ticket form
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState<string>("general");
  const [newPriority, setNewPriority] = useState<string>("normal");
  const [newBookingId, setNewBookingId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Detail view
  const [statusUpdate, setStatusUpdate] = useState("");
  const [noteText, setNoteText] = useState("");
  const [updating, setUpdating] = useState(false);

  // Legacy stub state
  const [bookingId, setBookingId] = useState("");
  const [noteBookingId, setNoteBookingId] = useState("");
  const [legacyNoteText, setLegacyNoteText] = useState("");
  const [sending, setSending] = useState(false);

  async function loadTickets() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterCategory) params.set("category", filterCategory);
      const qs = params.toString();
      const res = await fetch(`/api/admin/support/tickets${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        setError("Failed to load tickets.");
        return;
      }
      const raw = await res.json();
      const data = raw.data ?? raw;
      setTickets(data.tickets || []);
    } catch {
      setError("Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, [filterStatus, filterCategory]);

  async function createTicket() {
    if (!canEdit || !newSubject.trim() || !newDescription.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newSubject.trim(),
          category: newCategory,
          priority: newPriority,
          description: newDescription.trim(),
          bookingId: newBookingId || undefined
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create ticket.");
        return;
      }
      setNewSubject("");
      setNewCategory("general");
      setNewPriority("normal");
      setNewBookingId("");
      setNewDescription("");
      setCreateOpen(false);
      await loadTickets();
    } catch {
      setError("Failed to create ticket.");
    } finally {
      setCreating(false);
    }
  }

  async function openTicketDetail(ticket: Ticket) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticket.id}`);
      if (!res.ok) {
        setError("Failed to load ticket details.");
        return;
      }
      const raw = await res.json();
      const data = raw.data ?? raw;
      setSelectedTicket(data.ticket);
      setStatusUpdate(data.ticket.status);
      setNoteText("");
      setView("detail");
    } catch {
      setError("Failed to load ticket details.");
    }
  }

  async function updateTicketStatus() {
    if (!canEdit || !selectedTicket || !statusUpdate) return;
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/support/tickets/${selectedTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusUpdate })
      });
      if (!res.ok) {
        setError("Failed to update ticket.");
        return;
      }
      const raw = await res.json();
      const data = raw.data ?? raw;
      setSelectedTicket(data.ticket);
    } catch {
      setError("Failed to update ticket.");
    } finally {
      setUpdating(false);
    }
  }

  async function addNote() {
    if (!canEdit || !selectedTicket || !noteText.trim()) return;
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/support/tickets/${selectedTicket.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: noteText.trim() })
      });
      if (!res.ok) {
        setError("Failed to add note.");
        return;
      }
      const raw = await res.json();
      const data = raw.data ?? raw;
      setSelectedTicket(data.ticket);
      setNoteText("");
    } catch {
      setError("Failed to add note.");
    } finally {
      setUpdating(false);
    }
  }

  async function resend(channel: "whatsapp" | "email") {
    if (!canEdit || !bookingId) {
      setError("Enter a booking ID or reference to resend.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/support/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, channel })
      });
      if (!res.ok) throw new Error("resend failed");
    } catch {
      setError("Failed to send notification.");
    } finally {
      setSending(false);
    }
  }

  async function saveLegacyNote() {
    if (!canEdit || !noteBookingId || !legacyNoteText.trim()) {
      setError("Add a booking ID and note.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/support/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: noteBookingId, note: legacyNoteText.trim() })
      });
      if (!res.ok) throw new Error("note failed");
      setNoteBookingId("");
      setLegacyNoteText("");
    } catch {
      setError("Failed to save support note.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">System</p>
            <h1>Support</h1>
            <p>Manage support tickets and track issue resolution flow.</p>
          </div>
        </div>
        {!canEdit ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
            {reason || "Read-only access: support actions are disabled."}
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      {view === "list" ? (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2>Tickets</h2>
              <p className="text-sm text-muted-foreground">Track incoming support requests and resolution progress.</p>
            </div>
            {canEdit ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>New ticket</Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-3 mt-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3 mt-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <p className="mt-3">No tickets match your filters.</p>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>{ticket.subject}</td>
                      <td>{ticket.category}</td>
                      <td>{ticket.priority}</td>
                      <td>
                        <span className={ticketBadgeClass(ticket.status)}>
                          {statusLabel(ticket.status)}
                        </span>
                      </td>
                      <td>{formatDateZA(ticket.createdAtIso)}</td>
                      <td>
                        <Button size="sm" onClick={() => openTicketDetail(ticket)}>View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {view === "detail" && selectedTicket ? (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between mb-4">
            <h2>{selectedTicket.subject}</h2>
            <Button variant="outline" size="sm" onClick={() => { setView("list"); void loadTickets(); }}>
              Back to list
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</p>
              <p>{selectedTicket.category}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</p>
              <p>{selectedTicket.priority}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
              <span className={ticketBadgeClass(selectedTicket.status)}>
                {statusLabel(selectedTicket.status)}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</p>
              <p>{formatDateTimeZA(selectedTicket.createdAtIso)}</p>
            </div>
          </div>

          {selectedTicket.bookingId ? (
            <p className="mt-2"><strong>Booking:</strong> {selectedTicket.bookingId}</p>
          ) : null}

          <div className="rounded-lg border border-border p-4 mt-4">
            <strong>Description</strong>
            <p className="mt-2">{selectedTicket.description}</p>
          </div>

          {canEdit ? (
            <div className="rounded-lg border border-border p-4 mt-4">
              <strong>Update status</strong>
              <div className="flex items-center gap-2 mt-2">
                <select
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={statusUpdate}
                  onChange={(e) => setStatusUpdate(e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
                <RecordActionButton
                  action="update"
                  label="Update ticket status"
                  disabled={updating || statusUpdate === selectedTicket.status}
                  onClick={updateTicketStatus}
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-border p-4 mt-4">
            <strong>Notes ({selectedTicket.notes.length})</strong>
            {selectedTicket.notes.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                {selectedTicket.notes.map((note) => (
                  <div key={note.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <strong>{note.authorName}</strong>
                      <span className="text-xs text-muted-foreground">{formatDateTimeZA(note.createdAtIso)}</span>
                    </div>
                    <p className="mt-2">{note.text}</p>
                  </div>
                ))}
              </div>
            )}
            {canEdit ? (
              <div className="mt-3">
                <textarea
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                  rows={3}
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <RecordActionButton
                  action="add"
                  label="Add note"
                  disabled={updating || !noteText.trim()}
                  onClick={addNote}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2>Quick actions</h2>
            <p className="text-sm text-muted-foreground">Use these fallback tools for manual support operations.</p>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4 mt-3">
          <strong>Resend notification</strong>
          <LabeledInput
            label="Booking ID or reference"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
          />
          <div className="flex items-center gap-2">
            {canEdit ? (
              <Button size="sm" disabled={sending} onClick={() => resend("whatsapp")}>
                Resend WhatsApp
              </Button>
            ) : null}
            {canEdit ? (
              <Button size="sm" disabled={sending} onClick={() => resend("email")}>
                Resend Email
              </Button>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            This is a stub until the notifications queue is wired.
          </p>
        </div>

        <div className="rounded-lg border border-border p-4 mt-4">
          <strong>Exception notes</strong>
          <LabeledInput
            label="Booking ID"
            value={noteBookingId}
            onChange={(e) => setNoteBookingId(e.target.value)}
          />
          <LabeledInput
            label="Note"
            value={legacyNoteText}
            onChange={(e) => setLegacyNoteText(e.target.value)}
          />
          {canEdit ? (
            <Button size="sm" disabled={sending} onClick={saveLegacyNote}>
              Save note
            </Button>
          ) : null}
        </div>
      </div>

      <ActionModal
        open={createOpen}
        title="New ticket"
        description="Capture a support issue without leaving the ticket list."
        onClose={() => {
          if (creating) return;
          setCreateOpen(false);
        }}
      >
        <div className="flex flex-col gap-4">
          <LabeledInput
            label="Subject"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
          />
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Category</span>
            <select className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Priority</span>
            <select className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </label>
          <LabeledInput
            label="Booking ID (optional)"
            value={newBookingId}
            onChange={(e) => setNewBookingId(e.target.value)}
          />
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Description</span>
            <textarea
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
              rows={4}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Exit
            </Button>
            <Button
              disabled={creating || !newSubject.trim() || !newDescription.trim()}
              onClick={createTicket}
            >
              {creating ? "Creating..." : "Save ticket"}
            </Button>
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
