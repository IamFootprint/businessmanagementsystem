import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CustomerShell } from "@/revamp/components/CustomerShell";
import { Button } from "@/revamp/components/ui/button";
import { Input } from "@/revamp/components/ui/input";
import { Textarea } from "@/revamp/components/ui/textarea";
import { User, Phone, ChevronRight, LogOut, Bell, Shield, MapPin, Trash2, Save } from "lucide-react";
import { apiFetch } from "@/lib/client/api";

type Profile = {
  id: string;
  phone: string;
  name?: string | null;
  role?: string;
  status?: string;
  createdAtIso?: string;
};

type Location = {
  id: string;
  label?: string | null;
  addressLine1: string;
  suburb?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type NotificationPrefs = {
  bookingUpdates: boolean;
  reminders: boolean;
  promotions: boolean;
};

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  bookingUpdates: true,
  reminders: true,
  promotions: false,
};

const menuItems = [
  { key: "details", icon: User, label: "Personal Details", description: "Name, phone, and saved locations" },
  { key: "notifications", icon: Bell, label: "Notification Settings", description: "SMS and in-app preferences" },
  { key: "security", icon: Shield, label: "Privacy & Security", description: "Session and account controls" },
] as const;

type MenuKey = typeof menuItems[number]["key"];

function initials(name?: string | null) {
  if (!name) return "CD";
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "CD"
  );
}

function locationSummary(location: Location) {
  return [location.addressLine1, location.suburb, location.city].filter(Boolean).join(", ");
}

