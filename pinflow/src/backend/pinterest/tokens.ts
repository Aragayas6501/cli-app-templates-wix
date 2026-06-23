/**
 * Pinterest OAuth 2.0 token lifecycle.
 *
 * - Client id/secret live in Wix Secrets Manager (never in source).
 * - Access tokens are short-lived; we lazily refresh on use when within the
 *   refresh window, because Wix CLI apps have no native scheduler.
 */
import { auth } from "@wix/essentials";
import { secrets } from "@wix/secrets";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PINTEREST, SECRET_NAMES } from "@/consts";
import type { PinterestAccount, PinterestTokenResponse } from "@/types";

/** Refresh the access token when it has less than this many ms of life left. */
const REFRESH_WINDOW_MS = 5 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export interface OAuthStateInput {
  nonce: string;
  redirectUri: string;
  siteId: string;
  instanceId?: string;
}

interface OAuthStatePayload extends OAuthStateInput {
  exp: number;
}

async function getSecret(name: string): Promise<string> {
  const getSecretValue = auth.elevate(secrets.getSecretValue);
  const res = await getSecretValue(name);
  if (!res?.value) {
    throw new Error(`Missing required secret "${name}". Add it in Settings → Secrets Manager.`);
  }
  return res.value;
}

async function getClientCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  const [clientId, clientSecret] = await Promise.all([
    getSecret(SECRET_NAMES.pinterestClientId),
    getSecret(SECRET_NAMES.pinterestClientSecret),
  ]);
  return { clientId, clientSecret };
}

function encode(data: string): string {
  return Buffer.from(data).toString("base64url");
}

function decode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function createOAuthState(input: OAuthStateInput): Promise<string> {
  const { clientSecret } = await getClientCredentials();
  const payload = encode(JSON.stringify({ ...input, exp: Date.now() + OAUTH_STATE_TTL_MS }));
  return `${payload}.${sign(payload, clientSecret)}`;
}

export async function verifyOAuthState(
  state: string,
  expected: Omit<OAuthStateInput, "nonce">,
): Promise<void> {
  const { clientSecret } = await getClientCredentials();
  const [payload, signature] = state.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload, clientSecret))) {
    throw new Error("Invalid OAuth state");
  }

  const parsed = JSON.parse(decode(payload)) as Partial<OAuthStatePayload>;
  if (
    typeof parsed.nonce !== "string" ||
    typeof parsed.redirectUri !== "string" ||
    typeof parsed.siteId !== "string" ||
    typeof parsed.exp !== "number" ||
    parsed.exp < Date.now() ||
    parsed.redirectUri !== expected.redirectUri ||
    parsed.siteId !== expected.siteId ||
    (expected.instanceId && parsed.instanceId !== expected.instanceId)
  ) {
    throw new Error("Invalid OAuth state");
  }
}

/** Build the Pinterest authorize URL the dashboard opens to start OAuth. */
export async function buildAuthorizeUrl(state: string, redirectUri: string): Promise<string> {
  const { clientId } = await getClientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: PINTEREST.scopes.join(","),
    state,
  });
  return `${PINTEREST.oauthAuthorizeUrl}?${params.toString()}`;
}

async function tokenRequest(body: URLSearchParams): Promise<PinterestTokenResponse> {
  const { clientId, clientSecret } = await getClientCredentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(PINTEREST.oauthTokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinterest token request failed (${res.status}): ${text}`);
  }
  return (await res.json()) as PinterestTokenResponse;
}

/** Exchange an authorization code for tokens (OAuth callback). */
export function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<PinterestTokenResponse> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  );
}

export function refreshAccessToken(refreshToken: string): Promise<PinterestTokenResponse> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

/**
 * Return a valid access token for an account, refreshing + persisting it first
 * if it is expired or close to expiring. The persistence callback is injected
 * to avoid a circular dependency with the accounts repository.
 */
export async function getValidAccessToken(
  account: PinterestAccount,
  persist: (patch: Partial<PinterestAccount>) => Promise<void>,
): Promise<string> {
  const expiresInMs = (account.tokenExpiresAt ?? 0) - Date.now();
  if (expiresInMs > REFRESH_WINDOW_MS) {
    return account.accessToken;
  }
  const refreshed = await refreshAccessToken(account.refreshToken);
  const patch: Partial<PinterestAccount> = {
    accessToken: refreshed.access_token,
    tokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
    // Pinterest may rotate the refresh token; keep the newest one.
    refreshToken: refreshed.refresh_token ?? account.refreshToken,
  };
  await persist(patch);
  return refreshed.access_token;
}
