/**
 * HTTP helpers shared by the Astro Backend API routes under `src/pages/api`.
 */
import { auth } from "@wix/essentials";
import { secrets } from "@wix/secrets";
import { timingSafeEqual } from "node:crypto";
import { SECRET_NAMES } from "@/consts";

interface TokenInfo {
  active: boolean;
  subjectType: "APP" | "USER" | "MEMBER" | "VISITOR" | "UNKNOWN";
  subjectId: string;
  exp: number;
  iat: number;
  clientId?: string;
  siteId: string;
  instanceId?: string;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const ok = (data: unknown) => json(data, 200);
export const badRequest = (message: string) => json({ error: message }, 400);
export const unauthorized = (message = "Unauthorized") => json({ error: message }, 401);
export const serverError = (message: string) => json({ error: message }, 500);

/** HTML redirect response used by the OAuth start/callback routes. */
export function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location } });
}

export async function getDashboardAuthInfo(): Promise<TokenInfo | null> {
  try {
    const tokenInfo = await auth.getTokenInfo();
    const dashboardSubject =
      tokenInfo.subjectType === "USER" || tokenInfo.subjectType === "APP";
    if (!tokenInfo.active || !tokenInfo.siteId || !tokenInfo.instanceId || !dashboardSubject) {
      return null;
    }
    return tokenInfo;
  } catch {
    return null;
  }
}

export async function requireDashboardAuth(): Promise<Response | null> {
  return (await getDashboardAuthInfo()) ? null : unauthorized("Invalid or missing Wix authorization");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validate the shared-secret header sent by the external scheduler. Returns
 * `true` only when the provided token matches the value in Secrets Manager.
 */
export async function isSchedulerAuthorized(request: Request): Promise<boolean> {
  const provided = request.headers.get("x-pinflow-scheduler-token");
  if (!provided) return false;
  try {
    const getSecret = auth.elevate(secrets.getSecretValue);
    const secret = await getSecret(SECRET_NAMES.schedulerToken);
    const expected = secret?.value;
    return typeof expected === "string" && expected.length > 0 && safeEqual(provided, expected);
  } catch {
    return false;
  }
}
