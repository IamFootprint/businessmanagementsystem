import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CustomerShell } from "@/revamp/components/CustomerShell";
import { Button } from "@/revamp/components/ui/button";
import { Wrench, Clock, CheckCircle2, ArrowRight, Info } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { formatDurationMinutes, formatZarFromCents } from "@/revamp/lib/formatters";

type CatalogItem = {
  id: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  priceCents: number;
};

type CatalogResponse = {
  services: CatalogItem[];
  packages: CatalogItem[];
};

type QuoteLineItem = {
  code: string;
  label: string;
  amountCents: number;
};

type QuoteResponse = {
  lineItems: QuoteLineItem[];
  subtotalCents: number;
  totalCents: number;
  currency: "ZAR";
};

export default function CustomerQuote() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get("itemId");
  const itemType = searchParams.get("itemType") === "package" ? "package" : "service";
  const legacyServiceName = searchParams.get("service");

  const [item, setItem] = useState<CatalogItem | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const catalog = await apiFetch<CatalogResponse>("/api/public/catalog");
        const bucket = itemType === "package" ? catalog.packages || [] : catalog.services || [];
        const resolvedItem =
          (itemId ? bucket.find((entry) => entry.id === itemId) : undefined) ||
          (legacyServiceName ? (catalog.services || []).find((entry) => entry.name === legacyServiceName) : undefined) ||
          bucket[0] ||
          (catalog.services || [])[0] ||
          null;

        if (!resolvedItem) {
          if (!ignore) {
            setItem(null);
            setQuote(null);
            setError("No service is available for quoting right now.");
          }
          return;
        }

        const quoteData = await apiFetch<QuoteResponse>("/api/public/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemType: itemType === "package" ? "package" : "service",
            itemId: resolvedItem.id,
          }),
        });

        if (ignore) return;
        setItem(resolvedItem);
        setQuote(quoteData);
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load quote.");
          setQuote(null);
          setItem(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [itemId, itemType, legacyServiceName]);

  const includedItems = useMemo(() => {
    if (!quote || quote.lineItems.length === 0) return [];
    return quote.lineItems.filter((line) => line.amountCents >= 0).slice(0, 6);
  }, [quote]);

  return (
    <CustomerShell title="Quote" hideNav>
      <div className="stack-lg">
        {loading ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">Preparing your quote...</p>
          </div>
        ) : null}
        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled">{error}</p>
          </div>
        ) : null}
        {/* Service summary */}
        <div className="panel-padded">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="font-bold text-foreground">{item?.name || "Service"}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" /> Estimated {formatDurationMinutes(item?.durationMinutes)}
              </div>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="panel">
          <div className="p-4 border-b border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Estimate Breakdown</p>
          </div>
          <div className="divide-y divide-border">
            {quote?.lineItems.map((line) => (
              <div key={line.code} className="flex items-center justify-between p-4">
                <span className="text-sm text-foreground">{line.label}</span>
                <span className="text-sm font-semibold text-foreground">{formatZarFromCents(line.amountCents)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/30">
            <span className="text-sm font-bold text-foreground">Total Estimate</span>
            <span className="text-lg font-bold text-primary">{formatZarFromCents(quote?.totalCents)}</span>
          </div>
        </div>

        {/* Info note */}
        <div className="panel-padded flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">This is an estimate</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Final price may vary based on additional parts or repairs identified during service. Your mechanic will confirm before proceeding.
            </p>
          </div>
        </div>

        {/* What's included */}
        <div className="panel-padded">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">What's Included</p>
          <div className="space-y-2">
            {includedItems.map((line) => (
              <div key={line.code} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-completed shrink-0" />
                <span className="text-sm text-foreground">{line.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Button
          size="lg"
          className="w-full"
          disabled={!item}
          onClick={() => navigate(`/book/new?itemType=${itemType}&itemId=${encodeURIComponent(item?.id || "")}`)}
        >
          Continue to Book <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </CustomerShell>
  );
}
