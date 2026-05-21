/**
 * React Query hooks for scan operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scansApi, statsApi } from "@/lib/api";

export function useScans(params?: { scan_type?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["scans", params],
    queryFn: () => scansApi.list(params),
    staleTime: 30_000,
  });
}

export function useScan(scanId: string) {
  return useQuery({
    queryKey: ["scan", scanId],
    queryFn: () => scansApi.get(scanId),
    enabled: !!scanId,
  });
}

export function useDeleteScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scanId: string) => scansApi.delete(scanId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scans"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => statsApi.get(),
    staleTime: 60_000,
  });
}
