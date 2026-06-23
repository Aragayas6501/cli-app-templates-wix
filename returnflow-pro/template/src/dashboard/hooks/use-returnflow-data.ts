import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveReturnRequest,
  createReturnRefundIntent,
  getReturnFlowData,
  issueReturnStoreCredit,
  rejectReturnRequest,
  saveReturnFlowSettings,
} from "backend/returnflow-data.web";
import type { ReturnFlowSettings } from "../../types";

const queryKey = ["returnflow-data"];

export function useReturnFlowData() {
  const queryClient = useQueryClient();
  const data = useQuery({
    queryKey,
    queryFn: () => getReturnFlowData(),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  return {
    data,
    approve: useMutation({
      mutationFn: (id: string) => approveReturnRequest(id),
      onSuccess: invalidate,
    }),
    reject: useMutation({
      mutationFn: (id: string) => rejectReturnRequest(id),
      onSuccess: invalidate,
    }),
    refund: useMutation({
      mutationFn: (id: string) => createReturnRefundIntent(id),
      onSuccess: invalidate,
    }),
    credit: useMutation({
      mutationFn: (id: string) => issueReturnStoreCredit(id),
      onSuccess: invalidate,
    }),
    saveSettings: useMutation({
      mutationFn: (settings: ReturnFlowSettings) => saveReturnFlowSettings(settings),
      onSuccess: invalidate,
    }),
  };
}
