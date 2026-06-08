"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import useSWR from "swr";
import {
  Settings,
  KeyRound,
  AtSign,
  Mail,
  Bell,
  Building2,
  Briefcase,
  Cpu,
  Package,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageHero } from "@/components/shared/PageHero";
import { useDepartments, useDesignations } from "@/lib/hooks/useEmployees";
import { useStockLocations } from "@/lib/hooks/useStockLocations";
import {
  api,
  type Department,
  type Designation,
  type Processor,
  type StockLocation,
} from "@/lib/api";
import { getProcessorGradeBadge, cn } from "@/lib/utils";

// ── Schemas ───────────────────────────────────────────────────────────────────

const generalSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  admin_name: z.string().min(1, "Admin name is required"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password required"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const emailSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newEmail: z.string().email("Invalid email"),
});

const smtpSchema = z.object({
  smtp_host: z.string().optional(),
  smtp_port: z.string().optional(),
  smtp_user: z.string().optional(),
  smtp_pass: z.string().optional(),
  smtp_from: z.string().optional(),
});

const alertPrefSchema = z.object({
  alert_days_ahead: z.coerce.number().int().min(1).max(365),
  alert_email_enabled: z.boolean(),
  alert_emails: z.string().optional(),
}).refine(data => {
  if (!data.alert_emails) return true;
  const emails = data.alert_emails.split(',').map(e => e.trim()).filter(Boolean);
  return emails.every(e => z.string().email().safeParse(e).success);
}, {
  message: "One or more email addresses are invalid (use a comma-separated list)",
  path: ["alert_emails"],
});

const aiSchema = z.object({
  openai_api_key: z.string().optional(),
});

const departmentSchema = z.object({ name: z.string().min(1, "Name required") });
const designationSchema = z.object({ title: z.string().min(1, "Title required") });
const processorSchema = z.object({
  name: z.string().min(1, "Name required"),
  brand: z.string().optional(),
  grade: z.enum(["LOW", "MID", "HIGH"]),
});
const locationSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

type GeneralValues = z.infer<typeof generalSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;
type EmailValues = z.infer<typeof emailSchema>;
type SmtpValues = z.infer<typeof smtpSchema>;
type AlertPrefValues = z.infer<typeof alertPrefSchema>;
type AiValues = z.infer<typeof aiSchema>;
type DeptValues = z.infer<typeof departmentSchema>;
type DesigValues = z.infer<typeof designationSchema>;
type ProcessorValues = z.infer<typeof processorSchema>;
type LocationValues = z.infer<typeof locationSchema>;

// ── Nav sections ──────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  { id: "general", label: "General Settings", icon: Settings },
  { id: "password", label: "Change Password", icon: KeyRound },
  { id: "email", label: "Change Email", icon: AtSign },
  { id: "smtp", label: "Email / SMTP", icon: Mail },
  { id: "alert-prefs", label: "Alert Preferences", icon: Bell },
  { id: "ai-prefs", label: "AI Configuration", icon: Cpu },
  { id: "departments", label: "Departments", icon: Building2 },
  { id: "designations", label: "Designations", icon: Briefcase },
  { id: "processors", label: "Processor Library", icon: Cpu },
  { id: "locations", label: "Stock Locations", icon: Package },
];

// ── General Section ───────────────────────────────────────────────────────────

