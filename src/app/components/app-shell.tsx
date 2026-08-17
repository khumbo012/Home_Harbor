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
  const activeIndex = Math.max(NAV_ITEMS.findIndex((item) => item.id === active), 0);

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] lg:hidden" aria-label="Primary">
      <div className="pointer-events-auto relative mx-auto max-w-md overflow-hidden rounded-[1.65rem] border border-white/70 bg-white/78 p-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
        <span
          className="absolute bottom-1.5 left-1.5 top-1.5 w-[calc((100%_-_0.75rem)/5)] rounded-[1.25rem] bg-[var(--hh-primary)] shadow-[0_10px_26px_rgba(10,132,255,0.25)] transition-transform duration-200 ease-out"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
          aria-hidden="true"
        />
        <div className="relative grid grid-cols-5">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const activeItem = active === id;
          return (
            <button key={id} onClick={() => onChange(id)} className={`relative flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-[1.2rem] px-1 transition-colors duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hh-primary-border)] ${activeItem ? "text-white" : "text-muted-foreground hover:text-foreground"}`} aria-current={activeItem ? "page" : undefined}>
              <span className="relative">
                <Icon className="h-5 w-5" />
                {id === "dashboard" && badge > 0 && <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--hh-urgent)] px-1 text-[9px] font-semibold text-white">{badge > 9 ? "9+" : badge}</span>}
              </span>
              <span className="max-w-full truncate text-[10px] font-semibold leading-none">{label}</span>
            </button>
          );
        })}
        </div>
      </div>
    </nav>
  );
}

function Sidebar({ active, onChange, badge, profile }: { active: Tab; onChange: (tab: Tab) => void; badge: number; profile: AppProfile }) {
  return (
    <aside className="hidden h-full w-[248px] flex-shrink-0 flex-col border-r border-border bg-[var(--hh-glass)] backdrop-blur-2xl lg:flex">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-[18px]">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[var(--hh-primary)] shadow-[0_8px_18px_rgba(10,132,255,0.2)]"><Home className="h-4 w-4 text-white" /></div>
        <span className="text-[15px] font-semibold text-foreground">Home Harbor</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const activeItem = active === id;
          return (
            <button key={id} onClick={() => onChange(id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition-all ${activeItem ? "bg-[var(--hh-primary-soft)] text-[var(--hh-primary)]" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              {id === "dashboard" && badge > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--hh-urgent)] px-1 text-[10px] font-semibold text-white">{badge}</span>}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--hh-primary-soft)] text-[11px] font-semibold uppercase text-[var(--hh-primary)]">{initials(profile.name)}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold leading-tight text-foreground">{profile.name}</p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">{profile.portfolioName}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AppShell({ active, onChange, badge, profile, cloudStatus, children, beforeContent, overlay, notice }: { active: Tab; onChange: (tab: Tab) => void; badge: number; profile: AppProfile; cloudStatus: string; children: React.ReactNode; beforeContent?: React.ReactNode; overlay?: React.ReactNode; notice: { message: string; tone: "success" | "error" } | null }) {
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-transparent pt-[env(safe-area-inset-top)]">
      <Sidebar active={active} onChange={onChange} badge={badge} profile={profile} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="border-b border-border bg-[var(--hh-glass)] px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground backdrop-blur-2xl lg:text-left">
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
