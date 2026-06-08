import useSWR from "swr";
import { api } from "@/lib/api";

export const useDashboard = () => {
  const { data, error, isLoading, mutate } = useSWR("/dashboard", () => api.getDashboard());
  return { dashboard: data?.data, error, isLoading, mutate };
};
