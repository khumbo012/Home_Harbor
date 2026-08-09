import React from "react";
import { Building2, CheckSquare, FileText, Home, Settings } from "lucide-react";
import type { AppProfile, Tab } from "../types";
import { ConfirmationToast } from "./home-harbor-ui";

const NAV_ITEMS = [
  { id: "dashboard" as Tab, label: "Today", Icon: Home },
  { id: "properties" as Tab, label: "Properties", Icon: Building2 },
  { id: "tasks" as Tab, label: "Tasks", Icon: CheckSquare },
  { id: "documents" as Tab, label: "Docs", Icon: FileText },
  { id: "settings" as Tab, label: "Settings", Icon: Settings },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "U") + (parts[1]?.[0] || "");
}

function MobileNav({ active, onChange, badge }: { active: Tab; onChange: (tab: Tab) => void; badge: number }) {
  return (
    <nav className="border-t border-border bg-card pb-[calc(env(safe-area-inset-bottom)+0.25rem)] lg:hidden">
      <div className="flex">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const activeItem = active === id;
          return (
            <button key={id} onClick={() => onChange(id)} className={`relative flex min-h-[60px] flex-1 flex-col items-center gap-0.5 pb-3 pt-2 transition-colors ${activeItem ? "text-[var(--hh-primary)]" : "text-muted-foreground"}`}>
              {activeItem && <span className="absolute top-0 h-[2px] w-8 rounded-full bg-[var(--hh-primary)]" />}
              <span className="relative">
                <Icon className="h-[21px] w-[21px]" />
                {id === "dashboard" && badge > 0 && <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--hh-urgent)] px-1 text-[9px] font-black text-white">{badge > 9 ? "9+" : badge}</span>}
              </span>
              <span className="text-[10px] font-bold leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Sidebar({ active, onChange, badge, profile }: { active: Tab; onChange: (tab: Tab) => void; badge: number; profile: AppProfile }) {
  return (
    <aside className="hidden h-full w-[232px] flex-shrink-0 flex-col bg-[var(--hh-primary)] lg:flex">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-[18px]">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/15"><Home className="h-4 w-4 text-white" /></div>
        <span className="text-[15px] font-black tracking-[-0.03em] text-white">Home Harbor</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const activeItem = active === id;
          return (
            <button key={id} onClick={() => onChange(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all ${activeItem ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/10 hover:text-white"}`}>
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              {id === "dashboard" && badge > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--hh-urgent)] px-1 text-[10px] font-black text-white">{badge}</span>}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-[11px] font-black uppercase text-white">{initials(profile.name)}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold leading-tight text-white">{profile.name}</p>
            <p className="truncate text-[11px] leading-tight text-white/45">{profile.portfolioName}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AppShell({ active, onChange, badge, profile, cloudStatus, children, beforeContent, overlay, notice }: { active: Tab; onChange: (tab: Tab) => void; badge: number; profile: AppProfile; cloudStatus: string; children: React.ReactNode; beforeContent?: React.ReactNode; overlay?: React.ReactNode; notice: { message: string; tone: "success" | "error" } | null }) {
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background pt-[env(safe-area-inset-top)]">
      <Sidebar active={active} onChange={onChange} badge={badge} profile={profile} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="border-b border-border bg-card px-4 py-2 text-center text-[11px] font-bold text-muted-foreground lg:text-left">
            {cloudStatus}
          </div>
          {beforeContent}
          {children}
        </main>
        <MobileNav active={active} onChange={onChange} badge={badge} />
      </div>
      {overlay}
      <ConfirmationToast notice={notice} />
    </div>
  );
}
