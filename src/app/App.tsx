import React, { useMemo, useState } from "react";
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
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Shield,
  Upload,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";

type Tab = "dashboard" | "properties" | "tasks" | "documents" | "settings";
type ModalKind = "property" | "tenant" | "maintenance" | "task" | "document" | null;

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
}

interface AppData {
  properties: Property[];
  tenants: Tenant[];
  maintenance: MaintenanceItem[];
  tasks: TaskItem[];
  docs: DocItem[];
}

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

function Sidebar({ active, onChange, badge }: { active: Tab; onChange: (tab: Tab) => void; badge: number }) {
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-[11px] font-black text-white">DM</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold leading-tight text-white">David Martinez</p>
            <p className="truncate text-[11px] leading-tight text-white/45">Rental portfolio</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Dashboard({ data, onNav }: { data: AppData; onNav: (tab: Tab) => void }) {
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
            <h1 className="mt-1 text-2xl font-black leading-tight tracking-[-0.03em] text-foreground">Good morning,<br />David.</h1>
          </div>
          <button className="relative mt-1 flex-shrink-0 rounded-xl p-2.5 transition-colors hover:bg-muted" aria-label="Notifications">
            <Bell className="h-5 w-5 text-foreground/60" />
            {(totals.urgent.length + totals.expiring.length) > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-background bg-red-500" />}
          </button>
        </div>
      </div>

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

function PropertiesList({ data, onSelect, onAdd }: { data: AppData; onSelect: (id: string) => void; onAdd: () => void }) {
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
            <button key={property.id} onClick={() => onSelect(property.id)} className="group w-full overflow-hidden rounded-2xl border border-border bg-card text-left transition-all duration-200 hover:border-[#1A3352]/20 hover:shadow-lg active:scale-[0.99]">
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
              <div className="grid grid-cols-3 gap-2 p-4">
                {[{ label: "Units", value: property.units }, { label: "Tenants", value: stats.tenants.length }, { label: "Monthly", value: money(stats.revenue) }].map((item) => (
                  <div key={item.label} className="rounded-xl bg-background py-2.5 text-center">
                    <p className="text-[15px] font-black tracking-[-0.03em] text-foreground">{item.value}</p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <EmptyState icon={Building2} title="No properties found" subtitle="Try a different search or add a new property." />}
      </div>
    </div>
  );
}

function PropertyDetail({ data, propertyId, onBack, onAddTenant, onAddMaintenance, onAddDocument, updateMaintenance }: {
  data: AppData;
  propertyId: string;
  onBack: () => void;
  onAddTenant: () => void;
  onAddMaintenance: () => void;
  onAddDocument: () => void;
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
      <PageHeader title={property.name} subtitle={property.city} onBack={onBack} action={openIssues > 0 && <Chip className="border-red-100 bg-red-50 text-red-700">{openIssues} open</Chip>} />
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
                  <Chip className={statusStyle(tenant.status)}>{tenant.status === "expiring" ? "Expiring" : tenant.status}</Chip>
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
                <div className="mb-2 flex items-start justify-between gap-2"><p className="flex-1 text-sm font-black leading-tight text-foreground">{item.title}</p><Chip className={statusStyle(item.status)}>{item.status === "in-progress" ? "In progress" : item.status}</Chip></div>
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
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-foreground">{doc.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{doc.date} - {doc.size}</p></div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Tasks({ data, onAdd, toggleTask }: { data: AppData; onAdd: () => void; toggleTask: (id: string) => void }) {
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
          </div>
        ))}
      </div>
    </div>
  );
}

function Documents({ data, onAdd }: { data: AppData; onAdd: () => void }) {
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
          <button key={doc.id} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-[#1A3352]/20 hover:shadow-sm">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${docColor(doc.type)}`}><FileText className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold text-foreground">{doc.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{propertyName(data, doc.propertyId)}{doc.tenantName ? ` - ${doc.tenantName}` : ""} - {doc.date} - {doc.size}</p></div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsScreen({ data, resetData, exportData }: { data: AppData; resetData: () => void; exportData: () => void }) {
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
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#1A3352] text-lg font-black text-white">DM</div>
          <div className="min-w-0 flex-1"><p className="font-black tracking-[-0.02em] text-foreground">David Martinez</p><p className="text-sm text-muted-foreground">david.martinez@email.com</p><p className="mt-1 text-xs text-muted-foreground">{data.properties.length} properties - {data.tenants.length} tenants</p></div>
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
        <div className="pb-4 pt-6 text-center"><p className="text-xs font-bold text-muted-foreground">Keystone - v1.1.0</p><p className="mt-0.5 text-xs text-muted-foreground">Your rentals, organized.</p></div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[#1A3352]/40 focus:ring-2 focus:ring-[#1A3352]/20";

function AppModal({ kind, data, selectedProperty, onClose, onSave }: { kind: ModalKind; data: AppData; selectedProperty: string | null; onClose: () => void; onSave: (kind: Exclude<ModalKind, null>, payload: Record<string, FormDataEntryValue>) => void }) {
  if (!kind) return null;
  const title = kind === "property" ? "Add Property" : kind === "tenant" ? "Add Tenant" : kind === "maintenance" ? "Add Maintenance" : kind === "task" ? "Add Task" : "Upload Document";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(kind, Object.fromEntries(new FormData(event.currentTarget)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-0 sm:items-center sm:justify-center sm:p-4">
      <form onSubmit={submit} className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-4 shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><p className="text-lg font-black tracking-[-0.03em] text-foreground">{title}</p><p className="text-xs text-muted-foreground">Saved to this browser automatically.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          {kind === "property" && (
            <>
              <Field label="Property name"><input name="name" required className={inputClass} placeholder="Cedar Lane Apartments" /></Field>
              <Field label="Street address"><input name="address" required className={inputClass} placeholder="100 Cedar Lane" /></Field>
              <Field label="City / ZIP"><input name="city" required className={inputClass} placeholder="Oakland, CA 94610" /></Field>
              <Field label="Units"><input name="units" type="number" min="1" defaultValue="1" required className={inputClass} /></Field>
              <Field label="Image URL"><input name="imageUrl" className={inputClass} placeholder="Optional property photo URL" /></Field>
            </>
          )}

          {(kind === "tenant" || kind === "maintenance" || kind === "task" || kind === "document") && (
            <Field label="Property">
              <select name="propertyId" defaultValue={selectedProperty || ""} className={inputClass} required={kind !== "task"}>
                {kind === "task" && <option value="">All properties</option>}
                {data.properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
              </select>
            </Field>
          )}

          {kind === "tenant" && (
            <>
              <Field label="Tenant name"><input name="name" required className={inputClass} placeholder="Alex Morgan" /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Unit"><input name="unit" required className={inputClass} placeholder="Unit 3B" /></Field><Field label="Rent"><input name="rent" type="number" min="0" required className={inputClass} placeholder="2100" /></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="Phone"><input name="phone" className={inputClass} placeholder="(510) 555-0100" /></Field><Field label="Email"><input name="email" type="email" className={inputClass} placeholder="tenant@email.com" /></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="Lease start"><input name="leaseStart" required className={inputClass} placeholder="Jun 1, 2026" /></Field><Field label="Lease end"><input name="leaseEnd" required className={inputClass} placeholder="May 31, 2027" /></Field></div>
              <Field label="Status"><select name="status" className={inputClass}><option value="active">Active</option><option value="expiring">Expiring</option><option value="expired">Expired</option></select></Field>
              <Field label="Notes"><textarea name="notes" rows={3} className={inputClass} placeholder="Preferences, reminders, lease notes" /></Field>
            </>
          )}

          {kind === "maintenance" && (
            <>
              <Field label="Title"><input name="title" required className={inputClass} placeholder="Garbage disposal jammed" /></Field>
              <Field label="Description"><textarea name="description" rows={3} required className={inputClass} placeholder="What happened and what needs to be done?" /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Unit"><input name="unit" className={inputClass} placeholder="Unit A" /></Field><Field label="Tenant"><input name="tenantName" className={inputClass} placeholder="Tenant name" /></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="Priority"><select name="priority" className={inputClass}><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></Field><Field label="Status"><select name="status" className={inputClass}><option value="open">Open</option><option value="in-progress">In progress</option><option value="resolved">Resolved</option></select></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="Date"><input name="date" required className={inputClass} placeholder="May 29, 2026" /></Field><Field label="Vendor"><input name="vendor" className={inputClass} placeholder="Optional" /></Field></div>
            </>
          )}

          {kind === "task" && (
            <>
              <Field label="Task"><input name="title" required className={inputClass} placeholder="Send renewal offer" /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Type"><select name="type" className={inputClass}><option value="lease">Lease</option><option value="inspection">Inspection</option><option value="maintenance">Maintenance</option><option value="financial">Financial</option><option value="reminder">Reminder</option></select></Field><Field label="Priority"><select name="priority" className={inputClass}><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></Field></div>
              <Field label="Due date"><input name="dueDate" required className={inputClass} placeholder="Jun 15, 2026" /></Field>
            </>
          )}

          {kind === "document" && (
            <>
              <Field label="Document name"><input name="name" required className={inputClass} placeholder="Lease Agreement - Alex Morgan" /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Type"><select name="type" className={inputClass}><option value="lease">Lease</option><option value="inspection">Inspection</option><option value="warranty">Warranty</option><option value="receipt">Receipt</option><option value="application">Application</option><option value="other">Other</option></select></Field><Field label="Size"><input name="size" className={inputClass} placeholder="320 KB" /></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="Tenant"><input name="tenantName" className={inputClass} placeholder="Optional" /></Field><Field label="Date"><input name="date" required className={inputClass} placeholder="May 29, 2026" /></Field></div>
            </>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-black text-muted-foreground">Cancel</button>
          <button type="submit" className="flex-1 rounded-xl bg-[#1A3352] px-4 py-3 text-sm font-black text-white">Save</button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [data, setData] = useStoredData();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);

  const badge = data.maintenance.filter((m) => m.priority === "high" && m.status !== "resolved").length + data.tenants.filter((t) => t.status === "expiring" || t.status === "expired").length;

  function navigate(next: Tab) {
    setTab(next);
    if (next !== "properties") setSelectedProperty(null);
  }

  function save(kind: Exclude<ModalKind, null>, payload: Record<string, FormDataEntryValue>) {
    setData((current) => {
      if (kind === "property") {
        const imageUrl = String(payload.imageUrl || "").trim() || DEFAULT_IMAGES[current.properties.length % DEFAULT_IMAGES.length];
        return { ...current, properties: [...current.properties, { id: uid("p"), name: String(payload.name), address: String(payload.address), city: String(payload.city), units: Number(payload.units || 1), imageUrl }] };
      }
      if (kind === "tenant") {
        return { ...current, tenants: [...current.tenants, { id: uid("t"), name: String(payload.name), phone: String(payload.phone || ""), email: String(payload.email || ""), propertyId: String(payload.propertyId), unit: String(payload.unit), rent: Number(payload.rent || 0), leaseStart: String(payload.leaseStart), leaseEnd: String(payload.leaseEnd), status: payload.status as Tenant["status"], notes: String(payload.notes || "") }] };
      }
      if (kind === "maintenance") {
        return { ...current, maintenance: [...current.maintenance, { id: uid("m"), title: String(payload.title), description: String(payload.description), propertyId: String(payload.propertyId), unit: String(payload.unit || ""), tenantName: String(payload.tenantName || ""), status: payload.status as MaintenanceItem["status"], priority: payload.priority as MaintenanceItem["priority"], date: String(payload.date), vendor: String(payload.vendor || "") }] };
      }
      if (kind === "task") {
        return { ...current, tasks: [...current.tasks, { id: uid("tk"), title: String(payload.title), type: payload.type as TaskItem["type"], propertyId: String(payload.propertyId || ""), dueDate: String(payload.dueDate), status: "pending", priority: payload.priority as TaskItem["priority"] }] };
      }
      return { ...current, docs: [...current.docs, { id: uid("d"), name: String(payload.name), type: payload.type as DocItem["type"], propertyId: String(payload.propertyId), tenantName: String(payload.tenantName || ""), date: String(payload.date), size: String(payload.size || "0 KB") }] };
    });
    setModal(null);
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
    if (tab === "dashboard") return <Dashboard data={data} onNav={navigate} />;
    if (tab === "properties") {
      return selectedProperty ? (
        <PropertyDetail data={data} propertyId={selectedProperty} onBack={() => setSelectedProperty(null)} onAddTenant={() => setModal("tenant")} onAddMaintenance={() => setModal("maintenance")} onAddDocument={() => setModal("document")} updateMaintenance={updateMaintenance} />
      ) : (
        <PropertiesList data={data} onSelect={setSelectedProperty} onAdd={() => setModal("property")} />
      );
    }
    if (tab === "tasks") return <Tasks data={data} onAdd={() => setModal("task")} toggleTask={toggleTask} />;
    if (tab === "documents") return <Documents data={data} onAdd={() => setModal("document")} />;
    return <SettingsScreen data={data} resetData={resetData} exportData={exportData} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar active={tab} onChange={navigate} badge={badge} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{renderContent()}</main>
        <BottomNav active={tab} onChange={navigate} badge={badge} />
      </div>
      <AppModal kind={modal} data={data} selectedProperty={selectedProperty} onClose={() => setModal(null)} onSave={save} />
    </div>
  );
}
