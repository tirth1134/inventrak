import useSWR from "swr";
import { api } from "@/lib/api";

export const useAlerts = (params = "") => {
  const key = `/alerts?${params}`;
  const { data, error, isLoading, mutate } = useSWR(key, () => api.getAlerts(params));
  return { alerts: data?.data ?? [], total: data?.total ?? 0, totalPages: data?.totalPages ?? 0, error, isLoading, mutate };
};
