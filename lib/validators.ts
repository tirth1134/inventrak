import { z } from "zod";

// ─── Employees ───────────────────────────────────────────────────────────────

export const createEmployeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  departmentId: z.string().min(1, "Department is required"),
  designationId: z.string().optional(),
  isTeamLead: z.boolean().optional().default(false),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

// ─── Departments ─────────────────────────────────────────────────────────────

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

// ─── Designations ────────────────────────────────────────────────────────────

export const createDesignationSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export const updateDesignationSchema = createDesignationSchema.partial();

// ─── Subscriptions ───────────────────────────────────────────────────────────

export const createSubscriptionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url().optional().or(z.literal("")),
  category: z.string().optional(),
  planName: z.string().optional(),
  billingCycle: z.enum(["MONTHLY", "YEARLY", "ONE_TIME"]),
  buyDate: z.string().datetime().optional().or(z.literal("")),
  renewalDate: z.string().datetime().optional().or(z.literal("")),
  nextPaymentDate: z.string().datetime().optional().or(z.literal("")),
  price: z.number().min(0, "Price must be non-negative"),
  currency: z.string().optional().default("INR"),
  paymentMethod: z.string().optional(),
  licenceCount: z.number().int().min(1).optional().default(1),
  departmentId: z.string().optional(),
  teamLeadName: z.string().optional(),
  status: z.enum(["ACTIVE", "CANCELLED", "EXPIRED"]).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  cancelReason: z.string().optional(),
});

export const updateSubscriptionSchema = createSubscriptionSchema.partial();

// ─── Subscription Users ──────────────────────────────────────────────────────

export const assignSubscriptionUserSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  username: z.string().optional(),
});

// ─── Software Invoices ───────────────────────────────────────────────────────

export const createSoftwareInvoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  amount: z.number().min(0),
  currency: z.string().optional().default("INR"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  notes: z.string().optional(),
});

// ─── Hardware / Assets ───────────────────────────────────────────────────────

export const createAssetSchema = z.object({
  type: z.enum(["DESKTOP", "LAPTOP", "MONITOR", "SERVER", "PERIPHERAL", "OTHER"]),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  osType: z.string().optional(),
  processorId: z.string().optional(),
  ramGb: z.number().int().optional(),
  storageGb: z.number().int().optional(),
  storageType: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().min(0).optional(),
  currency: z.string().optional().default("INR"),
  vendorId: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
  status: z.enum(["IN_USE", "IN_STOCK", "IN_REPAIR", "SCRAPPED"]).optional(),
  remarks: z.string().optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

// ─── Asset Assignment ────────────────────────────────────────────────────────

export const assignAssetSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  notes: z.string().optional(),
});

// ─── Accessories ─────────────────────────────────────────────────────────────

export const createAccessorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  brand: z.string().optional(),
  serialNumber: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  purchaseDate: z.string().optional(),
  status: z.enum(["IN_USE", "IN_STOCK", "IN_REPAIR", "SCRAPPED"]).optional(),
});

export const updateAccessorySchema = createAccessorySchema.partial();

// ─── Hardware Invoices ───────────────────────────────────────────────────────

export const createHardwareInvoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  amount: z.number().min(0),
  currency: z.string().optional().default("INR"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  vendorId: z.string().optional(),
  assetIds: z.array(z.string()).min(1, "At least one asset ID is required"),
  notes: z.string().optional(),
});

// ─── Vendors ─────────────────────────────────────────────────────────────────

export const createVendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  type: z.enum(["HARDWARE", "SOFTWARE", "BOTH"]),
  notes: z.string().optional(),
});

export const updateVendorSchema = createVendorSchema.partial();

// ─── Processors ──────────────────────────────────────────────────────────────

export const createProcessorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  brand: z.string().optional(),
  grade: z.enum(["LOW", "MID", "HIGH"]),
});

export const updateProcessorSchema = createProcessorSchema.partial();

// ─── Stock Locations ─────────────────────────────────────────────────────────

export const createStockLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export const updateStockLocationSchema = createStockLocationSchema.partial();

// ─── Floor Map ───────────────────────────────────────────────────────────────

export const createFloorMapSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gridCols: z.number().int().min(1).optional().default(20),
  gridRows: z.number().int().min(1).optional().default(15),
});

export const updateFloorMapSchema = createFloorMapSchema.partial();

export const bulkUpsertDesksSchema = z.object({
  desks: z.array(
    z.object({
      id: z.string().optional(), // existing desk ID for update
      gridX: z.number().int().min(0),
      gridY: z.number().int().min(0),
      label: z.string().optional(),
      employeeId: z.string().optional().nullable(),
      assetId: z.string().optional().nullable(),
      locationId: z.string().optional().nullable(),
    })
  ),
});

// ─── Scrap ───────────────────────────────────────────────────────────────────

export const createScrapSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  reason: z.string().optional(),
  disposalMethod: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Settings ────────────────────────────────────────────────────────────────

export const updateSettingsSchema = z.record(z.string(), z.string());

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const changeEmailSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newEmail: z.string().email("Invalid email address"),
});
