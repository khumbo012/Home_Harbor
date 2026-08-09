import type { AppData, DocItem, ReminderItem } from "./types";

export function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function money(n: number) {
  return "$" + n.toLocaleString();
}

export function propertyName(data: AppData, id: string) {
  return data.properties.find((p) => p.id === id)?.name || "All properties";
}

export function propertyStats(data: AppData, propertyId: string) {
  const property = data.properties.find((p) => p.id === propertyId);
  const tenants = data.tenants.filter((t) => t.propertyId === propertyId);
  const occupiedUnits = Math.min(tenants.length, property?.units || tenants.length);
  const revenue = tenants.reduce((sum, t) => sum + Number(t.rent || 0), 0);
  return { tenants, occupiedUnits, revenue };
}

export function parseAppDate(value: string) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
}

export function daysUntil(value: string) {
  const parsed = parseAppDate(value);
  if (!parsed) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return Math.ceil((parsed.getTime() - today.getTime()) / 86400000);
}

export function formatReminderTiming(days: number | null) {
  if (days === null) return "No date";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

export function formatToday() {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(new Date());
}

export function dueTone(days: number | null, done = false) {
  if (done) return "complete";
  if (days !== null && days < 0) return "overdue";
  if (days !== null && days <= 7) return "soon";
  return "normal";
}

export function dueLabel(value: string, done = false) {
  if (done) return "Complete";
  const days = daysUntil(value);
  if (days === null) return value;
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return "Due soon";
  return value;
}

export function buildReminders(data: AppData): ReminderItem[] {
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

export function fileSizeLabel(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function priorityStyle(priority: string) {
  if (priority === "high") return "bg-[var(--hh-urgent-bg)] text-[var(--hh-urgent)] border-[var(--hh-urgent-border)]";
  if (priority === "medium") return "bg-[var(--hh-warning-bg)] text-[var(--hh-warning)] border-[var(--hh-warning-border)]";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export function statusStyle(status: string) {
  if (status === "open" || status === "expired") return "bg-[var(--hh-urgent-bg)] text-[var(--hh-urgent)] border-[var(--hh-urgent-border)]";
  if (status === "in-progress" || status === "expiring") return "bg-[var(--hh-warning-bg)] text-[var(--hh-warning)] border-[var(--hh-warning-border)]";
  if (status === "resolved" || status === "active" || status === "done") return "bg-[var(--hh-success-bg)] text-[var(--hh-success)] border-[var(--hh-success-border)]";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export function docColor(type: DocItem["type"]) {
  if (type === "lease") return "bg-blue-50 text-blue-600";
  if (type === "inspection") return "bg-[var(--hh-success-bg)] text-[var(--hh-success)]";
  if (type === "warranty") return "bg-purple-50 text-purple-600";
  if (type === "receipt") return "bg-green-50 text-green-600";
  if (type === "application") return "bg-orange-50 text-orange-600";
  return "bg-slate-100 text-slate-600";
}
