import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CustomerShell } from "@/revamp/components/CustomerShell";
import { Wrench, Settings, Sparkles, Shield, Cog, Zap, Clock, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { formatZarFromCents } from "@/revamp/lib/formatters";
import { Button } from "@/revamp/components/ui/button";

type Service = {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
  category?: string;
  sortOrder?: number;
};

const icons = [Wrench, Settings, Sparkles, Shield, Cog, Zap];

function formatDuration(minutes?: number) {
  if (!minutes || minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours}h`;
  return `${hours.toFixed(1)}h`;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadServices() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ services: Service[] }>("/api/public/catalog/services");
      setServices((data.services || []).slice());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load services.");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadServices();
  }, []);

  const sortedServices = useMemo(() => {
    return services
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [services]);

  return (
    <CustomerShell title="Services" hideNav>
      <div className="stack-lg">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Services</h1>
          <p className="text-sm text-muted-foreground">Select a service to get a quote and book a time slot.</p>
        </div>
        {loading ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">Loading services...</p>
          </div>
        ) : null}
        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled mb-3">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void loadServices()}>
              Retry
            </Button>
          </div>
        ) : null}
        {!loading && !error && sortedServices.length === 0 ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">No active services available right now.</p>
          </div>
        ) : null}
        <div className="stack-sm">
          {!loading && !error && sortedServices.map((service, index) => {
            const Icon = icons[index % icons.length];
            return (
            <Link
              key={service.id}
              to={`/book/quote?itemType=service&itemId=${encodeURIComponent(service.id)}`}
              className="panel-padded flex items-start gap-4 hover:bg-muted/20 transition-colors relative overflow-hidden"
            >
              {index === 0 ? (
                <span className="absolute top-0 right-0 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">Popular</span>
              ) : null}
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{service.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{service.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-bold text-primary">{formatZarFromCents(service.priceCents)}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />{formatDuration(service.durationMinutes)}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
            </Link>
            );
          })}
        </div>
      </div>
    </CustomerShell>
  );
}
