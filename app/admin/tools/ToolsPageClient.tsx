"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LabeledInput } from "@/components/ui/labeled-input";
import type { SidebarNavGroup } from "@/app/components/WorkspaceSidebar";
import {
  Home, ClipboardList, Calendar, Clock, Wrench, Box, Tag, Users,
  UserCog, Bell, Shield, Settings, MessageSquare, Globe, Lock
} from "lucide-react";

const toolIconMap: Record<string, React.ElementType> = {
  home: Home, clipboard: ClipboardList, calendar: Calendar, timeline: Clock,
  checklist: Settings, wrench: Wrench, box: Box, tag: Tag, clock: Clock,
  tool: UserCog, users: Users, bell: Bell, shield: Shield, settings: Settings,
  message: MessageSquare, globe: Globe, lock: Lock,
};

export default function ToolsPageClient({ groups }: { groups: SidebarNavGroup[] }) {
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const haystack = `${item.label} ${item.description || ""}`.toLowerCase();
          return haystack.includes(needle);
        })
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card rounded-xl border border-border p-5">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-0.5">All tools</p>
        <h1 className="font-display font-bold text-foreground text-lg mb-3">Find any admin module</h1>
        <LabeledInput
          label="Search tools"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search bookings, pricing, settings..."
        />
      </div>

      <div className="flex flex-col gap-4">
        {filteredGroups.map((group) => (
          <div key={group.key} className="bg-card rounded-xl border border-border p-5">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-0.5">{group.label}</p>
            <h2 className="font-display font-bold text-foreground mb-3">{group.label}</h2>
            <div className="flex flex-col divide-y divide-border">
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 py-3 hover:bg-muted/50 transition-colors -mx-2 px-2 rounded-lg">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                    {(() => { const Icon = toolIconMap[item.icon] || Home; return <Icon className="w-4 h-4" />; })()}
                  </span>
                  <span>
                    <strong className="block text-sm text-foreground">{item.label}</strong>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
