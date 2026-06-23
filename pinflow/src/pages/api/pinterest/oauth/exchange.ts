import type { APIRoute } from "astro";
import { badRequest, getDashboardAuthInfo, json, serverError, unauthorized } from "backend/http";
import { getUserAccount } from "backend/pinterest/client";
import { exchangeCodeForTokens, verifyOAuthState } from "backend/pinterest/tokens";
import { upsertConnectedAccount } from "backend/repositories/accounts";
import { assertCanConnectAccount, QuotaError } from "backend/tiers";
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
 * Complete the OAuth flow. Called from the dashboard via fetchWithAuth (so it
 * runs in the correct app-instance context), passing the `code` the popup
 * relayed back. Exchanges the code, reads the Pinterest account, enforces the
 * tier account limit, and persists the connection with encrypted tokens.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const tokenInfo = await getDashboardAuthInfo();
    if (!tokenInfo) return unauthorized("Invalid or missing Wix authorization");

    const body = await request.json().catch(() => null);
    let code: string;
    let redirectUri: string;
    let state: string;
    try {
      code = requiredText(body?.code, "code", 4096);
      redirectUri = validateRedirectUri(body?.redirectUri, request.url);
      state = requiredText(body?.state, "state", 4096);
      await verifyOAuthState(state, {
        redirectUri,
        siteId: tokenInfo.siteId,
        instanceId: tokenInfo.instanceId,
      });
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "Invalid OAuth exchange");
    }

    await assertCanConnectAccount();

    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const userAccount = await getUserAccount(tokens.access_token);

    const account = await upsertConnectedAccount({
      pinterestUserId: userAccount.id || userAccount.username,
      username: userAccount.username,
      status: "connected",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
      isBusiness: userAccount.account_type === "BUSINESS",
      scopes: tokens.scope ? tokens.scope.split(/[\s,]+/).filter(Boolean) : undefined,
    });

    return json({
      id: account._id,
      username: account.username,
      status: account.status,
      isBusiness: account.isBusiness ?? false,
    });
  } catch (err) {
    if (err instanceof QuotaError) return json({ error: err.message }, 402);
    return serverError(err instanceof Error ? err.message : "OAuth exchange failed");
  }
};
