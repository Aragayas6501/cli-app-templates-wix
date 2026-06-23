import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  connectEtsyShop as connectEtsyShopWeb,
  getDashboardData,
  resolveConflict as resolveConflictWeb,
  runManualSync as runManualSyncWeb,
  saveSyncProfile,
} from "../../backend/etsysync-data.web";
import type { Conflict, EtsySyncDashboardData, SyncProfile } from "../../types";

const queryKey = ["etsysync-dashboard-data"];

export function useEtsySyncData() {
  const queryClient = useQueryClient();

  const dashboardData = useQuery<EtsySyncDashboardData>({
    queryKey,
    queryFn: async () => getDashboardData(),
  });

  const invalidateDashboardData = () =>
    queryClient.invalidateQueries({ queryKey });

  const updateSyncProfile = useMutation({
    mutationFn: async (profile: SyncProfile) => saveSyncProfile(profile),
    onSuccess: invalidateDashboardData,
  });

  const connectEtsyShop = useMutation({
    mutationFn: async (shopName: string) => connectEtsyShopWeb(shopName),
    onSuccess: invalidateDashboardData,
  });

  const runManualSync = useMutation({
    mutationFn: async (scope: string) => runManualSyncWeb(scope),
    onSuccess: invalidateDashboardData,
  });

  const resolveConflict = useMutation({
    mutationFn: async ({
      conflictId,
      resolution,
    }: {
      conflictId: string;
      resolution: Conflict["recommendation"];
    }) => resolveConflictWeb(conflictId, resolution),
    onSuccess: invalidateDashboardData,
  });

  return {
    dashboardData,
    updateSyncProfile,
    connectEtsyShop,
    runManualSync,
    resolveConflict,
  };
}
