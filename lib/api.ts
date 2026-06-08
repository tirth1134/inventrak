// Typed API fetch wrapper

const apiFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`/api${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
};

const apiFetchMultipart = async <T>(url: string, formData: FormData): Promise<T> => {
  const res = await fetch(`/api${url}`, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }
  return res.json();
};

export const api = {
  // Dashboard
  getDashboard: () => apiFetch<DashboardResponse>("/dashboard"),

  // Subscriptions
  getSubscriptions: (params = "") => apiFetch<PaginatedResponse<Subscription>>(`/subscriptions?${params}`),
  getSubscription: (id: string) => apiFetch<ApiResponse<Subscription>>(`/subscriptions/${id}`),
  createSubscription: (data: unknown) => apiFetch<ApiResponse<Subscription>>("/subscriptions", { method: "POST", body: JSON.stringify(data) }),
  updateSubscription: (id: string, data: unknown) => apiFetch<ApiResponse<Subscription>>(`/subscriptions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSubscription: (id: string) => apiFetch(`/subscriptions/${id}`, { method: "DELETE" }),
  getSubscriptionCredentials: (id: string) => apiFetch<ApiResponse<{ username: string | null; password: string | null }>>(`/subscriptions/${id}/credentials`),
  getSubscriptionUsers: (id: string) => apiFetch<ApiResponse<SubscriptionUser[]>>(`/subscriptions/${id}/users`),
  assignSubscriptionUser: (id: string, data: unknown) => apiFetch<ApiResponse<SubscriptionUser>>(`/subscriptions/${id}/users`, { method: "POST", body: JSON.stringify(data) }),
  removeSubscriptionUser: (subId: string, userId: string) => apiFetch(`/subscriptions/${subId}/users/${userId}`, { method: "DELETE" }),
  getSubscriptionInvoices: (id: string) => apiFetch<ApiResponse<SoftwareInvoice[]>>(`/subscriptions/${id}/invoices`),
  uploadSubscriptionInvoice: (id: string, formData: FormData) => apiFetchMultipart<ApiResponse<SoftwareInvoice>>(`/subscriptions/${id}/invoices`, formData),
  deleteSubscriptionInvoice: (subId: string, invoiceId: string) => apiFetch(`/subscriptions/${subId}/invoices/${invoiceId}`, { method: "DELETE" }),

  // Hardware
  getAssets: (params = "") => apiFetch<PaginatedResponse<Asset>>(`/hardware?${params}`),
  getAsset: (id: string) => apiFetch<ApiResponse<Asset>>(`/hardware/${id}`),
  createAsset: (data: unknown) => apiFetch<ApiResponse<Asset>>("/hardware", { method: "POST", body: JSON.stringify(data) }),
  bulkCreateAssets: (data: unknown[]) => apiFetch<ApiResponse<{ count: number }>>("/hardware/bulk", { method: "POST", body: JSON.stringify(data) }),
  updateAsset: (id: string, data: unknown) => apiFetch<ApiResponse<Asset>>(`/hardware/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAsset: (id: string) => apiFetch(`/hardware/${id}`, { method: "DELETE" }),
  assignAsset: (id: string, data: unknown) => apiFetch<ApiResponse<AssetAssignment>>(`/hardware/${id}/assign`, { method: "POST", body: JSON.stringify(data) }),
  unassignAsset: (id: string) => apiFetch(`/hardware/${id}/assign`, { method: "DELETE" }),
  getAssignmentHistory: (id: string) => apiFetch<ApiResponse<AssetAssignment[]>>(`/hardware/${id}/assign/history`),
  getAccessories: (id: string) => apiFetch<ApiResponse<Accessory[]>>(`/hardware/${id}/accessories`),
  addAccessory: (id: string, data: unknown) => apiFetch<ApiResponse<Accessory>>(`/hardware/${id}/accessories`, { method: "POST", body: JSON.stringify(data) }),
  updateAccessory: (assetId: string, accId: string, data: unknown) => apiFetch<ApiResponse<Accessory>>(`/hardware/${assetId}/accessories/${accId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAccessory: (assetId: string, accId: string) => apiFetch(`/hardware/${assetId}/accessories/${accId}`, { method: "DELETE" }),
  getAssetInvoices: (id: string) => apiFetch<ApiResponse<HardwareInvoiceItem[]>>(`/hardware/${id}/invoices`),
  createHardwareInvoice: (formData: FormData) => apiFetchMultipart<ApiResponse<HardwareInvoice>>("/hardware/invoices", formData),
  deleteHardwareInvoice: (invoiceId: string) => apiFetch(`/hardware/invoices/${invoiceId}`, { method: "DELETE" }),

  // Employees
  getEmployees: (params = "") => apiFetch<PaginatedResponse<Employee>>(`/employees?${params}`),
  getEmployee: (id: string) => apiFetch<ApiResponse<Employee>>(`/employees/${id}`),
  createEmployee: (data: unknown) => apiFetch<ApiResponse<Employee>>("/employees", { method: "POST", body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: unknown) => apiFetch<ApiResponse<Employee>>(`/employees/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteEmployee: (id: string) => apiFetch(`/employees/${id}`, { method: "DELETE" }),

  // Departments
  getDepartments: () => apiFetch<ApiResponse<Department[]>>("/departments"),
  createDepartment: (data: unknown) => apiFetch<ApiResponse<Department>>("/departments", { method: "POST", body: JSON.stringify(data) }),
  updateDepartment: (id: string, data: unknown) => apiFetch<ApiResponse<Department>>(`/departments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDepartment: (id: string) => apiFetch(`/departments/${id}`, { method: "DELETE" }),

  // Designations
  getDesignations: () => apiFetch<ApiResponse<Designation[]>>("/designations"),
  createDesignation: (data: unknown) => apiFetch<ApiResponse<Designation>>("/designations", { method: "POST", body: JSON.stringify(data) }),
  updateDesignation: (id: string, data: unknown) => apiFetch<ApiResponse<Designation>>(`/designations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDesignation: (id: string) => apiFetch(`/designations/${id}`, { method: "DELETE" }),

  // Vendors
  getVendors: (params = "") => apiFetch<PaginatedResponse<Vendor>>(`/vendors?${params}`),
  getVendor: (id: string) => apiFetch<ApiResponse<Vendor>>(`/vendors/${id}`),
  createVendor: (data: unknown) => apiFetch<ApiResponse<Vendor>>("/vendors", { method: "POST", body: JSON.stringify(data) }),
  updateVendor: (id: string, data: unknown) => apiFetch<ApiResponse<Vendor>>(`/vendors/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteVendor: (id: string) => apiFetch(`/vendors/${id}`, { method: "DELETE" }),

  // Processors
  getProcessors: (params = "") => apiFetch<ApiResponse<Processor[]>>(`/processors?${params}`),
  createProcessor: (data: unknown) => apiFetch<ApiResponse<Processor>>("/processors", { method: "POST", body: JSON.stringify(data) }),
  updateProcessor: (id: string, data: unknown) => apiFetch<ApiResponse<Processor>>(`/processors/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProcessor: (id: string) => apiFetch(`/processors/${id}`, { method: "DELETE" }),

  // Stock Locations
  getStockLocations: () => apiFetch<ApiResponse<StockLocation[]>>("/stock"),
  createStockLocation: (data: unknown) => apiFetch<ApiResponse<StockLocation>>("/stock", { method: "POST", body: JSON.stringify(data) }),
  updateStockLocation: (id: string, data: unknown) => apiFetch<ApiResponse<StockLocation>>(`/stock/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteStockLocation: (id: string) => apiFetch(`/stock/${id}`, { method: "DELETE" }),

  // Scrap
  getScraps: (params = "") => apiFetch<PaginatedResponse<ScrapRecord>>(`/scrap?${params}`),
  createScrap: (data: unknown) => apiFetch<ApiResponse<ScrapRecord>>("/scrap", { method: "POST", body: JSON.stringify(data) }),
  undoScrap: (id: string) => apiFetch(`/scrap/${id}`, { method: "DELETE" }),

  // Floor Map
  getFloorMaps: () => apiFetch<ApiResponse<FloorMap[]>>("/floor-map"),
  getFloorMap: (id: string) => apiFetch<ApiResponse<FloorMap>>(`/floor-map/${id}`),
  createFloorMap: (data: unknown) => apiFetch<ApiResponse<FloorMap>>("/floor-map", { method: "POST", body: JSON.stringify(data) }),
  updateFloorMap: (id: string, data: unknown) => apiFetch<ApiResponse<FloorMap>>(`/floor-map/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteFloorMap: (id: string) => apiFetch(`/floor-map/${id}`, { method: "DELETE" }),
  saveDesks: (id: string, data: unknown) => apiFetch<ApiResponse<FloorMapDesk[]>>(`/floor-map/${id}/desks`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDesk: (mapId: string, deskId: string) => apiFetch(`/floor-map/${mapId}/desks/${deskId}`, { method: "DELETE" }),

  // Alerts
  getAlerts: (params = "") => apiFetch<PaginatedResponse<Alert>>(`/alerts?${params}`),
  dismissAlert: (id: string) => apiFetch(`/alerts/${id}/dismiss`, { method: "PUT" }),
  generateAlerts: () => apiFetch<ApiResponse<{ alertsCreated: number; emailsSent: number }>>("/alerts/generate", { method: "POST" }),

  // Reports
  getSubscriptionReport: (params = "") => apiFetch<ApiResponse<unknown>>(`/reports/subscriptions?${params}`),
  getHardwareReport: (params = "") => apiFetch<ApiResponse<unknown>>(`/reports/hardware?${params}`),

  // Settings
  getSettings: () => apiFetch<ApiResponse<Record<string, string>>>("/settings"),
  updateSettings: (data: unknown) => apiFetch("/settings", { method: "PUT", body: JSON.stringify(data) }),
  changePassword: (data: unknown) => apiFetch("/settings/password", { method: "PUT", body: JSON.stringify(data) }),
  changeEmail: (data: unknown) => apiFetch("/settings/email", { method: "PUT", body: JSON.stringify(data) }),

  // AI Import
  processAiImport: (data: unknown) => apiFetch<ApiResponse<any[]>>("/ai-import", { method: "POST", body: JSON.stringify(data) }),
  processAiImportFormData: (formData: FormData) => apiFetchMultipart<ApiResponse<any[]>>("/ai-import", formData),
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardResponse {
  data: {
    stats: {
      totalSubscriptions: number;
      activeSubscriptions: number;
      cancelledSubscriptions: number;
      totalMonthlySpend: number;
      totalYearlySpend: number;
      monthlySpendByCurrency?: Record<string, number>;
      yearlySpendByCurrency?: Record<string, number>;
      totalAssets: number;
      assetsInUse: number;
      assetsInStock: number;
      assetsInRepair: number;
      scrappedAssets: number;
      totalEmployees: number;
      activeAlerts: number;
    };
    alerts: Alert[];
    recentActivity: AuditLog[];
  };
}

export interface Subscription {
  id: string;
  name: string;
  url?: string;
  category?: string;
  planName?: string;
  billingCycle: "MONTHLY" | "YEARLY" | "ONE_TIME";
  buyDate?: string;
  renewalDate?: string;
  nextPaymentDate?: string;
  price: number;
  currency: string;
  paymentMethod?: string;
  licenceCount: number;
  costPerUser: number;
  departmentId?: string;
  department?: { id: string; name: string };
  teamLeadName?: string;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  tags: string[];
  notes?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  users?: SubscriptionUser[];
  invoices?: SoftwareInvoice[];
  alerts?: Alert[];
  _count?: { users: number; invoices: number };
}

export interface SubscriptionUser {
  id: string;
  subscriptionId: string;
  employeeId: string;
  employee: { id: string; name: string; email: string; department?: { id: string; name: string } };
  username?: string;
  assignedAt: string;
}

export interface SoftwareInvoice {
  id: string;
  subscriptionId: string;
  invoiceNumber?: string;
  amount: number;
  currency: string;
  invoiceDate: string;
  filePath?: string;
  fileName?: string;
  fileType?: string;
  notes?: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  assetId: string;
  type: "DESKTOP" | "LAPTOP" | "MONITOR" | "SERVER" | "PERIPHERAL" | "OTHER";
  brand?: string;
  model?: string;
  serialNumber?: string;
  osType?: string;
  processorId?: string;
  processor?: Processor;
  ramGb?: number;
  storageGb?: number;
  storageType?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currency: string;
  vendorId?: string;
  vendor?: Vendor;
  warrantyExpiry?: string;
  departmentId?: string;
  department?: Department;
  locationId?: string;
  location?: StockLocation;
  status: "IN_USE" | "IN_STOCK" | "IN_REPAIR" | "SCRAPPED";
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  assignments?: AssetAssignment[];
  assetAssignments?: AssetAssignment[];
  accessories?: Accessory[];
  maintenanceLogs?: MaintenanceLog[];
  alerts?: Alert[];
  scrapRecord?: ScrapRecord;
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  asset?: Asset;
  employeeId: string;
  employee: { id: string; name: string; email: string; department?: Department; designation?: Designation };
  assignedAt: string;
  returnedAt?: string;
  isCurrent: boolean;
  notes?: string;
}

export interface Accessory {
  id: string;
  assetId: string;
  name: string;
  brand?: string;
  serialNumber?: string;
  warrantyExpiry?: string;
  purchaseDate?: string;
  status: "IN_USE" | "IN_STOCK" | "IN_REPAIR" | "SCRAPPED";
  createdAt: string;
}

export interface HardwareInvoice {
  id: string;
  invoiceNumber?: string;
  amount: number;
  currency: string;
  invoiceDate: string;
  vendorId?: string;
  vendor?: Vendor;
  filePath?: string;
  fileName?: string;
  fileType?: string;
  notes?: string;
  createdAt: string;
  items?: HardwareInvoiceItem[];
}

export interface HardwareInvoiceItem {
  id: string;
  invoiceId: string;
  invoice: HardwareInvoice;
  assetId: string;
  asset?: { id: string; assetId: string; brand?: string; model?: string; type: string };
}

export interface MaintenanceLog {
  id: string;
  assetId: string;
  serviceDate: string;
  description: string;
  cost?: number;
  vendor?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  departmentId: string;
  department: Department;
  designationId?: string;
  designation?: Designation;
  isTeamLead: boolean;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  assetAssignments?: AssetAssignment[];
  subscriptionUsers?: SubscriptionUser[];
  _count?: { assetAssignments: number; subscriptionUsers: number };
}

export interface Department {
  id: string;
  name: string;
  createdAt: string;
  _count?: { employees: number; subscriptions: number; assets: number };
}

export interface Designation {
  id: string;
  title: string;
  createdAt: string;
  _count?: { employees: number };
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  type: "HARDWARE" | "SOFTWARE" | "BOTH";
  notes?: string;
  createdAt: string;
  updatedAt: string;
  assets?: Asset[];
  hardwareInvoices?: HardwareInvoice[];
  _count?: { assets: number; hardwareInvoices: number };
}

export interface Processor {
  id: string;
  name: string;
  brand?: string;
  grade: "LOW" | "MID" | "HIGH";
  createdAt: string;
  _count?: { assets: number };
}

export interface StockLocation {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  assetCounts?: { total: number; IN_STOCK: number; IN_USE: number; IN_REPAIR: number; SCRAPPED: number };
  _count?: { assets: number };
}

export interface ScrapRecord {
  id: string;
  assetId: string;
  asset: Asset;
  scrappedAt: string;
  reason?: string;
  disposalMethod?: string;
  notes?: string;
}

export interface FloorMap {
  id: string;
  name: string;
  gridCols: number;
  gridRows: number;
  createdAt: string;
  updatedAt: string;
  desks?: FloorMapDesk[];
  _count?: { desks: number };
}

export interface FloorMapDesk {
  id: string;
  floorMapId: string;
  gridX: number;
  gridY: number;
  label?: string;
  employeeId?: string;
  employee?: Employee;
  assetId?: string;
  asset?: Asset;
  locationId?: string;
  location?: StockLocation;
}

export interface Alert {
  id: string;
  type: "SUBSCRIPTION_RENEWAL" | "WARRANTY_EXPIRY" | "PAYMENT_DUE" | "LOW_STOCK";
  title: string;
  message: string;
  dueDate?: string;
  isDismissed: boolean;
  isEmailSent: boolean;
  subscriptionId?: string;
  subscription?: { id: string; name: string };
  assetId?: string;
  asset?: { id: string; assetId: string; brand?: string; model?: string };
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  detail?: string;
  adminId?: string;
  employeeId?: string;
  employee?: { id: string; name: string; email: string };
  createdAt: string;
}
