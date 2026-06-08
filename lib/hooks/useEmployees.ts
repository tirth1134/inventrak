import useSWR from "swr";
import { api } from "@/lib/api";

export const useEmployees = (params = "") => {
  const key = `/employees?${params}`;
  const { data, error, isLoading, mutate } = useSWR(key, () => api.getEmployees(params));
  return { employees: data?.data ?? [], total: data?.total ?? 0, totalPages: data?.totalPages ?? 0, error, isLoading, mutate };
};

export const useEmployee = (id: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(id ? `/employees/${id}` : null, () => api.getEmployee(id!));
  return { employee: data?.data, error, isLoading, mutate };
};

export const useDepartments = () => {
  const { data, error, isLoading, mutate } = useSWR("/departments", () => api.getDepartments());
  return { departments: data?.data ?? [], error, isLoading, mutate };
};

export const useDesignations = () => {
  const { data, error, isLoading, mutate } = useSWR("/designations", () => api.getDesignations());
  return { designations: data?.data ?? [], error, isLoading, mutate };
};
