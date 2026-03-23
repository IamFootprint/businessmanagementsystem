"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LabeledInput } from "@/components/ui/labeled-input";
import { useAdminUi } from "../admin-ui";
import ActionModal from "@/app/components/ActionModal";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import ErrorState from "@/app/components/ErrorState";
import IconAction from "@/app/components/IconAction";
import RecordActionButton from "@/app/components/RecordActionButton";
import { useNotify } from "@/app/components/ToastProvider";
import { apiFetch, getErrorHint, isApiClientError } from "@/lib/client/api";
import { PowerOff, Power } from "lucide-react";
type ServiceItem = {
  id: string;
  name: string;
  description?: string | null;
  durationMins: number;
  basePriceCents: number;
  category?: string | null;
  isActive: boolean;
  sortOrder: number;
};

type ServiceFormErrors = Partial<Record<"name" | "description" | "durationMins" | "basePriceCents" | "category" | "sortOrder", string>>;

const emptyService: ServiceItem = {
  id: "",
  name: "",
  description: "",
  durationMins: 60,
  basePriceCents: 0,
  category: "",
  isActive: true,
  sortOrder: 0
};

const SERVICE_TYPE_OPTIONS = [
  "General Service",
  "Drivetrain",
  "Brakes",
  "Suspension",
  "Wheel & Tyre",
  "Emergency Callout",
  "Custom"
];

