import React, { useEffect, useMemo, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Download,
  FileText,
  HelpCircle,
  Home,
  Lock,
  Mail,
  MapPin,
  Phone,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Shield,
  Trash2,
  Upload,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";

type Tab = "dashboard" | "properties" | "tasks" | "documents" | "settings";
type ModalKind = "property" | "tenant" | "maintenance" | "task" | "document" | null;
type EditableRecord =
  | { kind: "property"; item: Property }
  | { kind: "tenant"; item: Tenant }
  | { kind: "maintenance"; item: MaintenanceItem }
  | { kind: "task"; item: TaskItem }
  | { kind: "document"; item: DocItem }
  | null;

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  units: number;
  imageUrl: string;
}

interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  propertyId: string;
  unit: string;
  rent: number;
  leaseStart: string;
  leaseEnd: string;
  status: "active" | "expiring" | "expired";
  notes: string;
}

interface MaintenanceItem {
  id: string;
  title: string;
  description: string;
  propertyId: string;
  unit: string;
  tenantName: string;
  status: "open" | "in-progress" | "resolved";
  priority: "low" | "medium" | "high";
  date: string;
  vendor: string;
}

interface TaskItem {
  id: string;
  title: string;
  type: "lease" | "inspection" | "maintenance" | "financial" | "reminder";
  propertyId: string;
  dueDate: string;
  status: "pending" | "done";
  priority: "low" | "medium" | "high";
}

interface DocItem {
  id: string;
  name: string;
  type: "lease" | "inspection" | "warranty" | "receipt" | "application" | "other";
  propertyId: string;
  tenantName: string;
  date: string;
  size: string;
  fileName?: string;
  filePath?: string;
  mimeType?: string;
  uploadedAt?: string;
}

interface AppData {
  properties: Property[];
  tenants: Tenant[];
  maintenance: MaintenanceItem[];
  tasks: TaskItem[];
  docs: DocItem[];
}

interface AppProfile {
  name: string;
  email: string;
  portfolioName: string;
}

interface OnboardingSetup {
  profile: AppProfile;
  mode: "sample" | "fresh";
  property?: {
    name: string;
    address: string;
    city: string;
    units: number;
  };
}

interface ReminderItem {
  id: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  tab: Tab;
}

const DEFAULT_PROFILE: AppProfile = {
  name: "David Martinez",
  email: "david.martinez@email.com",
  portfolioName: "Rental portfolio",
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&h=520&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=900&h=520&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=900&h=520&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&h=520&fit=crop&auto=format",
];

const INITIAL_DATA: AppData = {
  properties: [
    { id: "p1", name: "Maple Street Duplex", address: "2847 Maple Street", city: "Oakland, CA 94602", units: 2, imageUrl: DEFAULT_IMAGES[0] },
    { id: "p2", name: "Pine Avenue Triplex", address: "1203 Pine Avenue", city: "Oakland, CA 94607", units: 3, imageUrl: DEFAULT_IMAGES[1] },
    { id: "p3", name: "Oak Court Single", address: "519 Oak Court", city: "Berkeley, CA 94710", units: 1, imageUrl: DEFAULT_IMAGES[2] },
    { id: "p4", name: "Elm Street Fourplex", address: "7744 Elm Street", city: "Berkeley, CA 94703", units: 4, imageUrl: DEFAULT_IMAGES[3] },
  ],
  tenants: [
    { id: "t1", name: "Sarah Chen", phone: "(510) 442-8831", email: "sarah.chen@gmail.com", propertyId: "p1", unit: "Unit 1A", rent: 2100, leaseStart: "Sep 1, 2024", leaseEnd: "Aug 31, 2026", status: "active", notes: "Excellent tenant. Always pays early. Prefers email." },
    { id: "t2", name: "Marcus Williams", phone: "(510) 882-3310", email: "m.williams@outlook.com", propertyId: "p1", unit: "Unit 1B", rent: 1950, leaseStart: "Jan 1, 2025", leaseEnd: "Dec 31, 2026", status: "active", notes: "Works nights - avoid calls before noon." },
    { id: "t3", name: "Priya Nair", phone: "(510) 774-5562", email: "priya.nair@icloud.com", propertyId: "p2", unit: "Unit A", rent: 1850, leaseStart: "Jul 1, 2024", leaseEnd: "Jun 30, 2026", status: "expiring", notes: "Renewal conversation needed. Interested in staying." },
    { id: "t4", name: "James & Tomoko Sato", phone: "(510) 993-7128", email: "jsato@gmail.com", propertyId: "p2", unit: "Unit B", rent: 2250, leaseStart: "Dec 1, 2024", leaseEnd: "Nov 30, 2026", status: "active", notes: "Very tidy. No pets." },
    { id: "t5", name: "Diana Reyes", phone: "(510) 341-9004", email: "diana.reyes@gmail.com", propertyId: "p3", unit: "Unit 1", rent: 2400, leaseStart: "Oct 1, 2024", leaseEnd: "Sep 30, 2026", status: "active", notes: "Very responsive via text." },
    { id: "t6", name: "Leon Okeke", phone: "(510) 671-2240", email: "leon.okeke@yahoo.com", propertyId: "p4", unit: "Unit 1A", rent: 1750, leaseStart: "Apr 1, 2025", leaseEnd: "Mar 31, 2027", status: "active", notes: "Very reliable." },
    { id: "t7", name: "Hannah Park", phone: "(510) 557-8874", email: "h.park@gmail.com", propertyId: "p4", unit: "Unit 2A", rent: 1800, leaseStart: "Aug 1, 2024", leaseEnd: "Jul 31, 2026", status: "expiring", notes: "Reported noise from upstairs." },
    { id: "t8", name: "Robert & Ana Kim", phone: "(510) 240-3391", email: "rkim@gmail.com", propertyId: "p4", unit: "Unit 2B", rent: 1800, leaseStart: "Nov 1, 2024", leaseEnd: "Oct 31, 2026", status: "active", notes: "Couple with infant." },
  ],
  maintenance: [
    { id: "m1", title: "Heater not working", description: "Wall heater in living room stopped working. Tenant called twice.", propertyId: "p2", unit: "Unit A", tenantName: "Priya Nair", status: "open", priority: "high", date: "May 2, 2026", vendor: "" },
    { id: "m2", title: "Leaky bathroom faucet", description: "Hot water faucet drips constantly.", propertyId: "p1", unit: "Unit 1B", tenantName: "Marcus Williams", status: "in-progress", priority: "medium", date: "May 8, 2026", vendor: "Ace Plumbing" },
    { id: "m3", title: "Torn window screen", description: "Back bedroom screen is torn. Needs replacement before summer.", propertyId: "p3", unit: "Unit 1", tenantName: "Diana Reyes", status: "open", priority: "low", date: "May 10, 2026", vendor: "" },
    { id: "m4", title: "Dishwasher not draining", description: "Clog in drain hose. Resolved.", propertyId: "p4", unit: "Unit 2A", tenantName: "Hannah Park", status: "resolved", priority: "high", date: "Apr 28, 2026", vendor: "QuickFix Appliance" },
  ],
  tasks: [
    { id: "tk1", title: "Renew lease - Priya Nair", type: "lease", propertyId: "p2", dueDate: "Jun 15, 2026", status: "pending", priority: "high" },
    { id: "tk2", title: "Renew lease - Hannah Park", type: "lease", propertyId: "p4", dueDate: "Jun 30, 2026", status: "pending", priority: "high" },
    { id: "tk3", title: "Annual safety inspection", type: "inspection", propertyId: "p1", dueDate: "May 20, 2026", status: "pending", priority: "medium" },
    { id: "tk4", title: "Replace HVAC filters - all properties", type: "maintenance", propertyId: "", dueDate: "May 25, 2026", status: "pending", priority: "medium" },
    { id: "tk5", title: "Property insurance renewal", type: "financial", propertyId: "p4", dueDate: "Jun 1, 2026", status: "pending", priority: "high" },
    { id: "tk6", title: "Rent increase notice - Unit A", type: "reminder", propertyId: "p2", dueDate: "May 30, 2026", status: "pending", priority: "low" },
  ],
  docs: [
    { id: "d1", name: "Lease Agreement - Sarah Chen", type: "lease", propertyId: "p1", tenantName: "Sarah Chen", date: "Sep 1, 2024", size: "284 KB" },
    { id: "d2", name: "Lease Agreement - Marcus Williams", type: "lease", propertyId: "p1", tenantName: "Marcus Williams", date: "Jan 1, 2025", size: "291 KB" },
    { id: "d3", name: "Lease Agreement - Priya Nair", type: "lease", propertyId: "p2", tenantName: "Priya Nair", date: "Jul 1, 2024", size: "278 KB" },
    { id: "d4", name: "Move-in Inspection - Diana Reyes", type: "inspection", propertyId: "p3", tenantName: "Diana Reyes", date: "Oct 1, 2024", size: "1.2 MB" },
    { id: "d5", name: "HVAC Service Report", type: "receipt", propertyId: "p1", tenantName: "", date: "Mar 15, 2025", size: "412 KB" },
  ],
};

