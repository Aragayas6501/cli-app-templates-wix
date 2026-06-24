import type { APIRoute } from "astro";
import { lookupPortalOrderForRequest } from "../../../backend/returnflow-data.web";

const jsonHeaders = { "Content-Type": "application/json" };

function errorResponse(error: unknown, status = 400): Response {
  const message = error instanceof Error ? error.message : "ReturnFlow lookup failed.";
  return new Response(JSON.stringify({ error: message }), {
    status,
    statusText: status === 400 ? "Bad Request" : "Internal Server Error",
    headers: jsonHeaders,
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as unknown;
    if (
      typeof body !== "object" ||
      body === null ||
      !("orderNumber" in body) ||
      !("email" in body) ||
      typeof body.orderNumber !== "string" ||
      typeof body.email !== "string"
    ) {
      return errorResponse(new Error("Order number and email are required."));
    }

    const result = await lookupPortalOrderForRequest(body.orderNumber, body.email);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("ReturnFlow lookup API failed:", error);
    return errorResponse(error);
  }
};
