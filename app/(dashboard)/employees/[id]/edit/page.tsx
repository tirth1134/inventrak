"use client";

import { use } from "react";
import { useEmployee } from "@/lib/hooks/useEmployees";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { PageLoader } from "@/components/shared/PageLoader";

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { employee, isLoading } = useEmployee(id);

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Edit Employee</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{employee?.name}</p>
      </div>
      {employee && <EmployeeForm employee={employee} />}
    </div>
  );
}
