import React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
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
import type { AppData, DocItem, Property, TaskItem } from "../types";
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
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${className}`}>{children}</span>;
}

export function Button({ children, onClick, type = "button", variant = "primary", disabled = false, className = "" }: { children: React.ReactNode; onClick?: () => void; type?: "button" | "submit"; variant?: "primary" | "secondary" | "ghost" | "danger"; disabled?: boolean; className?: string }) {
  const variants = {
    primary: "border-[var(--hh-primary)] bg-[var(--hh-primary)] text-white hover:bg-[var(--hh-primary-hover)]",
    secondary: "border-border bg-card text-[var(--hh-primary)] hover:border-[var(--hh-primary)]/25 hover:bg-[var(--hh-surface-muted)]",
    ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
    danger: "border-[var(--hh-urgent-border)] bg-[var(--hh-urgent-bg)] text-[var(--hh-urgent)] hover:bg-[var(--hh-urgent-bg)]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, action, onBack }: { title: string; subtitle?: string; action?: React.ReactNode; onBack?: () => void }) {
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

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-9 flex-shrink-0 items-center gap-1.5 rounded-lg bg-[var(--hh-primary)] px-3 py-1.5 text-xs font-black text-white transition-all hover:bg-[var(--hh-primary-hover)] active:scale-95">
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
      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition-all hover:shadow-sm ${
        tone === "danger" ? "border-[var(--hh-urgent-border)] bg-[var(--hh-urgent-bg)] text-[var(--hh-urgent)]" : "border-border bg-card text-muted-foreground hover:text-foreground"
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
        className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-[var(--hh-primary)]/40 focus:ring-2 focus:ring-[var(--hh-primary)]/20"
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
      className={`w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-[var(--hh-primary)]/40 focus:ring-2 focus:ring-[var(--hh-primary)]/20 ${className}`}
    />
  );
}

export function EmptyState({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="py-14 text-center">
      <Icon className="mx-auto mb-3 h-9 w-9 text-muted-foreground/30" />
      <p className="text-sm font-black text-foreground">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function SkeletonLoader({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2 px-4 py-4" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-2xl border border-border bg-card p-4">
          <div className="h-3 w-1/3 rounded-full bg-muted" />
          <div className="mt-3 h-3 w-3/4 rounded-full bg-muted" />
          <div className="mt-3 h-2 w-1/2 rounded-full bg-muted" />
        </div>
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
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/65">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black leading-none tracking-[-0.04em] text-foreground">{value}</p>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

export function QuickAction({ icon: Icon, label, detail, primary, onClick }: { icon: LucideIcon; label: string; detail: string; primary?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[76px] items-center gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${
        primary ? "border-[var(--hh-primary)] bg-[var(--hh-primary)] text-white shadow-sm" : "border-border bg-card text-foreground hover:border-[var(--hh-primary)]/25 hover:shadow-sm"
      }`}
    >
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${primary ? "bg-white/15 text-white" : "bg-[var(--hh-success-bg)] text-[var(--hh-success)]"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-black leading-tight ${primary ? "text-white" : "text-foreground"}`}>{label}</span>
        <span className={`mt-1 block text-xs leading-5 ${primary ? "text-white/70" : "text-muted-foreground"}`}>{detail}</span>
      </span>
    </button>
  );
}

export function TaskCard({ data, task, onToggle, onEdit, onDelete, compact = false }: { data: AppData; task: TaskItem; onToggle?: (id: string) => void; onEdit?: (task: TaskItem) => void; onDelete?: (id: string) => void; compact?: boolean }) {
  const overdue = dueTone(daysUntil(task.dueDate), task.status === "done") === "overdue";
  return (
    <div className={`flex items-start gap-3 rounded-2xl border bg-card ${overdue ? "border-[var(--hh-urgent-border)]" : "border-border"} ${compact ? "px-3 py-3" : "px-4 py-3.5"}`}>
      {onToggle && (
        <button onClick={() => onToggle(task.id)} className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${task.status === "done" ? "border-[var(--hh-success)] bg-[var(--hh-success)]" : "border-border hover:border-[var(--hh-success)] hover:bg-[var(--hh-success-bg)]"}`} aria-label="Toggle task">
          {task.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TaskStatusBadge task={task} />
          <PriorityBadge priority={task.priority} />
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black capitalize text-slate-600">{task.type}</span>
        </div>
        <p className={`mt-2 text-sm font-black leading-tight ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</p>
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
    <div className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-[var(--hh-primary)]/20 hover:shadow-sm">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${docColor(doc.type)}`}><FileText className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black capitalize text-slate-600">{doc.type}</span>
          {doc.filePath && <span className="rounded-md bg-[var(--hh-success-bg)] px-2 py-0.5 text-[10px] font-black text-[var(--hh-success)]">File attached</span>}
        </div>
        <p className="truncate text-sm font-black text-foreground">{doc.name}</p>
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
    <div className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--hh-shadow-sm)] transition-all hover:border-[var(--hh-primary)]/20 hover:shadow-[var(--hh-shadow-md)]">
      <button onClick={() => onSelect(property.id)} className="w-full text-left active:scale-[0.99]">
        <div className="relative h-44 bg-slate-200">
          <img src={property.imageUrl || DEFAULT_IMAGES[0]} alt={property.name} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          {openIssues > 0 && <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[var(--hh-urgent)] px-2 py-1 text-[10px] font-black text-white"><Wrench className="h-2.5 w-2.5" />{openIssues} open</div>}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-black leading-tight text-white drop-shadow-sm">{property.name}</p>
              <div className="mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0 text-white/75" /><p className="truncate text-xs text-white/80">{property.address}</p></div>
            </div>
            <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-black text-white ${occupiedTone}`}>{stats.occupiedUnits}/{property.units}</span>
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
            <button key={item} onClick={() => onFilterChange(item)} className={`min-h-9 flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-black capitalize transition-all active:scale-[0.98] ${activeFilter === item ? "bg-[var(--hh-primary)] text-white" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}>
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
      <div className={`flex max-w-sm items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-black text-foreground shadow-xl ${error ? "border-[var(--hh-urgent-border)]" : "border-[var(--hh-success-border)]"}`}>
        {error ? <AlertTriangle className="h-4 w-4 text-[var(--hh-urgent)]" /> : <CheckCircle2 className="h-4 w-4 text-[var(--hh-success)]" />}
        <span>{notice.message}</span>
      </div>
    </div>
  );
}
