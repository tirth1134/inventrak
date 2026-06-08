"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Vendor } from "@/lib/api";
import { useState } from "react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  type: z.enum(["HARDWARE", "SOFTWARE", "BOTH"]),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  vendor?: Vendor;
  onSuccess: () => void;
  onCancel: () => void;
}

export function VendorForm({ vendor, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: vendor
      ? {
          name: vendor.name,
          contactPerson: vendor.contactPerson ?? "",
          phone: vendor.phone ?? "",
          email: vendor.email ?? "",
          website: vendor.website ?? "",
          type: vendor.type,
          notes: vendor.notes ?? "",
        }
      : {
          type: "HARDWARE",
        },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        contactPerson: data.contactPerson || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        website: data.website || undefined,
        notes: data.notes || undefined,
      };
      if (vendor) {
        await api.updateVendor(vendor.id, payload);
        toast.success("Vendor updated");
      } else {
        await api.createVendor(payload);
        toast.success("Vendor created");
      }
      onSuccess();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Name *</Label>
        <Input {...register("name")} placeholder="Vendor name" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Contact Person</Label>
          <Input {...register("contactPerson")} placeholder="Contact name" />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input type="tel" {...register("phone")} placeholder="+91 98765 43210" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" {...register("email")} placeholder="vendor@example.com" />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Website</Label>
          <Input {...register("website")} placeholder="https://vendor.com" />
          {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Type *</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HARDWARE">Hardware</SelectItem>
                <SelectItem value="SOFTWARE">Software</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea {...register("notes")} placeholder="Additional notes..." rows={3} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {vendor ? "Update Vendor" : "Add Vendor"}
        </Button>
      </div>
    </form>
  );
}
