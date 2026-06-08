import useSWR from "swr";
import { api } from "@/lib/api";

export const useSubscriptions = (params = "") => {
  const key = `/subscriptions?${params}`;
  const { data, error, isLoading, mutate } = useSWR(key, () => api.getSubscriptions(params));
  return { subscriptions: data?.data ?? [], total: data?.total ?? 0, totalPages: data?.totalPages ?? 0, error, isLoading, mutate };
};

export const useSubscription = (id: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(id ? `/subscriptions/${id}` : null, () => api.getSubscription(id!));
  return { subscription: data?.data, error, isLoading, mutate };
};
