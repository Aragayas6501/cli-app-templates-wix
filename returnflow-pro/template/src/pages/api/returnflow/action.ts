import type { APIRoute } from "astro";
import {
  approveReturnRequest,
  createReturnRefundIntent,
  issueReturnStoreCredit,
  rejectReturnRequest,
} from "../../../backend/returnflow-data.web";

const jsonHeaders = { "Content-Type": "application/json" };
const actions = new Set(["approve", "reject", "refund", "credit"]);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as unknown;
    if (
      typeof body !== "object" ||
      body === null ||
      !("id" in body) ||
      !("action" in body) ||
      typeof body.id !== "string" ||
      typeof body.action !== "string" ||
      !actions.has(body.action)
    ) {
      return new Response(JSON.stringify({ error: "ReturnFlow action payload is invalid." }), {
        status: 400,
        statusText: "Bad Request",
        headers: jsonHeaders,
      });
    }

    const result =
      body.action === "approve"
        ? await approveReturnRequest(body.id)
        : body.action === "reject"
          ? await rejectReturnRequest(body.id)
          : body.action === "refund"
            ? await createReturnRefundIntent(body.id)
            : await issueReturnStoreCredit(body.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("ReturnFlow action API failed:", error);
    const message = error instanceof Error ? error.message : "ReturnFlow action failed.";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      statusText: "Bad Request",
      headers: jsonHeaders,
    });
  }
};