function GeneralSection({ settings }: { settings: Record<string, string> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GeneralValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      company_name: settings.company_name ?? "",
      admin_name: settings.admin_name ?? "",
    },
  });

  useEffect(() => {
    reset({ company_name: settings.company_name ?? "", admin_name: settings.admin_name ?? "" });
  }, [settings, reset]);

  const onSubmit = async (values: GeneralValues) => {
    try {
      await api.updateSettings(values);
      toast.success("Settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card className="p-6 md:p-8 rounded-2xl border-border/80 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="border-b border-border/40 pb-4 mb-6">
        <h2 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
          <span className="w-1.5 h-4 bg-primary rounded-full" />
          General settings
        </h2>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Company Name</Label>
          <Input {...register("company_name")} placeholder="Acme Corp" />
          {errors.company_name && (
            <p className="text-xs text-destructive">{errors.company_name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin Name</Label>
          <Input {...register("admin_name")} placeholder="John Doe" />
          {errors.admin_name && (
            <p className="text-xs text-destructive">{errors.admin_name.message}</p>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting} className="shadow-md hover:shadow-lg transition-all duration-200">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Card>
  );
}

// ── Password Section ──────────────────────────────────────────────────────────

function PasswordSection() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const onSubmit = async (values: PasswordValues) => {
    try {
      await api.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("Password changed");
      reset();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card className="p-6 md:p-8 rounded-2xl border-border/80 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="border-b border-border/40 pb-4 mb-6">
        <h2 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
          <span className="w-1.5 h-4 bg-primary rounded-full" />
          Change Password
        </h2>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Password</Label>
          <Input type="password" {...register("currentPassword")} />
          {errors.currentPassword && (
            <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">New Password</Label>
          <Input type="password" {...register("newPassword")} />
          {errors.newPassword && (
            <p className="text-xs text-destructive">{errors.newPassword.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Confirm New Password</Label>
          <Input type="password" {...register("confirmPassword")} />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting} className="shadow-md hover:shadow-lg transition-all duration-200">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Update Password
        </Button>
      </form>
    </Card>
  );
}

// ── Email Section ─────────────────────────────────────────────────────────────

function EmailSection() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({ resolver: zodResolver(emailSchema) });

  const onSubmit = async (values: EmailValues) => {
    try {
      await api.changeEmail({
        currentPassword: values.currentPassword,
        newEmail: values.newEmail,
      });
      toast.success("Email changed! Please use your new email for next login.");
      reset();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card className="p-6 md:p-8 rounded-2xl border-border/80 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="border-b border-border/40 pb-4 mb-6">
        <h2 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
          <span className="w-1.5 h-4 bg-primary rounded-full" />
          Change Email
        </h2>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Password</Label>
          <Input type="password" {...register("currentPassword")} />
          {errors.currentPassword && (
            <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">New Email Address</Label>
          <Input type="email" placeholder="new@example.com" {...register("newEmail")} />
          {errors.newEmail && (
            <p className="text-xs text-destructive">{errors.newEmail.message}</p>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting} className="shadow-md hover:shadow-lg transition-all duration-200">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Update Email
        </Button>
      </form>
    </Card>
  );
}

// ── SMTP Section ──────────────────────────────────────────────────────────────

function SmtpSection({ settings }: { settings: Record<string, string> }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SmtpValues>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      smtp_host: settings.smtp_host ?? "",
      smtp_port: settings.smtp_port ?? "",
      smtp_user: settings.smtp_user ?? "",
      smtp_pass: "",
      smtp_from: settings.smtp_from ?? "",
    },
  });

  useEffect(() => {
    reset({
      smtp_host: settings.smtp_host ?? "",
      smtp_port: settings.smtp_port ?? "",
      smtp_user: settings.smtp_user ?? "",
      smtp_pass: "",
      smtp_from: settings.smtp_from ?? "",
    });
  }, [settings, reset]);

  const [testLoading, setTestLoading] = useState(false);

  const onSubmit = async (values: SmtpValues) => {
    try {
      const payload: Record<string, string> = {};
      if (values.smtp_host) payload.smtp_host = values.smtp_host;
      if (values.smtp_port) payload.smtp_port = values.smtp_port;
      if (values.smtp_user) payload.smtp_user = values.smtp_user;
      if (values.smtp_pass) payload.smtp_pass = values.smtp_pass;
      if (values.smtp_from) payload.smtp_from = values.smtp_from;
      await api.updateSettings(payload);
      toast.success("SMTP settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleTestEmail = async () => {
    const email = window.prompt("Enter the email address to receive the test email:", "");
    if (email === null) return;
    if (email.trim() === "") {
      toast.error("Please enter a valid email address.");
      return;
    }

    setTestLoading(true);
    try {
      await api.updateSettings({ test_email: "true", test_email_address: email.trim() });
      toast.success(`Test email sent to ${email.trim()}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Card className="p-6 md:p-8 rounded-2xl border-border/80 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="border-b border-border/40 pb-4 mb-6">
        <h2 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
          <span className="w-1.5 h-4 bg-primary rounded-full" />
          Email / SMTP Configuration
        </h2>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SMTP Host</Label>
            <Input {...register("smtp_host")} placeholder="smtp.example.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SMTP Port</Label>
            <Input {...register("smtp_port")} placeholder="587" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SMTP Username</Label>
          <Input {...register("smtp_user")} placeholder="user@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SMTP Password</Label>
          <Input type="password" {...register("smtp_pass")} placeholder="Leave blank to keep existing" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">From Address</Label>
          <Input {...register("smtp_from")} placeholder="noreply@example.com" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting} className="shadow-md hover:shadow-lg transition-all duration-200">
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save SMTP
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleTestEmail}
            disabled={testLoading}
          >
            {testLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send Test Email
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ── Alert Preferences Section ─────────────────────────────────────────────────

function AlertPrefsSection({ settings }: { settings: Record<string, string> }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AlertPrefValues>({
    resolver: zodResolver(alertPrefSchema) as any,
    defaultValues: {
      alert_days_ahead: Number(settings.alert_days_ahead) || 30,
      alert_email_enabled: settings.alert_email_enabled === "true",
      alert_emails: settings.alert_emails || "",
    },
  });

  useEffect(() => {
    reset({
      alert_days_ahead: Number(settings.alert_days_ahead) || 30,
      alert_email_enabled: settings.alert_email_enabled === "true",
      alert_emails: settings.alert_emails || "",
    });
  }, [settings, reset]);

  const emailEnabled = watch("alert_email_enabled");

  const savedEmails = settings.alert_emails
    ? settings.alert_emails.split(",").map((e) => e.trim()).filter(Boolean)
    : [];

  const onSubmit = async (values: AlertPrefValues) => {
    try {
      await api.updateSettings({
        alert_days_ahead: String(values.alert_days_ahead),
        alert_email_enabled: String(values.alert_email_enabled),
        alert_emails: values.alert_emails || "",
      });
      toast.success("Alert preferences saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card className="p-6 md:p-8 rounded-2xl border-border/80 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="border-b border-border/40 pb-4 mb-6">
        <h2 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
          <span className="w-1.5 h-4 bg-primary rounded-full" />
          Alert Preferences
        </h2>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Days Ahead for Alerts</Label>
          <Input type="number" min={1} max={365} {...register("alert_days_ahead")} />
          <p className="text-xs text-muted-foreground leading-normal mt-0.5">
            Generate alerts this many days before renewal/expiry dates
          </p>
        </div>
        <div className="flex items-center gap-3 py-1">
          <Switch
            id="email-enabled"
            checked={emailEnabled}
            onCheckedChange={(v) => setValue("alert_email_enabled", v)}
          />
          <Label htmlFor="email-enabled" className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-foreground/95">
            Enable Email Notifications
          </Label>
        </div>
        {emailEnabled && (
          <div className="space-y-1.5 pt-1 animate-fade-in">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notification Email Addresses</Label>
            <Input placeholder="admin@example.com, it@example.com" {...register("alert_emails")} />
            {errors.alert_emails && (
              <p className="text-xs text-destructive">{errors.alert_emails.message}</p>
            )}
            <p className="text-xs text-muted-foreground leading-normal mt-0.5">
              Comma-separated list of emails to receive alerts. If left blank, alerts will go to the primary admin.
            </p>
          </div>
        )}
        <Button type="submit" disabled={isSubmitting} className="shadow-md hover:shadow-lg transition-all duration-200">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Preferences
        </Button>
      </form>

      {settings.alert_email_enabled === "true" && savedEmails.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border/40">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Active Notification Emails</h3>
          <div className="flex flex-wrap gap-2">
            {savedEmails.map((email, i) => (
              <Badge key={i} variant="secondary" className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20 border shadow-sm">
                {email}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── AI Preferences Section ──────────────────────────────────────────────────

function AiPrefsSection({ settings }: { settings: Record<string, string> }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<AiValues>({
    resolver: zodResolver(aiSchema),
    defaultValues: {
      openai_api_key: settings.openai_api_key || "",
    },
  });

  useEffect(() => {
    reset({
      openai_api_key: settings.openai_api_key || "",
    });
  }, [settings, reset]);

  const onSubmit = async (values: AiValues) => {
    try {
      await api.updateSettings({
        openai_api_key: values.openai_api_key || "",
      });
      toast.success("AI Configuration saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card className="p-6 md:p-8 rounded-2xl border-border/80 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="border-b border-border/40 pb-4 mb-6">
        <h2 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
          <span className="w-1.5 h-4 bg-primary rounded-full" />
          AI Configuration
        </h2>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">OpenRouter API Key</Label>
          <Input type="password" placeholder="sk-or-v1-..." {...register("openai_api_key")} />
          <p className="text-xs text-muted-foreground leading-normal mt-0.5">
            Required for AI-powered Excel imports. Get your free key at{" "}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">openrouter.ai/keys</a>.
            Stored securely in the database.
          </p>
        </div>
        <Button type="submit" disabled={isSubmitting} className="shadow-md hover:shadow-lg transition-all duration-200">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save AI Keys
        </Button>
      </form>
    </Card>
  );
}

// ── Generic inline list editor ────────────────────────────────────────────────

function InlineListSection<
  T extends { id: string },
  V extends Record<string, unknown>,
>({
  title,
  items,
  isLoading,
  renderRow,
  schema,
  defaultValues,
  fields,
  onAdd,
  onEdit,
  onDelete,
  getDeleteLabel,
}: {
  title: string;
  items: T[];
  isLoading: boolean;
  renderRow: (item: T) => React.ReactNode;
  schema: z.ZodObject<any>;
  defaultValues: V;
  fields: { name: keyof V; label: string; placeholder?: string; type?: string }[];
  onAdd: (values: V) => Promise<void>;
  onEdit: (id: string, values: V) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  getDeleteLabel?: (item: T) => string;
}) {
  const [editItem, setEditItem] = useState<T | null>(null);
  const [deleteItem, setDeleteItem] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema) as any,
    defaultValues: defaultValues as any,
  } as any);

  const onSubmit = async (values: any) => {
    try {
      if (editItem) {
        await onEdit(editItem.id, values);
        toast.success("Updated");
      } else {
        await onAdd(values);
        toast.success("Added");
      }
      reset(defaultValues);
      setEditItem(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await onDelete(deleteItem.id);
      toast.success("Deleted");
      setDeleteItem(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = (item: T) => {
    setEditItem(item);
    fields.forEach((f) => {
      const val = (item as Record<string, unknown>)[f.name as string];
      setValue(f.name as any, val as any);
    });
  };

  return (
    <Card className="p-6 md:p-8 rounded-2xl border-border/80 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="border-b border-border/40 pb-4 mb-6">
        <h2 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
          <span className="w-1.5 h-4 bg-primary rounded-full" />
          {title}
        </h2>
      </div>
      <div className="space-y-6">
        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2 italic">No items yet.</p>
        ) : (
          <div className="divide-y divide-border border border-border/80 rounded-xl overflow-hidden shadow-sm bg-card">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">{renderRow(item)}</div>
                <div className="flex items-center gap-1 shrink-0 ml-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-lg hover:bg-muted"
                    onClick={() => startEdit(item)}
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteItem(item)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator className="bg-border/50" />

        {/* Add/Edit form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <p className="text-xs font-bold uppercase tracking-widest text-foreground/80">
            {editItem ? "Edit Item" : "Add New Item"}
          </p>
          <div className="flex gap-3 flex-wrap items-end">
            {fields.map((f) => (
              <div key={String(f.name)} className="flex-1 min-w-[160px] space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{f.label}</Label>
                <Input
                  type={f.type ?? "text"}
                  placeholder={f.placeholder}
                  className="text-sm"
                  {...register(f.name as any)}
                />
                {errors[f.name as string] && (
                  <p className="text-xs text-destructive">
                    {(errors[f.name as string] as { message?: string })?.message}
                  </p>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Button type="submit" className="shadow-sm hover:shadow transition-all" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editItem ? (
                  "Update"
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5" />Add
                  </>
                )}
              </Button>
              {editItem && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setEditItem(null); reset(defaultValues); }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
        title={`Delete ${title.replace(/s$/, "")}`}
        description={`Are you sure you want to delete "${deleteItem && getDeleteLabel ? getDeleteLabel(deleteItem) : "this item"}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </Card>
  );
}

// ── Processor Library Section ─────────────────────────────────────────────────

function ProcessorSection() {
  const { data, isLoading, mutate } = useSWR("/processors", () => api.getProcessors());
  const processors: Processor[] = (data as { data: Processor[] } | undefined)?.data ?? [];

  const [editProcessor, setEditProcessor] = useState<Processor | null>(null);
  const [deleteProcessor, setDeleteProcessor] = useState<Processor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProcessorValues>({
    resolver: zodResolver(processorSchema),
    defaultValues: { name: "", brand: "", grade: "MID" },
  });

  const gradeValue = watch("grade");

  const onSubmit = async (values: ProcessorValues) => {
    try {
      if (editProcessor) {
        await api.updateProcessor(editProcessor.id, values);
        toast.success("Processor updated");
      } else {
        await api.createProcessor(values);
        toast.success("Processor added");
      }
      mutate();
      setDialogOpen(false);
      setEditProcessor(null);
      reset({ name: "", brand: "", grade: "MID" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteProcessor) return;
    setDeleting(true);
    try {
      await api.deleteProcessor(deleteProcessor.id);
      toast.success("Processor deleted");
      mutate();
      setDeleteProcessor(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = (p: Processor) => {
    setEditProcessor(p);
    reset({ name: p.name, brand: p.brand ?? "", grade: p.grade });
    setDialogOpen(true);
  };

  return (
    <Card className="p-6 md:p-8 rounded-2xl border-border/80 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
        <h2 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
          <span className="w-1.5 h-4 bg-primary rounded-full" />
          Processor Library
        </h2>
        <Button
          onClick={() => {
            setEditProcessor(null);
            reset({ name: "", brand: "", grade: "MID" });
            setDialogOpen(true);
          }}
          className="shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />Add Processor
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      ) : processors.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 italic">No processors yet.</p>
      ) : (
        <div className="divide-y divide-border border border-border/80 rounded-xl overflow-hidden shadow-sm bg-card">
          {processors.map((p) => {
            const grade = getProcessorGradeBadge(p.grade);
            return (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-semibold text-sm text-foreground">{p.name}</span>
                  {p.brand && (
                    <span className="text-xs text-muted-foreground font-medium">{p.brand}</span>
                  )}
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] font-bold px-1.5 py-0", grade.class)}
                  >
                    {grade.label}
                  </Badge>
                  {p._count && (
                    <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full border border-border/40">
                      {p._count.assets} asset{p._count.assets !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-lg hover:bg-muted"
                    onClick={() => startEdit(p)}
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteProcessor(p)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) { setEditProcessor(null); reset({ name: "", brand: "", grade: "MID" }); }
          setDialogOpen(o);
        }}
      >
        <DialogContent className="max-w-sm rounded-2xl border-border/85 bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold tracking-tight">
              {editProcessor ? "Edit Processor" : "Add Processor"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</Label>
              <Input {...register("name")} placeholder="Intel Core i7-12700" />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Brand</Label>
              <Input {...register("brand")} placeholder="Intel" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Grade</Label>
              <Select
                value={gradeValue}
                onValueChange={(v) => setValue("grade", v as "LOW" | "MID" | "HIGH")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-lg border-border/85">
                  <SelectItem value="LOW">Low Grade</SelectItem>
                  <SelectItem value="MID">Mid Grade</SelectItem>
                  <SelectItem value="HIGH">High Grade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="shadow-md hover:shadow-lg transition-all duration-200">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editProcessor ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteProcessor}
        onOpenChange={(o) => !o && setDeleteProcessor(null)}
        title="Delete Processor"
        description={`Delete "${deleteProcessor?.name}"? Assets using this processor will have it cleared.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("general");

  const { data: settingsData, isLoading: settingsLoading } = useSWR(
    "/settings",
    () => api.getSettings()
  );
  const settings = (settingsData as { data: Record<string, string> } | undefined)?.data ?? {};

  // Departments
  const { departments, isLoading: deptLoading, mutate: mutateDepts } = useDepartments();
  // Designations
  const { designations, isLoading: desigLoading, mutate: mutateDesigs } = useDesignations();
  // Stock Locations
  const { locations, isLoading: locsLoading, mutate: mutateLocs } = useStockLocations();

  const sectionContent: Record<string, React.ReactNode> = {
    general: settingsLoading ? (
      <Skeleton className="h-48 rounded-xl" />
    ) : (
      <GeneralSection settings={settings} />
    ),
    password: <PasswordSection />,
    email: <EmailSection />,
    smtp: settingsLoading ? (
      <Skeleton className="h-72 rounded-xl" />
    ) : (
      <SmtpSection settings={settings} />
    ),
    "alert-prefs": settingsLoading ? (
      <Skeleton className="h-48 rounded-xl" />
    ) : (
      <AlertPrefsSection settings={settings} />
    ),
    "ai-prefs": settingsLoading ? (
      <Skeleton className="h-48 rounded-xl" />
    ) : (
      <AiPrefsSection settings={settings} />
    ),
    departments: (
      <InlineListSection<Department, DeptValues>
        title="Departments"
        items={departments}
        isLoading={deptLoading}
        renderRow={(d) => (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{d.name}</span>
            {d._count && (
              <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full border border-border/40">
                {d._count.employees} employee{d._count.employees !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
        schema={departmentSchema}
        defaultValues={{ name: "" }}
        fields={[{ name: "name", label: "Name", placeholder: "Engineering" }]}
        onAdd={async (v) => { await api.createDepartment(v); mutateDepts(); }}
        onEdit={async (id, v) => { await api.updateDepartment(id, v); mutateDepts(); }}
        onDelete={async (id) => { await api.deleteDepartment(id); mutateDepts(); }}
        getDeleteLabel={(d) => d.name}
      />
    ),
    designations: (
      <InlineListSection<Designation, DesigValues>
        title="Designations"
        items={designations}
        isLoading={desigLoading}
        renderRow={(d) => (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{d.title}</span>
            {d._count && (
              <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full border border-border/40">
                {d._count.employees} employee{d._count.employees !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
        schema={designationSchema}
        defaultValues={{ title: "" }}
        fields={[{ name: "title", label: "Title", placeholder: "Software Engineer" }]}
        onAdd={async (v) => { await api.createDesignation(v); mutateDesigs(); }}
        onEdit={async (id, v) => { await api.updateDesignation(id, v); mutateDesigs(); }}
        onDelete={async (id) => { await api.deleteDesignation(id); mutateDesigs(); }}
        getDeleteLabel={(d) => d.title}
      />
    ),
    processors: <ProcessorSection />,
    locations: (
      <InlineListSection<StockLocation, LocationValues>
        title="Stock Locations"
        items={locations}
        isLoading={locsLoading}
        renderRow={(l) => (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{l.name}</span>
            {l.description && (
              <span className="text-xs text-muted-foreground font-medium truncate max-w-xs">{l.description}</span>
            )}
            {l.assetCounts && (
              <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full border border-border/40">
                {l.assetCounts.total} asset{l.assetCounts.total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
        schema={locationSchema}
        defaultValues={{ name: "", description: "" }}
        fields={[
          { name: "name", label: "Name", placeholder: "Server Room A" },
          { name: "description", label: "Description", placeholder: "Optional details" },
        ]}
        onAdd={async (v) => { await api.createStockLocation(v); mutateLocs(); }}
        onEdit={async (id, v) => { await api.updateStockLocation(id, v); mutateLocs(); }}
        onDelete={async (id) => { await api.deleteStockLocation(id); mutateLocs(); }}
        getDeleteLabel={(l) => l.name}
      />
    ),
  };

  return (
    <div className="page-shell space-y-5">
      <PageHero
        eyebrow="System Configuration"
        title="Settings"
        description="Configure departments, designations, locations, processor specifications, edit security credentials, and manage notification rules."
        icon={Settings}
      />

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Left nav */}
        <nav className="w-full md:w-56 shrink-0 ui-card p-2">
          <div className="space-y-1.5">
            {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left border-l-2",
                  activeSection === id
                    ? "bg-primary/10 text-primary border-primary dark:bg-primary/20"
                    : "text-muted-foreground border-transparent hover:bg-muted/65 hover:text-foreground"
                )}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 w-full min-w-0">{sectionContent[activeSection]}</div>
      </div>
    </div>
  );
}
