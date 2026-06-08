import useSWR from "swr";
import { api } from "@/lib/api";

export const useStockLocations = () => {
  const { data, error, isLoading, mutate } = useSWR("/stock", () => api.getStockLocations());
  return { locations: data?.data ?? [], error, isLoading, mutate };
};
