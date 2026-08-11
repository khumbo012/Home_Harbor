import React, { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Clock,
  DollarSign,
  Download,
  FileText,
  HelpCircle,
  Home,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Pencil,
  Plus,
  RefreshCcw,
  Settings,
  Shield,
  Scale,
  Trash2,
  Upload,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { AppShell } from "./components/app-shell";
import {
  AddButton,
  Button,
  Chip,
  DocumentCard,
  EmptyState,
  IconAction,
  PageHeader,
  PropertyCard,
  QuickAction,
  SearchAndFilterBar,
  SkeletonLoader,
  StatusBadge,
  StatusCard,
  TaskCard,
} from "./components/home-harbor-ui";
import { DEFAULT_IMAGES, DEFAULT_PROFILE, INITIAL_DATA } from "./data";
import {
  loadAnalyticsSummary,
  loadCloudPortfolio,
  openDocumentFile,
  recordAnalyticsEvent,
  saveCloudPortfolio,
  submitFeedback,
  supabase,
  uploadDocumentFile,
} from "./services";
import type {
  AnalyticsSummary,
  AppData,
  AppProfile,
  ActivityItem,
  DocItem,
  EditableRecord,
  MaintenanceItem,
  ModalKind,
  OnboardingSetup,
  Property,
  ReminderItem,
  Tab,
  TaskItem,
  Tenant,
} from "./types";
import {
  buildReminders,
  daysUntil,
  docColor,
  fileSizeLabel,
  formatToday,
  money,
  priorityStyle,
  propertyName,
  propertyStats,
  uid,
} from "./utils";

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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "U") + (parts[1]?.[0] || "");
}

function activityTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  const minutes = Math.max(Math.round((Date.now() - date.getTime()) / 60000), 0);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function withActivity(data: AppData, activity: Omit<ActivityItem, "id" | "at">): AppData {
  return {
    ...data,
    activity: [
      { id: uid("a"), at: new Date().toISOString(), ...activity },
      ...(data.activity || []),
    ].slice(0, 80),
  };
}

function maintenanceNextAction(item: MaintenanceItem) {
  if (item.status === "resolved") return "Handled. Keep the receipt or vendor note attached.";
  if (item.status === "in-progress") return item.vendor ? `Waiting on ${item.vendor}.` : "Add the vendor or mark resolved when finished.";
  return item.priority === "high" ? "Assign a vendor or contact the tenant today." : "Decide who owns the next follow-up.";
}

function leaseNextAction(tenant: Tenant) {
  return tenant.status === "expired" ? "Contact tenant and document the decision." : "Send renewal terms or add a renewal task.";
}

