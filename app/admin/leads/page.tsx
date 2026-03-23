"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDateTimeZA } from "@/lib/format/date";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  formType: string;
  status: string;
  utmSource: string | null;
  utmCampaign: string | null;
  createdAtIso: string;
};

function statusBadgeClass(status: string) {
  if (status === "NEW") return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (status === "CONTACTED") return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  if (status === "CONVERTED") return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadLeads() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/leads");
      if (!res.ok) {
        setError("Failed to load leads.");
        return;
      }
      const data = await res.json();
      setLeads(data.leads || []);
    } catch {
      setError("Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Platform</p>
            <h1>Leads</h1>
            <p>Marketing leads captured from public forms and early-access signups.</p>
          </div>
        </div>
        {error ? (
          <div className="flex items-center gap-3 mt-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={loadLeads}>
              Retry
            </Button>
          </div>
        ) : null}
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads captured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.name}</td>
                    <td>{lead.email}</td>
                    <td>{lead.phone || "\u2014"}</td>
                    <td>{lead.formType}</td>
                    <td>
                      <span className={statusBadgeClass(lead.status)}>
                        {lead.status}
                      </span>
                    </td>
                    <td>{formatDateTimeZA(lead.createdAtIso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
