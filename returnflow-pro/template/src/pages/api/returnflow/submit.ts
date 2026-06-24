import type { APIRoute } from "astro";
import { submitPortalReturnForRequest } from "../../../backend/returnflow-data.web";
import type { PortalSubmissionInput, ResolutionPreference } from "../../../types";

const jsonHeaders = { "Content-Type": "application/json" };
const resolutionPreferences = new Set<ResolutionPreference>(["refund", "exchange", "storeCredit"]);

function errorResponse(error: unknown, status = 400): Response {
  const message = error instanceof Error ? error.message : "ReturnFlow submission failed.";
  return new Response(JSON.stringify({ error: message }), {
    status,
    statusText: status === 400 ? "Bad Request" : "Internal Server Error",
    headers: jsonHeaders,
  });
}

function parseSubmissionInput(body: unknown): PortalSubmissionInput | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }
  const candidate = body as Record<string, unknown>;
  if (
    typeof candidate.token !== "string" ||
    !Array.isArray(candidate.selectedLineItemIds) ||
    !candidate.selectedLineItemIds.every((id) => typeof id === "string") ||
    typeof candidate.reasonCode !== "string" ||
    typeof candidate.comment !== "string" ||
    typeof candidate.resolutionPreference !== "string" ||
    !resolutionPreferences.has(candidate.resolutionPreference as ResolutionPreference)
  ) {
    return undefined;
  }

  return {
    token: candidate.token,
    selectedLineItemIds: candidate.selectedLineItemIds,
    reasonCode: candidate.reasonCode,
    comment: candidate.comment,
    resolutionPreference: candidate.resolutionPreference as ResolutionPreference,
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const input = parseSubmissionInput(await request.json() as unknown);
    if (!input) {
      return errorResponse(new Error("Return submission payload is invalid."));
    }

    const result = await submitPortalReturnForRequest(input);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("ReturnFlow submit API failed:", error);
    return errorResponse(error);
  }
};
