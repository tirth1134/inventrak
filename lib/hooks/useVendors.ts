import useSWR from "swr";
import { api } from "@/lib/api";

export const useVendors = (params = "") => {
  const key = `/vendors?${params}`;
  const { data, error, isLoading, mutate } = useSWR(key, () => api.getVendors(params));
  return { vendors: data?.data ?? [], total: data?.total ?? 0, totalPages: data?.totalPages ?? 0, error, isLoading, mutate };
};

export const useVendor = (id: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(id ? `/vendors/${id}` : null, () => api.getVendor(id!));
  return { vendor: data?.data, error, isLoading, mutate };
};

export const useProcessors = (params = "") => {
  const { data, error, isLoading, mutate } = useSWR(`/processors?${params}`, () => api.getProcessors(params));
  return { processors: data?.data ?? [], error, isLoading, mutate };
};

export const useStockLocations = () => {
  const { data, error, isLoading, mutate } = useSWR("/stock", () => api.getStockLocations());
  return { locations: data?.data ?? [], error, isLoading, mutate };
};
