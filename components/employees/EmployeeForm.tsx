"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api, type Employee } from "@/lib/api";
import { useDepartments, useDesignations } from "@/lib/hooks/useEmployees";
import { useState } from "react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email"),
  phone: z.string().optional(),
  departmentId: z.string().min(1, "Department is required"),
  designationId: z.string().optional(),
  isTeamLead: z.boolean().default(false),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  employee?: Employee;
}

export function EmployeeForm({ employee }: Props) {
  const router = useRouter();
  const { departments } = useDepartments();
  const { designations } = useDesignations();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: employee
      ? {
          name: employee.name,
          email: employee.email,
          phone: employee.phone ?? "",
          departmentId: employee.departmentId,
          designationId: employee.designationId ?? "",
          isTeamLead: employee.isTeamLead,
          status: employee.status,
        }
      : {
          isTeamLead: false,
          status: "ACTIVE",
        },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        phone: data.phone || undefined,
        designationId: data.designationId || undefined,
      };
      if (employee) {
        await api.updateEmployee(employee.id, payload);
        toast.success("Employee updated");
      } else {
        await api.createEmployee(payload);
        toast.success("Employee created");
      }
      router.push("/employees");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input {...register("name")} placeholder="e.g. John Doe" />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" {...register("email")} placeholder="john@company.com" />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input type="tel" {...register("phone")} placeholder="+91 98765 43210" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.departmentId && (
                <p className="text-xs text-destructive">{errors.departmentId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Controller
                name="designationId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none-desig">— None —</SelectItem>
                      {designations.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Team Lead</Label>
              <Controller
                name="isTeamLead"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-3 h-10">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="isTeamLead"
                    />
                    <label htmlFor="isTeamLead" className="text-sm text-muted-foreground cursor-pointer">
                      {field.value ? "Yes, this employee is a team lead" : "Not a team lead"}
                    </label>
                  </div>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/employees")}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {employee ? "Update Employee" : "Create Employee"}
        </Button>
      </div>
    </form>
  );
}