function toZar(value: number) {
  return (value / 100).toFixed(0);
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitize(item: ServiceItem): ServiceItem {
  return {
    ...item,
    name: item.name.trim(),
    description: (item.description || "").trim(),
    category: (item.category || "").trim(),
    durationMins: Math.max(15, Math.round(item.durationMins)),
    basePriceCents: Math.max(0, Math.round(item.basePriceCents)),
    sortOrder: Math.max(0, Math.round(item.sortOrder))
  };
}

function mapServiceFields(fields?: Record<string, string>): ServiceFormErrors {
  return {
    name: fields?.name,
    description: fields?.description,
    durationMins: fields?.durationMins,
    basePriceCents: fields?.basePriceCents,
    category: fields?.category || fields?.serviceType,
    sortOrder: fields?.sortOrder
  };
}

function ServiceForm({
  service,
  errors,
  onChange,
  onSubmit,
  onCancel,
  onToggle,
  canEdit,
  saving,
  submitLabel
}: {
  service: ServiceItem;
  errors: ServiceFormErrors;
  onChange: (next: ServiceItem) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  onToggle?: () => void;
  canEdit: boolean;
  saving: boolean;
  submitLabel: string;
}) {
  const selectedType =
    service.category && SERVICE_TYPE_OPTIONS.includes(service.category) ? service.category : "Custom";

  return (
    <div className="flex flex-col gap-4">
      <LabeledInput
        label="Service name"
        value={service.name}
        onChange={(e) => onChange({ ...service, name: e.target.value })}
        helperText="Use a customer-friendly name."
        error={errors.name || null}
      />
      <label className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">Service type</span>
        <select
          className={`h-11 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${errors.category ? "border-destructive" : "border-input"}`}
          value={selectedType}
          onChange={(event) => {
            const nextType = event.target.value;
            onChange({ ...service, category: nextType === "Custom" ? "" : nextType });
          }}
          disabled={!canEdit || saving}
        >
          {SERVICE_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {errors.category ? <span className="text-xs text-destructive">{errors.category}</span> : null}
      </label>
      {selectedType === "Custom" ? (
        <LabeledInput
          label="Custom service type"
          value={service.category || ""}
          onChange={(e) => onChange({ ...service, category: e.target.value })}
          helperText="Optional label, e.g. Bike Fit or E-bike Diagnostics."
          error={errors.category || null}
        />
      ) : null}
      <LabeledInput
        label="Description"
        value={service.description || ""}
        onChange={(e) => onChange({ ...service, description: e.target.value })}
        error={errors.description || null}
      />
      <LabeledInput
        label="Duration (minutes)"
        value={String(service.durationMins)}
        inputMode="numeric"
        onChange={(e) => onChange({ ...service, durationMins: toNumber(e.target.value, service.durationMins) })}
        error={errors.durationMins || null}
      />
      <LabeledInput
        label="Base price (ZAR)"
        value={toZar(service.basePriceCents)}
        inputMode="numeric"
        onChange={(e) =>
          onChange({
            ...service,
            basePriceCents: Math.round(toNumber(e.target.value, service.basePriceCents / 100) * 100)
          })
        }
        error={errors.basePriceCents || null}
      />
      <LabeledInput
        label="Sort order"
        value={String(service.sortOrder)}
        inputMode="numeric"
        onChange={(e) => onChange({ ...service, sortOrder: toNumber(e.target.value, service.sortOrder) })}
        error={errors.sortOrder || null}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={service.isActive}
          onChange={(e) => onChange({ ...service, isActive: e.target.checked })}
          disabled={!canEdit || saving}
        />
        Active
      </label>
      <div className="flex items-center gap-2">
        {onCancel ? (
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Exit
          </Button>
        ) : null}
        {canEdit ? (
          <Button onClick={onSubmit} disabled={saving || !service.name.trim()}>
            {saving ? "Saving..." : submitLabel}
          </Button>
        ) : null}
        {canEdit && onToggle ? (
          <Button variant="outline" onClick={onToggle} disabled={saving}>
            {service.isActive ? "Deactivate" : "Activate"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function CatalogPageContent() {
  const searchParams = useSearchParams();
  const notify = useNotify();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [newService, setNewService] = useState<ServiceItem>({ ...emptyService });
  const [newErrors, setNewErrors] = useState<ServiceFormErrors>({});
  const [editErrors, setEditErrors] = useState<Record<string, ServiceFormErrors>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadHint, setLoadHint] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | "new" | null>(null);
  const [confirmItem, setConfirmItem] = useState<ServiceItem | null>(null);
  const { canEdit, reason } = useAdminUi();

  async function load() {
    setLoading(true);
    setLoadError(null);
    setLoadHint(null);
    try {
      const data = await apiFetch<{ services: ServiceItem[] }>("/api/admin/catalog/services");
      setServices(data.services || []);
    } catch (error) {
      setLoadError("We couldn't load the service catalogue.");
      setLoadHint(getErrorHint(error, "Check your connection or try again.") || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateOpen(true);
    }
  }, [searchParams]);

  async function saveService(item: ServiceItem) {
    if (!canEdit) return false;
    const key = item.id || "new";
    setSavingKey(key);
    if (key === "new") {
      setNewErrors({});
    } else {
      setEditErrors((prev) => ({ ...prev, [key]: {} }));
    }

    try {
      const payload = sanitize(item);
      const data = await apiFetch<{ service: ServiceItem }>("/api/admin/catalog/services", {
        method: item.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!item.id) {
        setServices((prev) => [data.service, ...prev]);
        setNewService({ ...emptyService });
        notify.success("Service saved", `${data.service.name} is now in the catalogue.`);
      } else {
        setServices((prev) => prev.map((svc) => (svc.id === item.id ? data.service : svc)));
        notify.success("Service updated", `${data.service.name} was updated.`);
      }
      return true;
    } catch (error) {
      if (isApiClientError(error) && error.fields) {
        const fieldErrors = mapServiceFields(error.fields);
        if (key === "new") {
          setNewErrors(fieldErrors);
        } else {
          setEditErrors((prev) => ({ ...prev, [key]: fieldErrors }));
        }
      }
      notify.error(
        "Service could not be saved",
        error instanceof Error ? error.message : "Please check your inputs and try again.",
        getErrorHint(error, "Review the form and try again."),
        isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
      );
      return false;
    } finally {
      setSavingKey(null);
    }
  }

  async function toggleService(item: ServiceItem) {
    setSavingKey(item.id);
    try {
      const data = await apiFetch<{ service: ServiceItem }>(`/api/admin/catalog/services/${item.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive })
      });
      setServices((prev) => prev.map((svc) => (svc.id === item.id ? data.service : svc)));
      notify.success(
        data.service.isActive ? "Service activated" : "Service deactivated",
        `${data.service.name} is now ${data.service.isActive ? "bookable" : "hidden from booking"}.`
      );
    } catch (error) {
      notify.error(
        "Service status could not be changed",
        error instanceof Error ? error.message : "Try again.",
        getErrorHint(error, "Try again or contact support if the problem continues."),
        isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
      );
    } finally {
      setSavingKey(null);
      setConfirmItem(null);
    }
  }

  const editingService = useMemo(
    () => (editingId ? services.find((item) => item.id === editingId) || null : null),
    [editingId, services]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Setup</p>
            <h1>Catalogue</h1>
            <p>Manage service items customers can book.</p>
          </div>
        </div>
        {!canEdit ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
            {reason || "Read-only access: catalogue changes are disabled."}
          </div>
        ) : null}
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2>Service items</h2>
            <p className="text-sm text-muted-foreground">Keep service menu details clear and customer-facing.</p>
          </div>
          {canEdit ? (
            <RecordActionButton action="add" label="Add service" onClick={() => setCreateOpen(true)} />
          ) : null}
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Loading catalogue…</p> : null}
        {!loading && loadError ? (
          <ErrorState
            title="Catalogue unavailable"
            message={loadError}
            hint={loadHint || undefined}
            onRetry={load}
          />
        ) : null}
        {!loading && !loadError && services.length === 0 ? <p>No services yet.</p> : null}
        {!loading && !loadError && services.length > 0 ? (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Service type</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Sort</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc) => (
                  <tr key={svc.id}>
                    <td>{svc.name}</td>
                    <td>{svc.category || "General Service"}</td>
                    <td>{svc.durationMins} min</td>
                    <td>{toZar(svc.basePriceCents)} ZAR</td>
                    <td>
                      <Badge variant={svc.isActive ? "default" : "secondary"}>
                        {svc.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td>{svc.sortOrder}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <RecordActionButton action="update" label={`Update ${svc.name}`} onClick={() => setEditingId(svc.id)} />
                        {canEdit ? (
                          <IconAction
                            icon={svc.isActive ? PowerOff : Power}
                            label={svc.isActive ? `Deactivate ${svc.name}` : `Activate ${svc.name}`}
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmItem(svc)}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <ActionModal
        open={createOpen}
        title="Add new service"
        description="Capture service details, then save to update the catalogue."
        onClose={() => {
          if (savingKey === "new") return;
          setCreateOpen(false);
          setNewErrors({});
        }}
      >
        <ServiceForm
          service={newService}
          errors={newErrors}
          onChange={(next) => {
            setNewService(next);
            if (Object.keys(newErrors).length > 0) setNewErrors({});
          }}
          onSubmit={async () => {
            const success = await saveService(newService);
            if (success) setCreateOpen(false);
          }}
          onCancel={() => setCreateOpen(false)}
          canEdit={canEdit}
          saving={savingKey === "new"}
          submitLabel="Save service"
        />
      </ActionModal>

      <ActionModal
        open={Boolean(editingService)}
        title={editingService ? `Edit service: ${editingService.name}` : "Edit service"}
        description="Update service details and save to refresh the table."
        onClose={() => {
          if (editingService && savingKey === editingService.id) return;
          setEditingId(null);
        }}
      >
        {editingService ? (
          <ServiceForm
            service={editingService}
            errors={editErrors[editingService.id] || {}}
            onChange={(next) =>
              setServices((prev) =>
                prev.map((item) => (item.id === editingService.id ? next : item))
              )
            }
            onSubmit={async () => {
              const success = await saveService(editingService);
              if (success) setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
            onToggle={() => setConfirmItem(editingService)}
            canEdit={canEdit}
            saving={savingKey === editingService.id}
            submitLabel="Save changes"
          />
        ) : null}
      </ActionModal>

      <ConfirmDialog
        open={Boolean(confirmItem)}
        title={confirmItem?.isActive ? "Deactivate service?" : "Activate service?"}
        message={
          confirmItem?.isActive
            ? "This will hide the service from booking until you reactivate it."
            : "This will make the service available for booking again."
        }
        detail={confirmItem ? confirmItem.name : undefined}
        confirmLabel={confirmItem?.isActive ? "Deactivate" : "Activate"}
        cancelLabel="Keep current status"
        variant={confirmItem?.isActive ? "danger" : "default"}
        loading={savingKey === confirmItem?.id}
        onCancel={() => setConfirmItem(null)}
        onConfirm={() => {
          if (!confirmItem) return;
          void toggleService(confirmItem);
        }}
      />
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-8 w-48 mb-1" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <Skeleton className="h-6 w-40 mb-4" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </div>
        </div>
      }
    >
      <CatalogPageContent />
    </Suspense>
  );
}
