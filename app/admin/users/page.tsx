"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LabeledInput } from "@/components/ui/labeled-input";
import { useAdminUi } from "../admin-ui";
import ActionModal from "@/app/components/ActionModal";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import ErrorState from "@/app/components/ErrorState";
import IconAction from "@/app/components/IconAction";
import RecordActionButton from "@/app/components/RecordActionButton";
import { useNotify } from "@/app/components/ToastProvider";
import { apiFetch, getErrorHint, isApiClientError } from "@/lib/client/api";
import { formatDateTimeZA } from "@/lib/format/date";
import { Save, PowerOff, Power } from "lucide-react";
type UserRow = {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "PENDING_APPROVAL";
  createdAt: string;
  updatedAt: string;
};

type UserErrors = Partial<Record<"phone" | "firstName" | "lastName" | "role", string>>;

const ROLE_OPTIONS = [
  { value: "SHOP_OWNER", label: "Shop owner" },
  { value: "PLATFORM_OWNER", label: "Platform owner" },
  { value: "MECHANIC", label: "Mechanic" },
  { value: "CLIENT", label: "Client" }
];

function splitName(value?: string | null) {
  const parts = (value || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function isPlatformOwnerProfile(phone: string, name?: string | null) {
  const normalizedPhone = phone.replace(/\s+/g, "");
  return normalizedPhone === "+27110000002" || (name || "").toLowerCase().includes("platform owner");
}

function roleForUi(role: string, phone: string, name?: string | null) {
  const normalized = role.trim().toUpperCase();
  if (normalized === "ADMIN") {
    return isPlatformOwnerProfile(phone, name) ? "PLATFORM_OWNER" : "SHOP_OWNER";
  }
  if (normalized === "CUSTOMER") return "CLIENT";
  if (normalized === "MECHANIC") return "MECHANIC";
  return ROLE_OPTIONS.some((option) => option.value === normalized) ? normalized : "CLIENT";
}

function mapUser(user: {
  id: string;
  phone: string;
  name?: string | null;
  role: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "PENDING_APPROVAL";
  createdAt: string;
  updatedAt: string;
}): UserRow {
  const names = splitName(user.name);
  return {
    id: user.id,
    phone: user.phone,
    firstName: names.firstName,
    lastName: names.lastName,
    role: roleForUi(user.role, user.phone, user.name),
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export default function UsersPage() {
  const notify = useNotify();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [baselineById, setBaselineById] = useState<Record<string, UserRow>>({});
  const [query, setQuery] = useState("");
  const [newUser, setNewUser] = useState<UserRow>({
    id: "",
    phone: "",
    firstName: "",
    lastName: "",
    role: "CLIENT",
    status: "ACTIVE",
    createdAt: "",
    updatedAt: ""
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadHint, setLoadHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmUser, setConfirmUser] = useState<UserRow | null>(null);
  const [newUserErrors, setNewUserErrors] = useState<UserErrors>({});
  const [rowErrors, setRowErrors] = useState<Record<string, UserErrors>>({});
  const { canEdit, reason, role: viewerRole } = useAdminUi();

  const roleOptions = useMemo(
    () => (viewerRole === "PLATFORM_OWNER" ? ROLE_OPTIONS : ROLE_OPTIONS.filter((option) => option.value !== "PLATFORM_OWNER" && option.value !== "SHOP_OWNER")),
    [viewerRole]
  );

  async function load() {
    setLoading(true);
    setLoadError(null);
    setLoadHint(null);
    try {
      const data = await apiFetch<{ users: Array<{
        id: string;
        phone: string;
        name?: string | null;
        role: string;
        status: "ACTIVE" | "INACTIVE" | "PENDING" | "PENDING_APPROVAL";
        createdAt: string;
        updatedAt: string;
      }> }>("/api/admin/users");
      const mapped = (data.users || []).map(mapUser);
      setUsers(mapped);
      setBaselineById(Object.fromEntries(mapped.map((user) => [user.id, user])));
    } catch (error) {
      setLoadError("We couldn't load users.");
      setLoadHint(getErrorHint(error, "Check your connection or try again.") || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveUser(user: UserRow) {
    if (!canEdit) return false;
    if (user.id) {
      const baseline = baselineById[user.id];
      if (
        baseline &&
        baseline.phone === user.phone &&
        baseline.firstName === user.firstName &&
        baseline.lastName === user.lastName &&
        baseline.role === user.role
      ) {
        notify.warning("No changes to save", "Update a field before saving.");
        return false;
      }
    }
    const method = user.id ? "PUT" : "POST";
    const setErrors = user.id
      ? (fields: UserErrors) => setRowErrors((prev) => ({ ...prev, [user.id]: fields }))
      : setNewUserErrors;

    if (user.id) {
      setSavingId(user.id);
    } else {
      setSavingNew(true);
    }
    setErrors({});

    try {
      const endpoint = user.id ? `/api/admin/users/${user.id}` : "/api/admin/users";
      const data = await apiFetch<{ user: {
        id: string;
        phone: string;
        name?: string | null;
        role: string;
        status: "ACTIVE" | "INACTIVE" | "PENDING" | "PENDING_APPROVAL";
        shopId?: string | null;
        createdAt: string;
        updatedAt: string;
      } }>(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        })
      });

      const savedUser = mapUser(data.user);
      if (!user.id) {
        setUsers((prev) => [savedUser, ...prev]);
        setBaselineById((prev) => ({ ...prev, [savedUser.id]: savedUser }));
        setNewUser({
          id: "",
          phone: "",
          firstName: "",
          lastName: "",
          role: "CLIENT",
          status: "ACTIVE",
          createdAt: "",
          updatedAt: ""
        });
        notify.success("User created successfully");
        return true;
      }

      setUsers((prev) => prev.map((item) => (item.id === user.id ? savedUser : item)));
      setBaselineById((prev) => ({ ...prev, [savedUser.id]: savedUser }));
      notify.success("User updated successfully");
      return true;
    } catch (error) {
      if (isApiClientError(error) && error.fields) {
        setErrors({
          phone: error.fields.phone,
          firstName: error.fields.firstName,
          lastName: error.fields.lastName,
          role: error.fields.role
        });
      }
      if (isApiClientError(error) && error.status === 403) {
        notify.error("Not allowed", "Not allowed.");
      } else if (isApiClientError(error) && error.code === "USER_ALREADY_EXISTS") {
        setErrors({ phone: error.message });
        notify.error(
          "Duplicate phone number",
          error.message,
          getErrorHint(error, "Use a different phone number."),
          { code: error.code, requestId: error.requestId }
        );
      } else {
        notify.error(
          "Could not save changes",
          "Could not save changes. Please try again.",
          getErrorHint(error, "Check the highlighted fields and try again."),
          isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
        );
      }
      return false;
    } finally {
      setSavingNew(false);
      setSavingId(null);
    }
  }

  async function toggleUserStatus(user: UserRow) {
    if (!canEdit) return;
    setTogglingId(user.id);
    try {
      const route = user.status === "ACTIVE" ? "deactivate" : "reactivate";
      const data = await apiFetch<{ user: {
        id: string;
        phone: string;
        name?: string | null;
        role: string;
        status: "ACTIVE" | "INACTIVE" | "PENDING" | "PENDING_APPROVAL";
        shopId?: string | null;
        createdAt: string;
        updatedAt: string;
      } }>(`/api/admin/users/${user.id}/${route}`, { method: "POST" });
      const savedUser = mapUser(data.user);
      setUsers((prev) => prev.map((item) => (item.id === user.id ? savedUser : item)));
      setBaselineById((prev) => ({ ...prev, [savedUser.id]: savedUser }));
      notify.success(
        user.status === "ACTIVE" ? "User deactivated successfully" : "User reactivated successfully"
      );
    } catch (error) {
      if (isApiClientError(error) && error.status === 403) {
        notify.error("Not allowed", "Not allowed.");
      } else {
        notify.error(
          "Could not save changes",
          "Could not save changes. Please try again.",
          getErrorHint(error, "Try again or contact support if the issue continues."),
          isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
        );
      }
    } finally {
      setTogglingId(null);
      setConfirmUser(null);
    }
  }

  const filtered = useMemo(
    () =>
      users.filter((user) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          user.phone.toLowerCase().includes(q) ||
          `${user.firstName} ${user.lastName}`.toLowerCase().includes(q) ||
          user.role.toLowerCase().includes(q) ||
          user.status.toLowerCase().includes(q)
        );
      }),
    [query, users]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Setup</p>
            <h1>Users</h1>
            <p>Manage admin roles and account access for this console.</p>
          </div>
          {canEdit ? (
            <RecordActionButton action="add" label="Add user" onClick={() => setCreateOpen(true)} />
          ) : null}
        </div>

        {!canEdit ? <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{reason || "Read-only access: user changes are disabled."}</div> : null}

        <div className="mt-4">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Search users</span>
            <input
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, phone, role, or status"
            />
          </label>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        {loading ? <p className="text-sm text-muted-foreground mt-4">Loading users…</p> : null}
        {!loading && loadError ? (
          <div className="mt-4">
            <ErrorState
              title="Users unavailable"
              message={loadError}
              hint={loadHint || undefined}
              onRetry={load}
            />
          </div>
        ) : null}

        {!loading && !loadError ? (
          <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Phone</th>
                <th>First name</th>
                <th>Last name</th>
                <th>Role type</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>No users found.</td>
                </tr>
              ) : null}
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <input
                      className={`h-9 w-full rounded-md border ${rowErrors[user.id]?.phone ? "border-destructive" : "border-input"} bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring`}
                      aria-label={`Phone for ${user.firstName || user.phone}`}
                      value={user.phone}
                      onChange={(e) =>
                        setUsers((prev) =>
                          prev.map((item) => (item.id === user.id ? { ...item, phone: e.target.value } : item))
                        )
                      }
                    />
                    {rowErrors[user.id]?.phone ? <span className="text-xs text-destructive">{rowErrors[user.id]?.phone}</span> : null}
                  </td>
                  <td>
                    <input
                      className={`h-9 w-full rounded-md border ${rowErrors[user.id]?.firstName ? "border-destructive" : "border-input"} bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring`}
                      aria-label={`First name for ${user.phone}`}
                      value={user.firstName}
                      onChange={(e) =>
                        setUsers((prev) =>
                          prev.map((item) => (item.id === user.id ? { ...item, firstName: e.target.value } : item))
                        )
                      }
                    />
                    {rowErrors[user.id]?.firstName ? <span className="text-xs text-destructive">{rowErrors[user.id]?.firstName}</span> : null}
                  </td>
                  <td>
                    <input
                      className={`h-9 w-full rounded-md border ${rowErrors[user.id]?.lastName ? "border-destructive" : "border-input"} bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring`}
                      aria-label={`Last name for ${user.phone}`}
                      value={user.lastName}
                      onChange={(e) =>
                        setUsers((prev) =>
                          prev.map((item) => (item.id === user.id ? { ...item, lastName: e.target.value } : item))
                        )
                      }
                    />
                    {rowErrors[user.id]?.lastName ? <span className="text-xs text-destructive">{rowErrors[user.id]?.lastName}</span> : null}
                  </td>
                  <td>
                    <select
                      className={`h-9 w-full rounded-md border ${rowErrors[user.id]?.role ? "border-destructive" : "border-input"} bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring`}
                      aria-label={`Role for ${user.phone}`}
                      value={user.role}
                      onChange={(e) =>
                        setUsers((prev) =>
                          prev.map((item) => (item.id === user.id ? { ...item, role: e.target.value } : item))
                        )
                      }
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {rowErrors[user.id]?.role ? <span className="text-xs text-destructive">{rowErrors[user.id]?.role}</span> : null}
                  </td>
                  <td>
                    {user.status === "PENDING" || user.status === "PENDING_APPROVAL" ? (
                      <Badge
                        variant="secondary"
                        style={{ backgroundColor: "rgb(251 191 36 / 0.1)", color: "rgb(180 83 9)" }}
                      >
                        {user.status === "PENDING_APPROVAL" ? "Pending approval" : "Pending"}
                      </Badge>
                    ) : (
                      <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"}>
                        {user.status}
                      </Badge>
                    )}
                  </td>
                  <td>{formatDateTimeZA(user.createdAt)}</td>
                  <td>{formatDateTimeZA(user.updatedAt)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {canEdit ? (
                        <IconAction
                          icon={Save}
                          label={`Save ${user.firstName || user.phone}`}
                          variant="outline"
                          size="sm"
                          onClick={() => void saveUser(user)}
                          disabled={savingId === user.id || !user.phone.trim() || !user.firstName.trim() || !user.lastName.trim()}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">Read-only</span>
                      )}
                      {canEdit ? (
                        <IconAction
                          icon={user.status === "ACTIVE" ? PowerOff : Power}
                          label={user.status === "ACTIVE" ? `Deactivate ${user.firstName || user.phone}` : `Reactivate ${user.firstName || user.phone}`}
                          variant={user.status === "ACTIVE" ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => setConfirmUser(user)}
                          disabled={togglingId === user.id}
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
        title="Add user"
        description="Capture first name, last name, phone, and role type."
        onClose={() => {
          if (savingNew) return;
          setCreateOpen(false);
        }}
      >
        <div className="flex flex-col gap-4">
          <div>
            <LabeledInput
              label="Phone"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              error={newUserErrors.phone || null}
            />
          </div>
          <div>
            <LabeledInput
              label="First name"
              value={newUser.firstName}
              onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
              error={newUserErrors.firstName || null}
            />
          </div>
          <div>
            <LabeledInput
              label="Last name"
              value={newUser.lastName}
              onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
              error={newUserErrors.lastName || null}
            />
          </div>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Role type</span>
            <select
              className={`h-11 w-full rounded-lg border ${newUserErrors.role ? "border-destructive" : "border-input"} bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring`}
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {newUserErrors.role ? <span className="text-xs text-destructive">{newUserErrors.role}</span> : null}
          </label>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={savingNew}>
              Exit
            </Button>
            <Button
              onClick={async () => {
                const saved = await saveUser(newUser);
                if (saved) setCreateOpen(false);
              }}
              disabled={!newUser.phone.trim() || !newUser.firstName.trim() || !newUser.lastName.trim() || savingNew}
            >
              {savingNew ? "Saving..." : "Save user"}
            </Button>
          </div>
        </div>
      </ActionModal>

      <ConfirmDialog
        open={Boolean(confirmUser)}
        title={confirmUser?.status === "ACTIVE" ? "Deactivate user" : "Reactivate user"}
        message={
          confirmUser?.status === "ACTIVE"
            ? "Deactivate this user? They will no longer be able to log in."
            : "Reactivate this user? They will be able to log in again."
        }
        detail={confirmUser ? `${confirmUser.firstName} ${confirmUser.lastName} · ${confirmUser.phone}` : undefined}
        confirmLabel={confirmUser?.status === "ACTIVE" ? "Deactivate user" : "Reactivate user"}
        variant={confirmUser?.status === "ACTIVE" ? "danger" : "default"}
        loading={Boolean(confirmUser && togglingId === confirmUser.id)}
        onConfirm={() => {
          if (confirmUser) {
            void toggleUserStatus(confirmUser);
          }
        }}
        onCancel={() => setConfirmUser(null)}
      />
    </div>
  );
}
