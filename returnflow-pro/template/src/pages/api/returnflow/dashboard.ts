import type { APIRoute } from "astro";
import { getReturnFlowData } from "../../../backend/returnflow-data.web";

const jsonHeaders = { "Content-Type": "application/json" };

export const GET: APIRoute = async () => {
  try {
    return new Response(JSON.stringify(await getReturnFlowData()), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("ReturnFlow dashboard API failed:", error);
    const message = error instanceof Error ? error.message : "ReturnFlow dashboard data failed.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      statusText: "Internal Server Error",
      headers: jsonHeaders,
    });
  }
};
