import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { DEFAULT_IMAGES } from "../data";
import type { ActivityItem, AppData, DocItem, Property, Tab, TaskItem } from "../types";
import {
  daysUntil,
  docColor,
  dueLabel,
  dueTone,
  money,
  priorityStyle,
  propertyName,
  propertyStats,
  statusStyle,
} from "../utils";

export function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${className}`}>{children}</span>;
}

export function Button({ children, onClick, type = "button", variant = "primary", disabled = false, className = "" }: { children: React.ReactNode; onClick?: () => void; type?: "button" | "submit"; variant?: "primary" | "secondary" | "ghost" | "danger"; disabled?: boolean; className?: string }) {
  const variants = {
    primary: "border-[var(--hh-primary)] bg-[var(--hh-primary)] text-white shadow-[0_8px_18px_rgba(10,132,255,0.22)] hover:bg-[var(--hh-primary-hover)]",
    secondary: "border-border bg-[var(--hh-glass)] text-[var(--hh-primary)] backdrop-blur-xl hover:border-[var(--hh-primary-border)] hover:bg-white",
    ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-[var(--hh-primary-soft)] hover:text-[var(--hh-primary)]",
    danger: "border-[var(--hh-urgent-border)] bg-[var(--hh-urgent-bg)] text-[var(--hh-urgent)] hover:bg-[var(--hh-urgent-bg)]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, action, onBack }: { title: string; subtitle?: string; action?: React.ReactNode; onBack?: () => void }) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-[var(--hh-glass)] backdrop-blur-2xl">
      <div className="flex min-h-[58px] items-center gap-3 px-4 py-3">
        {onBack && (
          <button onClick={onBack} className="-ml-1.5 rounded-full p-2 transition-colors hover:bg-muted" aria-label="Go back">
            <ArrowLeft className="h-5 w-5 text-foreground/60" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-[var(--hh-primary)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(10,132,255,0.2)] transition-all hover:bg-[var(--hh-primary-hover)] active:scale-95">
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export function IconAction({ label, icon: Icon, tone = "neutral", onClick }: { label: string; icon: LucideIcon; tone?: "neutral" | "danger"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs transition-all duration-200 active:scale-95 ${
        tone === "danger" ? "border-[var(--hh-urgent-border)] bg-[var(--hh-urgent-bg)] text-[var(--hh-urgent)]" : "border-border bg-[var(--hh-glass)] text-muted-foreground backdrop-blur-xl hover:text-foreground"
      }`}
      aria-label={label}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-border bg-[var(--input-background)] py-3 pl-9 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-[var(--hh-primary-border)] focus:bg-card focus:ring-2 focus:ring-[var(--hh-primary-soft)]"
      />
    </div>
  );
}

export function Input({ name, value, defaultValue, onChange, type = "text", required, minLength, min, placeholder, className = "" }: { name?: string; value?: string | number; defaultValue?: string | number; onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean; minLength?: number; min?: string | number; placeholder?: string; className?: string }) {
  return (
    <input
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      type={type}
      required={required}
      minLength={minLength}
      min={min}
      placeholder={placeholder}
      className={`w-full rounded-2xl border border-border bg-[var(--input-background)] px-3.5 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-[var(--hh-primary-border)] focus:bg-card focus:ring-2 focus:ring-[var(--hh-primary-soft)] ${className}`}
    />
  );
}