function useStoredData() {
  const [data, setDataState] = useState<AppData>(() => {
    try {
      const stored = localStorage.getItem("keystone-rental-data");
      return stored ? { ...INITIAL_DATA, ...JSON.parse(stored) } : INITIAL_DATA;
    } catch {
      return INITIAL_DATA;
    }
  });

  function setData(next: AppData | ((current: AppData) => AppData)) {
    setDataState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      localStorage.setItem("keystone-rental-data", JSON.stringify(resolved));
      return resolved;
    });
  }

  return [data, setData] as const;
}

function useStoredProfile() {
  const [profile, setProfileState] = useState<AppProfile>(() => {
    try {
      const stored = localStorage.getItem("keystone-user-profile");
      return stored ? { ...DEFAULT_PROFILE, ...JSON.parse(stored) } : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  function setProfile(next: AppProfile) {
    localStorage.setItem("keystone-user-profile", JSON.stringify(next));
    setProfileState(next);
  }

  return [profile, setProfile] as const;
}

async function loadCloudPortfolio(userId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("user_portfolios")
    .select("profile,data,onboarded")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as { profile: AppProfile | null; data: AppData | null; onboarded: boolean | null } | null;
}

async function saveCloudPortfolio(userId: string, profile: AppProfile, data: AppData, onboarded: boolean) {
  if (!supabase) return;

  const { error } = await supabase
    .from("user_portfolios")
    .upsert({
      user_id: userId,
      profile,
      data,
      onboarded,
    }, { onConflict: "user_id" });

  if (error) throw error;
}

async function uploadDocumentFile(userId: string, file: File, documentId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${userId}/${documentId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("documents").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) throw error;
  return path;
}

async function openDocumentFile(filePath: string) {
  if (!supabase) return;

  const { data, error } = await supabase.storage.from("documents").createSignedUrl(filePath, 60);
  if (error) {
    window.alert(error.message);
    return;
  }

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function money(n: number) {
  return "$" + n.toLocaleString();
}

function propertyName(data: AppData, id: string) {
  return data.properties.find((p) => p.id === id)?.name || "All properties";
}

function propertyStats(data: AppData, propertyId: string) {
  const property = data.properties.find((p) => p.id === propertyId);
  const tenants = data.tenants.filter((t) => t.propertyId === propertyId);
  const occupiedUnits = Math.min(tenants.length, property?.units || tenants.length);
  const revenue = tenants.reduce((sum, t) => sum + Number(t.rent || 0), 0);
  return { tenants, occupiedUnits, revenue };
}

function parseAppDate(value: string) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
}

function daysUntil(value: string) {
  const parsed = parseAppDate(value);
  if (!parsed) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return Math.ceil((parsed.getTime() - today.getTime()) / 86400000);
}

function formatReminderTiming(days: number | null) {
  if (days === null) return "No date";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

function buildReminders(data: AppData): ReminderItem[] {
  const maintenance = data.maintenance
    .filter((item) => item.status !== "resolved" && item.priority === "high")
    .map((item) => ({
      id: `maintenance-${item.id}`,
      title: item.title,
      detail: `${propertyName(data, item.propertyId)} - ${item.unit || "No unit"} - high priority`,
      severity: "high" as const,
      tab: "properties" as const,
    }));

  const tasks = data.tasks
    .filter((task) => task.status === "pending")
    .map((task) => ({ task, days: daysUntil(task.dueDate) }))
    .filter(({ days, task }) => task.priority === "high" || days === null || days <= 14)
    .map(({ task, days }) => ({
      id: `task-${task.id}`,
      title: task.title,
      detail: `${propertyName(data, task.propertyId)} - ${formatReminderTiming(days)}`,
      severity: (task.priority === "high" || (days !== null && days <= 0) ? "high" : task.priority) as ReminderItem["severity"],
      tab: "tasks" as const,
    }));

  const leases = data.tenants
    .map((tenant) => ({ tenant, days: daysUntil(tenant.leaseEnd) }))
    .filter(({ tenant, days }) => tenant.status !== "active" || (days !== null && days <= 60))
    .map(({ tenant, days }) => ({
      id: `lease-${tenant.id}`,
      title: `Lease renewal - ${tenant.name}`,
      detail: `${propertyName(data, tenant.propertyId)} - ${tenant.unit} - ${formatReminderTiming(days)}`,
      severity: (tenant.status === "expired" || (days !== null && days <= 14) ? "high" : "medium") as ReminderItem["severity"],
      tab: "tasks" as const,
    }));

  return [...maintenance, ...tasks, ...leases].sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.severity] - rank[b.severity];
  });
}

function fileSizeLabel(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function priorityStyle(priority: string) {
  if (priority === "high") return "bg-red-50 text-red-700 border-red-100";
  if (priority === "medium") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function statusStyle(status: string) {
  if (status === "open" || status === "expired") return "bg-red-50 text-red-700 border-red-100";
  if (status === "in-progress" || status === "expiring") return "bg-amber-50 text-amber-700 border-amber-100";
  if (status === "resolved" || status === "active" || status === "done") return "bg-teal-50 text-teal-700 border-teal-100";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function docColor(type: DocItem["type"]) {
  if (type === "lease") return "bg-blue-50 text-blue-600";
  if (type === "inspection") return "bg-teal-50 text-teal-600";
  if (type === "warranty") return "bg-purple-50 text-purple-600";
  if (type === "receipt") return "bg-green-50 text-green-600";
  if (type === "application") return "bg-orange-50 text-orange-600";
  return "bg-slate-100 text-slate-600";
}

function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${className}`}>{children}</span>;
}

function PageHeader({ title, subtitle, action, onBack }: { title: string; subtitle?: string; action?: React.ReactNode; onBack?: () => void }) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex min-h-[54px] items-center gap-3 px-4 py-3">
        {onBack && (
          <button onClick={onBack} className="-ml-1.5 rounded-lg p-1.5 transition-colors hover:bg-muted" aria-label="Go back">
            <ArrowLeft className="h-5 w-5 text-foreground/60" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-black tracking-[-0.015em] text-foreground">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#1A3352] px-3 py-1.5 text-xs font-black text-white transition-all hover:bg-[#162B44] active:scale-95">
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function IconAction({ label, icon: Icon, tone = "neutral", onClick }: { label: string; icon: React.ElementType; tone?: "neutral" | "danger"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition-all hover:shadow-sm ${
        tone === "danger" ? "border-red-100 bg-red-50 text-red-700" : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
      aria-label={label}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-[#1A3352]/40 focus:ring-2 focus:ring-[#1A3352]/20"
      />
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="py-14 text-center">
      <Icon className="mx-auto mb-3 h-9 w-9 text-muted-foreground/30" />
      <p className="text-sm font-black text-foreground">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "U") + (parts[1]?.[0] || "");
}

const NAV_ITEMS = [
  { id: "dashboard" as Tab, label: "Today", Icon: Home },
  { id: "properties" as Tab, label: "Properties", Icon: Building2 },
  { id: "tasks" as Tab, label: "Tasks", Icon: CheckSquare },
  { id: "documents" as Tab, label: "Docs", Icon: FileText },
  { id: "settings" as Tab, label: "Settings", Icon: Settings },
];

function BottomNav({ active, onChange, badge }: { active: Tab; onChange: (tab: Tab) => void; badge: number }) {
  return (
    <nav className="border-t border-border bg-card lg:hidden">
      <div className="flex">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const activeItem = active === id;
          return (
            <button key={id} onClick={() => onChange(id)} className={`relative flex min-h-[60px] flex-1 flex-col items-center gap-0.5 pb-3 pt-2 transition-colors ${activeItem ? "text-[#1A3352]" : "text-muted-foreground"}`}>
              {activeItem && <span className="absolute top-0 h-[2px] w-8 rounded-full bg-[#1A3352]" />}
              <span className="relative">
                <Icon className="h-[21px] w-[21px]" />
                {id === "dashboard" && badge > 0 && <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">{badge > 9 ? "9+" : badge}</span>}
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
    <aside className="hidden h-full w-[232px] flex-shrink-0 flex-col bg-[#1A3352] lg:flex">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-[18px]">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/15"><Home className="h-4 w-4 text-white" /></div>
        <span className="text-[15px] font-black tracking-[-0.03em] text-white">Keystone</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const activeItem = active === id;
          return (
            <button key={id} onClick={() => onChange(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all ${activeItem ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/10 hover:text-white"}`}>
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              {id === "dashboard" && badge > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{badge}</span>}
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

function Dashboard({ data, profile, reminders, notificationsEnabled, onNav, onToggleNotifications }: { data: AppData; profile: AppProfile; reminders: ReminderItem[]; notificationsEnabled: boolean; onNav: (tab: Tab) => void; onToggleNotifications: () => void }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const totals = useMemo(() => {
    const units = data.properties.reduce((sum, p) => sum + p.units, 0);
    const revenue = data.tenants.reduce((sum, t) => sum + Number(t.rent || 0), 0);
    const openMaintenance = data.maintenance.filter((m) => m.status !== "resolved");
    const urgent = openMaintenance.filter((m) => m.priority === "high");
    const expiring = data.tenants.filter((t) => t.status === "expiring" || t.status === "expired");
    const pendingTasks = data.tasks.filter((t) => t.status === "pending");
    return { units, revenue, openMaintenance, urgent, expiring, pendingTasks };
  }, [data]);

  return (
    <div className="pb-24 lg:pb-10">
      <div className="px-4 pb-2 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Friday, May 29, 2026</p>
            <h1 className="mt-1 text-2xl font-black leading-tight tracking-[-0.03em] text-foreground">Good morning,<br />{profile.name.split(" ")[0] || "there"}.</h1>
          </div>
          <button onClick={() => setShowNotifications((visible) => !visible)} className="relative mt-1 flex-shrink-0 rounded-xl p-2.5 transition-colors hover:bg-muted" aria-label="Notifications">
            <Bell className="h-5 w-5 text-foreground/60" />
            {reminders.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-red-500 px-1 text-[10px] font-black text-white">{reminders.length > 9 ? "9+" : reminders.length}</span>}
          </button>
        </div>
      </div>

      {showNotifications && (
        <section className="px-4 pb-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-foreground">Reminders</p>
                <p className="text-xs text-muted-foreground">{notificationsEnabled ? "Browser notifications enabled" : "In-app reminders active"}</p>
              </div>
              <button onClick={onToggleNotifications} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-black text-[#1A3352]">
                {notificationsEnabled ? "On" : "Enable"}
              </button>
            </div>
            <div className="space-y-2">
              {reminders.length === 0 ? (
                <p className="rounded-xl bg-background px-3 py-3 text-xs font-bold text-muted-foreground">No urgent reminders right now.</p>
              ) : reminders.slice(0, 8).map((reminder) => (
                <button key={reminder.id} onClick={() => onNav(reminder.tab)} className="flex w-full items-start gap-3 rounded-xl bg-background px-3 py-3 text-left">
                  <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${reminder.severity === "high" ? "bg-red-500" : reminder.severity === "medium" ? "bg-amber-400" : "bg-slate-300"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-black text-foreground">{reminder.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{reminder.detail}</span>
                  </span>
                  <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-2.5 px-4 pb-6 pt-5">
        {[
          { label: "Properties", value: String(data.properties.length), sub: `${totals.units} total units`, alert: false },
          { label: "Tenants", value: String(data.tenants.length), sub: `${Math.max(totals.units - data.tenants.length, 0)} vacant units`, alert: false },
          { label: "Open Requests", value: String(totals.openMaintenance.length), sub: `${totals.urgent.length} high priority`, alert: totals.openMaintenance.length > 0 },
          { label: "Monthly Revenue", value: money(totals.revenue), sub: "scheduled rent", alert: false },
        ].map((item) => (
          <div key={item.label} className={`rounded-2xl border p-4 ${item.alert ? "border-red-100 bg-red-50" : "border-border bg-card"}`}>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</p>
            <p className={`text-[22px] font-black leading-none tracking-[-0.04em] ${item.alert ? "text-red-700" : "text-foreground"}`}>{item.value}</p>
            <p className="mt-1.5 text-[11px] leading-tight text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>

      {(totals.urgent.length > 0 || totals.expiring.length > 0) && (
        <section className="mb-6 px-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-black tracking-tight text-foreground">Needs Attention</h2>
          </div>
          <div className="space-y-2.5">
            {totals.urgent.map((item) => (
              <div key={item.id} className="rounded-2xl border border-red-100 bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-50"><Wrench className="h-4 w-4 text-red-600" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black leading-tight text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-tight text-muted-foreground">{propertyName(data, item.propertyId)} - {item.unit} - {item.tenantName}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Chip className={statusStyle(item.status)}>{item.status === "in-progress" ? "In progress" : "Open"}</Chip>
                      <Chip className={priorityStyle(item.priority)}>High</Chip>
                    </div>
                  </div>
                  <button onClick={() => onNav("properties")} className="mt-0.5 flex-shrink-0 text-xs font-black text-[#1A3352] hover:opacity-60">View</button>
                </div>
              </div>
            ))}
            {totals.expiring.map((tenant) => (
              <div key={tenant.id} className="rounded-2xl border border-amber-100 bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50"><Calendar className="h-4 w-4 text-amber-600" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black leading-tight text-foreground">Lease expiring - {tenant.name}</p>
                    <p className="mt-0.5 text-xs leading-tight text-muted-foreground">{propertyName(data, tenant.propertyId)} - {tenant.unit} - ends {tenant.leaseEnd}</p>
                    <div className="mt-2"><Chip className={statusStyle(tenant.status)}>{tenant.status === "expired" ? "Expired" : "Expiring soon"}</Chip></div>
                  </div>
                  <button onClick={() => onNav("tasks")} className="mt-0.5 flex-shrink-0 text-xs font-black text-[#1A3352] hover:opacity-60">Renew</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6 px-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-[#0D9488]" /><h2 className="text-sm font-black tracking-tight text-foreground">Coming Up</h2></div>
          <button onClick={() => onNav("tasks")} className="text-xs font-black text-[#1A3352] hover:opacity-60">See all</button>
        </div>
        <div className="space-y-2">
          {totals.pendingTasks.slice(0, 5).map((task) => (
            <div key={task.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#0D9488]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold leading-tight text-foreground">{task.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{task.dueDate}</p>
              </div>
              <Chip className={priorityStyle(task.priority)}>{task.priority}</Chip>
            </div>
          ))}
          {totals.pendingTasks.length === 0 && <EmptyState icon={CheckCircle2} title="All caught up" subtitle="No open tasks right now." />}
        </div>
      </section>
    </div>
  );
}

function PropertiesList({ data, onSelect, onAdd, onEdit, onDelete }: { data: AppData; onSelect: (id: string) => void; onAdd: () => void; onEdit: (property: Property) => void; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = data.properties.filter((p) => `${p.name} ${p.address} ${p.city}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="pb-24 lg:pb-10">
      <PageHeader title="Properties" subtitle={`${data.properties.length} active properties`} action={<AddButton label="Add" onClick={onAdd} />} />
      <div className="px-4 py-3"><SearchInput value={query} onChange={setQuery} placeholder="Search by name or address..." /></div>
      <div className="space-y-4 px-4">
        {filtered.map((property) => {
          const stats = propertyStats(data, property.id);
          const openIssues = data.maintenance.filter((m) => m.propertyId === property.id && m.status !== "resolved").length;
          return (
            <div key={property.id} className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:border-[#1A3352]/20 hover:shadow-lg">
              <button onClick={() => onSelect(property.id)} className="w-full text-left active:scale-[0.99]">
                <div className="relative h-44 bg-slate-200">
                <img src={property.imageUrl || DEFAULT_IMAGES[0]} alt={property.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                {openIssues > 0 && <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-500 px-2 py-1 text-[10px] font-black text-white"><Wrench className="h-2.5 w-2.5" />{openIssues} open</div>}
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-black leading-tight text-white drop-shadow-sm">{property.name}</p>
                    <div className="mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0 text-white/75" /><p className="truncate text-xs text-white/80">{property.address}</p></div>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-black text-white ${stats.occupiedUnits === property.units ? "bg-teal-500" : "bg-amber-500"}`}>{stats.occupiedUnits}/{property.units}</span>
                </div>
              </div>
              </button>
              <div className="grid grid-cols-3 gap-2 px-4 pt-4">
                {[{ label: "Units", value: property.units }, { label: "Tenants", value: stats.tenants.length }, { label: "Monthly", value: money(stats.revenue) }].map((item) => (
                  <div key={item.label} className="rounded-xl bg-background py-2.5 text-center">
                    <p className="text-[15px] font-black tracking-[-0.03em] text-foreground">{item.value}</p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <button onClick={() => onSelect(property.id)} className="text-xs font-black text-[#1A3352]">Open</button>
                <div className="flex gap-2">
                  <IconAction label="Edit property" icon={Pencil} onClick={() => onEdit(property)} />
                  <IconAction label="Delete property" icon={Trash2} tone="danger" onClick={() => onDelete(property.id)} />
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <EmptyState icon={Building2} title="No properties found" subtitle="Try a different search or add a new property." />}
      </div>
    </div>
  );
}

function PropertyDetail({ data, propertyId, onBack, onAddTenant, onAddMaintenance, onAddDocument, onEditProperty, onDeleteProperty, onEditTenant, onDeleteTenant, onEditMaintenance, onDeleteMaintenance, onEditDocument, onDeleteDocument, updateMaintenance }: {
  data: AppData;
  propertyId: string;
  onBack: () => void;
  onAddTenant: () => void;
  onAddMaintenance: () => void;
  onAddDocument: () => void;
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (id: string) => void;
  onEditTenant: (tenant: Tenant) => void;
  onDeleteTenant: (id: string) => void;
  onEditMaintenance: (item: MaintenanceItem) => void;
  onDeleteMaintenance: (id: string) => void;
  onEditDocument: (doc: DocItem) => void;
  onDeleteDocument: (id: string) => void;
  updateMaintenance: (id: string, status: MaintenanceItem["status"]) => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "maintenance" | "documents">("overview");
  const property = data.properties.find((p) => p.id === propertyId);
  if (!property) return <PageHeader title="Property not found" onBack={onBack} />;

  const stats = propertyStats(data, propertyId);
  const maintenance = data.maintenance.filter((m) => m.propertyId === propertyId);
  const docs = data.docs.filter((d) => d.propertyId === propertyId);
  const openIssues = maintenance.filter((m) => m.status !== "resolved").length;
  const vacant = Math.max(property.units - stats.occupiedUnits, 0);

  return (
    <div className="pb-24 lg:pb-10">
      <PageHeader
        title={property.name}
        subtitle={property.city}
        onBack={onBack}
        action={
          <div className="flex items-center gap-2">
            {openIssues > 0 && <Chip className="border-red-100 bg-red-50 text-red-700">{openIssues} open</Chip>}
            <IconAction label="Edit property" icon={Pencil} onClick={() => onEditProperty(property)} />
            <IconAction label="Delete property" icon={Trash2} tone="danger" onClick={() => onDeleteProperty(property.id)} />
          </div>
        }
      />
      <div className="relative h-48 bg-slate-200">
        <img src={property.imageUrl || DEFAULT_IMAGES[0]} alt={property.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
      <div className="relative z-10 mx-4 -mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <div className="grid grid-cols-3 divide-x divide-border py-4 text-center">
          {[{ value: `${stats.occupiedUnits}/${property.units}`, label: "Occupied" }, { value: stats.tenants.length, label: "Tenants" }, { value: money(stats.revenue), label: "Monthly" }].map((item) => (
            <div key={item.label}><p className="text-lg font-black tracking-[-0.04em] text-foreground">{item.value}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p></div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-4 pb-0 pt-3 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{property.address}, {property.city}</div>

      <div className="px-4 pb-1 pt-4">
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
          {(["overview", "maintenance", "documents"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 rounded-lg py-2 text-xs font-black capitalize leading-none transition-all ${activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground/70"}`}>
              {tab}{tab === "maintenance" && openIssues > 0 && <span className="ml-1 text-red-500">({openIssues})</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-4 pt-4">
        {activeTab === "overview" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Units & Tenants</p>
              <button onClick={onAddTenant} className="flex items-center gap-1 text-xs font-black text-[#1A3352]"><Plus className="h-3.5 w-3.5" />Add tenant</button>
            </div>
            {stats.tenants.map((tenant) => (
              <div key={tenant.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-sm font-black leading-tight text-foreground">{tenant.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{tenant.unit} - {money(tenant.rent)}/mo</p></div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Chip className={statusStyle(tenant.status)}>{tenant.status === "expiring" ? "Expiring" : tenant.status}</Chip>
                    <IconAction label="Edit tenant" icon={Pencil} onClick={() => onEditTenant(tenant)} />
                    <IconAction label="Delete tenant" icon={Trash2} tone="danger" onClick={() => onDeleteTenant(tenant.id)} />
                  </div>
                </div>
                <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /><span>{tenant.leaseStart} - {tenant.leaseEnd}</span></div>
                {tenant.notes && <p className="mb-3 rounded-xl bg-muted/40 px-3 py-2 text-xs italic leading-relaxed text-muted-foreground">"{tenant.notes}"</p>}
                <div className="flex items-center gap-3 border-t border-border pt-3">
                  <a href={`tel:${tenant.phone}`} className="flex items-center gap-1.5 text-xs font-black text-[#1A3352] hover:opacity-60"><Phone className="h-3.5 w-3.5" />{tenant.phone}</a>
                  <span className="h-3 w-px bg-border" />
                  <a href={`mailto:${tenant.email}`} className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-black text-[#1A3352] hover:opacity-60"><Mail className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{tenant.email}</span></a>
                </div>
              </div>
            ))}
            {vacant > 0 && (
              <button onClick={onAddTenant} className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-border p-4 text-left transition-colors hover:border-[#1A3352]/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted"><Plus className="h-4 w-4 text-muted-foreground" /></div>
                <div><p className="text-sm font-bold text-foreground">{vacant} vacant {vacant === 1 ? "unit" : "units"}</p><p className="text-xs text-muted-foreground">Add tenant details and lease dates</p></div>
              </button>
            )}
          </>
        )}

        {activeTab === "maintenance" && (
          <>
            <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Requests</p><button onClick={onAddMaintenance} className="flex items-center gap-1 text-xs font-black text-[#1A3352]"><Plus className="h-3.5 w-3.5" />Add</button></div>
            {maintenance.length === 0 ? <EmptyState icon={Wrench} title="No maintenance requests" /> : maintenance.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm font-black leading-tight text-foreground">{item.title}</p>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Chip className={statusStyle(item.status)}>{item.status === "in-progress" ? "In progress" : item.status}</Chip>
                    <IconAction label="Edit maintenance" icon={Pencil} onClick={() => onEditMaintenance(item)} />
                    <IconAction label="Delete maintenance" icon={Trash2} tone="danger" onClick={() => onDeleteMaintenance(item.id)} />
                  </div>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{item.unit} - {item.tenantName}</span><span>{item.date}</span>{item.vendor && <span className="font-bold text-[#1A3352]">{item.vendor}</span>}</div>
                <div className="flex items-center justify-between gap-2">
                  <Chip className={priorityStyle(item.priority)}>{item.priority}</Chip>
                  {item.status !== "resolved" ? <button onClick={() => updateMaintenance(item.id, "resolved")} className="text-xs font-black text-[#0D9488]">Mark resolved</button> : <button onClick={() => updateMaintenance(item.id, "open")} className="text-xs font-black text-[#1A3352]">Reopen</button>}
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === "documents" && (
          <>
            <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Files</p><button onClick={onAddDocument} className="flex items-center gap-1 text-xs font-black text-[#1A3352]"><Upload className="h-3.5 w-3.5" />Upload</button></div>
            {docs.length === 0 ? <EmptyState icon={FileText} title="No documents yet" /> : docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${docColor(doc.type)}`}><FileText className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-foreground">{doc.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{doc.date} - {doc.size}{doc.fileName ? ` - ${doc.fileName}` : ""}</p></div>
                <div className="flex flex-shrink-0 gap-2">
                  {doc.filePath && <IconAction label="Open file" icon={Download} onClick={() => openDocumentFile(doc.filePath!)} />}
                  <IconAction label="Edit document" icon={Pencil} onClick={() => onEditDocument(doc)} />
                  <IconAction label="Delete document" icon={Trash2} tone="danger" onClick={() => onDeleteDocument(doc.id)} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Tasks({ data, onAdd, onEdit, onDelete, toggleTask }: { data: AppData; onAdd: () => void; onEdit: (task: TaskItem) => void; onDelete: (id: string) => void; toggleTask: (id: string) => void }) {
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low" | "done">("all");
  const visible = data.tasks.filter((task) => filter === "done" ? task.status === "done" : task.status === "pending" && (filter === "all" || task.priority === filter));
  const highCount = data.tasks.filter((task) => task.status === "pending" && task.priority === "high").length;

  return (
    <div className="pb-24 lg:pb-10">
      <PageHeader title="Tasks" subtitle={`${data.tasks.filter((t) => t.status === "pending").length} open - ${highCount} urgent`} action={<AddButton label="Add" onClick={onAdd} />} />
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {(["all", "high", "medium", "low", "done"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-black capitalize transition-all ${filter === item ? "bg-[#1A3352] text-white" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}>{item}</button>)}
      </div>
      <div className="space-y-2 px-4">
        {visible.length === 0 ? <EmptyState icon={CheckCircle2} title="Nothing here" subtitle="Try a different filter or add a task." /> : visible.map((task) => (
          <div key={task.id} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
            <button onClick={() => toggleTask(task.id)} className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${task.status === "done" ? "border-[#0D9488] bg-[#0D9488]" : "border-border hover:border-[#0D9488] hover:bg-teal-50"}`} aria-label="Toggle task">{task.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}</button>
            <div className="min-w-0 flex-1"><p className={`text-[13px] font-bold leading-tight ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</p><div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{propertyName(data, task.propertyId)}</span><span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{task.dueDate}</span></div></div>
            <div className="flex flex-shrink-0 flex-col items-end gap-1.5"><Chip className={priorityStyle(task.priority)}>{task.priority}</Chip><span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black capitalize text-slate-600">{task.type}</span></div>
            <div className="flex flex-shrink-0 flex-col gap-1.5">
              <IconAction label="Edit task" icon={Pencil} onClick={() => onEdit(task)} />
              <IconAction label="Delete task" icon={Trash2} tone="danger" onClick={() => onDelete(task.id)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Documents({ data, onAdd, onEdit, onDelete }: { data: AppData; onAdd: () => void; onEdit: (doc: DocItem) => void; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<DocItem["type"] | "all">("all");
  const filtered = data.docs.filter((doc) => {
    const text = `${doc.name} ${doc.tenantName} ${propertyName(data, doc.propertyId)}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (type === "all" || doc.type === type);
  });

  return (
    <div className="pb-24 lg:pb-10">
      <PageHeader title="Documents" subtitle={`${data.docs.length} files`} action={<AddButton label="Upload" onClick={onAdd} />} />
      <div className="px-4 pb-2 pt-3">
        <div className="mb-3"><SearchInput value={query} onChange={setQuery} placeholder="Search documents..." /></div>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {(["all", "lease", "inspection", "warranty", "receipt", "application", "other"] as const).map((item) => <button key={item} onClick={() => setType(item)} className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-black capitalize transition-all ${type === item ? "bg-[#1A3352] text-white" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}>{item === "all" ? "All" : item}</button>)}
        </div>
      </div>
      <div className="space-y-2 px-4">
        {filtered.length === 0 ? <EmptyState icon={FileText} title="No documents found" /> : filtered.map((doc) => (
          <div key={doc.id} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-[#1A3352]/20 hover:shadow-sm">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${docColor(doc.type)}`}><FileText className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold text-foreground">{doc.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{propertyName(data, doc.propertyId)}{doc.tenantName ? ` - ${doc.tenantName}` : ""} - {doc.date} - {doc.size}{doc.fileName ? ` - ${doc.fileName}` : ""}</p></div>
            <div className="flex flex-shrink-0 gap-2">
              {doc.filePath && <IconAction label="Open file" icon={Download} onClick={() => openDocumentFile(doc.filePath!)} />}
              <IconAction label="Edit document" icon={Pencil} onClick={() => onEdit(doc)} />
              <IconAction label="Delete document" icon={Trash2} tone="danger" onClick={() => onDelete(doc.id)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsScreen({ data, profile, notificationsEnabled, resetData, exportData, replayOnboarding, onToggleNotifications, onSignOut }: { data: AppData; profile: AppProfile; notificationsEnabled: boolean; resetData: () => void; exportData: () => void; replayOnboarding: () => void; onToggleNotifications: () => void; onSignOut: () => void }) {
  const monthly = data.tenants.reduce((sum, tenant) => sum + Number(tenant.rent || 0), 0);
  const items = [
    { section: "Portfolio", rows: [{ Icon: Building2, label: "Properties", value: `${data.properties.length} active` }, { Icon: Users, label: "Tenants", value: `${data.tenants.length} active` }, { Icon: DollarSign, label: "Rent roll", value: `${money(monthly)}/mo` }] },
    { section: "Preferences", rows: [{ Icon: Bell, label: "Notifications", value: "Email & push" }, { Icon: Calendar, label: "Lease renewal alerts", value: "60 days before" }] },
    { section: "Account", rows: [{ Icon: Shield, label: "Security", value: "" }, { Icon: Lock, label: "Privacy", value: "" }, { Icon: HelpCircle, label: "Help & support", value: "" }] },
  ];

  return (
    <div className="pb-24 lg:pb-10">
      <PageHeader title="Settings" />
      <div className="px-4 pt-4">
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#1A3352] text-lg font-black uppercase text-white">{initials(profile.name)}</div>
          <div className="min-w-0 flex-1"><p className="font-black tracking-[-0.02em] text-foreground">{profile.name}</p><p className="text-sm text-muted-foreground">{profile.email}</p><p className="mt-1 text-xs text-muted-foreground">{data.properties.length} properties - {data.tenants.length} tenants</p></div>
        </div>
        {items.map((section) => (
          <div key={section.section} className="mb-5">
            <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{section.section}</p>
            <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
              {section.rows.map(({ Icon, label, value }) => (
                <button key={label} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30">
                  <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-[13px] font-bold text-foreground">{label}</span>
                  {value && <span className="text-xs text-muted-foreground">{value}</span>}
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={exportData} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-black text-[#1A3352]"><Download className="h-4 w-4" />Export</button>
          <button onClick={resetData} className="flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-black text-red-700"><RefreshCcw className="h-4 w-4" />Reset demo</button>
        </div>
        <button onClick={onToggleNotifications} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-black text-muted-foreground">
          <Bell className="h-4 w-4" />
          Browser notifications {notificationsEnabled ? "on" : "off"}
        </button>
        <button onClick={replayOnboarding} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-black text-muted-foreground">
          <User className="h-4 w-4" />
          Replay onboarding
        </button>
        <button onClick={onSignOut} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-black text-muted-foreground">
          <Lock className="h-4 w-4" />
          Sign out
        </button>
        <div className="pb-4 pt-6 text-center"><p className="text-xs font-bold text-muted-foreground">Keystone - v1.1.0</p><p className="mt-0.5 text-xs text-muted-foreground">Your rentals, organized.</p></div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[#1A3352]/40 focus:ring-2 focus:ring-[#1A3352]/20";

function AppModal({ kind, data, selectedProperty, editRecord, saving, onClose, onSave }: { kind: ModalKind; data: AppData; selectedProperty: string | null; editRecord: EditableRecord; saving: boolean; onClose: () => void; onSave: (kind: Exclude<ModalKind, null>, payload: Record<string, FormDataEntryValue>, editRecord: EditableRecord) => Promise<void> }) {
  if (!kind) return null;
  const editing = editRecord?.kind === kind;
  const item = editing ? editRecord.item : null;
  const titlePrefix = editing ? "Edit" : "Add";
  const title = kind === "property" ? `${titlePrefix} Property` : kind === "tenant" ? `${titlePrefix} Tenant` : kind === "maintenance" ? `${titlePrefix} Maintenance` : kind === "task" ? `${titlePrefix} Task` : editing ? "Edit Document" : "Upload Document";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(kind, Object.fromEntries(new FormData(event.currentTarget)), editRecord);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-0 sm:items-center sm:justify-center sm:p-4">
      <form onSubmit={submit} className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-4 shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><p className="text-lg font-black tracking-[-0.03em] text-foreground">{title}</p><p className="text-xs text-muted-foreground">Saved to your cloud portfolio automatically.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          {kind === "property" && (
            <>
              <Field label="Property name"><input name="name" required defaultValue={(item as Property | null)?.name || ""} className={inputClass} placeholder="Cedar Lane Apartments" /></Field>
              <Field label="Street address"><input name="address" required defaultValue={(item as Property | null)?.address || ""} className={inputClass} placeholder="100 Cedar Lane" /></Field>
              <Field label="City / ZIP"><input name="city" required defaultValue={(item as Property | null)?.city || ""} className={inputClass} placeholder="Oakland, CA 94610" /></Field>
              <Field label="Units"><input name="units" type="number" min="1" defaultValue={(item as Property | null)?.units || 1} required className={inputClass} /></Field>
              <Field label="Image URL"><input name="imageUrl" defaultValue={(item as Property | null)?.imageUrl || ""} className={inputClass} placeholder="Optional property photo URL" /></Field>
            </>
          )}

          {(kind === "tenant" || kind === "maintenance" || kind === "task" || kind === "document") && (
            <Field label="Property">
              <select name="propertyId" defaultValue={(item as Tenant | MaintenanceItem | TaskItem | DocItem | null)?.propertyId || selectedProperty || ""} className={inputClass} required={kind !== "task"}>
                {kind === "task" && <option value="">All properties</option>}
                {data.properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
              </select>
            </Field>
          )}

          {kind === "tenant" && (
            <>
              <Field label="Tenant name"><input name="name" required defaultValue={(item as Tenant | null)?.name || ""} className={inputClass} placeholder="Alex Morgan" /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Unit"><input name="unit" required defaultValue={(item as Tenant | null)?.unit || ""} className={inputClass} placeholder="Unit 3B" /></Field><Field label="Rent"><input name="rent" type="number" min="0" defaultValue={(item as Tenant | null)?.rent || ""} required className={inputClass} placeholder="2100" /></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="Phone"><input name="phone" defaultValue={(item as Tenant | null)?.phone || ""} className={inputClass} placeholder="(510) 555-0100" /></Field><Field label="Email"><input name="email" type="email" defaultValue={(item as Tenant | null)?.email || ""} className={inputClass} placeholder="tenant@email.com" /></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="Lease start"><input name="leaseStart" required defaultValue={(item as Tenant | null)?.leaseStart || ""} className={inputClass} placeholder="Jun 1, 2026" /></Field><Field label="Lease end"><input name="leaseEnd" required defaultValue={(item as Tenant | null)?.leaseEnd || ""} className={inputClass} placeholder="May 31, 2027" /></Field></div>
              <Field label="Status"><select name="status" defaultValue={(item as Tenant | null)?.status || "active"} className={inputClass}><option value="active">Active</option><option value="expiring">Expiring</option><option value="expired">Expired</option></select></Field>
              <Field label="Notes"><textarea name="notes" rows={3} defaultValue={(item as Tenant | null)?.notes || ""} className={inputClass} placeholder="Preferences, reminders, lease notes" /></Field>
            </>
          )}

          {kind === "maintenance" && (
            <>
              <Field label="Title"><input name="title" required defaultValue={(item as MaintenanceItem | null)?.title || ""} className={inputClass} placeholder="Garbage disposal jammed" /></Field>
              <Field label="Description"><textarea name="description" rows={3} required defaultValue={(item as MaintenanceItem | null)?.description || ""} className={inputClass} placeholder="What happened and what needs to be done?" /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Unit"><input name="unit" defaultValue={(item as MaintenanceItem | null)?.unit || ""} className={inputClass} placeholder="Unit A" /></Field><Field label="Tenant"><input name="tenantName" defaultValue={(item as MaintenanceItem | null)?.tenantName || ""} className={inputClass} placeholder="Tenant name" /></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="Priority"><select name="priority" defaultValue={(item as MaintenanceItem | null)?.priority || "medium"} className={inputClass}><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></Field><Field label="Status"><select name="status" defaultValue={(item as MaintenanceItem | null)?.status || "open"} className={inputClass}><option value="open">Open</option><option value="in-progress">In progress</option><option value="resolved">Resolved</option></select></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="Date"><input name="date" required defaultValue={(item as MaintenanceItem | null)?.date || ""} className={inputClass} placeholder="May 29, 2026" /></Field><Field label="Vendor"><input name="vendor" defaultValue={(item as MaintenanceItem | null)?.vendor || ""} className={inputClass} placeholder="Optional" /></Field></div>
            </>
          )}

          {kind === "task" && (
            <>
              <Field label="Task"><input name="title" required defaultValue={(item as TaskItem | null)?.title || ""} className={inputClass} placeholder="Send renewal offer" /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Type"><select name="type" defaultValue={(item as TaskItem | null)?.type || "reminder"} className={inputClass}><option value="lease">Lease</option><option value="inspection">Inspection</option><option value="maintenance">Maintenance</option><option value="financial">Financial</option><option value="reminder">Reminder</option></select></Field><Field label="Priority"><select name="priority" defaultValue={(item as TaskItem | null)?.priority || "medium"} className={inputClass}><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></Field></div>
              <Field label="Due date"><input name="dueDate" required defaultValue={(item as TaskItem | null)?.dueDate || ""} className={inputClass} placeholder="Jun 15, 2026" /></Field>
              {editing && <Field label="Status"><select name="status" defaultValue={(item as TaskItem | null)?.status || "pending"} className={inputClass}><option value="pending">Pending</option><option value="done">Done</option></select></Field>}
            </>
          )}

          {kind === "document" && (
            <>
              <Field label="Document name"><input name="name" required defaultValue={(item as DocItem | null)?.name || ""} className={inputClass} placeholder="Lease Agreement - Alex Morgan" /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Type"><select name="type" defaultValue={(item as DocItem | null)?.type || "lease"} className={inputClass}><option value="lease">Lease</option><option value="inspection">Inspection</option><option value="warranty">Warranty</option><option value="receipt">Receipt</option><option value="application">Application</option><option value="other">Other</option></select></Field><Field label="Size"><input name="size" defaultValue={(item as DocItem | null)?.size || ""} className={inputClass} placeholder="320 KB" /></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="Tenant"><input name="tenantName" defaultValue={(item as DocItem | null)?.tenantName || ""} className={inputClass} placeholder="Optional" /></Field><Field label="Date"><input name="date" required defaultValue={(item as DocItem | null)?.date || ""} className={inputClass} placeholder="May 29, 2026" /></Field></div>
              <Field label={editing ? "Replace file" : "Attach file"}><input name="file" type="file" className={inputClass} /></Field>
              {editing && (item as DocItem | null)?.fileName && <p className="rounded-xl bg-background px-3 py-2 text-xs font-bold text-muted-foreground">Current file: {(item as DocItem).fileName}</p>}
            </>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-black text-muted-foreground disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[#1A3352] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "Saving..." : editing ? "Save changes" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}

function AuthShell({ children, eyebrow, title, subtitle }: { children: React.ReactNode; eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden bg-[#1A3352] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="mb-10 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Home className="h-5 w-5" /></div>
            <span className="text-lg font-black tracking-[-0.03em]">Keystone</span>
          </div>
          <h1 className="max-w-md text-4xl font-black leading-tight tracking-[-0.05em]">Your rental data, tied to your account.</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/68">Sign in on your Mac, iPhone, or iPad and keep the same portfolio synced through Supabase.</p>
        </div>
        <div className="grid gap-3">
          {[
            { label: "Accounts", value: "Email sign-in" },
            { label: "Database", value: "Cloud synced" },
            { label: "Security", value: "Row-level policies" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <span className="text-sm font-bold text-white/75">{item.label}</span>
              <span className="text-sm font-black">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-[440px]">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1A3352] text-white"><Home className="h-4 w-4" /></div>
            <span className="font-black tracking-[-0.03em] text-foreground">Keystone</span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
            <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-foreground">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function CloudSetupScreen() {
  return (
    <AuthShell
      eyebrow="Cloud setup required"
      title="Connect Supabase before public beta signups."
      subtitle="The app is account-gated now. Add your Supabase project URL and anon key, then run the included SQL schema."
    >
      <div className="mt-6 space-y-3">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">1. Environment</p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-[#0D1422] p-3 text-xs leading-5 text-white">{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key`}</pre>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">2. Database</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Run <span className="font-black text-foreground">supabase/schema.sql</span> in the Supabase SQL editor to create the secured portfolio table.</p>
        </div>
      </div>
    </AuthShell>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (result.error) throw result.error;
      setMessage(mode === "signin" ? "Signed in. Loading your portfolio..." : "Account created. Check your email if confirmation is enabled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow={mode === "signin" ? "Welcome back" : "Create account"}
      title={mode === "signin" ? "Sign in to Keystone." : "Start your Keystone account."}
      subtitle="Your portfolio syncs to the cloud after you sign in."
    >
      <form onSubmit={submit} className="mt-6 space-y-3">
        <Field label="Email"><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className={inputClass} placeholder="you@email.com" /></Field>
        <Field label="Password"><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={6} className={inputClass} placeholder="At least 6 characters" /></Field>
        {message && <p className="rounded-xl bg-background px-3 py-2 text-xs font-bold leading-5 text-muted-foreground">{message}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-[#1A3352] px-4 py-3 text-sm font-black text-white transition-all disabled:opacity-50">
          {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 w-full text-center text-xs font-black text-[#1A3352]">
        {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </AuthShell>
  );
}

function OnboardingFlow({ onComplete }: { onComplete: (setup: OnboardingSetup) => void }) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"sample" | "fresh">("sample");
  const [profile, setProfile] = useState<AppProfile>({
    name: "",
    email: "",
    portfolioName: "My rental portfolio",
  });
  const [property, setProperty] = useState({
    name: "",
    address: "",
    city: "",
    units: 1,
  });

  const steps = ["Welcome", "Profile", "Portfolio"];
  const canContinue = step === 0 || (step === 1 ? profile.name.trim().length > 1 && profile.email.trim().length > 3 : mode === "sample" || property.name.trim().length > 1);

  function finish() {
    onComplete({
      profile: {
        name: profile.name.trim() || DEFAULT_PROFILE.name,
        email: profile.email.trim() || DEFAULT_PROFILE.email,
        portfolioName: profile.portfolioName.trim() || "My rental portfolio",
      },
      mode,
      property: mode === "fresh" ? {
        name: property.name.trim(),
        address: property.address.trim(),
        city: property.city.trim(),
        units: Math.max(Number(property.units || 1), 1),
      } : undefined,
    });
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[0.92fr_1.08fr]">
      <section className="relative hidden overflow-hidden bg-[#1A3352] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="mb-10 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Home className="h-5 w-5" /></div>
            <span className="text-lg font-black tracking-[-0.03em]">Keystone</span>
          </div>
          <h1 className="max-w-md text-4xl font-black leading-tight tracking-[-0.05em]">Bring your rentals into focus before the day starts.</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/68">Set up the essentials once, then manage properties, tenants, tasks, maintenance, and documents from one calm workspace.</p>
        </div>
        <div className="grid gap-3">
          {[
            { label: "Lease renewals", value: "60-day alerts" },
            { label: "Maintenance", value: "Priority tracking" },
            { label: "Documents", value: "Property organized" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <span className="text-sm font-bold text-white/78">{item.label}</span>
              <span className="text-sm font-black">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-[520px]">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1A3352] text-white"><Home className="h-4 w-4" /></div>
              <span className="font-black tracking-[-0.03em] text-foreground">Keystone</span>
            </div>
            <div className="ml-auto flex gap-1.5">
              {steps.map((label, index) => (
                <span key={label} className={`h-1.5 rounded-full transition-all ${index === step ? "w-7 bg-[#1A3352]" : index < step ? "w-4 bg-[#0D9488]" : "w-4 bg-muted"}`} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            {step === 0 && (
              <div>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF8F6]"><Building2 className="h-6 w-6 text-[#0D9488]" /></div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Welcome</p>
                <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-foreground">Let’s set up your rental command center.</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">Keystone works best when it starts with your name, your portfolio, and at least one property. You can use sample data first or begin with your own clean workspace.</p>
                <div className="mt-6 grid gap-2">
                  {[
                    { Icon: CheckSquare, title: "Track work", copy: "Tasks, reminders, and lease renewals stay visible." },
                    { Icon: Wrench, title: "Handle maintenance", copy: "Open requests are grouped by property and priority." },
                    { Icon: FileText, title: "Organize documents", copy: "Leases, inspections, receipts, and warranties live together." },
                  ].map(({ Icon, title, copy }) => (
                    <div key={title} className="flex gap-3 rounded-xl bg-background p-3">
                      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1A3352]" />
                      <div><p className="text-sm font-black text-foreground">{title}</p><p className="text-xs leading-5 text-muted-foreground">{copy}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Your profile</p>
                <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-foreground">First, tell Keystone who is managing the portfolio.</h2>
                <div className="mt-6 space-y-3">
                  <Field label="Full name"><input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className={inputClass} placeholder="Your name" /></Field>
                  <Field label="Email"><input value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} type="email" className={inputClass} placeholder="you@email.com" /></Field>
                  <Field label="Portfolio name"><input value={profile.portfolioName} onChange={(event) => setProfile({ ...profile, portfolioName: event.target.value })} className={inputClass} placeholder="My rental portfolio" /></Field>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Portfolio start</p>
                <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-foreground">Choose how you want to begin.</h2>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => setMode("sample")} className={`rounded-2xl border p-4 text-left transition-all ${mode === "sample" ? "border-[#1A3352] bg-[#1A3352]/5 ring-2 ring-[#1A3352]/10" : "border-border bg-background"}`}>
                    <CheckCircle2 className={`mb-3 h-5 w-5 ${mode === "sample" ? "text-[#0D9488]" : "text-muted-foreground"}`} />
                    <p className="text-sm font-black text-foreground">Use sample portfolio</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Best for exploring the app with realistic data.</p>
                  </button>
                  <button type="button" onClick={() => setMode("fresh")} className={`rounded-2xl border p-4 text-left transition-all ${mode === "fresh" ? "border-[#1A3352] bg-[#1A3352]/5 ring-2 ring-[#1A3352]/10" : "border-border bg-background"}`}>
                    <Plus className={`mb-3 h-5 w-5 ${mode === "fresh" ? "text-[#1A3352]" : "text-muted-foreground"}`} />
                    <p className="text-sm font-black text-foreground">Start with my property</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Create a clean workspace with one property.</p>
                  </button>
                </div>

                {mode === "fresh" && (
                  <div className="mt-5 space-y-3">
                    <Field label="Property name"><input value={property.name} onChange={(event) => setProperty({ ...property, name: event.target.value })} className={inputClass} placeholder="Cedar Lane Apartments" /></Field>
                    <Field label="Street address"><input value={property.address} onChange={(event) => setProperty({ ...property, address: event.target.value })} className={inputClass} placeholder="100 Cedar Lane" /></Field>
                    <div className="grid grid-cols-[1fr_96px] gap-3">
                      <Field label="City / ZIP"><input value={property.city} onChange={(event) => setProperty({ ...property, city: event.target.value })} className={inputClass} placeholder="Oakland, CA 94610" /></Field>
                      <Field label="Units"><input value={property.units} onChange={(event) => setProperty({ ...property, units: Number(event.target.value || 1) })} type="number" min="1" className={inputClass} /></Field>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-7 flex items-center gap-2">
              {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-black text-muted-foreground">Back</button>}
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => step === 2 ? finish() : setStep(step + 1)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1A3352] px-4 py-3 text-sm font-black text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                {step === 2 ? "Enter Keystone" : "Continue"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [data, setData] = useStoredData();
  const [profile, setProfile] = useStoredProfile();
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem("keystone-onboarding-complete") === "true");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("Local data");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [editRecord, setEditRecord] = useState<EditableRecord>(null);
  const [savingRecord, setSavingRecord] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem("keystone-browser-notifications") === "true");
  const [lastNotificationKey, setLastNotificationKey] = useState("");

  const serializedData = JSON.stringify(data);
  const serializedProfile = JSON.stringify(profile);
  const badge = data.maintenance.filter((m) => m.priority === "high" && m.status !== "resolved").length + data.tenants.filter((t) => t.status === "expiring" || t.status === "expired").length;
  const reminders = useMemo(() => buildReminders(data), [serializedData]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data: authData }) => {
      if (!mounted) return;
      setSession(authData.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (!nextSession) {
        setCloudReady(false);
        setCloudStatus("Signed out");
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;

    let cancelled = false;
    setCloudLoading(true);
    setCloudStatus("Loading cloud data...");

    loadCloudPortfolio(session.user.id)
      .then((portfolio) => {
        if (cancelled) return;
        if (portfolio) {
          if (portfolio.profile) setProfile({ ...DEFAULT_PROFILE, ...portfolio.profile });
          if (portfolio.data) setData({ ...INITIAL_DATA, ...portfolio.data });
          setOnboarded(Boolean(portfolio.onboarded));
          localStorage.setItem("keystone-onboarding-complete", String(Boolean(portfolio.onboarded)));
        } else {
          setOnboarded(false);
          localStorage.removeItem("keystone-onboarding-complete");
        }
        setCloudReady(true);
        setCloudStatus("Cloud synced");
      })
      .catch((error) => {
        if (cancelled) return;
        setCloudStatus(error instanceof Error ? error.message : "Cloud load failed");
      })
      .finally(() => {
        if (!cancelled) setCloudLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !cloudReady) return;

    setCloudStatus("Saving...");
    const timer = window.setTimeout(() => {
      saveCloudPortfolio(session.user.id, profile, data, onboarded)
        .then(() => setCloudStatus("Cloud synced"))
        .catch((error) => setCloudStatus(error instanceof Error ? error.message : "Cloud save failed"));
    }, 500);

    return () => window.clearTimeout(timer);
  }, [session?.user.id, cloudReady, serializedData, serializedProfile, onboarded]);

  useEffect(() => {
    if (!notificationsEnabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const urgent = reminders.filter((reminder) => reminder.severity === "high");
    if (urgent.length === 0) return;

    const key = urgent.map((reminder) => reminder.id).join("|");
    if (key === lastNotificationKey) return;

    new Notification("Home Harbor reminders", {
      body: `${urgent.length} urgent ${urgent.length === 1 ? "item needs" : "items need"} your attention.`,
    });
    setLastNotificationKey(key);
  }, [notificationsEnabled, reminders, lastNotificationKey]);

  function navigate(next: Tab) {
    setTab(next);
    if (next !== "properties") setSelectedProperty(null);
  }

  function openAdd(kind: Exclude<ModalKind, null>) {
    setEditRecord(null);
    setModal(kind);
  }

  function openEdit(record: Exclude<EditableRecord, null>) {
    setEditRecord(record);
    setModal(record.kind);
  }

  function closeModal() {
    setModal(null);
    setEditRecord(null);
  }

  async function save(kind: Exclude<ModalKind, null>, payload: Record<string, FormDataEntryValue>, editing: EditableRecord) {
    setSavingRecord(true);
    try {
      let uploadedDocPatch: Partial<DocItem> = {};
      if (kind === "document") {
        const file = payload.file instanceof File && payload.file.size > 0 ? payload.file : null;
        if (file) {
          if (!session?.user.id) throw new Error("Sign in before uploading files.");
          const documentId = editing?.kind === "document" ? editing.item.id : uid("d");
          const filePath = await uploadDocumentFile(session.user.id, file, documentId);
          uploadedDocPatch = {
            id: documentId,
            filePath,
            fileName: file.name,
            mimeType: file.type,
            uploadedAt: new Date().toISOString(),
            size: fileSizeLabel(file.size),
          };
        }
      }

      setData((current) => {
      if (kind === "property") {
        const previous = editing?.kind === "property" ? editing.item : null;
        const imageUrl = String(payload.imageUrl || "").trim() || previous?.imageUrl || DEFAULT_IMAGES[current.properties.length % DEFAULT_IMAGES.length];
        const nextProperty = { id: previous?.id || uid("p"), name: String(payload.name), address: String(payload.address), city: String(payload.city), units: Number(payload.units || 1), imageUrl };
        return { ...current, properties: previous ? current.properties.map((property) => property.id === previous.id ? nextProperty : property) : [...current.properties, nextProperty] };
      }
      if (kind === "tenant") {
        const previous = editing?.kind === "tenant" ? editing.item : null;
        const nextTenant = { id: previous?.id || uid("t"), name: String(payload.name), phone: String(payload.phone || ""), email: String(payload.email || ""), propertyId: String(payload.propertyId), unit: String(payload.unit), rent: Number(payload.rent || 0), leaseStart: String(payload.leaseStart), leaseEnd: String(payload.leaseEnd), status: payload.status as Tenant["status"], notes: String(payload.notes || "") };
        return { ...current, tenants: previous ? current.tenants.map((tenant) => tenant.id === previous.id ? nextTenant : tenant) : [...current.tenants, nextTenant] };
      }
      if (kind === "maintenance") {
        const previous = editing?.kind === "maintenance" ? editing.item : null;
        const nextMaintenance = { id: previous?.id || uid("m"), title: String(payload.title), description: String(payload.description), propertyId: String(payload.propertyId), unit: String(payload.unit || ""), tenantName: String(payload.tenantName || ""), status: payload.status as MaintenanceItem["status"], priority: payload.priority as MaintenanceItem["priority"], date: String(payload.date), vendor: String(payload.vendor || "") };
        return { ...current, maintenance: previous ? current.maintenance.map((item) => item.id === previous.id ? nextMaintenance : item) : [...current.maintenance, nextMaintenance] };
      }
      if (kind === "task") {
        const previous = editing?.kind === "task" ? editing.item : null;
        const nextTask = { id: previous?.id || uid("tk"), title: String(payload.title), type: payload.type as TaskItem["type"], propertyId: String(payload.propertyId || ""), dueDate: String(payload.dueDate), status: (payload.status || previous?.status || "pending") as TaskItem["status"], priority: payload.priority as TaskItem["priority"] };
        return { ...current, tasks: previous ? current.tasks.map((task) => task.id === previous.id ? nextTask : task) : [...current.tasks, nextTask] };
      }
      const previous = editing?.kind === "document" ? editing.item : null;
      const nextDoc = {
        id: uploadedDocPatch.id || previous?.id || uid("d"),
        name: String(payload.name),
        type: payload.type as DocItem["type"],
        propertyId: String(payload.propertyId),
        tenantName: String(payload.tenantName || ""),
        date: String(payload.date),
        size: String(uploadedDocPatch.size || payload.size || previous?.size || "0 KB"),
        fileName: uploadedDocPatch.fileName || previous?.fileName,
        filePath: uploadedDocPatch.filePath || previous?.filePath,
        mimeType: uploadedDocPatch.mimeType || previous?.mimeType,
        uploadedAt: uploadedDocPatch.uploadedAt || previous?.uploadedAt,
      };
      return { ...current, docs: previous ? current.docs.map((doc) => doc.id === previous.id ? nextDoc : doc) : [...current.docs, nextDoc] };
      });
      closeModal();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingRecord(false);
    }
  }

  function deleteRecord(kind: Exclude<ModalKind, null>, id: string) {
    const labels = { property: "property", tenant: "tenant", maintenance: "maintenance request", task: "task", document: "document" };
    if (!window.confirm(`Delete this ${labels[kind]}? This cannot be undone.`)) return;

    setData((current) => {
      if (kind === "property") {
        return {
          ...current,
          properties: current.properties.filter((property) => property.id !== id),
          tenants: current.tenants.filter((tenant) => tenant.propertyId !== id),
          maintenance: current.maintenance.filter((item) => item.propertyId !== id),
          docs: current.docs.filter((doc) => doc.propertyId !== id),
          tasks: current.tasks.map((task) => task.propertyId === id ? { ...task, propertyId: "" } : task),
        };
      }
      if (kind === "tenant") return { ...current, tenants: current.tenants.filter((tenant) => tenant.id !== id) };
      if (kind === "maintenance") return { ...current, maintenance: current.maintenance.filter((item) => item.id !== id) };
      if (kind === "task") return { ...current, tasks: current.tasks.filter((task) => task.id !== id) };
      return { ...current, docs: current.docs.filter((doc) => doc.id !== id) };
    });

    if (kind === "property" && selectedProperty === id) {
      setSelectedProperty(null);
    }
  }

  function updateMaintenance(id: string, status: MaintenanceItem["status"]) {
    setData((current) => ({ ...current, maintenance: current.maintenance.map((item) => item.id === id ? { ...item, status } : item) }));
  }

  function toggleTask(id: string) {
    setData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, status: task.status === "done" ? "pending" : "done" } : task) }));
  }

  function resetData() {
    localStorage.removeItem("keystone-rental-data");
    setData(INITIAL_DATA);
  }

  function completeOnboarding(setup: OnboardingSetup) {
    setProfile(setup.profile);
    if (setup.mode === "fresh" && setup.property) {
      setData({
        properties: [{
          id: uid("p"),
          name: setup.property.name,
          address: setup.property.address || "Address not set",
          city: setup.property.city || "City not set",
          units: setup.property.units,
          imageUrl: DEFAULT_IMAGES[0],
        }],
        tenants: [],
        maintenance: [],
        tasks: [{
          id: uid("tk"),
          title: "Add first tenant",
          type: "reminder",
          propertyId: "",
          dueDate: "This week",
          status: "pending",
          priority: "medium",
        }],
        docs: [],
      });
    }
    localStorage.setItem("keystone-onboarding-complete", "true");
    setOnboarded(true);
    setTab("dashboard");
    setSelectedProperty(null);
  }

  function replayOnboarding() {
    localStorage.removeItem("keystone-onboarding-complete");
    setOnboarded(false);
  }

  async function toggleNotifications() {
    if (typeof Notification === "undefined") {
      window.alert("Browser notifications are not supported here.");
      return;
    }

    if (notificationsEnabled) {
      localStorage.removeItem("keystone-browser-notifications");
      setNotificationsEnabled(false);
      return;
    }

    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem("keystone-browser-notifications", "true");
      setNotificationsEnabled(true);
      new Notification("Home Harbor reminders enabled", {
        body: "You will be notified when urgent rental items need attention.",
      });
    } else {
      window.alert("Notifications were not enabled. You can allow them later in browser settings.");
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setSession(null);
    setCloudReady(false);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "keystone-rental-data.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderContent() {
    if (tab === "dashboard") return <Dashboard data={data} profile={profile} reminders={reminders} notificationsEnabled={notificationsEnabled} onNav={navigate} onToggleNotifications={toggleNotifications} />;
    if (tab === "properties") {
      return selectedProperty ? (
        <PropertyDetail
          data={data}
          propertyId={selectedProperty}
          onBack={() => setSelectedProperty(null)}
          onAddTenant={() => openAdd("tenant")}
          onAddMaintenance={() => openAdd("maintenance")}
          onAddDocument={() => openAdd("document")}
          onEditProperty={(property) => openEdit({ kind: "property", item: property })}
          onDeleteProperty={(id) => deleteRecord("property", id)}
          onEditTenant={(tenant) => openEdit({ kind: "tenant", item: tenant })}
          onDeleteTenant={(id) => deleteRecord("tenant", id)}
          onEditMaintenance={(item) => openEdit({ kind: "maintenance", item })}
          onDeleteMaintenance={(id) => deleteRecord("maintenance", id)}
          onEditDocument={(doc) => openEdit({ kind: "document", item: doc })}
          onDeleteDocument={(id) => deleteRecord("document", id)}
          updateMaintenance={updateMaintenance}
        />
      ) : (
        <PropertiesList data={data} onSelect={setSelectedProperty} onAdd={() => openAdd("property")} onEdit={(property) => openEdit({ kind: "property", item: property })} onDelete={(id) => deleteRecord("property", id)} />
      );
    }
    if (tab === "tasks") return <Tasks data={data} onAdd={() => openAdd("task")} onEdit={(task) => openEdit({ kind: "task", item: task })} onDelete={(id) => deleteRecord("task", id)} toggleTask={toggleTask} />;
    if (tab === "documents") return <Documents data={data} onAdd={() => openAdd("document")} onEdit={(doc) => openEdit({ kind: "document", item: doc })} onDelete={(id) => deleteRecord("document", id)} />;
    return <SettingsScreen data={data} profile={profile} notificationsEnabled={notificationsEnabled} resetData={resetData} exportData={exportData} replayOnboarding={replayOnboarding} onToggleNotifications={toggleNotifications} onSignOut={signOut} />;
  }

  if (!supabase) {
    return <CloudSetupScreen />;
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <Home className="mx-auto mb-3 h-8 w-8 text-[#1A3352]" />
          <p className="text-sm font-black text-foreground">Loading Keystone...</p>
          <p className="mt-1 text-xs text-muted-foreground">Checking your account session.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (cloudLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <Shield className="mx-auto mb-3 h-8 w-8 text-[#0D9488]" />
          <p className="text-sm font-black text-foreground">Loading your portfolio...</p>
          <p className="mt-1 text-xs text-muted-foreground">{cloudStatus}</p>
        </div>
      </div>
    );
  }

  if (!onboarded) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar active={tab} onChange={navigate} badge={badge} profile={profile} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="border-b border-border bg-card px-4 py-2 text-center text-[11px] font-bold text-muted-foreground lg:text-left">
            {cloudStatus}
          </div>
          {renderContent()}
        </main>
        <BottomNav active={tab} onChange={navigate} badge={badge} />
      </div>
      <AppModal kind={modal} data={data} selectedProperty={selectedProperty} editRecord={editRecord} saving={savingRecord} onClose={closeModal} onSave={save} />
    </div>
  );
}
