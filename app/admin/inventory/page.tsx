"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import ActionModal from "@/app/components/ActionModal";
import RecordActionButton from "@/app/components/RecordActionButton";
type Item = {
  id: string;
  name: string;
  category: string;
  unitPriceCents: number;
  costCents?: number;
  stockOnHand?: number;
  isActive: boolean;
};

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/admin/inventory");
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(raw?.error || "Failed to load inventory.");
        return;
      }
      const data = raw.data ?? raw;
      setItems(data.items || []);
    } catch {
      setError("Failed to load inventory.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createItem() {
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          unitPriceCents: Math.round(Number(unitPrice || 0) * 100),
          costCents: cost ? Math.round(Number(cost) * 100) : undefined,
          stockOnHand: stock ? Number(stock) : undefined,
          isActive: true
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to create inventory item.");
        return false;
      }
      setMessage("Inventory item added.");
      setName("");
      setCategory("");
      setUnitPrice("");
      setCost("");
      setStock("");
      await load();
      return true;
    } catch {
      setError("Failed to create inventory item.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function toggleItem(item: Item) {
    const res = await fetch("/api/admin/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isActive: !item.isActive })
    });
    if (res.ok) {
      await load();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Setup</p>
            <h1>Inventory</h1>
            <p>Manage workshop parts and consumables.</p>
          </div>
          <RecordActionButton action="add" label="Add item" onClick={() => setCreateOpen(true)} />
        </div>
        {error ? <p className="text-sm text-destructive mt-3">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground mt-3">{message}</p> : null}
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Unit price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6}>No inventory items yet.</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>R {(item.unitPriceCents / 100).toFixed(2)}</td>
                    <td>{typeof item.stockOnHand === "number" ? item.stockOnHand : "-"}</td>
                    <td>{item.isActive ? "Active" : "Inactive"}</td>
                    <td>
                      <Button variant="outline" onClick={() => toggleItem(item)}>
                        {item.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ActionModal
        open={createOpen}
        title="Add inventory item"
        description="Capture part or consumable details, then save."
        onClose={() => {
          if (saving) return;
          setCreateOpen(false);
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabeledInput label="Name" value={name} onChange={(event) => setName(event.target.value)} />
            <LabeledInput label="Category" value={category} onChange={(event) => setCategory(event.target.value)} />
            <LabeledInput
              label="Unit price (ZAR)"
              type="number"
              min={0}
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
            />
            <LabeledInput
              label="Cost (ZAR, optional)"
              type="number"
              min={0}
              value={cost}
              onChange={(event) => setCost(event.target.value)}
            />
            <LabeledInput
              label="Stock on hand (optional)"
              type="number"
              min={0}
              value={stock}
              onChange={(event) => setStock(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Exit
            </Button>
            <Button
              onClick={async () => {
                const ok = await createItem();
                if (ok) setCreateOpen(false);
              }}
              disabled={saving || !name || !category || !unitPrice}
            >
              {saving ? "Saving..." : "Save item"}
            </Button>
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
