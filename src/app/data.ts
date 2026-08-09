import type { AppData, AppProfile } from "./types";

export const DEFAULT_PROFILE: AppProfile = {
  name: "David Martinez",
  email: "david.martinez@email.com",
  portfolioName: "Rental portfolio",
};

export const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&h=520&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=900&h=520&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=900&h=520&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&h=520&fit=crop&auto=format",
];

export const INITIAL_DATA: AppData = {
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
