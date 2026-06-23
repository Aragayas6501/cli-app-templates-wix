import type { APIRoute } from "astro";
import { badRequest, getDashboardAuthInfo, json, serverError, unauthorized } from "backend/http";
import { buildAuthorizeUrl, createOAuthState } from "backend/pinterest/tokens";
import { requiredText } from "backend/validation";

function validateRedirectUri(value: unknown, requestUrl: string): string {
  const redirectUri = requiredText(value, "redirectUri", 2048);
  const url = new URL(redirectUri);
  const expected = new URL("/api/pinterest/oauth/callback", requestUrl);
  if (url.toString() !== expected.toString()) {
    throw new Error("redirectUri must be the PinFlow OAuth callback URL");
  }
  return url.toString();
}

/**
 * Begin the Pinterest OAuth flow. Called from the dashboard via fetchWithAuth.
 * Returns the authorize URL (built with the client id from Secrets Manager)
 * which the dashboard opens in a popup. `redirectUri` must equal the callback
 * route URL and be whitelisted in the Pinterest app settings.
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const tokenInfo = await getDashboardAuthInfo();
    if (!tokenInfo) return unauthorized("Invalid or missing Wix authorization");

    const url = new URL(request.url);
    let redirectUri: string;
    let state: string;
    try {
      redirectUri = validateRedirectUri(url.searchParams.get("redirectUri"), request.url);
      const nonce = requiredText(url.searchParams.get("state") || crypto.randomUUID(), "state", 128);
      state = await createOAuthState({
        nonce,
        redirectUri,
        siteId: tokenInfo.siteId,
        instanceId: tokenInfo.instanceId,
      });
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "Invalid OAuth request");
    }
    const authorizeUrl = await buildAuthorizeUrl(state, redirectUri);
    return json({ url: authorizeUrl, state });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to start OAuth");
  }
};