function Dashboard({ data, profile, reminders, notificationsEnabled, onNav, onToggleNotifications, onAddTask, onAddMaintenance, onAddDocument, onOpenProperty }: { data: AppData; profile: AppProfile; reminders: ReminderItem[]; notificationsEnabled: boolean; onNav: (tab: Tab) => void; onToggleNotifications: () => void; onAddTask: () => void; onAddMaintenance: () => void; onAddDocument: () => void; onOpenProperty: (id: string) => void }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const totals = useMemo(() => {
    const units = data.properties.reduce((sum, p) => sum + p.units, 0);
    const revenue = data.tenants.reduce((sum, t) => sum + Number(t.rent || 0), 0);
    const openMaintenance = data.maintenance.filter((m) => m.status !== "resolved");
    const urgent = openMaintenance.filter((m) => m.priority === "high");
    const expiring = data.tenants.filter((t) => t.status === "expiring" || t.status === "expired");
    const pendingTasks = data.tasks.filter((t) => t.status === "pending");
    const overdueTasks = pendingTasks.filter((task) => {
      const days = daysUntil(task.dueDate);
      return days !== null && days < 0;
    });
    const dueSoonTasks = pendingTasks
      .filter((task) => {
        const days = daysUntil(task.dueDate);
        return days === null || (days >= 0 && days <= 14) || task.priority === "high";
      })
      .sort((a, b) => (daysUntil(a.dueDate) ?? 999) - (daysUntil(b.dueDate) ?? 999));
    return { units, revenue, openMaintenance, urgent, expiring, pendingTasks, overdueTasks, dueSoonTasks };
  }, [data]);
  const vacant = Math.max(totals.units - data.tenants.length, 0);
  const attentionCount = totals.urgent.length + totals.expiring.length + totals.overdueTasks.length;
  const calm = attentionCount === 0;
  const activity = (data.activity || []).slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-6xl pb-24 lg:pb-10">
      <div className="px-4 pb-3 pt-6 lg:pt-8">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{formatToday()}</p>
              <h1 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-foreground lg:text-3xl">Good morning, {profile.name.split(" ")[0] || "there"}.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {calm ? "Nothing urgent is blocking your portfolio right now." : `${attentionCount} item${attentionCount === 1 ? "" : "s"} need attention before the day gets away from you.`}
              </p>
            </div>
            <button onClick={() => setShowNotifications((visible) => !visible)} className="relative flex-shrink-0 rounded-xl p-2.5 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-[var(--hh-primary)]/30" aria-label="Notifications">
            <Bell className="h-5 w-5 text-foreground/60" />
            {reminders.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-[var(--hh-urgent)] px-1 text-[10px] font-black text-white">{reminders.length > 9 ? "9+" : reminders.length}</span>}
            </button>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <QuickAction icon={CheckSquare} label="Add task" detail="Renewals, follow-ups, inspections" primary onClick={onAddTask} />
            <QuickAction icon={Wrench} label="Log maintenance" detail="Capture an issue before it slips" onClick={onAddMaintenance} />
            <QuickAction icon={Upload} label="Upload document" detail="Store leases, receipts, notices" onClick={onAddDocument} />
          </div>
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
              <button onClick={onToggleNotifications} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-black text-[var(--hh-primary)] focus-visible:ring-2 focus-visible:ring-[var(--hh-primary)]/30">
                {notificationsEnabled ? "On" : "Enable"}
              </button>
            </div>
            <div className="space-y-2">
              {reminders.length === 0 ? (
                <p className="rounded-xl bg-background px-3 py-3 text-xs font-bold text-muted-foreground">No urgent reminders right now.</p>
              ) : reminders.slice(0, 8).map((reminder) => (
                <button key={reminder.id} onClick={() => onNav(reminder.tab)} className="flex w-full items-start gap-3 rounded-xl bg-background px-3 py-3 text-left">
                  <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${reminder.severity === "high" ? "bg-[var(--hh-urgent)]" : reminder.severity === "medium" ? "bg-[var(--hh-warning)]" : "bg-slate-300"}`} />
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

      <div className="grid gap-3 px-4 pb-6 pt-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard label="Needs attention" value={String(attentionCount)} detail={calm ? "No urgent work" : "Urgent, overdue, or expiring"} icon={AlertTriangle} tone={attentionCount > 0 ? "urgent" : "good"} />
        <StatusCard label="Due soon" value={String(totals.dueSoonTasks.length)} detail="Next 14 days" icon={Clock} tone={totals.dueSoonTasks.length > 0 ? "warning" : "neutral"} />
        <StatusCard label="Open requests" value={String(totals.openMaintenance.length)} detail={`${totals.urgent.length} urgent maintenance`} icon={Wrench} tone={totals.urgent.length > 0 ? "urgent" : "neutral"} />
        <StatusCard label="Portfolio" value={`${data.properties.length}`} detail={`${totals.units} units, ${vacant} vacant`} icon={Building2} />
      </div>

      {(totals.urgent.length > 0 || totals.expiring.length > 0) && (
        <section className="mb-6 px-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--hh-warning)]" />
            <h2 className="text-sm font-black tracking-tight text-foreground">Needs Attention</h2>
          </div>
          <div className="space-y-2.5">
            {totals.urgent.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--hh-urgent-border)] bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--hh-urgent-bg)]"><Wrench className="h-4 w-4 text-[var(--hh-urgent)]" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black leading-tight text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-tight text-muted-foreground">{propertyName(data, item.propertyId)} - {item.unit} - {item.tenantName}</p>
                    <p className="mt-2 rounded-xl bg-background px-3 py-2 text-xs font-bold leading-5 text-muted-foreground">Next action: {maintenanceNextAction(item)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge status={item.status} />
                      <Chip className={priorityStyle(item.priority)}>High</Chip>
                    </div>
                  </div>
                  <button onClick={() => onNav("properties")} className="mt-0.5 flex-shrink-0 text-xs font-black text-[var(--hh-primary)] hover:opacity-60">View</button>
                </div>
              </div>
            ))}
            {totals.expiring.map((tenant) => (
              <div key={tenant.id} className="rounded-2xl border border-[var(--hh-warning-border)] bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--hh-warning-bg)]"><Calendar className="h-4 w-4 text-[var(--hh-warning)]" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black leading-tight text-foreground">Lease expiring - {tenant.name}</p>
                    <p className="mt-0.5 text-xs leading-tight text-muted-foreground">{propertyName(data, tenant.propertyId)} - {tenant.unit} - ends {tenant.leaseEnd}</p>
                    <p className="mt-2 rounded-xl bg-background px-3 py-2 text-xs font-bold leading-5 text-muted-foreground">Next action: {leaseNextAction(tenant)}</p>
                    <div className="mt-2"><StatusBadge status={tenant.status} /></div>
                  </div>
                  <button onClick={() => onNav("tasks")} className="mt-0.5 flex-shrink-0 text-xs font-black text-[var(--hh-primary)] hover:opacity-60">Renew</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6 px-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-[var(--hh-success)]" /><h2 className="text-sm font-black tracking-tight text-foreground">Overdue & Due Soon</h2></div>
          <button onClick={() => onNav("tasks")} className="text-xs font-black text-[var(--hh-primary)] hover:opacity-60 focus-visible:ring-2 focus-visible:ring-[var(--hh-primary)]/30">See all</button>
        </div>
        <div className="space-y-2">
          {[...totals.overdueTasks, ...totals.dueSoonTasks.filter((task) => !totals.overdueTasks.some((overdue) => overdue.id === task.id))].slice(0, 6).map((task) => (
            <TaskCard key={task.id} data={data} task={task} compact />
          ))}
          {totals.pendingTasks.length === 0 && <EmptyState icon={CheckCircle2} title="All caught up" subtitle="No open tasks right now." />}
          {totals.pendingTasks.length > 0 && totals.overdueTasks.length === 0 && totals.dueSoonTasks.length === 0 && <EmptyState icon={Clock} title="Nothing pressing this week" subtitle="Your open tasks are scheduled farther out." />}
        </div>
      </section>

      <section className="grid gap-6 px-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[var(--hh-primary)]" /><h2 className="text-sm font-black tracking-tight text-foreground">Property Status</h2></div>
            <button onClick={() => onNav("properties")} className="text-xs font-black text-[var(--hh-primary)] hover:opacity-60">Open properties</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.properties.slice(0, 4).map((property) => {
              const stats = propertyStats(data, property.id);
              const openIssues = data.maintenance.filter((item) => item.propertyId === property.id && item.status !== "resolved").length;
              return (
                <button key={property.id} onClick={() => onOpenProperty(property.id)} className="rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-[var(--hh-primary)]/25 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--hh-primary)]/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-foreground">{property.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{stats.occupiedUnits}/{property.units} occupied</p>
                    </div>
                    <Chip className={openIssues > 0 ? "border-[var(--hh-urgent-border)] bg-[var(--hh-urgent-bg)] text-[var(--hh-urgent)]" : "border-[var(--hh-success-border)] bg-[var(--hh-success-bg)] text-[var(--hh-success)]"}>{openIssues > 0 ? `${openIssues} open` : "Clear"}</Chip>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-[var(--hh-success)]" style={{ width: `${Math.min((stats.occupiedUnits / Math.max(property.units, 1)) * 100, 100)}%` }} />
                  </div>
                </button>
              );
            })}
            {data.properties.length === 0 && <div className="sm:col-span-2"><EmptyState icon={Building2} title="Add your first property" subtitle="Once a property is added, status cards will appear here." /></div>}
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[var(--hh-success)]" /><h2 className="text-sm font-black tracking-tight text-foreground">Action Receipts</h2></div>
          <div className="space-y-2">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${item.tone === "urgent" ? "bg-[var(--hh-urgent-bg)] text-[var(--hh-urgent)]" : item.tone === "warning" ? "bg-[var(--hh-warning-bg)] text-[var(--hh-warning)]" : item.tone === "success" ? "bg-[var(--hh-success-bg)] text-[var(--hh-success)]" : "bg-muted text-muted-foreground"}`}>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-black leading-tight text-foreground">{item.title}</p>
                    <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{activityTime(item.at)}</span>
                  </div>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                  <p className="mt-2 rounded-lg bg-background px-2.5 py-1.5 text-xs font-bold leading-5 text-foreground">{item.outcome}</p>
                </div>
              </div>
            ))}
            {activity.length === 0 && <EmptyState icon={Clock} title="No action receipts yet" subtitle="Saves, uploads, completions, and status changes will appear here." />}
          </div>
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
      <SearchAndFilterBar query={query} onQueryChange={setQuery} placeholder="Search by name or address..." />
      <div className="space-y-4 px-4">
        {filtered.map((property) => <PropertyCard key={property.id} property={property} data={data} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} />)}
        {filtered.length === 0 && <EmptyState icon={Building2} title="No properties found" subtitle="Try a different search or add a new property." />}
      </div>
    </div>
  );
}

