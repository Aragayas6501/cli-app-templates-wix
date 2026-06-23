import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPriceFlowDashboardData,
  removePricingRule,
  savePricingRule,
} from "../../backend/rules.web";
import type { RuleDraft } from "../../types";

const queryKey = ["priceflow-dashboard-data"];

export function usePriceFlowData() {
  const queryClient = useQueryClient();
  const dashboardData = useQuery({
    queryKey,
    queryFn: getPriceFlowDashboardData,
  });

  const saveRule = useMutation({
    mutationFn: (draft: RuleDraft) => savePricingRule(draft),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteRule = useMutation({
    mutationFn: (ruleId: string) => removePricingRule(ruleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return { dashboardData, saveRule, deleteRule };
}

