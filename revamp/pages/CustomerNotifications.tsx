import { useEffect, useMemo, useState } from "react";
import { CustomerShell } from "@/revamp/components/CustomerShell";
import { Bell, Calendar, Wrench, CheckCircle2, CreditCard, MessageSquare } from "lucide-react";
import { cn } from "@/revamp/lib/utils";
import { apiFetch } from "@/lib/client/api";
import { formatDateTimeCompactZA } from "@/revamp/lib/formatters";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAtIso: string;
  read: boolean;
  type: "status" | "booking" | "reminder" | "payment" | "message" | "system";
};

export default function CustomerNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ notifications: NotificationItem[] }>("/api/app/notifications");
        if (!ignore) setNotifications(data.notifications || []);
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load notifications.");
          setNotifications([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const visibleNotifications = useMemo(() => {
    return notifications
      .slice()
      .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso))
      .slice(0, 30);
  }, [notifications]);

  function iconFor(type: NotificationItem["type"]) {
    if (type === "status") return CheckCircle2;
    if (type === "booking") return Calendar;
    if (type === "payment") return CreditCard;
    if (type === "message") return MessageSquare;
    if (type === "reminder") return Bell;
    return Wrench;
  }

  return (
    <CustomerShell title="Notifications">
      <div className="stack-sm">
        {loading ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>
        ) : null}
        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled">{error}</p>
          </div>
        ) : null}
        {!loading && !error && notifications.length === 0 ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </div>
        ) : null}
        {!loading && !error && visibleNotifications.map((notification) => {
          const Icon = iconFor(notification.type);
          return (
            <div
              key={notification.id}
              className={cn(
                "panel-padded flex items-start gap-3 transition-colors",
                !notification.read && "border-l-2 border-l-primary"
              )}
            >
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", !notification.read ? "bg-primary/10" : "bg-secondary")}>
                <Icon className={cn("w-4 h-4", !notification.read ? "text-primary" : "text-secondary-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm font-semibold truncate", !notification.read ? "text-foreground" : "text-muted-foreground")}>
                    {notification.title}
                  </p>
                  <span className="text-[11px] text-muted-foreground shrink-0">{formatDateTimeCompactZA(notification.createdAtIso)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notification.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </CustomerShell>
  );
}
