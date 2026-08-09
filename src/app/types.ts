export type Tab = "dashboard" | "properties" | "tasks" | "documents" | "settings";
export type ModalKind = "property" | "tenant" | "maintenance" | "task" | "document" | null;

export type EditableRecord =
  | { kind: "property"; item: Property }
  | { kind: "tenant"; item: Tenant }
  | { kind: "maintenance"; item: MaintenanceItem }
  | { kind: "task"; item: TaskItem }
  | { kind: "document"; item: DocItem }
  | null;

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  units: number;
  imageUrl: string;
}

export interface Tenant {
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

export interface MaintenanceItem {
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

export interface TaskItem {
  id: string;
  title: string;
  type: "lease" | "inspection" | "maintenance" | "financial" | "reminder";
  propertyId: string;
  dueDate: string;
  status: "pending" | "done";
  priority: "low" | "medium" | "high";
}

export interface DocItem {
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

export interface AppData {
  properties: Property[];
  tenants: Tenant[];
  maintenance: MaintenanceItem[];
  tasks: TaskItem[];
  docs: DocItem[];
}

export interface AppProfile {
  name: string;
  email: string;
  portfolioName: string;
}

export interface OnboardingSetup {
  profile: AppProfile;
  mode: "sample" | "fresh";
  property?: {
    name: string;
    address: string;
    city: string;
    units: number;
  };
}

export interface ReminderItem {
  id: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  tab: Tab;
}

export interface FeedbackItem {
  type: "bug" | "idea" | "question" | "other";
  message: string;
  email?: string;
  page?: string;
}

export interface AnalyticsSummary {
  totalEvents: number;
  lastEventAt: string | null;
  topEvents: { name: string; count: number }[];
}
