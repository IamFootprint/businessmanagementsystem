import { useEffect, useMemo, useState } from "react";
import { WorkspaceShell } from "@/revamp/components/WorkspaceShell";
import { ADMIN_NAV_GROUPS } from "@/revamp/lib/navigation";
import { Button } from "@/revamp/components/ui/button";
import { Plus, Search, Edit, EyeOff, Eye } from "lucide-react";
import { Input } from "@/revamp/components/ui/input";
import { apiFetch } from "@/lib/client/api";
import { formatZarFromCents } from "@/revamp/lib/formatters";

type Service = {
  id: string;
  name: string;
  description?: string;
  durationMins: number;
  basePriceCents: number;
  category?: string;
  isActive: boolean;
  sortOrder: number;
};

const EMPTY_FORM = {
  name: "",
  description: "",
  durationMins: "60",
  basePriceZar: "",
  category: "",
};

export default function AdminCatalog() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadServices() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ services: Service[] }>("/api/admin/catalog/services");
      setServices(data.services || []);
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

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = services.slice().sort((a, b) => a.sortOrder - b.sortOrder);
    if (!query) return sorted;
    return sorted.filter((service) => {
      const haystack = `${service.name} ${service.description || ""} ${service.category || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [services, searchQuery]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(service: Service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description || "",
      durationMins: String(service.durationMins),
      basePriceZar: String(Math.round(service.basePriceCents / 100)),
      category: service.category || "",
    });
    setFormOpen(true);
  }

  async function saveService() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        id: editingId || undefined,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        durationMins: Math.max(15, Number(form.durationMins || 0)),
        basePriceCents: Math.max(0, Math.round(Number(form.basePriceZar || 0) * 100)),
        category: form.category.trim() || undefined,
        serviceType: form.category.trim() || undefined,
        isActive: true,
        sortOrder: editingId ? services.find((service) => service.id === editingId)?.sortOrder || 0 : services.length,
      };

      if (editingId) {
        await apiFetch("/api/admin/catalog/services", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/catalog/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadServices();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save service.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleService(service: Service) {
    setError(null);
    try {
      await apiFetch(`/api/admin/catalog/services/${service.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      setServices((prev) => prev.map((row) => (row.id === service.id ? { ...row, isActive: !row.isActive } : row)));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update service status.");
    }
  }

  return (
    <WorkspaceShell navGroups={ADMIN_NAV_GROUPS} title="Catalogue">
      <div className="stack-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Catalogue</h1>
            <p className="text-sm text-muted-foreground">Services, bundles, and workshop menu.</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add Service
          </Button>
        </div>

        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled">{error}</p>
          </div>
        ) : null}

        {formOpen ? (
          <div className="panel-padded stack-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {editingId ? "Edit Service" : "Create Service"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Service name" />
              <Input value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="Category" />
            </div>
            <Input value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description (optional)" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" min={15} value={form.durationMins} onChange={(event) => setForm((prev) => ({ ...prev, durationMins: event.target.value }))} placeholder="Duration (mins)" />
              <Input type="number" min={0} value={form.basePriceZar} onChange={(event) => setForm((prev) => ({ ...prev, basePriceZar: event.target.value }))} placeholder="Price (ZAR)" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void saveService()} disabled={saving || !form.name.trim()}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search services..." className="pl-9" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
        </div>

        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-sm text-muted-foreground">Loading services...</td>
                </tr>
              ) : null}
              {!loading && filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-sm text-muted-foreground">No services found.</td>
                </tr>
              ) : null}
              {!loading && filteredServices.map((service) => (
                <tr key={service.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{service.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-xs truncate">{service.description || "—"}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{formatZarFromCents(service.basePriceCents)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{service.durationMins} min</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${service.isActive ? "bg-status-completed/15 text-status-completed" : "bg-muted text-muted-foreground"}`}>
                      {service.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(service)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => void toggleService(service)}>
                        {service.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WorkspaceShell>
  );
}