function PropertyDetail({ data, propertyId, onBack, onAddTenant, onAddMaintenance, onAddDocument, onEditProperty, onDeleteProperty, onEditTenant, onDeleteTenant, onEditMaintenance, onDeleteMaintenance, onOpenDocument, onEditDocument, onDeleteDocument, updateMaintenance }: {
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
  onOpenDocument: (filePath: string) => void;
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
            {openIssues > 0 && <Chip className="border-[var(--hh-urgent-border)] bg-[var(--hh-urgent-bg)] text-[var(--hh-urgent)]">{openIssues} open</Chip>}
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
              {tab}{tab === "maintenance" && openIssues > 0 && <span className="ml-1 text-[var(--hh-urgent)]">({openIssues})</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-4 pt-4">
        {activeTab === "overview" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Units & Tenants</p>
              <button onClick={onAddTenant} className="flex items-center gap-1 text-xs font-black text-[var(--hh-primary)]"><Plus className="h-3.5 w-3.5" />Add tenant</button>
            </div>
            {stats.tenants.map((tenant) => (
              <div key={tenant.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-sm font-black leading-tight text-foreground">{tenant.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{tenant.unit} - {money(tenant.rent)}/mo</p></div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <StatusBadge status={tenant.status} />
                    <IconAction label="Edit tenant" icon={Pencil} onClick={() => onEditTenant(tenant)} />
                    <IconAction label="Delete tenant" icon={Trash2} tone="danger" onClick={() => onDeleteTenant(tenant.id)} />
                  </div>
                </div>
                <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /><span>{tenant.leaseStart} - {tenant.leaseEnd}</span></div>
                {tenant.notes && <p className="mb-3 rounded-xl bg-muted/40 px-3 py-2 text-xs italic leading-relaxed text-muted-foreground">"{tenant.notes}"</p>}
                <div className="flex items-center gap-3 border-t border-border pt-3">
                  <a href={`tel:${tenant.phone}`} className="flex items-center gap-1.5 text-xs font-black text-[var(--hh-primary)] hover:opacity-60"><Phone className="h-3.5 w-3.5" />{tenant.phone}</a>
                  <span className="h-3 w-px bg-border" />
                  <a href={`mailto:${tenant.email}`} className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-black text-[var(--hh-primary)] hover:opacity-60"><Mail className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{tenant.email}</span></a>
                </div>
              </div>
            ))}
            {vacant > 0 && (
              <button onClick={onAddTenant} className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-border p-4 text-left transition-colors hover:border-[var(--hh-primary)]/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted"><Plus className="h-4 w-4 text-muted-foreground" /></div>
                <div><p className="text-sm font-bold text-foreground">{vacant} vacant {vacant === 1 ? "unit" : "units"}</p><p className="text-xs text-muted-foreground">Add tenant details and lease dates</p></div>
              </button>
            )}
          </>
        )}

        {activeTab === "maintenance" && (
          <>
            <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Requests</p><button onClick={onAddMaintenance} className="flex items-center gap-1 text-xs font-black text-[var(--hh-primary)]"><Plus className="h-3.5 w-3.5" />Add</button></div>
            {maintenance.length === 0 ? <EmptyState icon={Wrench} title="No maintenance requests" /> : maintenance.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm font-black leading-tight text-foreground">{item.title}</p>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <StatusBadge status={item.status} />
                    <IconAction label="Edit maintenance" icon={Pencil} onClick={() => onEditMaintenance(item)} />
                    <IconAction label="Delete maintenance" icon={Trash2} tone="danger" onClick={() => onDeleteMaintenance(item.id)} />
                  </div>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{item.unit} - {item.tenantName}</span><span>{item.date}</span>{item.vendor && <span className="font-bold text-[var(--hh-primary)]">{item.vendor}</span>}</div>
                <div className="flex items-center justify-between gap-2">
                  <Chip className={priorityStyle(item.priority)}>{item.priority}</Chip>
                  {item.status !== "resolved" ? <button onClick={() => updateMaintenance(item.id, "resolved")} className="text-xs font-black text-[var(--hh-success)]">Mark resolved</button> : <button onClick={() => updateMaintenance(item.id, "open")} className="text-xs font-black text-[var(--hh-primary)]">Reopen</button>}
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === "documents" && (
          <>
            <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Files</p><button onClick={onAddDocument} className="flex items-center gap-1 text-xs font-black text-[var(--hh-primary)]"><Upload className="h-3.5 w-3.5" />Upload</button></div>
            {docs.length === 0 ? <EmptyState icon={FileText} title="No documents yet" /> : docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${docColor(doc.type)}`}><FileText className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-foreground">{doc.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{doc.date} - {doc.size}{doc.fileName ? ` - ${doc.fileName}` : ""}</p></div>
                <div className="flex flex-shrink-0 gap-2">
                  {doc.filePath && <IconAction label="Open file" icon={Download} onClick={() => onOpenDocument(doc.filePath!)} />}
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
  const visible = data.tasks
    .filter((task) => filter === "done" ? task.status === "done" : task.status === "pending" && (filter === "all" || task.priority === filter))
    .sort((a, b) => (daysUntil(a.dueDate) ?? 999) - (daysUntil(b.dueDate) ?? 999));
  const highCount = data.tasks.filter((task) => task.status === "pending" && task.priority === "high").length;
  const overdueCount = data.tasks.filter((task) => task.status === "pending" && (daysUntil(task.dueDate) ?? 1) < 0).length;

  return (
    <div className="mx-auto w-full max-w-5xl pb-24 lg:pb-10">
      <PageHeader title="Tasks" subtitle={`${data.tasks.filter((t) => t.status === "pending").length} open - ${overdueCount} overdue - ${highCount} urgent`} action={<AddButton label="Add" onClick={onAdd} />} />
      <div className="px-4 pt-4">
        <div className="mb-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-black text-foreground">Work queue</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Sorted by due date so renewals, inspections, and follow-ups surface before lower-pressure work.</p>
        </div>
      </div>
      <SearchAndFilterBar filters={["all", "high", "medium", "low", "done"] as const} activeFilter={filter} onFilterChange={setFilter} />
      <div className="space-y-2 px-4">
        {visible.length === 0 ? <EmptyState icon={CheckCircle2} title="Nothing here" subtitle="Try a different filter or add a task." /> : visible.map((task) => (
          <TaskCard key={task.id} data={data} task={task} onToggle={toggleTask} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function Documents({ data, onAdd, onOpen, onEdit, onDelete }: { data: AppData; onAdd: () => void; onOpen: (filePath: string) => void; onEdit: (doc: DocItem) => void; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<DocItem["type"] | "all">("all");
  const filtered = data.docs.filter((doc) => {
    const text = `${doc.name} ${doc.tenantName} ${propertyName(data, doc.propertyId)}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (type === "all" || doc.type === type);
  });

  return (
    <div className="mx-auto w-full max-w-5xl pb-24 lg:pb-10">
      <PageHeader title="Documents" subtitle={`${data.docs.length} files`} action={<AddButton label="Upload" onClick={onAdd} />} />
      <SearchAndFilterBar query={query} onQueryChange={setQuery} placeholder="Search documents..." filters={["all", "lease", "inspection", "warranty", "receipt", "application", "other"] as const} activeFilter={type} onFilterChange={setType} />
      <div className="space-y-2 px-4">
        {filtered.length === 0 ? <EmptyState icon={FileText} title="No documents found" /> : filtered.map((doc) => (
          <DocumentCard key={doc.id} data={data} doc={doc} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function LegalPage({ kind, onBack }: { kind: "privacy" | "terms"; onBack: () => void }) {
  const privacy = kind === "privacy";
  const sections = privacy ? [
    { title: "What Home Harbor Stores", body: "Your account stores profile details, property records, tenant details, maintenance notes, tasks, document metadata, uploaded files, feedback, and basic product analytics when enabled." },
    { title: "How Data Is Used", body: "Data is used to run your rental workspace, sync across devices, send reminders, improve beta quality, and respond to support requests. Home Harbor does not sell personal data." },
    { title: "Security", body: "Portfolio data is protected by Supabase authentication and row-level security policies so signed-in users can access only their own records." },
    { title: "Your Choices", body: "You can export your portfolio, turn analytics off, delete demo data, and sign out from Settings. Uploaded documents remain private in the secured documents bucket." },
  ] : [
    { title: "Beta Software", body: "Home Harbor is beta software. Features may change, and you should keep independent copies of critical leases, notices, financial records, and legal documents." },
    { title: "No Legal Advice", body: "The app helps organize rental operations, but it does not provide legal, tax, accounting, or compliance advice." },
    { title: "User Responsibility", body: "You are responsible for the accuracy of information you enter and for following local housing, privacy, notice, and document retention laws." },
    { title: "Acceptable Use", body: "Do not upload unlawful content, malware, or data you do not have permission to store. Access is intended for your own portfolio management." },
  ];

  return (
    <div className="pb-24 lg:pb-10">
      <PageHeader title={privacy ? "Privacy Policy" : "Terms of Use"} subtitle="Beta draft for public testing" onBack={onBack} />
      <div className="space-y-3 px-4 pt-4">
        <div className="rounded-2xl border border-[var(--hh-primary-border)] bg-card p-5">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--hh-success-bg)]">
            {privacy ? <Shield className="h-5 w-5 text-[var(--hh-success)]" /> : <Scale className="h-5 w-5 text-[var(--hh-success)]" />}
          </div>
          <p className="text-lg font-black tracking-[-0.03em] text-foreground">{privacy ? "Your rental data stays yours." : "Clear terms for beta use."}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Last updated August 8, 2026. This draft should be reviewed by a qualified attorney before a full public launch.</p>
        </div>
        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-black tracking-[-0.015em] text-foreground">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

function FeedbackScreen({ profile, userId, currentPage, onBack, onTrack }: { profile: AppProfile; userId: string; currentPage: string; onBack: () => void; onTrack: (eventName: string, metadata?: Record<string, unknown>) => void }) {
  const [type, setType] = useState<FeedbackItem["type"]>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(profile.email);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      await submitFeedback(userId, { type, message: message.trim(), email: email.trim(), page: currentPage });
      onTrack("feedback_submitted", { type, page: currentPage });
      setMessage("");
      setStatus("Thanks. Your feedback was sent.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Feedback could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-24 lg:pb-10">
      <PageHeader title="Feedback" subtitle="Help shape the beta" onBack={onBack} />
      <div className="px-4 pt-4">
        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--hh-success-bg)]"><MessageSquare className="h-5 w-5 text-[var(--hh-success)]" /></div>
          <p className="text-lg font-black tracking-[-0.03em] text-foreground">Tell us what happened.</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Bug reports, feature ideas, confusing screens, and beta notes all land in your Supabase feedback table.</p>
          <div className="mt-5 space-y-3">
            <Field label="Type">
              <select value={type} onChange={(event) => setType(event.target.value as FeedbackItem["type"])} className={inputClass}>
                <option value="bug">Bug report</option>
                <option value="idea">Feature idea</option>
                <option value="question">Question</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Message">
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} required rows={5} className={inputClass} placeholder="What should we know?" />
            </Field>
            <Field label="Reply email">
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className={inputClass} placeholder="Optional" />
            </Field>
          </div>
          {status && <p className="mt-3 rounded-xl bg-background px-3 py-2 text-xs font-bold leading-5 text-muted-foreground">{status}</p>}
          <Button type="submit" disabled={busy || message.trim().length < 4} className="mt-4 w-full">
            {busy ? "Sending..." : "Send feedback"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function AnalyticsScreen({ userId, analyticsEnabled, setAnalyticsEnabled, onBack, onTrack }: { userId: string; analyticsEnabled: boolean; setAnalyticsEnabled: (enabled: boolean) => void; onBack: () => void; onTrack: (eventName: string, metadata?: Record<string, unknown>) => void }) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [status, setStatus] = useState("Loading analytics...");

  useEffect(() => {
    let cancelled = false;
    loadAnalyticsSummary(userId)
      .then((nextSummary) => {
        if (cancelled) return;
        setSummary(nextSummary);
        setStatus("");
      })
      .catch((error) => {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Analytics could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function toggleAnalytics() {
    const next = !analyticsEnabled;
    localStorage.setItem("home-harbor-analytics-enabled", String(next));
    setAnalyticsEnabled(next);
    if (next) onTrack("analytics_enabled");
  }

  return (
    <div className="pb-24 lg:pb-10">
      <PageHeader title="Analytics" subtitle="First-party beta signals" onBack={onBack} />
      <div className="space-y-3 px-4 pt-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--hh-success-bg)]"><BarChart3 className="h-5 w-5 text-[var(--hh-success)]" /></div>
          <p className="text-lg font-black tracking-[-0.03em] text-foreground">Privacy-friendly product analytics.</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Home Harbor records simple events like page opens, creates, updates, deletes, and feedback submissions to your own Supabase project.</p>
          <Button onClick={toggleAnalytics} variant={analyticsEnabled ? "primary" : "secondary"} className="mt-4 w-full">
            Analytics {analyticsEnabled ? "on" : "off"}
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-black text-foreground">Recent activity</p>
          {status && <p className="mt-2 text-sm leading-6 text-muted-foreground">{status}</p>}
          {summary && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-background p-3"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Events</p><p className="mt-1 text-xl font-black text-foreground">{summary.totalEvents}</p></div>
                <div className="rounded-xl bg-background p-3"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last event</p><p className="mt-1 truncate text-xs font-bold text-foreground">{summary.lastEventAt ? new Date(summary.lastEventAt).toLocaleString() : "None yet"}</p></div>
              </div>
              {summary.topEvents.length === 0 ? <EmptyState icon={BarChart3} title="No analytics yet" subtitle="Events appear as testers use the app." /> : summary.topEvents.map((event) => (
                <div key={event.name} className="flex items-center justify-between rounded-xl bg-background px-3 py-2">
                  <span className="text-xs font-bold text-foreground">{event.name.replace(/_/g, " ")}</span>
                  <span className="text-xs font-black text-muted-foreground">{event.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsScreen({ data, profile, userId, activeTab, notificationsEnabled, analyticsEnabled, setAnalyticsEnabled, resetData, exportData, replayOnboarding, onToggleNotifications, onSignOut, onTrack }: { data: AppData; profile: AppProfile; userId: string; activeTab: Tab; notificationsEnabled: boolean; analyticsEnabled: boolean; setAnalyticsEnabled: (enabled: boolean) => void; resetData: () => void; exportData: () => void; replayOnboarding: () => void; onToggleNotifications: () => void; onSignOut: () => void; onTrack: (eventName: string, metadata?: Record<string, unknown>) => void }) {
  const [view, setView] = useState<"main" | "privacy" | "terms" | "feedback" | "analytics">("main");
  const monthly = data.tenants.reduce((sum, tenant) => sum + Number(tenant.rent || 0), 0);
  const items = [
    { section: "Portfolio", rows: [{ Icon: Building2, label: "Properties", value: `${data.properties.length} active` }, { Icon: Users, label: "Tenants", value: `${data.tenants.length} active` }, { Icon: DollarSign, label: "Rent roll", value: `${money(monthly)}/mo` }] },
    { section: "Preferences", rows: [{ Icon: Bell, label: "Notifications", value: notificationsEnabled ? "On" : "Off", action: onToggleNotifications }, { Icon: BarChart3, label: "Analytics", value: analyticsEnabled ? "On" : "Off", view: "analytics" as const }, { Icon: Calendar, label: "Lease renewal alerts", value: "60 days before" }] },
    { section: "Account", rows: [{ Icon: Shield, label: "Security", value: "RLS protected" }, { Icon: Lock, label: "Privacy", value: "", view: "privacy" as const }, { Icon: Scale, label: "Terms of use", value: "", view: "terms" as const }, { Icon: MessageSquare, label: "Feedback", value: "Beta", view: "feedback" as const }, { Icon: HelpCircle, label: "Help & support", value: "" }] },
  ];

  if (view === "privacy") return <LegalPage kind="privacy" onBack={() => setView("main")} />;
  if (view === "terms") return <LegalPage kind="terms" onBack={() => setView("main")} />;
  if (view === "feedback") return <FeedbackScreen profile={profile} userId={userId} currentPage={activeTab} onBack={() => setView("main")} onTrack={onTrack} />;
  if (view === "analytics") return <AnalyticsScreen userId={userId} analyticsEnabled={analyticsEnabled} setAnalyticsEnabled={setAnalyticsEnabled} onBack={() => setView("main")} onTrack={onTrack} />;

  return (
    <div className="pb-24 lg:pb-10">
      <PageHeader title="Settings" />
      <div className="px-4 pt-4">
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--hh-primary)] text-lg font-black uppercase text-white">{initials(profile.name)}</div>
          <div className="min-w-0 flex-1"><p className="font-black tracking-[-0.02em] text-foreground">{profile.name}</p><p className="text-sm text-muted-foreground">{profile.email}</p><p className="mt-1 text-xs text-muted-foreground">{data.properties.length} properties - {data.tenants.length} tenants</p></div>
        </div>
        {items.map((section) => (
          <div key={section.section} className="mb-5">
            <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{section.section}</p>
            <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
              {section.rows.map(({ Icon, label, value, action, view }) => (
                <button key={label} onClick={() => view ? setView(view) : action?.()} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30">
                  <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-[13px] font-bold text-foreground">{label}</span>
                  {value && <span className="text-xs text-muted-foreground">{value}</span>}
                  {(view || action) && <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={exportData} className="text-xs"><Download className="h-4 w-4" />Export</Button>
          <Button variant="danger" onClick={resetData} className="text-xs"><RefreshCcw className="h-4 w-4" />Reset demo</Button>
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
        <div className="pb-4 pt-6 text-center"><p className="text-xs font-bold text-muted-foreground">Home Harbor - v1.1.0</p><p className="mt-0.5 text-xs text-muted-foreground">Your rentals, organized.</p></div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[var(--hh-primary)]/40 focus:ring-2 focus:ring-[var(--hh-primary)]/20";

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
    <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-0 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <form onSubmit={submit} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-border bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl sm:max-w-lg sm:rounded-2xl sm:pb-4">
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
          <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={saving} className="flex-1">{saving ? "Saving..." : editing ? "Save changes" : "Save"}</Button>
        </div>
      </form>
    </div>
  );
}

function AuthShell({ children, eyebrow, title, subtitle }: { children: React.ReactNode; eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden bg-[var(--hh-primary)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="mb-10 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Home className="h-5 w-5" /></div>
            <span className="text-lg font-black tracking-[-0.03em]">Home Harbor</span>
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
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--hh-primary)] text-white"><Home className="h-4 w-4" /></div>
            <span className="font-black tracking-[-0.03em] text-foreground">Home Harbor</span>
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
          <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--hh-code-bg)] p-3 text-xs leading-5 text-white">{`VITE_SUPABASE_URL=https://your-project.supabase.co
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

function InstallHint() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("home-harbor-install-hint-dismissed") === "true");
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setShowHint(isIOS && !isStandalone && !dismissed);
  }, [dismissed]);

  if (!showHint) return null;

  function dismiss() {
    localStorage.setItem("home-harbor-install-hint-dismissed", "true");
    setDismissed(true);
  }

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-[var(--hh-primary-border)] bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--hh-success-bg)]">
          <Upload className="h-4 w-4 text-[var(--hh-success)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-foreground">Install on your iPhone</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">In Safari, tap Share, then Add to Home Screen for an app-like Home Harbor icon.</p>
        </div>
        <button onClick={dismiss} className="-mr-1 -mt-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Dismiss install hint">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
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
      title={mode === "signin" ? "Sign in to Home Harbor." : "Start your Home Harbor account."}
      subtitle="Your portfolio syncs to the cloud after you sign in."
    >
      <form onSubmit={submit} className="mt-6 space-y-3">
        <Field label="Email"><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className={inputClass} placeholder="you@email.com" /></Field>
        <Field label="Password"><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={6} className={inputClass} placeholder="At least 6 characters" /></Field>
        {message && <p className="rounded-xl bg-background px-3 py-2 text-xs font-bold leading-5 text-muted-foreground">{message}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 w-full text-center text-xs font-black text-[var(--hh-primary)]">
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
      <section className="relative hidden overflow-hidden bg-[var(--hh-primary)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="mb-10 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Home className="h-5 w-5" /></div>
            <span className="text-lg font-black tracking-[-0.03em]">Home Harbor</span>
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
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--hh-primary)] text-white"><Home className="h-4 w-4" /></div>
              <span className="font-black tracking-[-0.03em] text-foreground">Home Harbor</span>
            </div>
            <div className="ml-auto flex gap-1.5">
              {steps.map((label, index) => (
                <span key={label} className={`h-1.5 rounded-full transition-all ${index === step ? "w-7 bg-[var(--hh-primary)]" : index < step ? "w-4 bg-[var(--hh-success)]" : "w-4 bg-muted"}`} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            {step === 0 && (
              <div>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--hh-success-bg)]"><Building2 className="h-6 w-6 text-[var(--hh-success)]" /></div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Welcome</p>
                <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-foreground">Let’s set up your rental command center.</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">Home Harbor works best when it starts with your name, your portfolio, and at least one property. You can use sample data first or begin with your own clean workspace.</p>
                <div className="mt-6 grid gap-2">
                  {[
                    { Icon: CheckSquare, title: "Track work", copy: "Tasks, reminders, and lease renewals stay visible." },
                    { Icon: Wrench, title: "Handle maintenance", copy: "Open requests are grouped by property and priority." },
                    { Icon: FileText, title: "Organize documents", copy: "Leases, inspections, receipts, and warranties live together." },
                  ].map(({ Icon, title, copy }) => (
                    <div key={title} className="flex gap-3 rounded-xl bg-background p-3">
                      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--hh-primary)]" />
                      <div><p className="text-sm font-black text-foreground">{title}</p><p className="text-xs leading-5 text-muted-foreground">{copy}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Your profile</p>
                <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-foreground">First, tell Home Harbor who is managing the portfolio.</h2>
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
                  <button type="button" onClick={() => setMode("sample")} className={`rounded-2xl border p-4 text-left transition-all ${mode === "sample" ? "border-[var(--hh-primary)] bg-[var(--hh-primary-soft)] ring-2 ring-[var(--hh-primary-border)]" : "border-border bg-background"}`}>
                    <CheckCircle2 className={`mb-3 h-5 w-5 ${mode === "sample" ? "text-[var(--hh-success)]" : "text-muted-foreground"}`} />
                    <p className="text-sm font-black text-foreground">Use sample portfolio</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Best for exploring the app with realistic data.</p>
                  </button>
                  <button type="button" onClick={() => setMode("fresh")} className={`rounded-2xl border p-4 text-left transition-all ${mode === "fresh" ? "border-[var(--hh-primary)] bg-[var(--hh-primary-soft)] ring-2 ring-[var(--hh-primary-border)]" : "border-border bg-background"}`}>
                    <Plus className={`mb-3 h-5 w-5 ${mode === "fresh" ? "text-[var(--hh-primary)]" : "text-muted-foreground"}`} />
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
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--hh-primary)] px-4 py-3 text-sm font-black text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                {step === 2 ? "Enter Home Harbor" : "Continue"}
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
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => localStorage.getItem("home-harbor-analytics-enabled") !== "false");
  const [lastNotificationKey, setLastNotificationKey] = useState("");
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "error" } | null>(null);

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

  function track(eventName: string, metadata: Record<string, unknown> = {}) {
    if (!analyticsEnabled) return;
    void recordAnalyticsEvent(session?.user.id, eventName, metadata).catch(() => {});
  }

  function showToast(message: string, tone: "success" | "error" = "success") {
    setNotice({ message, tone });
    window.setTimeout(() => setNotice(null), tone === "error" ? 4200 : 2600);
  }

  useEffect(() => {
    if (session?.user.id && onboarded) track("app_opened", { tab });
  }, [session?.user.id, onboarded]);

  function navigate(next: Tab) {
    setTab(next);
    if (next !== "properties") setSelectedProperty(null);
    track("section_opened", { section: next });
  }

  function openPropertyFromDashboard(id: string) {
    setSelectedProperty(id);
    setTab("properties");
    track("property_opened", { source: "dashboard" });
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
        return withActivity(
          { ...current, properties: previous ? current.properties.map((property) => property.id === previous.id ? nextProperty : property) : [...current.properties, nextProperty] },
          { title: previous ? "Property updated" : "Property added", detail: nextProperty.name, outcome: previous ? "Changes saved to the portfolio" : "Property is ready for tenants, tasks, maintenance, and documents", tone: "success", tab: "properties", propertyId: nextProperty.id },
        );
      }
      if (kind === "tenant") {
        const previous = editing?.kind === "tenant" ? editing.item : null;
        const nextTenant = { id: previous?.id || uid("t"), name: String(payload.name), phone: String(payload.phone || ""), email: String(payload.email || ""), propertyId: String(payload.propertyId), unit: String(payload.unit), rent: Number(payload.rent || 0), leaseStart: String(payload.leaseStart), leaseEnd: String(payload.leaseEnd), status: payload.status as Tenant["status"], notes: String(payload.notes || "") };
        return withActivity(
          { ...current, tenants: previous ? current.tenants.map((tenant) => tenant.id === previous.id ? nextTenant : tenant) : [...current.tenants, nextTenant] },
          { title: previous ? "Tenant updated" : "Tenant added", detail: `${nextTenant.name} at ${propertyName(current, nextTenant.propertyId)} - ${nextTenant.unit}`, outcome: nextTenant.status === "expiring" ? "Lease renewal now appears in attention items" : "Tenant record is saved and linked to the property", tone: nextTenant.status === "expiring" || nextTenant.status === "expired" ? "warning" : "success", tab: "properties", propertyId: nextTenant.propertyId },
        );
      }
      if (kind === "maintenance") {
        const previous = editing?.kind === "maintenance" ? editing.item : null;
        const nextMaintenance = { id: previous?.id || uid("m"), title: String(payload.title), description: String(payload.description), propertyId: String(payload.propertyId), unit: String(payload.unit || ""), tenantName: String(payload.tenantName || ""), status: payload.status as MaintenanceItem["status"], priority: payload.priority as MaintenanceItem["priority"], date: String(payload.date), vendor: String(payload.vendor || "") };
        return withActivity(
          { ...current, maintenance: previous ? current.maintenance.map((item) => item.id === previous.id ? nextMaintenance : item) : [...current.maintenance, nextMaintenance] },
          { title: previous ? "Maintenance updated" : "Maintenance logged", detail: `${nextMaintenance.title} at ${propertyName(current, nextMaintenance.propertyId)}`, outcome: maintenanceNextAction(nextMaintenance), tone: nextMaintenance.status === "resolved" ? "success" : nextMaintenance.priority === "high" ? "urgent" : "warning", tab: "properties", propertyId: nextMaintenance.propertyId },
        );
      }
      if (kind === "task") {
        const previous = editing?.kind === "task" ? editing.item : null;
        const nextTask = { id: previous?.id || uid("tk"), title: String(payload.title), type: payload.type as TaskItem["type"], propertyId: String(payload.propertyId || ""), dueDate: String(payload.dueDate), status: (payload.status || previous?.status || "pending") as TaskItem["status"], priority: payload.priority as TaskItem["priority"] };
        return withActivity(
          { ...current, tasks: previous ? current.tasks.map((task) => task.id === previous.id ? nextTask : task) : [...current.tasks, nextTask] },
          { title: previous ? "Task updated" : "Task added", detail: `${nextTask.title} - ${propertyName(current, nextTask.propertyId)}`, outcome: nextTask.status === "done" ? "Marked complete" : `Visible in tasks until ${nextTask.dueDate}`, tone: nextTask.status === "done" ? "success" : nextTask.priority === "high" ? "urgent" : "warning", tab: "tasks", propertyId: nextTask.propertyId || undefined },
        );
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
      return withActivity(
        { ...current, docs: previous ? current.docs.map((doc) => doc.id === previous.id ? nextDoc : doc) : [...current.docs, nextDoc] },
        { title: previous ? "Document updated" : "Document uploaded", detail: `${nextDoc.name} - ${propertyName(current, nextDoc.propertyId)}`, outcome: nextDoc.filePath ? "File is attached and ready to open" : "Document record is saved without an attached file", tone: nextDoc.filePath ? "success" : "neutral", tab: "documents", propertyId: nextDoc.propertyId },
      );
      });
      track(editing ? "record_updated" : "record_created", { kind });
      showToast(editing ? "Changes saved." : "Added successfully.");
      closeModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Save failed.", "error");
    } finally {
      setSavingRecord(false);
    }
  }

  function deleteRecord(kind: Exclude<ModalKind, null>, id: string) {
    const labels = { property: "property", tenant: "tenant", maintenance: "maintenance request", task: "task", document: "document" };
    if (!window.confirm(`Delete this ${labels[kind]}? This cannot be undone.`)) return;

    setData((current) => {
      if (kind === "property") {
        const removed = current.properties.find((property) => property.id === id);
        return withActivity({
          ...current,
          properties: current.properties.filter((property) => property.id !== id),
          tenants: current.tenants.filter((tenant) => tenant.propertyId !== id),
          maintenance: current.maintenance.filter((item) => item.propertyId !== id),
          docs: current.docs.filter((doc) => doc.propertyId !== id),
          tasks: current.tasks.map((task) => task.propertyId === id ? { ...task, propertyId: "" } : task),
        }, { title: "Property deleted", detail: removed?.name || "Property removed", outcome: "Related tenants, maintenance, and documents were removed from the portfolio", tone: "warning", tab: "properties" });
      }
      if (kind === "tenant") {
        const removed = current.tenants.find((tenant) => tenant.id === id);
        return withActivity({ ...current, tenants: current.tenants.filter((tenant) => tenant.id !== id) }, { title: "Tenant deleted", detail: removed?.name || "Tenant removed", outcome: "Tenant is no longer active in this portfolio", tone: "warning", tab: "properties", propertyId: removed?.propertyId });
      }
      if (kind === "maintenance") {
        const removed = current.maintenance.find((item) => item.id === id);
        return withActivity({ ...current, maintenance: current.maintenance.filter((item) => item.id !== id) }, { title: "Maintenance deleted", detail: removed?.title || "Maintenance request removed", outcome: "Request was removed from open work", tone: "warning", tab: "properties", propertyId: removed?.propertyId });
      }
      if (kind === "task") {
        const removed = current.tasks.find((task) => task.id === id);
        return withActivity({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }, { title: "Task deleted", detail: removed?.title || "Task removed", outcome: "Task is no longer in the work queue", tone: "warning", tab: "tasks", propertyId: removed?.propertyId || undefined });
      }
      const removed = current.docs.find((doc) => doc.id === id);
      return withActivity({ ...current, docs: current.docs.filter((doc) => doc.id !== id) }, { title: "Document deleted", detail: removed?.name || "Document removed", outcome: "Document is no longer listed in files", tone: "warning", tab: "documents", propertyId: removed?.propertyId });
    });
    track("record_deleted", { kind });
    showToast("Deleted.");

    if (kind === "property" && selectedProperty === id) {
      setSelectedProperty(null);
    }
  }

  function updateMaintenance(id: string, status: MaintenanceItem["status"]) {
    setData((current) => {
      const nextItem = current.maintenance.find((item) => item.id === id);
      const updated = nextItem ? { ...nextItem, status } : null;
      return withActivity(
        { ...current, maintenance: current.maintenance.map((item) => item.id === id ? { ...item, status } : item) },
        { title: status === "resolved" ? "Maintenance resolved" : "Maintenance reopened", detail: updated ? `${updated.title} at ${propertyName(current, updated.propertyId)}` : "Maintenance status changed", outcome: updated ? maintenanceNextAction(updated) : "Status updated", tone: status === "resolved" ? "success" : "warning", tab: "properties", propertyId: updated?.propertyId },
      );
    });
    showToast(status === "resolved" ? "Maintenance marked resolved." : "Maintenance reopened.");
  }

  function toggleTask(id: string) {
    setData((current) => {
      const task = current.tasks.find((item) => item.id === id);
      const done = task?.status !== "done";
      return withActivity(
        { ...current, tasks: current.tasks.map((item) => item.id === id ? { ...item, status: item.status === "done" ? "pending" : "done" } : item) },
        { title: done ? "Task completed" : "Task reopened", detail: task?.title || "Task status changed", outcome: done ? "No longer shown as open work" : "Back in the work queue", tone: done ? "success" : "warning", tab: "tasks", propertyId: task?.propertyId || undefined },
      );
    });
    showToast("Task updated.");
  }

  function resetData() {
    localStorage.removeItem("keystone-rental-data");
    setData(withActivity(INITIAL_DATA, { title: "Demo data reset", detail: "Sample portfolio restored", outcome: "Dashboard, tasks, documents, and maintenance are back to the starter data", tone: "neutral", tab: "dashboard" }));
    showToast("Demo data reset.");
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
        activity: [{
          id: uid("a"),
          at: new Date().toISOString(),
          title: "Workspace created",
          detail: setup.property.name,
          outcome: "Next step: add your first tenant",
          tone: "success",
          tab: "properties",
        }],
      });
    }
    localStorage.setItem("keystone-onboarding-complete", "true");
    setOnboarded(true);
    setTab("dashboard");
    setSelectedProperty(null);
    track("onboarding_completed", { mode: setup.mode });
  }

  function replayOnboarding() {
    localStorage.removeItem("keystone-onboarding-complete");
    setOnboarded(false);
  }

  async function toggleNotifications() {
    if (typeof Notification === "undefined") {
      showToast("Browser notifications are not supported here.", "error");
      return;
    }

    if (notificationsEnabled) {
      localStorage.removeItem("keystone-browser-notifications");
      setNotificationsEnabled(false);
      track("notifications_disabled");
      showToast("Notifications turned off.");
      return;
    }

    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem("keystone-browser-notifications", "true");
      setNotificationsEnabled(true);
      new Notification("Home Harbor reminders enabled", {
        body: "You will be notified when urgent rental items need attention.",
      });
      track("notifications_enabled");
      showToast("Notifications enabled.");
    } else {
      showToast("Notifications were not enabled. You can allow them later in browser settings.", "error");
    }
  }

  async function openDocument(filePath: string) {
    try {
      const doc = data.docs.find((item) => item.filePath === filePath);
      await openDocumentFile(filePath);
      if (doc) {
        setData((current) => withActivity(current, { title: "Document opened", detail: doc.name, outcome: "Signed link opened in a new tab", tone: "success", tab: "documents", propertyId: doc.propertyId }));
      }
      track("document_opened");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Document could not be opened.", "error");
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
    link.download = "home-harbor-rental-data.json";
    link.click();
    URL.revokeObjectURL(url);
    setData((current) => withActivity(current, { title: "Portfolio exported", detail: `${data.properties.length} properties, ${data.tenants.length} tenants`, outcome: "A backup JSON file downloaded to this device", tone: "success", tab: "settings" }));
    track("data_exported", { properties: data.properties.length, tenants: data.tenants.length });
    showToast("Export downloaded.");
  }

  function renderContent() {
    if (tab === "dashboard") return <Dashboard data={data} profile={profile} reminders={reminders} notificationsEnabled={notificationsEnabled} onNav={navigate} onToggleNotifications={toggleNotifications} onAddTask={() => openAdd("task")} onAddMaintenance={() => openAdd("maintenance")} onAddDocument={() => openAdd("document")} onOpenProperty={openPropertyFromDashboard} />;
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
          onOpenDocument={openDocument}
          onEditDocument={(doc) => openEdit({ kind: "document", item: doc })}
          onDeleteDocument={(id) => deleteRecord("document", id)}
          updateMaintenance={updateMaintenance}
        />
      ) : (
        <PropertiesList data={data} onSelect={setSelectedProperty} onAdd={() => openAdd("property")} onEdit={(property) => openEdit({ kind: "property", item: property })} onDelete={(id) => deleteRecord("property", id)} />
      );
    }
    if (tab === "tasks") return <Tasks data={data} onAdd={() => openAdd("task")} onEdit={(task) => openEdit({ kind: "task", item: task })} onDelete={(id) => deleteRecord("task", id)} toggleTask={toggleTask} />;
    if (tab === "documents") return <Documents data={data} onAdd={() => openAdd("document")} onOpen={openDocument} onEdit={(doc) => openEdit({ kind: "document", item: doc })} onDelete={(id) => deleteRecord("document", id)} />;
    return <SettingsScreen data={data} profile={profile} userId={session.user.id} activeTab={tab} notificationsEnabled={notificationsEnabled} analyticsEnabled={analyticsEnabled} setAnalyticsEnabled={setAnalyticsEnabled} resetData={resetData} exportData={exportData} replayOnboarding={replayOnboarding} onToggleNotifications={toggleNotifications} onSignOut={signOut} onTrack={track} />;
  }

  if (!supabase) {
    return <CloudSetupScreen />;
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <Home className="mx-auto mb-3 h-8 w-8 text-[var(--hh-primary)]" />
          <p className="text-sm font-black text-foreground">Loading Home Harbor...</p>
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
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <Shield className="mx-auto mb-3 h-8 w-8 text-[var(--hh-success)]" />
          <p className="text-sm font-black text-foreground">Loading your portfolio...</p>
          <p className="mt-1 text-xs text-muted-foreground">{cloudStatus}</p>
          <SkeletonLoader rows={2} />
        </div>
      </div>
    );
  }

  if (!onboarded) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  return (
    <AppShell
      active={tab}
      onChange={navigate}
      badge={badge}
      profile={profile}
      cloudStatus={cloudStatus}
      beforeContent={<InstallHint />}
      overlay={<AppModal kind={modal} data={data} selectedProperty={selectedProperty} editRecord={editRecord} saving={savingRecord} onClose={closeModal} onSave={save} />}
      notice={notice}
    >
      {renderContent()}
    </AppShell>
  );
}
