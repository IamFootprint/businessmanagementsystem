"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LabeledInput } from "@/components/ui/labeled-input";
import ActionModal from "@/app/components/ActionModal";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import ErrorState from "@/app/components/ErrorState";
import IconAction from "@/app/components/IconAction";
import { useNotify } from "@/app/components/ToastProvider";
import { apiFetch, getErrorHint, isApiClientError } from "@/lib/client/api";
import { formatDateTimeZA } from "@/lib/format/date";
import { UserPlus, PowerOff, Power } from "lucide-react";
type Invite = {
  id: string;
  phone: string;
  role: string;
  name?: string;
  createdAtIso: string;
  usedAtIso?: string;
};

type Mechanic = {
  id: string;
  phone: string;
  name?: string;
  role: string;
  status: "ACTIVE" | "INACTIVE";
  specialties?: string[];
  availability?: {
    blackoutDates?: string[];
  };
  createdAtIso: string;
};

type InviteErrors = Partial<Record<"phone" | "firstName" | "lastName", string>>;

function MechanicsPageContent() {
  const searchParams = useSearchParams();
  const notify = useNotify();
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [inviteRole, setInviteRole] = useState("MECHANIC");
  const [activeView, setActiveView] = useState<"invites" | "team">("invites");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [inviteErrors, setInviteErrors] = useState<InviteErrors>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadHint, setLoadHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmMechanic, setConfirmMechanic] = useState<Mechanic | null>(null);

  async function loadInvites() {
    const data = await apiFetch<{ invites: Invite[] }>("/api/admin/mechanics/invites");
    setInvites(data.invites || []);
  }

  async function loadMechanics() {
    const data = await apiFetch<{ mechanics: Mechanic[] }>("/api/admin/mechanics");
    setMechanics(data.mechanics || []);
  }

  async function load() {
    setLoading(true);
    setLoadError(null);
    setLoadHint(null);
    try {
      await Promise.all([loadInvites(), loadMechanics()]);
    } catch (error) {
      setLoadError("We couldn't load mechanics and invite data.");
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
      setInviteModalOpen(true);
    }
  }, [searchParams]);

  async function createInvite() {
    setSubmitting(true);
    setInviteErrors({});
    try {
      const data = await apiFetch<{ invite: Invite; inviteUrl: string }>("/api/admin/mechanics/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: inviteRole
        })
      });
      setInviteUrl(data.inviteUrl || "");
      setPhone("");
      setFirstName("");
      setLastName("");
      setInviteRole("MECHANIC");
      await loadInvites();
      notify.success("Invite created", "The mechanic invite link is ready to share.");
      return true;
    } catch (error) {
      if (isApiClientError(error) && error.fields) {
        setInviteErrors({
          phone: error.fields.phone,
          firstName: error.fields.firstName,
          lastName: error.fields.lastName
        });
      }
      notify.error(
        "Invite could not be created",
        error instanceof Error ? error.message : "Try again.",
        getErrorHint(error, "Check the highlighted fields and try again."),
        isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleMechanic(mechanic: Mechanic) {
    const route = mechanic.status === "ACTIVE" ? "deactivate" : "activate";
    setTogglingId(mechanic.id);
    try {
      const data = await apiFetch<{ mechanic: Mechanic }>(`/api/admin/mechanics/${mechanic.id}/${route}`, {
        method: "POST"
      });
      setMechanics((prev) =>
        prev.map((item) => (item.id === mechanic.id ? data.mechanic : item))
      );
      notify.success(
        data.mechanic.status === "ACTIVE" ? "Mechanic activated" : "Mechanic deactivated",
        `${data.mechanic.name || data.mechanic.phone} is now ${data.mechanic.status.toLowerCase()}.`
      );
    } catch (error) {
      notify.error(
        "Mechanic status could not be changed",
        error instanceof Error ? error.message : "Try again.",
        getErrorHint(error, "Try again or contact support if the issue continues."),
        isApiClientError(error) ? { code: error.code, requestId: error.requestId } : undefined
      );
    } finally {
      setTogglingId(null);
      setConfirmMechanic(null);
    }
  }

  const hasInviteFormValues = useMemo(
    () => Boolean(phone.trim() || firstName.trim() || lastName.trim()),
    [firstName, lastName, phone]
  );

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h1>Mechanic onboarding</h1>
      <p>Create invite links and manage active mechanics.</p>

      <div className="flex items-center justify-between mt-3">
        <p className="text-sm text-muted-foreground">Invite creation opens as a focused modal form.</p>
        <Button variant="outline" onClick={() => setInviteModalOpen(true)}>
          <UserPlus style={{ width: 16, height: 16, marginRight: 8 }} />
          Create invite
        </Button>
      </div>

      {inviteUrl ? (
        <div className="rounded-lg border border-border p-4 mt-4">
          <strong>Invite link</strong>
          <p>{inviteUrl}</p>
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(inviteUrl);
              notify.info("Invite link copied");
            }}
          >
            Copy link
          </Button>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="flex items-center gap-2">
          <Button
            className={activeView === "invites" ? "" : undefined}
            variant={activeView === "invites" ? "default" : "outline"}
            onClick={() => setActiveView("invites")}
          >
            Invite queue
          </Button>
          <Button
            className={activeView === "team" ? "" : undefined}
            variant={activeView === "team" ? "default" : "outline"}
            onClick={() => setActiveView("team")}
          >
            Active team
          </Button>
        </div>

        {loading ? <p className="text-sm text-muted-foreground mt-4">Loading mechanic data…</p> : null}
        {!loading && loadError ? (
          <div className="mt-4">
            <ErrorState
              title="Mechanic data unavailable"
              message={loadError}
              hint={loadHint || undefined}
              onRetry={load}
            />
          </div>
        ) : null}

        {!loading && !loadError && activeView === "invites" ? (
          <>
            <h2 className="mt-4">Existing invites</h2>
            {invites.length === 0 ? <p>No invites created yet.</p> : null}
            {invites.length > 0 ? (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th>Phone</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Created</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((invite) => (
                      <tr key={invite.id}>
                        <td>{invite.phone}</td>
                        <td>{invite.name || "Mechanic"}</td>
                        <td>{invite.role}</td>
                        <td>{formatDateTimeZA(invite.createdAtIso)}</td>
                        <td>
                          {invite.usedAtIso ? (
                            <Badge variant="default">Used</Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              style={{ backgroundColor: "rgb(251 191 36 / 0.1)", color: "rgb(180 83 9)" }}
                            >
                              Invited
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : null}

        {!loading && !loadError && activeView === "team" ? (
          <>
            <h2 className="mt-4">Mechanics</h2>
            {mechanics.length === 0 ? <p>No mechanics onboarded yet.</p> : null}
            {mechanics.length > 0 ? (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Specialties</th>
                      <th>Blackouts</th>
                      <th>Status</th>
                      <th>Onboarded</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mechanics.map((mech) => (
                      <tr key={mech.id}>
                        <td>{mech.name || "Mechanic"}</td>
                        <td>{mech.phone}</td>
                        <td>{(mech.specialties || []).join(", ") || "-"}</td>
                        <td>{mech.availability?.blackoutDates?.length || 0}</td>
                        <td>
                          <Badge variant={mech.status === "ACTIVE" ? "default" : "secondary"}>
                            {mech.status}
                          </Badge>
                        </td>
                        <td>{formatDateTimeZA(mech.createdAtIso)}</td>
                        <td>
                          <IconAction
                            icon={mech.status === "ACTIVE" ? PowerOff : Power}
                            label={mech.status === "ACTIVE" ? `Deactivate ${mech.name || mech.phone}` : `Activate ${mech.name || mech.phone}`}
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmMechanic(mech)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <ActionModal
        open={inviteModalOpen}
        title="Create mechanic invite"
        description="Capture one mechanic at a time with first name, last name, role type, and phone."
        onClose={() => {
          if (submitting) return;
          setInviteModalOpen(false);
          setInviteErrors({});
        }}
      >
        <div className="flex flex-col gap-4">
          <LabeledInput
            label="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={inviteErrors.phone || null}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabeledInput
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={inviteErrors.firstName || null}
            />
            <LabeledInput
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={inviteErrors.lastName || null}
            />
          </div>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Role type</span>
            <select
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="MECHANIC">Mechanic</option>
            </select>
          </label>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setInviteModalOpen(false)} disabled={submitting}>
              Exit
            </Button>
            <Button
              onClick={async () => {
                const success = await createInvite();
                if (success) setInviteModalOpen(false);
              }}
              disabled={submitting || !phone.trim() || !firstName.trim() || !lastName.trim()}
            >
              {submitting ? "Creating..." : "Save invite"}
            </Button>
          </div>
          {!hasInviteFormValues ? (
            <p className="text-sm text-muted-foreground">Enter the mechanic&apos;s phone number and both names before saving.</p>
          ) : null}
        </div>
      </ActionModal>

      <ConfirmDialog
        open={Boolean(confirmMechanic)}
        title={confirmMechanic?.status === "ACTIVE" ? "Deactivate mechanic?" : "Activate mechanic?"}
        message={
          confirmMechanic?.status === "ACTIVE"
            ? "This mechanic will lose access to mechanic tools until reactivated."
            : "This mechanic will regain access to mechanic tools."
        }
        detail={confirmMechanic?.name || confirmMechanic?.phone}
        confirmLabel={confirmMechanic?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        cancelLabel="Keep current status"
        variant={confirmMechanic?.status === "ACTIVE" ? "danger" : "default"}
        loading={togglingId === confirmMechanic?.id}
        onCancel={() => setConfirmMechanic(null)}
        onConfirm={() => {
          if (!confirmMechanic) return;
          void toggleMechanic(confirmMechanic);
        }}
      />
    </div>
  );
}

export default function MechanicsPage() {
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
      <MechanicsPageContent />
    </Suspense>
  );
}