export function EmptyState({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="py-14 text-center">
      <Icon className="mx-auto mb-3 h-9 w-9 text-muted-foreground/30" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function SkeletonLoader({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2 px-4 py-4" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-[1.35rem] border border-border bg-card/80 p-4">
          <div className="h-3 w-1/3 rounded-full bg-muted" />
          <div className="mt-3 h-3 w-3/4 rounded-full bg-muted" />
          <div className="mt-3 h-2 w-1/2 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function SectionHeader({ title, eyebrow, actionLabel, onAction }: { title: string; eyebrow?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>}
        <h2 className="text-[15px] font-semibold leading-tight text-foreground">{title}</h2>
      </div>
      {actionLabel && onAction && (
        <button onClick={onAction} className="flex-shrink-0 text-xs font-semibold text-[var(--hh-primary)] transition-opacity hover:opacity-70">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function StatusIndicator({ tone, label }: { tone: "urgent" | "warning" | "success" | "neutral"; label: string }) {
  const toneClass = tone === "urgent"
    ? "bg-[var(--hh-urgent-bg)] text-[var(--hh-urgent)]"
    : tone === "warning"
      ? "bg-[var(--hh-warning-bg)] text-[var(--hh-warning)]"
      : tone === "success"
        ? "bg-[var(--hh-success-bg)] text-[var(--hh-success)]"
        : "bg-muted text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${toneClass}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function TodayPriority({ action, onPrimary, onCreateTask }: { action: { eyebrow: string; title: string; detail: string; reason: string; cta: string; tone: "urgent" | "warning" | "success" | "neutral"; icon: LucideIcon } | null; onPrimary?: () => void; onCreateTask: () => void }) {
  const Icon = action?.icon || CheckCircle2;
  const calm = !action;
  return (
    <section className="px-4 pb-6 pt-6 lg:pt-8">
      <div className="mx-auto max-w-5xl">
        <div className="border-b border-border pb-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{action?.eyebrow || "Today"}</p>
            <StatusIndicator tone={calm ? "success" : action.tone} label={calm ? "Clear" : action.reason} />
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="min-w-0">
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${calm ? "bg-[var(--hh-success-bg)] text-[var(--hh-success)]" : action.tone === "urgent" ? "bg-[var(--hh-urgent-bg)] text-[var(--hh-urgent)]" : "bg-[var(--hh-warning-bg)] text-[var(--hh-warning)]"}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-[1.08] text-foreground sm:text-4xl">
                {action?.title || "Your rentals are steady today."}
              </h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted-foreground">
                {action?.detail || "No urgent owner decision is waiting. You can add a task, upload a document, or review your upcoming work when you are ready."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <Button onClick={action ? onPrimary : onCreateTask} className="min-w-[150px]">
                {action?.cta || "Add task"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              {action && (
                <Button variant="secondary" onClick={onCreateTask} className="min-w-[150px]">
                  Add task
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ActionItemRow({ icon: Icon, title, meta, reason, tone, status, actionLabel, onClick }: { icon: LucideIcon; title: string; meta: string; reason: string; tone: "urgent" | "warning" | "success" | "neutral"; status: string; actionLabel: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex w-full items-start gap-3 border-b border-border px-0 py-4 text-left transition-colors last:border-b-0 hover:bg-white/55 active:scale-[0.995] sm:px-2">
      <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl ${tone === "urgent" ? "bg-[var(--hh-urgent-bg)] text-[var(--hh-urgent)]" : tone === "warning" ? "bg-[var(--hh-warning-bg)] text-[var(--hh-warning)]" : tone === "success" ? "bg-[var(--hh-success-bg)] text-[var(--hh-success)]" : "bg-muted text-muted-foreground"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-[15px] font-semibold leading-tight text-foreground">{title}</p>
          <StatusIndicator tone={tone} label={status} />
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{meta}</p>
        <p className="mt-1.5 text-sm leading-6 text-foreground/80">{reason}</p>
      </div>
      <span className="mt-1 hidden flex-shrink-0 items-center gap-1 text-xs font-semibold text-[var(--hh-primary)] sm:flex">
        {actionLabel}
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

export function UpcomingItemRow({ title, meta, timing, onClick }: { title: string; meta: string; timing: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-border py-3 text-left transition-colors last:border-b-0 hover:bg-white/45 active:scale-[0.995]">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--hh-warning-bg)] text-[var(--hh-warning)]">
        <Calendar className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <span className="flex-shrink-0 text-xs font-semibold text-muted-foreground">{timing}</span>
    </button>
  );
}

export function PortfolioHealthSummary({ stats, onOpen }: { stats: { label: string; value: string; detail?: string; tone?: "urgent" | "warning" | "success" | "neutral" }[]; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="w-full rounded-[1.35rem] border border-border bg-card/70 p-4 text-left transition-all hover:bg-white active:scale-[0.995]">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="min-w-0">
            <p className="text-xl font-semibold leading-none text-foreground">{item.value}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
            {item.detail && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>}
          </div>
        ))}
      </div>
    </button>
  );
}

export function ActivityFeed({ activity, onOpen }: { activity: ActivityItem[]; onOpen: (tab: Tab) => void }) {
  if (activity.length === 0) {
    return <EmptyState icon={CheckCircle2} title="No recent receipts yet" subtitle="Saves, uploads, completions, and status changes will appear here." />;
  }

  return (
    <div className="divide-y divide-border">
      {activity.map((item) => (
        <button key={item.id} onClick={() => onOpen(item.tab)} className="flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-white/45 active:scale-[0.995]">
          <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${item.tone === "urgent" ? "bg-[var(--hh-urgent)]" : item.tone === "warning" ? "bg-[var(--hh-warning)]" : item.tone === "success" ? "bg-[var(--hh-success)]" : "bg-muted-foreground/40"}`} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-tight text-foreground">{item.title}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.detail}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const label = status === "in-progress" ? "In Progress" : status === "done" ? "Complete" : status === "expiring" ? "Expiring Soon" : status.charAt(0).toUpperCase() + status.slice(1);
  return <Chip className={statusStyle(status)}>{label}</Chip>;
}

export function PriorityBadge({ priority }: { priority: "low" | "medium" | "high" }) {
  const label = priority === "high" ? "Urgent" : priority === "medium" ? "Upcoming" : "Low";
  return <Chip className={priorityStyle(priority)}>{label}</Chip>;
}

export function TaskStatusBadge({ task }: { task: TaskItem }) {
  const tone = dueTone(daysUntil(task.dueDate), task.status === "done");
  const className = tone === "complete"
    ? "border-[var(--hh-success-border)] bg-[var(--hh-success-bg)] text-[var(--hh-success)]"
    : tone === "overdue"
      ? "border-[var(--hh-urgent-border)] bg-[var(--hh-urgent-bg)] text-[var(--hh-urgent)]"
      : tone === "soon"
        ? "border-[var(--hh-warning-border)] bg-[var(--hh-warning-bg)] text-[var(--hh-warning)]"
        : "border-slate-200 bg-slate-100 text-slate-600";
  return <Chip className={className}>{dueLabel(task.dueDate, task.status === "done")}</Chip>;
}

export function StatusCard({ label, value, detail, icon: Icon, tone = "neutral" }: { label: string; value: string; detail: string; icon: LucideIcon; tone?: "neutral" | "urgent" | "warning" | "good" }) {
  const toneClass = tone === "urgent"
    ? "border-[var(--hh-urgent-border)] bg-[var(--hh-urgent-bg)] text-[var(--hh-urgent)]"
    : tone === "warning"
      ? "border-[var(--hh-warning-border)] bg-[var(--hh-warning-bg)] text-[var(--hh-warning)]"
      : tone === "good"
        ? "border-[var(--hh-success-border)] bg-[var(--hh-success-bg)] text-[var(--hh-success)]"
        : "border-border bg-card text-[var(--hh-primary)]";

  return (
    <div className={`rounded-[1.35rem] border p-4 shadow-[var(--hh-shadow-sm)] backdrop-blur-xl ${toneClass}`}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/70">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold leading-none text-foreground">{value}</p>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

export function QuickAction({ icon: Icon, label, detail, primary, onClick }: { icon: LucideIcon; label: string; detail: string; primary?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[76px] items-center gap-3 rounded-[1.35rem] border p-4 text-left transition-all duration-200 active:scale-[0.98] ${
        primary ? "border-[var(--hh-primary)] bg-[var(--hh-primary)] text-white shadow-[0_12px_28px_rgba(10,132,255,0.22)]" : "border-border bg-card/85 text-foreground shadow-[var(--hh-shadow-sm)] backdrop-blur-xl hover:border-[var(--hh-primary-border)] hover:bg-white"
      }`}
    >
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${primary ? "bg-white/18 text-white" : "bg-[var(--hh-primary-soft)] text-[var(--hh-primary)]"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-semibold leading-tight ${primary ? "text-white" : "text-foreground"}`}>{label}</span>
        <span className={`mt-1 block text-xs leading-5 ${primary ? "text-white/70" : "text-muted-foreground"}`}>{detail}</span>
      </span>
    </button>
  );
}

export function TaskCard({ data, task, onToggle, onEdit, onDelete, compact = false }: { data: AppData; task: TaskItem; onToggle?: (id: string) => void; onEdit?: (task: TaskItem) => void; onDelete?: (id: string) => void; compact?: boolean }) {
  const overdue = dueTone(daysUntil(task.dueDate), task.status === "done") === "overdue";
  return (
    <div className={`flex items-start gap-3 rounded-[1.35rem] border bg-card/90 shadow-[var(--hh-shadow-sm)] backdrop-blur-xl ${overdue ? "border-[var(--hh-urgent-border)]" : "border-border"} ${compact ? "px-3 py-3" : "px-4 py-3.5"}`}>
      {onToggle && (
        <button onClick={() => onToggle(task.id)} className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${task.status === "done" ? "border-[var(--hh-success)] bg-[var(--hh-success)]" : "border-border hover:border-[var(--hh-success)] hover:bg-[var(--hh-success-bg)]"}`} aria-label="Toggle task">
          {task.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TaskStatusBadge task={task} />
          <PriorityBadge priority={task.priority} />
          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold capitalize text-muted-foreground">{task.type}</span>
        </div>
        <p className={`mt-2 text-sm font-semibold leading-tight ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{propertyName(data, task.propertyId)}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{task.dueDate}</span>
        </div>
      </div>
      {(onEdit || onDelete) && (
        <div className="flex flex-shrink-0 gap-1.5">
          {onEdit && <IconAction label="Edit task" icon={Pencil} onClick={() => onEdit(task)} />}
          {onDelete && <IconAction label="Delete task" icon={Trash2} tone="danger" onClick={() => onDelete(task.id)} />}
        </div>
      )}
    </div>
  );
}

export function DocumentCard({ data, doc, onOpen, onEdit, onDelete }: { data: AppData; doc: DocItem; onOpen: (filePath: string) => void; onEdit: (doc: DocItem) => void; onDelete: (id: string) => void }) {
  return (
    <div className="flex w-full items-center gap-3 rounded-[1.35rem] border border-border bg-card/90 p-4 text-left shadow-[var(--hh-shadow-sm)] backdrop-blur-xl transition-all hover:border-[var(--hh-primary-border)] hover:bg-white">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${docColor(doc.type)}`}><FileText className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold capitalize text-muted-foreground">{doc.type}</span>
          {doc.filePath && <span className="rounded-md bg-[var(--hh-success-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--hh-success)]">File attached</span>}
        </div>
        <p className="truncate text-sm font-semibold text-foreground">{doc.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{propertyName(data, doc.propertyId)}{doc.tenantName ? ` - ${doc.tenantName}` : ""} - {doc.date} - {doc.size}</p>
      </div>
      <div className="flex flex-shrink-0 gap-2">
        {doc.filePath && <IconAction label="Open file" icon={FileText} onClick={() => onOpen(doc.filePath!)} />}
        <IconAction label="Edit document" icon={Pencil} onClick={() => onEdit(doc)} />
        <IconAction label="Delete document" icon={Trash2} tone="danger" onClick={() => onDelete(doc.id)} />
      </div>
    </div>
  );
}

export function PropertyCard({ property, data, onSelect, onEdit, onDelete }: { property: Property; data: AppData; onSelect: (id: string) => void; onEdit: (property: Property) => void; onDelete: (id: string) => void }) {
  const stats = propertyStats(data, property.id);
  const openIssues = data.maintenance.filter((m) => m.propertyId === property.id && m.status !== "resolved").length;
  const occupiedTone = stats.occupiedUnits === property.units ? "bg-[var(--hh-success)]" : "bg-[var(--hh-warning)]";

  return (
    <div className="group overflow-hidden rounded-[1.6rem] border border-border bg-card/90 shadow-[var(--hh-shadow-sm)] backdrop-blur-xl transition-all hover:border-[var(--hh-primary-border)] hover:bg-white hover:shadow-[var(--hh-shadow-md)]">
      <button onClick={() => onSelect(property.id)} className="w-full text-left active:scale-[0.99]">
        <div className="relative h-44 bg-muted">
          <img src={property.imageUrl || DEFAULT_IMAGES[0]} alt={property.name} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          {openIssues > 0 && <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[var(--hh-urgent)] px-2 py-1 text-[10px] font-semibold text-white"><Wrench className="h-2.5 w-2.5" />{openIssues} open</div>}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-tight text-white drop-shadow-sm">{property.name}</p>
              <div className="mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0 text-white/75" /><p className="truncate text-xs text-white/80">{property.address}</p></div>
            </div>
            <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white ${occupiedTone}`}>{stats.occupiedUnits}/{property.units}</span>
          </div>
        </div>
      </button>
      <div className="grid grid-cols-3 gap-2 px-4 pt-4">
        {[{ label: "Units", value: property.units }, { label: "Tenants", value: stats.tenants.length }, { label: "Monthly", value: money(stats.revenue) }].map((item) => (
          <div key={item.label} className="rounded-2xl bg-[var(--input-background)] py-2.5 text-center">
            <p className="text-[15px] font-semibold text-foreground">{item.value}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <Button variant="ghost" onClick={() => onSelect(property.id)} className="min-h-8 px-2 py-1 text-xs">Open</Button>
        <div className="flex gap-2">
          <IconAction label="Edit property" icon={Pencil} onClick={() => onEdit(property)} />
          <IconAction label="Delete property" icon={Trash2} tone="danger" onClick={() => onDelete(property.id)} />
        </div>
      </div>
    </div>
  );
}

export function SearchAndFilterBar<T extends string>({ query, onQueryChange, placeholder, filters, activeFilter, onFilterChange }: { query?: string; onQueryChange?: (value: string) => void; placeholder?: string; filters?: readonly T[]; activeFilter?: T; onFilterChange?: (value: T) => void }) {
  return (
    <div className="space-y-3 px-4 py-3">
      {query !== undefined && onQueryChange && <SearchInput value={query} onChange={onQueryChange} placeholder={placeholder || "Search..."} />}
      {filters && activeFilter && onFilterChange && (
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {filters.map((item) => (
            <button key={item} onClick={() => onFilterChange(item)} className={`min-h-9 flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-all active:scale-[0.98] ${activeFilter === item ? "bg-[var(--hh-primary)] text-white shadow-[0_8px_18px_rgba(10,132,255,0.18)]" : "border border-border bg-card/80 text-muted-foreground backdrop-blur-xl hover:text-foreground"}`}>
              {item === "all" ? "All" : item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConfirmationToast({ notice }: { notice: { message: string; tone: "success" | "error" } | null }) {
  if (!notice) return null;
  const error = notice.tone === "error";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[60] flex justify-center px-4 lg:bottom-6">
      <div className={`flex max-w-sm items-center gap-2 rounded-[1.35rem] border bg-white/88 px-4 py-3 text-sm font-semibold text-foreground shadow-[var(--hh-shadow-md)] backdrop-blur-2xl ${error ? "border-[var(--hh-urgent-border)]" : "border-[var(--hh-success-border)]"}`}>
        {error ? <AlertTriangle className="h-4 w-4 text-[var(--hh-urgent)]" /> : <CheckCircle2 className="h-4 w-4 text-[var(--hh-success)]" />}
        <span>{notice.message}</span>
      </div>
    </div>
  );
}
