import useSWR from "swr";
import { api } from "@/lib/api";

export const useFloorMaps = () => {
  const { data, error, isLoading, mutate } = useSWR("/floor-map", () => api.getFloorMaps());
  return { floorMaps: data?.data ?? [], error, isLoading, mutate };
};

export const useFloorMap = (id: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/floor-map/${id}` : null,
    () => api.getFloorMap(id!)
  );
  return { floorMap: data?.data, error, isLoading, mutate };
};
