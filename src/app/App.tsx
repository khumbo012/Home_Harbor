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
  ActionItemRow,
  ActivityFeed,
  Button,
  Chip,
  DocumentCard,
  EmptyState,
  IconAction,
  PageHeader,
  PortfolioHealthSummary,
  PropertyCard,
  SearchAndFilterBar,
  SectionHeader,
  SkeletonLoader,
  StatusBadge,
  TodayPriority,
  TaskCard,
  UpcomingItemRow,
} from "./components/home-harbor-ui";
import { DEFAULT_IMAGES, DEFAULT_PROFILE, INITIAL_DATA } from "./data";
import {
  loadAnalyticsSummary,
  loadCloudPortfolio,
  loadTenantRequests,
  openDocumentFile,
  recordAnalyticsEvent,
  saveCloudPortfolio,
  submitFeedback,
  submitTenantRequest,
  supabase,
  uploadDocumentFile,
  uploadTenantRequestFile,
  updateTenantRequestStatus,
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
  TenantRequest,
  Tenant,
} from "./types";
import {
  buildReminders,
  daysUntil,
  docColor,
  fileSizeLabel,
  formatToday,
  formatReminderTiming,
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

type DashboardAction = {
  id: string;
  kind: "maintenance" | "lease" | "task";
  title: string;
  meta: string;
  detail: string;
  reason: string;
  status: string;
  cta: string;
  score: number;
  tone: "urgent" | "warning" | "success" | "neutral";
  icon: typeof Wrench;
  tab: Tab;
  propertyId?: string;
  requestId?: string;
};

function taskActionLabel(task: TaskItem) {
  if (task.type === "lease") return "Review lease";
  if (task.type === "inspection") return "View inspection";
  if (task.type === "maintenance") return "Review work";
  if (task.type === "financial") return "Review renewal";
  return "Open task";
}

function tenantRequestNextAction(request: TenantRequest) {
  if (request.status === "resolved") return "Resolved. Keep the request for your records.";
  if (request.status === "in-progress") return "In progress. Follow up with the tenant when the work is complete.";
  return request.permissionToEnter ? "Assign a vendor or schedule the repair." : "Contact the tenant before sending someone.";
}

function buildDashboardActions(data: AppData, tenantRequests: TenantRequest[] = []): DashboardAction[] {
  const tenantRequestActions = tenantRequests
    .filter((request) => request.status !== "resolved")
    .map((request) => ({
      id: `tenant-request-${request.id}`,
      kind: "maintenance" as const,
      title: request.status === "in-progress" ? `Check tenant request: ${request.title}` : `Review tenant request: ${request.title}`,
      meta: `${request.propertyName || propertyName(data, request.propertyId)}${request.unit ? ` - ${request.unit}` : ""}${request.tenantName ? ` - ${request.tenantName}` : ""}`,
      detail: tenantRequestNextAction(request),
      reason: request.urgency === "high" ? "Tenant marked urgent" : request.status === "open" ? "Tenant waiting" : "In progress",
      status: request.urgency === "high" ? "Urgent" : request.status === "open" ? "Owner action" : "In progress",
      cta: request.status === "open" ? "Review request" : "Check status",
      score: (request.urgency === "high" ? 105 : request.urgency === "medium" ? 70 : 38) + (request.status === "open" ? 18 : 0),
      tone: request.urgency === "high" ? "urgent" as const : "warning" as const,
      icon: Wrench,
      tab: "properties" as const,
      propertyId: request.propertyId,
      requestId: request.id,
    }));

  const maintenanceActions = data.maintenance
    .filter((item) => item.status !== "resolved")
    .map((item) => ({
      id: `maintenance-${item.id}`,
      kind: "maintenance" as const,
      title: item.status === "in-progress" ? `Check ${item.title.toLowerCase()}` : `Assign owner for ${item.title.toLowerCase()}`,
      meta: `${propertyName(data, item.propertyId)}${item.unit ? ` - ${item.unit}` : ""}${item.tenantName ? ` - ${item.tenantName}` : ""}`,
      detail: maintenanceNextAction(item),
      reason: item.priority === "high" ? "High priority maintenance" : item.status === "open" ? "Needs owner decision" : "In progress",
      status: item.priority === "high" ? "Urgent" : item.status === "open" ? "Owner action" : "Waiting",
      cta: item.vendor ? "Review request" : "Assign vendor",
      score: (item.priority === "high" ? 100 : item.priority === "medium" ? 55 : 25) + (item.status === "open" ? 20 : 0),
      tone: item.priority === "high" ? "urgent" as const : "warning" as const,
      icon: Wrench,
      tab: "properties" as const,
      propertyId: item.propertyId,
    }));

  const leaseActions = data.tenants
    .map((tenant) => ({ tenant, days: daysUntil(tenant.leaseEnd) }))
    .filter(({ tenant, days }) => tenant.status !== "active" || (days !== null && days <= 45))
    .map(({ tenant, days }) => ({
      id: `lease-${tenant.id}`,
      kind: "lease" as const,
      title: `${tenant.status === "expired" ? "Resolve" : "Renew"} ${tenant.name}'s lease`,
      meta: `${propertyName(data, tenant.propertyId)} - ${tenant.unit}`,
      detail: leaseNextAction(tenant),
      reason: days === null ? "Lease date needs review" : formatReminderTiming(days),
      status: tenant.status === "expired" || (days !== null && days <= 14) ? "Urgent" : "Upcoming",
      cta: tenant.status === "expired" ? "Review lease" : "Renew lease",
      score: tenant.status === "expired" ? 95 : days === null ? 45 : days <= 14 ? 85 : days <= 30 ? 62 : 38,
      tone: tenant.status === "expired" || (days !== null && days <= 14) ? "urgent" as const : "warning" as const,
      icon: Calendar,
      tab: "tasks" as const,
      propertyId: tenant.propertyId,
    }));

  const taskActions = data.tasks
    .filter((task) => task.status === "pending")
    .map((task) => {
      const days = daysUntil(task.dueDate);
      const overdue = days !== null && days < 0;
      const soon = days === null || days <= 14;
      return {
        id: `task-${task.id}`,
        kind: "task" as const,
        title: task.title,
        meta: `${propertyName(data, task.propertyId)} - ${task.type}`,
        detail: `${taskActionLabel(task)} before this leaves your active queue.`,
        reason: formatReminderTiming(days),
        status: overdue || task.priority === "high" ? "Urgent" : soon ? "Upcoming" : "Planned",
        cta: taskActionLabel(task),
        score: (overdue ? 82 : soon ? 44 : 12) + (task.priority === "high" ? 30 : task.priority === "medium" ? 12 : 0),
        tone: overdue || task.priority === "high" ? "urgent" as const : soon ? "warning" as const : "neutral" as const,
        icon: task.type === "inspection" ? ClipboardList : task.type === "maintenance" ? Wrench : task.type === "financial" ? DollarSign : CheckSquare,
        tab: "tasks" as const,
        propertyId: task.propertyId || undefined,
      };
    });

  return [...tenantRequestActions, ...maintenanceActions, ...leaseActions, ...taskActions].sort((a, b) => b.score - a.score);
}

function Dashboard({ data, profile, reminders, tenantRequests, notificationsEnabled, onNav, onToggleNotifications, onAddTask, onAddMaintenance, onAddDocument, onOpenProperty, onOpenTenantRequest }: { data: AppData; profile: AppProfile; reminders: ReminderItem[]; tenantRequests: TenantRequest[]; notificationsEnabled: boolean; onNav: (tab: Tab) => void; onToggleNotifications: () => void; onAddTask: () => void; onAddMaintenance: () => void; onAddDocument: () => void; onOpenProperty: (id: string) => void; onOpenTenantRequest: (request: TenantRequest) => void }) {
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
  const actions = useMemo(() => buildDashboardActions(data, tenantRequests), [data, tenantRequests]);
  const priority = actions[0] || null;
  const ownerActions = actions.slice(0, 5);
  const upcoming = actions.filter((action) => action.tone !== "urgent").slice(0, 4);
  const occupiedUnits = Math.min(data.tenants.length, totals.units);
  const healthStats = [
    { label: "Properties", value: String(data.properties.length), detail: `${totals.units} total units` },
    { label: "Occupied", value: `${occupiedUnits}/${totals.units || 0}`, detail: vacant > 0 ? `${vacant} vacant` : "Fully occupied", tone: vacant > 0 ? "warning" as const : "success" as const },
    { label: "Open work", value: String(totals.openMaintenance.length), detail: totals.urgent.length > 0 ? `${totals.urgent.length} urgent` : "No urgent requests", tone: totals.urgent.length > 0 ? "urgent" as const : "success" as const },
    { label: "Rent roll", value: money(totals.revenue), detail: "Monthly tracked" },
  ];
  const activity = (data.activity || []).slice(0, 5);
  const priorityCard = priority && {
    eyebrow: formatToday(),
    title: priority.title,
    detail: `${priority.meta}. ${priority.detail}`,
    reason: priority.reason,
    cta: priority.cta,
    tone: priority.tone,
    icon: priority.icon,
  };
  const openPriority = () => {
    if (!priority) return;
    if (priority.requestId) {
      const request = tenantRequests.find((item) => item.id === priority.requestId);
      if (request) onOpenTenantRequest(request);
      return;
    }
    if (priority.propertyId && priority.tab === "properties") onOpenProperty(priority.propertyId);
    else onNav(priority.tab);
  };

  return (
    <div className="mx-auto w-full max-w-5xl pb-24 lg:pb-12">
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Home Harbor</p>
          <p className="mt-1 text-sm text-muted-foreground">Good morning, {profile.name.split(" ")[0] || "there"}.</p>
        </div>
        <button onClick={() => setShowNotifications((visible) => !visible)} className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-[var(--hh-primary)]/30" aria-label="Notifications">
          <Bell className="h-5 w-5 text-foreground/60" />
          {reminders.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-[var(--hh-urgent)] px-1 text-[10px] font-semibold text-white">{reminders.length > 9 ? "9+" : reminders.length}</span>}
        </button>
      </div>

      <TodayPriority action={priorityCard} onPrimary={openPriority} onCreateTask={onAddTask} />

      {showNotifications && (
        <section className="px-4 pb-6">
          <div className="rounded-[1.35rem] border border-border bg-card/80 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Reminders</p>
                <p className="text-xs text-muted-foreground">{notificationsEnabled ? "Browser notifications enabled" : "In-app reminders active"}</p>
              </div>
              <button onClick={onToggleNotifications} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-[var(--hh-primary)] focus-visible:ring-2 focus-visible:ring-[var(--hh-primary)]/30">
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
                    <span className="block text-xs font-semibold text-foreground">{reminder.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{reminder.detail}</span>
                  </span>
                  <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-4 pb-8">
        <SectionHeader title="Needs Owner Action" eyebrow={`${ownerActions.length} prioritized`} />
        <div className="rounded-[1.35rem] border border-border bg-card/70 px-4">
          {ownerActions.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No owner decisions waiting" subtitle="Your urgent work is clear for now." />
          ) : ownerActions.map((action) => (
            <ActionItemRow
              key={action.id}
              icon={action.icon}
              title={action.title}
              meta={action.meta}
              reason={action.detail}
              tone={action.tone}
              status={action.status}
              actionLabel={action.cta}
              onClick={() => {
                if (action.requestId) {
                  const request = tenantRequests.find((item) => item.id === action.requestId);
                  if (request) onOpenTenantRequest(request);
                  return;
                }
                action.propertyId && action.tab === "properties" ? onOpenProperty(action.propertyId) : onNav(action.tab);
              }}
            />
          ))}
        </div>
      </section>

      <section className="px-4 pb-8">
        <SectionHeader title="Coming Up" eyebrow="Soon" actionLabel="View all upcoming" onAction={() => onNav("tasks")} />
        <div className="rounded-[1.35rem] border border-border bg-card/60 px-4">
          {upcoming.length === 0 ? (
            <EmptyState icon={Clock} title="Nothing pressing this week" subtitle="Open work scheduled farther out will stay in Tasks." />
          ) : upcoming.map((action) => (
            <UpcomingItemRow
              key={action.id}
              title={action.title}
              meta={action.meta}
              timing={action.reason}
              onClick={() => {
                if (action.requestId) {
                  const request = tenantRequests.find((item) => item.id === action.requestId);
                  if (request) onOpenTenantRequest(request);
                  return;
                }
                action.propertyId && action.tab === "properties" ? onOpenProperty(action.propertyId) : onNav(action.tab);
              }}
            />
          ))}
        </div>
      </section>

      <section className="px-4 pb-8">
        <SectionHeader title="Portfolio Health" eyebrow="At a glance" actionLabel="Open properties" onAction={() => onNav("properties")} />
        <PortfolioHealthSummary stats={healthStats} onOpen={() => onNav("properties")} />
      </section>

      <section className="px-4 pb-6">
        <SectionHeader title="Quick Capture" eyebrow="When something new comes in" />
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { label: "Add task", detail: "Renewal, follow-up, inspection", Icon: CheckSquare, action: onAddTask },
            { label: "Log maintenance", detail: "Capture an issue quickly", Icon: Wrench, action: onAddMaintenance },
            { label: "Upload document", detail: "Lease, receipt, notice", Icon: Upload, action: onAddDocument },
          ].map(({ label, detail, Icon, action }) => (
            <button key={label} onClick={action} className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card/55 px-4 py-3 text-left transition-all hover:bg-white active:scale-[0.99]">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--hh-primary-soft)] text-[var(--hh-primary)]"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{label}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detail}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="px-4">
        <SectionHeader title="Recent Receipts" eyebrow="Tracked for you" />
        <div className="rounded-[1.35rem] border border-border bg-card/50 px-4">
          <ActivityFeed activity={activity} onOpen={onNav} />
        </div>
      </section>
    </div>
  );
}

function PropertiesList({ data, onSelect, onAdd, onEdit, onDelete, onCopyRequestLink }: { data: AppData; onSelect: (id: string) => void; onAdd: () => void; onEdit: (property: Property) => void; onDelete: (id: string) => void; onCopyRequestLink: (property: Property) => void }) {
  const [query, setQuery] = useState("");
  const filtered = data.properties.filter((p) => `${p.name} ${p.address} ${p.city}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="pb-24 lg:pb-10">
      <PageHeader title="Properties" subtitle={`${data.properties.length} active properties`} action={<AddButton label="Add" onClick={onAdd} />} />
      <SearchAndFilterBar query={query} onQueryChange={setQuery} placeholder="Search by name or address..." />
      <div className="space-y-4 px-4">
        {filtered.map((property) => (
          <div key={property.id} className="space-y-2">
            <PropertyCard property={property} data={data} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} />
            <button onClick={() => onCopyRequestLink(property)} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card/55 px-4 py-3 text-left text-xs font-semibold text-muted-foreground transition-all hover:bg-white active:scale-[0.99]">
              <span>Tenant request link</span>
              <span className="text-[var(--hh-primary)]">Copy</span>
            </button>
          </div>
        ))}
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
      <div className="relative z-10 mx-4 -mt-5 overflow-hidden rounded-[1.35rem] border border-border bg-card/90 shadow-[var(--hh-shadow-md)]">
        <div className="grid grid-cols-3 divide-x divide-border py-4 text-center">
          {[{ value: `${stats.occupiedUnits}/${property.units}`, label: "Occupied" }, { value: stats.tenants.length, label: "Tenants" }, { value: money(stats.revenue), label: "Monthly" }].map((item) => (
            <div key={item.label}><p className="text-lg font-semibold text-foreground">{item.value}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p></div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-4 pb-0 pt-3 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{property.address}, {property.city}</div>

      <div className="px-4 pb-1 pt-4">
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
          {(["overview", "maintenance", "documents"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize leading-none transition-all ${activeTab === tab ? "bg-card text-foreground shadow-[var(--hh-shadow-sm)]" : "text-muted-foreground hover:text-foreground/70"}`}>
              {tab}{tab === "maintenance" && openIssues > 0 && <span className="ml-1 text-[var(--hh-urgent)]">({openIssues})</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-4 pt-4">
        {activeTab === "overview" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Units & Tenants</p>
              <button onClick={onAddTenant} className="flex items-center gap-1 text-xs font-semibold text-[var(--hh-primary)]"><Plus className="h-3.5 w-3.5" />Add tenant</button>
            </div>
            {stats.tenants.map((tenant) => (
              <div key={tenant.id} className="rounded-[1.35rem] border border-border bg-card/90 p-4">
                <div className="mb-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-sm font-semibold leading-tight text-foreground">{tenant.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{tenant.unit} - {money(tenant.rent)}/mo</p></div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <StatusBadge status={tenant.status} />
                    <IconAction label="Edit tenant" icon={Pencil} onClick={() => onEditTenant(tenant)} />
                    <IconAction label="Delete tenant" icon={Trash2} tone="danger" onClick={() => onDeleteTenant(tenant.id)} />
                  </div>
                </div>
                <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /><span>{tenant.leaseStart} - {tenant.leaseEnd}</span></div>
                {tenant.notes && <p className="mb-3 rounded-xl bg-muted/40 px-3 py-2 text-xs italic leading-relaxed text-muted-foreground">"{tenant.notes}"</p>}
                <div className="flex items-center gap-3 border-t border-border pt-3">
                  <a href={`tel:${tenant.phone}`} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--hh-primary)] hover:opacity-60"><Phone className="h-3.5 w-3.5" />{tenant.phone}</a>
                  <span className="h-3 w-px bg-border" />
                  <a href={`mailto:${tenant.email}`} className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-semibold text-[var(--hh-primary)] hover:opacity-60"><Mail className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{tenant.email}</span></a>
                </div>
              </div>
            ))}
            {vacant > 0 && (
              <button onClick={onAddTenant} className="flex w-full items-center gap-3 rounded-[1.35rem] border-2 border-dashed border-border p-4 text-left transition-colors hover:border-[var(--hh-primary)]/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted"><Plus className="h-4 w-4 text-muted-foreground" /></div>
                <div><p className="text-sm font-bold text-foreground">{vacant} vacant {vacant === 1 ? "unit" : "units"}</p><p className="text-xs text-muted-foreground">Add tenant details and lease dates</p></div>
              </button>
            )}
          </>
        )}

        {activeTab === "maintenance" && (
          <>
            <div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Requests</p><button onClick={onAddMaintenance} className="flex items-center gap-1 text-xs font-semibold text-[var(--hh-primary)]"><Plus className="h-3.5 w-3.5" />Add</button></div>
            {maintenance.length === 0 ? <EmptyState icon={Wrench} title="No maintenance requests" /> : maintenance.map((item) => (
              <div key={item.id} className="rounded-[1.35rem] border border-border bg-card/90 p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm font-semibold leading-tight text-foreground">{item.title}</p>
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
                  {item.status !== "resolved" ? <button onClick={() => updateMaintenance(item.id, "resolved")} className="text-xs font-semibold text-[var(--hh-success)]">Mark resolved</button> : <button onClick={() => updateMaintenance(item.id, "open")} className="text-xs font-semibold text-[var(--hh-primary)]">Reopen</button>}
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === "documents" && (
          <>
            <div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Files</p><button onClick={onAddDocument} className="flex items-center gap-1 text-xs font-semibold text-[var(--hh-primary)]"><Upload className="h-3.5 w-3.5" />Upload</button></div>
            {docs.length === 0 ? <EmptyState icon={FileText} title="No documents yet" /> : docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/90 p-4">
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
        <div className="mb-3 rounded-[1.35rem] border border-border bg-card/90 p-4">
          <p className="text-sm font-semibold text-foreground">Work queue</p>
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
        <div className="rounded-[1.35rem] border border-[var(--hh-primary-border)] bg-card/90 p-5">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[1.35rem] bg-[var(--hh-success-bg)]">
            {privacy ? <Shield className="h-5 w-5 text-[var(--hh-success)]" /> : <Scale className="h-5 w-5 text-[var(--hh-success)]" />}
          </div>
          <p className="text-lg font-semibold text-foreground">{privacy ? "Your rental data stays yours." : "Clear terms for beta use."}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Last updated August 8, 2026. This draft should be reviewed by a qualified attorney before a full public launch.</p>
        </div>
        {sections.map((section) => (
          <section key={section.title} className="rounded-[1.35rem] border border-border bg-card/90 p-4">
            <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
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
        <form onSubmit={submit} className="rounded-[1.35rem] border border-border bg-card/90 p-5">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[1.35rem] bg-[var(--hh-success-bg)]"><MessageSquare className="h-5 w-5 text-[var(--hh-success)]" /></div>
          <p className="text-lg font-semibold text-foreground">Tell us what happened.</p>
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
        <div className="rounded-[1.35rem] border border-border bg-card/90 p-5">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[1.35rem] bg-[var(--hh-success-bg)]"><BarChart3 className="h-5 w-5 text-[var(--hh-success)]" /></div>
          <p className="text-lg font-semibold text-foreground">Privacy-friendly product analytics.</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Home Harbor records simple events like page opens, creates, updates, deletes, and feedback submissions to your own Supabase project.</p>
          <Button onClick={toggleAnalytics} variant={analyticsEnabled ? "primary" : "secondary"} className="mt-4 w-full">
            Analytics {analyticsEnabled ? "on" : "off"}
          </Button>
        </div>
        <div className="rounded-[1.35rem] border border-border bg-card/90 p-4">
          <p className="text-sm font-semibold text-foreground">Recent activity</p>
          {status && <p className="mt-2 text-sm leading-6 text-muted-foreground">{status}</p>}
          {summary && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-background p-3"><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Events</p><p className="mt-1 text-xl font-semibold text-foreground">{summary.totalEvents}</p></div>
                <div className="rounded-xl bg-background p-3"><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Last event</p><p className="mt-1 truncate text-xs font-bold text-foreground">{summary.lastEventAt ? new Date(summary.lastEventAt).toLocaleString() : "None yet"}</p></div>
              </div>
              {summary.topEvents.length === 0 ? <EmptyState icon={BarChart3} title="No analytics yet" subtitle="Events appear as testers use the app." /> : summary.topEvents.map((event) => (
                <div key={event.name} className="flex items-center justify-between rounded-xl bg-background px-3 py-2">
                  <span className="text-xs font-bold text-foreground">{event.name.replace(/_/g, " ")}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{event.count}</span>
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
        <div className="mb-6 flex items-center gap-4 rounded-[1.35rem] border border-border bg-card/90 p-5">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[1.35rem] bg-[var(--hh-primary)] text-lg font-semibold uppercase text-white">{initials(profile.name)}</div>
          <div className="min-w-0 flex-1"><p className="font-semibold text-foreground">{profile.name}</p><p className="text-sm text-muted-foreground">{profile.email}</p><p className="mt-1 text-xs text-muted-foreground">{data.properties.length} properties - {data.tenants.length} tenants</p></div>
        </div>
        {items.map((section) => (
          <div key={section.section} className="mb-5">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{section.section}</p>
            <div className="overflow-hidden rounded-[1.35rem] border border-border bg-card/90 divide-y divide-border">
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
        <button onClick={onToggleNotifications} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card/90 px-4 py-3 text-xs font-semibold text-muted-foreground shadow-[var(--hh-shadow-sm)] transition-all hover:bg-white active:scale-[0.99]">
          <Bell className="h-4 w-4" />
          Browser notifications {notificationsEnabled ? "on" : "off"}
        </button>
        <button onClick={replayOnboarding} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card/90 px-4 py-3 text-xs font-semibold text-muted-foreground shadow-[var(--hh-shadow-sm)] transition-all hover:bg-white active:scale-[0.99]">
          <User className="h-4 w-4" />
          Replay onboarding
        </button>
        <button onClick={onSignOut} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card/90 px-4 py-3 text-xs font-semibold text-muted-foreground shadow-[var(--hh-shadow-sm)] transition-all hover:bg-white active:scale-[0.99]">
          <Lock className="h-4 w-4" />
          Sign out
        </button>
        <div className="pb-4 pt-6 text-center"><p className="text-xs font-bold text-muted-foreground">Home Harbor - v1.1.0</p><p className="mt-0.5 text-xs text-muted-foreground">Your rentals, organized.</p></div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}

const inputClass = "w-full rounded-2xl border border-border bg-[var(--input-background)] px-3.5 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-[var(--hh-primary-border)] focus:bg-card focus:ring-2 focus:ring-[var(--hh-primary-soft)]";

function getTenantRequestRoute() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] !== "request" || !parts[1] || !parts[2]) return null;
  return {
    ownerId: decodeURIComponent(parts[1]),
    propertyId: decodeURIComponent(parts[2]),
    propertyName: parts[3] ? decodeURIComponent(parts.slice(3).join(" ")) : "",
  };
}

function tenantRequestLink(ownerId: string, property: Property) {
  const base = window.location.origin;
  return `${base}/request/${encodeURIComponent(ownerId)}/${encodeURIComponent(property.id)}/${encodeURIComponent(property.name)}`;
}

function TenantRequestScreen({ route }: { route: { ownerId: string; propertyId: string; propertyName?: string } }) {
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const form = new FormData(event.currentTarget);
      const requestId = uid("tr");
      const file = form.get("file") instanceof File && (form.get("file") as File).size > 0 ? form.get("file") as File : null;
      let filePatch: Pick<TenantRequest, "fileName" | "filePath" | "mimeType"> = {};

      if (file) {
        const filePath = await uploadTenantRequestFile(route.ownerId, requestId, file);
        filePatch = { fileName: file.name, filePath, mimeType: file.type };
      }

      await submitTenantRequest({
        ownerId: route.ownerId,
        propertyId: route.propertyId,
        propertyName: route.propertyName || "",
        unit: String(form.get("unit") || ""),
        tenantName: String(form.get("tenantName") || ""),
        tenantEmail: String(form.get("tenantEmail") || ""),
        tenantPhone: String(form.get("tenantPhone") || ""),
        title: String(form.get("title") || ""),
        description: String(form.get("description") || ""),
        urgency: form.get("urgency") as TenantRequest["urgency"],
        permissionToEnter: form.get("permissionToEnter") === "yes",
        preferredTimes: String(form.get("preferredTimes") || ""),
        ...filePatch,
      });

      setSubmitted(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request could not be sent.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <main className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-xl flex-col justify-center">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--hh-primary)] text-white"><Home className="h-4 w-4" /></div>
          <div>
            <p className="text-sm font-semibold text-foreground">Home Harbor</p>
            <p className="text-xs text-muted-foreground">Maintenance request</p>
          </div>
        </div>

        {submitted ? (
          <section className="rounded-[1.75rem] border border-border bg-card/90 p-6 shadow-[var(--hh-shadow-sm)]">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-[var(--hh-success-bg)] text-[var(--hh-success)]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-2xl font-semibold leading-tight text-foreground">Request sent.</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Thanks. Your maintenance request was sent to the property owner. They will review it and follow up using the contact details you provided.</p>
          </section>
        ) : (
          <form onSubmit={submit} className="rounded-[1.75rem] border border-border bg-card/90 p-5 shadow-[var(--hh-shadow-sm)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{route.propertyName || "Property request link"}</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight text-foreground">Tell the owner what needs attention.</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">No account needed. Share the issue, add a photo if helpful, and the owner will see it in Home Harbor.</p>

            <div className="mt-6 space-y-3">
              <Field label="Issue title"><input name="title" required className={inputClass} placeholder="Kitchen sink is leaking" /></Field>
              <Field label="What happened?"><textarea name="description" required rows={4} className={inputClass} placeholder="Describe the issue, when it started, and anything the owner should know." /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Unit"><input name="unit" required className={inputClass} placeholder="Unit 2A" /></Field>
                <Field label="Urgency"><select name="urgency" defaultValue="medium" className={inputClass}><option value="low">Normal</option><option value="medium">Soon</option><option value="high">Urgent</option></select></Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Your name"><input name="tenantName" required className={inputClass} placeholder="Your name" /></Field>
                <Field label="Phone"><input name="tenantPhone" required className={inputClass} placeholder="Best phone number" /></Field>
              </div>
              <Field label="Email"><input name="tenantEmail" type="email" className={inputClass} placeholder="Optional email" /></Field>
              <Field label="Permission to enter"><select name="permissionToEnter" defaultValue="no" className={inputClass}><option value="no">Please contact me first</option><option value="yes">Yes, owner/vendor may enter</option></select></Field>
              <Field label="Preferred times"><input name="preferredTimes" className={inputClass} placeholder="Weekdays after 4pm, Saturday morning, etc." /></Field>
              <Field label="Photo or file"><input name="file" type="file" className={inputClass} /></Field>
              {message && <p className="rounded-2xl border border-[var(--hh-urgent-border)] bg-[var(--hh-urgent-bg)] px-3 py-2 text-sm font-semibold text-[var(--hh-urgent)]">{message}</p>}
            </div>

            <Button type="submit" disabled={saving} className="mt-5 w-full">
              {saving ? "Sending..." : "Send request"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}

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
      <form onSubmit={submit} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] border border-border bg-card/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[var(--hh-shadow-md)] backdrop-blur-2xl sm:max-w-lg sm:rounded-[1.35rem] sm:pb-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><p className="text-lg font-semibold text-foreground">{title}</p><p className="text-xs text-muted-foreground">Saved to your cloud portfolio automatically.</p></div>
          <button type="button" onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-muted active:scale-95" aria-label="Close"><X className="h-4 w-4" /></button>
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

function TenantRequestDrawer({ request, onClose, onStatusChange }: { request: TenantRequest | null; onClose: () => void; onStatusChange: (request: TenantRequest, status: TenantRequest["status"]) => void }) {
  if (!request) return null;
  const urgent = request.urgency === "high";

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-0 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Tenant request">
      <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] border border-border bg-card/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[var(--hh-shadow-md)] backdrop-blur-2xl sm:max-w-lg sm:rounded-[1.35rem] sm:pb-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tenant request</p>
            <h2 className="mt-1 text-xl font-semibold leading-tight text-foreground">{request.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{request.propertyName || "Property"}{request.unit ? ` - ${request.unit}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-muted active:scale-95" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <div className={`rounded-2xl border p-3 ${urgent ? "border-[var(--hh-urgent-border)] bg-[var(--hh-urgent-bg)]" : "border-[var(--hh-warning-border)] bg-[var(--hh-warning-bg)]"}`}>
            <p className={`text-xs font-semibold uppercase tracking-widest ${urgent ? "text-[var(--hh-urgent)]" : "text-[var(--hh-warning)]"}`}>{urgent ? "Urgent" : request.urgency === "medium" ? "Soon" : "Normal"}</p>
            <p className="mt-1 text-sm leading-6 text-foreground">{tenantRequestNextAction(request)}</p>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Description</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{request.description}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["Tenant", request.tenantName],
              ["Phone", request.tenantPhone],
              ["Email", request.tenantEmail || "Not provided"],
              ["Entry", request.permissionToEnter ? "Permission granted" : "Contact tenant first"],
              ["Preferred times", request.preferredTimes || "Not provided"],
              ["Status", request.status],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[var(--input-background)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          {request.fileName && (
            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Attached file</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{request.fileName}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Stored in the tenant request files bucket. Signed viewing can be added next.</p>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {request.status !== "in-progress" && <Button variant="secondary" onClick={() => onStatusChange(request, "in-progress")}>Mark in progress</Button>}
          {request.status !== "resolved" && <Button onClick={() => onStatusChange(request, "resolved")}>Mark resolved</Button>}
          {request.status === "resolved" && <Button variant="secondary" onClick={() => onStatusChange(request, "open")}>Reopen request</Button>}
        </div>
      </section>
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
            <span className="text-lg font-semibold">Home Harbor</span>
          </div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">Your rental data, tied to your account.</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/68">Sign in on your Mac, iPhone, or iPad and keep the same portfolio synced through Supabase.</p>
        </div>
        <div className="grid gap-3">
          {[
            { label: "Accounts", value: "Email sign-in" },
            { label: "Database", value: "Cloud synced" },
            { label: "Security", value: "Row-level policies" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-[1.35rem] border border-white/10 bg-white/10 px-4 py-3">
              <span className="text-sm font-bold text-white/75">{item.label}</span>
              <span className="text-sm font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-[440px]">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--hh-primary)] text-white"><Home className="h-4 w-4" /></div>
            <span className="font-semibold text-foreground">Home Harbor</span>
          </div>
          <div className="rounded-[1.35rem] border border-border bg-card/90 p-5 shadow-[var(--hh-shadow-sm)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground">{title}</h2>
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
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">1. Environment</p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--hh-code-bg)] p-3 text-xs leading-5 text-white">{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key`}</pre>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">2. Database</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Run <span className="font-semibold text-foreground">supabase/schema.sql</span> in the Supabase SQL editor to create the secured portfolio table.</p>
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
    <div className="mx-4 mt-3 rounded-[1.35rem] border border-[var(--hh-primary-border)] bg-card/90 p-4 shadow-[var(--hh-shadow-sm)]">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--hh-success-bg)]">
          <Upload className="h-4 w-4 text-[var(--hh-success)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Install on your iPhone</p>
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
      <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 w-full text-center text-xs font-semibold text-[var(--hh-primary)]">
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
            <span className="text-lg font-semibold">Home Harbor</span>
          </div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">Bring your rentals into focus before the day starts.</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/68">Set up the essentials once, then manage properties, tenants, tasks, maintenance, and documents from one calm workspace.</p>
        </div>
        <div className="grid gap-3">
          {[
            { label: "Lease renewals", value: "60-day alerts" },
            { label: "Maintenance", value: "Priority tracking" },
            { label: "Documents", value: "Property organized" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-[1.35rem] border border-white/10 bg-white/10 px-4 py-3">
              <span className="text-sm font-bold text-white/78">{item.label}</span>
              <span className="text-sm font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-[520px]">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--hh-primary)] text-white"><Home className="h-4 w-4" /></div>
              <span className="font-semibold text-foreground">Home Harbor</span>
            </div>
            <div className="ml-auto flex gap-1.5">
              {steps.map((label, index) => (
                <span key={label} className={`h-1.5 rounded-full transition-all ${index === step ? "w-7 bg-[var(--hh-primary)]" : index < step ? "w-4 bg-[var(--hh-success)]" : "w-4 bg-muted"}`} />
              ))}
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-border bg-card/90 p-5 shadow-[var(--hh-shadow-sm)] sm:p-6">
            {step === 0 && (
              <div>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-[var(--hh-success-bg)]"><Building2 className="h-6 w-6 text-[var(--hh-success)]" /></div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Welcome</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground">Let’s set up your rental command center.</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">Home Harbor works best when it starts with your name, your portfolio, and at least one property. You can use sample data first or begin with your own clean workspace.</p>
                <div className="mt-6 grid gap-2">
                  {[
                    { Icon: CheckSquare, title: "Track work", copy: "Tasks, reminders, and lease renewals stay visible." },
                    { Icon: Wrench, title: "Handle maintenance", copy: "Open requests are grouped by property and priority." },
                    { Icon: FileText, title: "Organize documents", copy: "Leases, inspections, receipts, and warranties live together." },
                  ].map(({ Icon, title, copy }) => (
                    <div key={title} className="flex gap-3 rounded-xl bg-background p-3">
                      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--hh-primary)]" />
                      <div><p className="text-sm font-semibold text-foreground">{title}</p><p className="text-xs leading-5 text-muted-foreground">{copy}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your profile</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground">First, tell Home Harbor who is managing the portfolio.</h2>
                <div className="mt-6 space-y-3">
                  <Field label="Full name"><input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className={inputClass} placeholder="Your name" /></Field>
                  <Field label="Email"><input value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} type="email" className={inputClass} placeholder="you@email.com" /></Field>
                  <Field label="Portfolio name"><input value={profile.portfolioName} onChange={(event) => setProfile({ ...profile, portfolioName: event.target.value })} className={inputClass} placeholder="My rental portfolio" /></Field>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Portfolio start</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground">Choose how you want to begin.</h2>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => setMode("sample")} className={`rounded-[1.35rem] border p-4 text-left transition-all ${mode === "sample" ? "border-[var(--hh-primary)] bg-[var(--hh-primary-soft)] ring-2 ring-[var(--hh-primary-border)]" : "border-border bg-background"}`}>
                    <CheckCircle2 className={`mb-3 h-5 w-5 ${mode === "sample" ? "text-[var(--hh-success)]" : "text-muted-foreground"}`} />
                    <p className="text-sm font-semibold text-foreground">Use sample portfolio</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Best for exploring the app with realistic data.</p>
                  </button>
                  <button type="button" onClick={() => setMode("fresh")} className={`rounded-[1.35rem] border p-4 text-left transition-all ${mode === "fresh" ? "border-[var(--hh-primary)] bg-[var(--hh-primary-soft)] ring-2 ring-[var(--hh-primary-border)]" : "border-border bg-background"}`}>
                    <Plus className={`mb-3 h-5 w-5 ${mode === "fresh" ? "text-[var(--hh-primary)]" : "text-muted-foreground"}`} />
                    <p className="text-sm font-semibold text-foreground">Start with my property</p>
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
              {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="rounded-xl border border-border bg-card/90 px-4 py-3 text-sm font-semibold text-muted-foreground">Back</button>}
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => step === 2 ? finish() : setStep(step + 1)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--hh-primary)] px-4 py-3 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
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
  const [tenantRequests, setTenantRequests] = useState<TenantRequest[]>([]);
  const [selectedTenantRequest, setSelectedTenantRequest] = useState<TenantRequest | null>(null);

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
    if (!session?.user.id || !cloudReady) return;

    let cancelled = false;
    loadTenantRequests(session.user.id)
      .then((requests) => {
        if (!cancelled) setTenantRequests(requests);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [session?.user.id, cloudReady, serializedData]);

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

  function openTenantRequest(request: TenantRequest) {
    setSelectedTenantRequest(request);
    track("tenant_request_opened", { status: request.status, urgency: request.urgency });
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

  async function changeTenantRequestStatus(request: TenantRequest, status: TenantRequest["status"]) {
    if (!session?.user.id) return;
    try {
      await updateTenantRequestStatus(session.user.id, request.id, status);
      const nextRequest = { ...request, status };
      setTenantRequests((current) => current.map((item) => item.id === request.id ? nextRequest : item));
      setSelectedTenantRequest(nextRequest);
      setData((current) => withActivity(
        current,
        {
          title: status === "resolved" ? "Tenant request resolved" : "Tenant request updated",
          detail: `${request.title} - ${request.propertyName || propertyName(current, request.propertyId)}`,
          outcome: status === "resolved" ? "No longer shown as owner action" : tenantRequestNextAction(nextRequest),
          tone: status === "resolved" ? "success" : "warning",
          tab: "dashboard",
          propertyId: request.propertyId,
        },
      ));
      showToast(status === "resolved" ? "Tenant request resolved." : "Tenant request updated.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not update tenant request.", "error");
    }
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

  async function copyRequestLink(property: Property) {
    if (!session?.user.id) return;
    const link = tenantRequestLink(session.user.id, property);
    try {
      await navigator.clipboard.writeText(link);
      showToast("Tenant request link copied.");
      track("tenant_request_link_copied", { propertyId: property.id });
    } catch {
      showToast(link, "success");
    }
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
    if (tab === "dashboard") return <Dashboard data={data} profile={profile} reminders={reminders} tenantRequests={tenantRequests} notificationsEnabled={notificationsEnabled} onNav={navigate} onToggleNotifications={toggleNotifications} onAddTask={() => openAdd("task")} onAddMaintenance={() => openAdd("maintenance")} onAddDocument={() => openAdd("document")} onOpenProperty={openPropertyFromDashboard} onOpenTenantRequest={openTenantRequest} />;
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
        <PropertiesList data={data} onSelect={setSelectedProperty} onAdd={() => openAdd("property")} onEdit={(property) => openEdit({ kind: "property", item: property })} onDelete={(id) => deleteRecord("property", id)} onCopyRequestLink={copyRequestLink} />
      );
    }
    if (tab === "tasks") return <Tasks data={data} onAdd={() => openAdd("task")} onEdit={(task) => openEdit({ kind: "task", item: task })} onDelete={(id) => deleteRecord("task", id)} toggleTask={toggleTask} />;
    if (tab === "documents") return <Documents data={data} onAdd={() => openAdd("document")} onOpen={openDocument} onEdit={(doc) => openEdit({ kind: "document", item: doc })} onDelete={(id) => deleteRecord("document", id)} />;
    return <SettingsScreen data={data} profile={profile} userId={session.user.id} activeTab={tab} notificationsEnabled={notificationsEnabled} analyticsEnabled={analyticsEnabled} setAnalyticsEnabled={setAnalyticsEnabled} resetData={resetData} exportData={exportData} replayOnboarding={replayOnboarding} onToggleNotifications={toggleNotifications} onSignOut={signOut} onTrack={track} />;
  }

  const tenantRequestRoute = getTenantRequestRoute();

  if (tenantRequestRoute) {
    return <TenantRequestScreen route={tenantRequestRoute} />;
  }

  if (!supabase) {
    return <CloudSetupScreen />;
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-[1.35rem] border border-border bg-card/90 p-6 text-center shadow-[var(--hh-shadow-sm)]">
          <Home className="mx-auto mb-3 h-8 w-8 text-[var(--hh-primary)]" />
          <p className="text-sm font-semibold text-foreground">Loading Home Harbor...</p>
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
        <div className="w-full max-w-md rounded-[1.35rem] border border-border bg-card/90 p-6 text-center shadow-[var(--hh-shadow-sm)]">
          <Shield className="mx-auto mb-3 h-8 w-8 text-[var(--hh-success)]" />
          <p className="text-sm font-semibold text-foreground">Loading your portfolio...</p>
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
      overlay={
        <>
          <AppModal kind={modal} data={data} selectedProperty={selectedProperty} editRecord={editRecord} saving={savingRecord} onClose={closeModal} onSave={save} />
          <TenantRequestDrawer request={selectedTenantRequest} onClose={() => setSelectedTenantRequest(null)} onStatusChange={changeTenantRequestStatus} />
        </>
      }
      notice={notice}
    >
      {renderContent()}
    </AppShell>
  );
}
