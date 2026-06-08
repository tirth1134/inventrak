import { EmployeeForm } from "@/components/employees/EmployeeForm";

export default function NewEmployeePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Add Employee</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Add a new employee to the directory</p>
      </div>
      <EmployeeForm />
    </div>
  );
}
