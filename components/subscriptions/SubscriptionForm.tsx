"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronUp, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api, type Subscription } from "@/lib/api";
import { useDepartments } from "@/lib/hooks/useEmployees";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url().optional().or(z.literal("")),
  category: z.string().optional(),
  planName: z.string().optional(),
  billingCycle: z.enum(["MONTHLY", "YEARLY", "ONE_TIME"]),
  buyDate: z.string().optional(),
  renewalDate: z.string().optional(),
  nextPaymentDate: z.string().optional(),
  price: z.number().min(0, "Price must be non-negative"),
  currency: z.string().default("INR"),
  paymentMethod: z.string().optional(),
  licenceCount: z.number().int().min(1).default(1),
  departmentId: z.string().optional(),
  teamLeadName: z.string().optional(),
  status: z.enum(["ACTIVE", "CANCELLED", "EXPIRED"]).default("ACTIVE"),
  username: z.string().optional(),
  password: z.string().optional(),
  notes: z.string().optional(),
  cancelReason: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props { subscription?: Subscription; }

export function SubscriptionForm({ subscription }: Props) {
  const router = useRouter();
  const { departments } = useDepartments();
  const [tags, setTags] = useState<string[]>(subscription?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [credExpanded, setCredExpanded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: subscription ? {
      name: subscription.name,
      url: subscription.url ?? "",
      category: subscription.category ?? "",
      planName: subscription.planName ?? "",
      billingCycle: subscription.billingCycle,
      buyDate: subscription.buyDate ? subscription.buyDate.split("T")[0] : "",
      renewalDate: subscription.renewalDate ? subscription.renewalDate.split("T")[0] : "",
      nextPaymentDate: subscription.nextPaymentDate ? subscription.nextPaymentDate.split("T")[0] : "",
      price: subscription.price,
      currency: subscription.currency,
      paymentMethod: subscription.paymentMethod ?? "",
      licenceCount: subscription.licenceCount,
      departmentId: subscription.departmentId ?? "",
      teamLeadName: subscription.teamLeadName ?? "",
      status: subscription.status,
      notes: subscription.notes ?? "",
      cancelReason: subscription.cancelReason ?? "",
    } : { billingCycle: "MONTHLY", currency: "INR", licenceCount: 1, status: "ACTIVE" },
  });

  const status = watch("status");

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        tags,
        buyDate: data.buyDate ? new Date(data.buyDate).toISOString() : undefined,
        renewalDate: data.renewalDate ? new Date(data.renewalDate).toISOString() : undefined,
        nextPaymentDate: data.nextPaymentDate ? new Date(data.nextPaymentDate).toISOString() : undefined,
        departmentId: data.departmentId || undefined,
      };

      if (subscription) {
        await api.updateSubscription(subscription.id, payload);
        toast.success("Subscription updated");
      } else {
        await api.createSubscription(payload);
        toast.success("Subscription created");
      }
      router.push("/subscriptions");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(""); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>App Name *</Label>
              <Input {...register("name")} placeholder="e.g. GitHub" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input {...register("url")} placeholder="https://github.com" />
              {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Controller name="category" control={control} render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {["Dev Tool", "Design", "CRM", "Cloud", "Communication", "HR", "Finance", "Other"].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>Plan Name</Label>
                <Input {...register("planName")} placeholder="e.g. Pro" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Controller name="status" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            {/* Tags */}
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag, press Enter" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
                <Button type="button" variant="outline" size="icon" onClick={addTag}><Plus className="w-4 h-4" /></Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1 text-xs">
                      {t}
                      <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))}><X className="w-2.5 h-2.5" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...register("notes")} placeholder="Additional notes..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Billing */}
          <Card>
            <CardHeader><CardTitle className="text-base">Billing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Billing Cycle *</Label>
                <Controller name="billingCycle" control={control} render={({ field }) => (
                  <div className="flex gap-2">
                    {(["MONTHLY", "YEARLY", "ONE_TIME"] as const).map((c) => (
                      <button key={c} type="button" onClick={() => field.onChange(c)}
                        className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${field.value === c ? "bg-primary text-white border-primary" : "bg-card border-border text-foreground hover:bg-muted"}`}>
                        {c === "MONTHLY" ? "Monthly" : c === "YEARLY" ? "Yearly" : "One-time"}
                      </button>
                    ))}
                  </div>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Price *</Label>
                  <Input type="number" step="0.01" {...register("price", { valueAsNumber: true })} placeholder="0.00" />
                  {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Controller name="currency" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["INR", "USD", "EUR", "GBP"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Licences</Label>
                  <Input type="number" min={1} {...register("licenceCount", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Method</Label>
                  <Input {...register("paymentMethod")} placeholder="e.g. HDFC Card ****4242" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(["buyDate", "renewalDate", "nextPaymentDate"] as const).map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs">{field === "buyDate" ? "Buy Date" : field === "renewalDate" ? "Renewal Date" : "Next Payment"}</Label>
                    <Input type="date" {...register(field)} className="text-sm" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader><CardTitle className="text-base">Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Controller name="departmentId" control={control} render={({ field }) => (
                  <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No department</SelectItem>
                      {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>Team Lead Name</Label>
                <Input {...register("teamLeadName")} placeholder="Team lead name" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Credentials (collapsible) */}
      <Card>
        <button type="button" className="w-full flex items-center justify-between p-4" onClick={() => setCredExpanded(!credExpanded)}>
          <span className="font-medium text-sm">Credentials</span>
          {credExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {credExpanded && (
          <CardContent className="pt-0 space-y-4">
            <p className="text-xs text-muted-foreground">🔒 Credentials are encrypted and stored securely</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input {...register("username")} placeholder="Username / email" />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} {...register("password")} placeholder="••••••••" className="pr-16" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Cancel reason */}
      {status === "CANCELLED" && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-1.5">
              <Label>Cancellation Reason</Label>
              <Textarea {...register("cancelReason")} placeholder="Why was this subscription cancelled?" rows={3} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.push("/subscriptions")}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {subscription ? "Update Subscription" : "Create Subscription"}
        </Button>
      </div>
    </form>
  );
}