export default function CustomerProfile() {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<MenuKey>("details");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [locationLabel, setLocationLabel] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationSuburb, setLocationSuburb] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [profileData, locationData] = await Promise.all([
          apiFetch<{ profile: Profile }>("/api/app/profile"),
          apiFetch<{ locations: Location[] }>("/api/app/locations"),
        ]);
        if (ignore) return;
        const nextProfile = profileData.profile || null;
        setProfile(nextProfile);
        setNameInput(nextProfile?.name || "");
        setPhoneInput(nextProfile?.phone || "");
        setLocations(locationData.locations || []);
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load your profile.");
          setProfile(null);
          setLocations([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadData();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cd:notification-prefs");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
      setNotificationPrefs({
        bookingUpdates: parsed.bookingUpdates ?? DEFAULT_NOTIFICATION_PREFS.bookingUpdates,
        reminders: parsed.reminders ?? DEFAULT_NOTIFICATION_PREFS.reminders,
        promotions: parsed.promotions ?? DEFAULT_NOTIFICATION_PREFS.promotions,
      });
    } catch {
      setNotificationPrefs(DEFAULT_NOTIFICATION_PREFS);
    }
  }, []);

  const avatarInitials = useMemo(() => initials(profile?.name), [profile?.name]);

  function resetLocationForm() {
    setEditingLocationId(null);
    setLocationLabel("");
    setLocationAddress("");
    setLocationSuburb("");
    setLocationCity("");
  }

  function startEditLocation(location: Location) {
    setEditingLocationId(location.id);
    setLocationLabel(location.label || "");
    setLocationAddress(location.addressLine1 || "");
    setLocationSuburb(location.suburb || "");
    setLocationCity(location.city || "");
  }

  async function saveProfile() {
    if (!profile) return;
    setSavingProfile(true);
    setFeedback(null);
    try {
      const data = await apiFetch<{ profile: Profile }>("/api/app/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput.trim(),
          phone: phoneInput.trim(),
        }),
      });
      setProfile(data.profile);
      setNameInput(data.profile?.name || "");
      setPhoneInput(data.profile?.phone || "");
      setFeedback({ type: "success", text: "Profile updated." });
    } catch (saveError) {
      setFeedback({ type: "error", text: saveError instanceof Error ? saveError.message : "Unable to save profile." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveLocation() {
    if (!locationAddress.trim()) return;
    setSavingLocation(true);
    setFeedback(null);
    try {
      if (editingLocationId) {
        const data = await apiFetch<{ location: Location }>(`/api/app/locations/${editingLocationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: locationLabel.trim() || undefined,
            addressLine1: locationAddress.trim(),
            suburb: locationSuburb.trim() || undefined,
            city: locationCity.trim() || undefined,
          }),
        });
        setLocations((prev) => prev.map((location) => (location.id === editingLocationId ? data.location : location)));
        setFeedback({ type: "success", text: "Location updated." });
      } else {
        const data = await apiFetch<{ location: Location }>("/api/app/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: locationLabel.trim() || undefined,
            addressLine1: locationAddress.trim(),
            suburb: locationSuburb.trim() || undefined,
            city: locationCity.trim() || undefined,
          }),
        });
        setLocations((prev) => [data.location, ...prev]);
        setFeedback({ type: "success", text: "Location added." });
      }
      resetLocationForm();
    } catch (saveError) {
      setFeedback({ type: "error", text: saveError instanceof Error ? saveError.message : "Unable to save location." });
    } finally {
      setSavingLocation(false);
    }
  }

  async function deleteLocation(id: string) {
    const location = locations.find((entry) => entry.id === id);
    const confirmed = window.confirm(`Delete location \"${location?.label || location?.addressLine1 || "this address"}\"?`);
    if (!confirmed) return;
    setFeedback(null);
    try {
      await apiFetch("/api/app/locations/" + id, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      setLocations((prev) => prev.filter((entry) => entry.id !== id));
      if (editingLocationId === id) {
        resetLocationForm();
      }
      setFeedback({ type: "success", text: "Location removed." });
    } catch (deleteError) {
      setFeedback({ type: "error", text: deleteError instanceof Error ? deleteError.message : "Unable to remove location." });
    }
  }

  function saveNotificationPrefs() {
    try {
      localStorage.setItem("cd:notification-prefs", JSON.stringify(notificationPrefs));
      setFeedback({ type: "success", text: "Notification settings saved on this device." });
    } catch {
      setFeedback({ type: "error", text: "Unable to save notification settings on this device." });
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "MANUAL" }),
        credentials: "include",
      });
    } finally {
      setSigningOut(false);
      navigate("/login");
    }
  }

  return (
    <CustomerShell title="Profile">
      <div className="stack-lg">
        {loading ? (
          <div className="panel-padded">
            <p className="text-sm text-muted-foreground">Loading profile...</p>
          </div>
        ) : null}
        {error ? (
          <div className="panel-padded border-status-cancelled/30 bg-status-cancelled/10">
            <p className="text-sm text-status-cancelled">{error}</p>
          </div>
        ) : null}
        {feedback ? (
          <div className={feedback.type === "error" ? "panel-padded border-status-cancelled/30 bg-status-cancelled/10" : "panel-padded border-status-completed/30 bg-status-completed/10"}>
            <p className={feedback.type === "error" ? "text-sm text-status-cancelled" : "text-sm text-status-completed"}>{feedback.text}</p>
          </div>
        ) : null}

        <div className="panel-padded flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-display font-bold text-lg">{avatarInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-lg">{profile?.name || "CycleDesk Rider"}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-3.5 h-3.5" />
              <span>{profile?.phone || "—"}</span>
            </div>
          </div>
        </div>

        <div className="panel divide-y divide-border">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
              onClick={() => setActivePanel(item.key)}
            >
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>

        {activePanel === "details" ? (
          <div className="panel-padded stack-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Personal Details</p>
            <Input value={nameInput} onChange={(event) => setNameInput(event.target.value)} placeholder="Full name" />
            <Input value={phoneInput} onChange={(event) => setPhoneInput(event.target.value)} placeholder="Phone" />
            <Button size="sm" onClick={() => void saveProfile()} disabled={savingProfile || !nameInput.trim() || !phoneInput.trim()}>
              <Save className="w-4 h-4" /> {savingProfile ? "Saving..." : "Save Details"}
            </Button>

            <div className="pt-4 border-t border-border stack-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Saved Locations</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} placeholder="Label (Home, Office)" />
                <Input value={locationCity} onChange={(event) => setLocationCity(event.target.value)} placeholder="City" />
              </div>
              <Textarea value={locationAddress} onChange={(event) => setLocationAddress(event.target.value)} placeholder="Street address" rows={2} />
              <Input value={locationSuburb} onChange={(event) => setLocationSuburb(event.target.value)} placeholder="Suburb" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void saveLocation()} disabled={savingLocation || !locationAddress.trim()}>
                  {savingLocation ? "Saving..." : editingLocationId ? "Update Location" : "Add Location"}
                </Button>
                {editingLocationId ? (
                  <Button size="sm" variant="ghost" onClick={resetLocationForm}>
                    Cancel edit
                  </Button>
                ) : null}
              </div>

              <div className="space-y-2">
                {locations.length === 0 ? <p className="text-sm text-muted-foreground">No saved locations yet.</p> : null}
                {locations.map((location) => (
                  <div key={location.id} className="rounded-md border border-border p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{location.label || "Saved address"}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {locationSummary(location)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => startEditLocation(location)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteLocation(location.id)}>
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activePanel === "notifications" ? (
          <div className="panel-padded stack-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Notification Settings</p>
            <label className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <span>Booking updates</span>
              <input
                type="checkbox"
                checked={notificationPrefs.bookingUpdates}
                onChange={(event) =>
                  setNotificationPrefs((prev) => ({ ...prev, bookingUpdates: event.target.checked }))
                }
              />
            </label>
            <label className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <span>Service reminders</span>
              <input
                type="checkbox"
                checked={notificationPrefs.reminders}
                onChange={(event) =>
                  setNotificationPrefs((prev) => ({ ...prev, reminders: event.target.checked }))
                }
              />
            </label>
            <label className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <span>Promotions</span>
              <input
                type="checkbox"
                checked={notificationPrefs.promotions}
                onChange={(event) =>
                  setNotificationPrefs((prev) => ({ ...prev, promotions: event.target.checked }))
                }
              />
            </label>
            <Button size="sm" onClick={saveNotificationPrefs}>Save Notification Settings</Button>
          </div>
        ) : null}

        {activePanel === "security" ? (
          <div className="panel-padded stack-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Privacy & Security</p>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="font-semibold text-foreground">Account status: {profile?.status || "ACTIVE"}</p>
              <p className="text-xs text-muted-foreground mt-1">Role: {profile?.role || "CLIENT"}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              You can sign out on this device any time. For full account recovery controls, contact support.
            </p>
            <Button variant="outline" className="w-full text-destructive" onClick={() => void signOut()} disabled={signingOut}>
              <LogOut className="w-4 h-4" /> {signingOut ? "Signing Out..." : "Sign Out"}
            </Button>
          </div>
        ) : null}
      </div>
    </CustomerShell>
  );
}
