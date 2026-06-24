import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@wix/essentials";
import type { ReturnFlowDashboardData, ReturnFlowSettings, ReturnRequest } from "../../types";

const queryKey = ["returnflow-data"];
const apiOrigin = new URL(import.meta.url).origin;

interface DashboardData extends ReturnFlowDashboardData {
  catalogVersion: string;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await httpClient.fetchWithAuth(`${apiOrigin}${path}`, init);
  const payload = await response.json() as unknown;
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "ReturnFlow request failed.";
    throw new Error(message);
  }
  return payload as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function useReturnFlowData() {
  const queryClient = useQueryClient();
  const data = useQuery({
    queryKey,
    queryFn: () => requestJson<DashboardData>("/api/returnflow/dashboard"),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  return {
    data,
    approve: useMutation({
      mutationFn: (id: string) => postJson<ReturnRequest>("/api/returnflow/action", { id, action: "approve" }),
      onSuccess: invalidate,
    }),
    reject: useMutation({
      mutationFn: (id: string) => postJson<ReturnRequest>("/api/returnflow/action", { id, action: "reject" }),
      onSuccess: invalidate,
    }),
    refund: useMutation({
      mutationFn: (id: string) => postJson("/api/returnflow/action", { id, action: "refund" }),
      onSuccess: invalidate,
    }),
    exchange: useMutation({
      mutationFn: (id: string) => postJson("/api/returnflow/action", { id, action: "exchange" }),
      onSuccess: invalidate,
    }),
    credit: useMutation({
      mutationFn: (id: string) => postJson("/api/returnflow/action", { id, action: "credit" }),
      onSuccess: invalidate,
    }),
    saveSettings: useMutation({
      mutationFn: (settings: ReturnFlowSettings) =>
        postJson<ReturnFlowSettings>("/api/returnflow/settings", settings),
      onSuccess: invalidate,
    }),
  };
}
