import { useEffect, useState } from "react";
import { CustomerShell } from "@/revamp/components/CustomerShell";
import { Button } from "@/revamp/components/ui/button";
import { Input } from "@/revamp/components/ui/input";
import { Plus, Bike, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { formatBikeType } from "@/revamp/lib/formatters";

type BikeRecord = {
  id: string;
  bikeType: "MTB" | "ROAD" | "GRAVEL" | "E_BIKE" | "OTHER";
  brand: string;
  model?: string | null;
  eBike?: boolean;
};

const BIKE_TYPES: BikeRecord["bikeType"][] = ["ROAD", "MTB", "GRAVEL", "E_BIKE", "OTHER"];

export default function MyBikes() {
  const [bikes, setBikes] = useState<BikeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [bikeType, setBikeType] = useState<BikeRecord["bikeType"]>("ROAD");

  async function loadBikes() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ bikes: BikeRecord[] }>("/api/app/bikes");
      setBikes(data.bikes || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load bikes.");
      setBikes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBikes();
  }, []);

  async function addBike() {
    if (!brand.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/app/bikes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bikeType,
          brand: brand.trim(),
          model: model.trim() || undefined,
          eBike: bikeType === "E_BIKE",
        }),
      });
      setBrand("");
      setModel("");
      setBikeType("ROAD");
      await loadBikes();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to add bike.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBike(id: string) {
    setError(null);
    try {
      await apiFetch(`/api/app/bikes/${id}`, { method: "DELETE" });
      setBikes((prev) => prev.filter((bike) => bike.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to remove bike.");
    }
  }

  return (
    <CustomerShell title="My Bikes">
      <div className="stack">
        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled">{error}</p>
          </div>
        ) : null}
        {loading ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">Loading bikes...</p>
          </div>
        ) : null}

        {!loading && bikes.length === 0 ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">No bikes saved yet.</p>
          </div>
        ) : null}

        {!loading && bikes.map((bike) => (
          <div key={bike.id} className="panel-padded flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Bike className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{[bike.brand, bike.model || ""].filter(Boolean).join(" ")}</p>
              <p className="text-sm text-muted-foreground">{formatBikeType(bike.bikeType)}</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => void deleteBike(bike.id)}>
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        ))}

        <div className="panel-padded stack-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add New Bike</p>
          <div className="grid grid-cols-2 gap-2">
            <Input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Brand" className="h-11" />
            <Input value={model} onChange={(event) => setModel(event.target.value)} placeholder="Model (optional)" className="h-11" />
          </div>
          <select
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={bikeType}
            onChange={(event) => setBikeType(event.target.value as BikeRecord["bikeType"])}
          >
            {BIKE_TYPES.map((type) => (
              <option key={type} value={type}>{formatBikeType(type)}</option>
            ))}
          </select>
          <Button variant="outline" size="lg" className="w-full" disabled={saving || !brand.trim()} onClick={() => void addBike()}>
            <Plus className="w-4 h-4" /> {saving ? "Saving..." : "Add New Bike"}
          </Button>
        </div>
      </div>
    </CustomerShell>
  );
}
