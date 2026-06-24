import type { APIRoute } from "astro";
import { saveReturnFlowSettings } from "../../../backend/returnflow-data.web";
import type { ReturnFlowSettings } from "../../../types";

const jsonHeaders = { "Content-Type": "application/json" };
const plans = new Set<ReturnFlowSettings["billingPlan"]>(["Free", "Starter", "Pro", "Business", "Enterprise"]);

function parseSettings(body: unknown): ReturnFlowSettings | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }
  const candidate = body as Record<string, unknown>;
  if (
    typeof candidate.instanceId !== "string" ||
    !plans.has(candidate.billingPlan as ReturnFlowSettings["billingPlan"]) ||
    !(
      candidate.monthlyReturnLimit === "unlimited" ||
      typeof candidate.monthlyReturnLimit === "number"
    ) ||
    typeof candidate.portalEnabled !== "boolean" ||
    typeof candidate.autoApproveLowRisk !== "boolean" ||
    typeof candidate.defaultReturnWindowDays !== "number" ||
    typeof candidate.storeCreditBonusPercent !== "number" ||
    typeof candidate.primaryLocale !== "string" ||
    !Array.isArray(candidate.enabledCarriers) ||
    !candidate.enabledCarriers.every((carrier) => typeof carrier === "string")
  ) {
    return undefined;
  }

  return {
    instanceId: candidate.instanceId,
    billingPlan: candidate.billingPlan as ReturnFlowSettings["billingPlan"],
    monthlyReturnLimit: candidate.monthlyReturnLimit,
    portalEnabled: candidate.portalEnabled,
    autoApproveLowRisk: candidate.autoApproveLowRisk,
    defaultReturnWindowDays: candidate.defaultReturnWindowDays,
    storeCreditBonusPercent: candidate.storeCreditBonusPercent,
    primaryLocale: candidate.primaryLocale,
    enabledCarriers: candidate.enabledCarriers,
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: unknown;
    try {
      body = await request.json() as unknown;
    } catch {
      return new Response(JSON.stringify({ error: "ReturnFlow settings payload is invalid." }), {
        status: 400,
        statusText: "Bad Request",
        headers: jsonHeaders,
      });
    }

    const settings = parseSettings(body);
    if (!settings) {
      return new Response(JSON.stringify({ error: "ReturnFlow settings payload is invalid." }), {
        status: 400,
        statusText: "Bad Request",
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify(await saveReturnFlowSettings(settings)), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("ReturnFlow settings API failed:", error);
    const message = error instanceof Error ? error.message : "ReturnFlow settings save failed.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      statusText: "Internal Server Error",
      headers: jsonHeaders,
    });
  }
};
