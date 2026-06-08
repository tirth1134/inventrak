import useSWR from "swr";
import { api } from "@/lib/api";

export const useHardware = (params = "") => {
  const key = `/hardware?${params}`;
  const { data, error, isLoading, mutate } = useSWR(key, () => api.getAssets(params));
  return { assets: data?.data ?? [], total: data?.total ?? 0, totalPages: data?.totalPages ?? 0, error, isLoading, mutate };
};

export const useAsset = (id: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(id ? `/hardware/${id}` : null, () => api.getAsset(id!));
  return { asset: data?.data, error, isLoading, mutate };
};
