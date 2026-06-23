import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { secrets } from "@wix/secrets";
import { APP_NAMESPACE, SECRET_NAMES } from "@/consts";
import { json, requireDashboardAuth, serverError } from "backend/http";
import { listConnectedAccounts } from "backend/repositories/accounts";
import { listBoards } from "backend/repositories/boards";
import { getSettings } from "backend/repositories/settings";

interface ReadinessCheck {
  id: string;
  label: string;
  ready: boolean;
  detail: string;
}

async function hasSecret(name: string): Promise<boolean> {
  try {
    const getSecret = auth.elevate(secrets.getSecretValue);
    const secret = await getSecret(name);
    return typeof secret?.value === "string" && secret.value.length > 0;
  } catch {
    return false;
  }
}

/** Report operational setup checks without exposing secret values. */
export const GET: APIRoute = async () => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const [settings, accounts, boards, hasClientId, hasClientSecret, hasSchedulerToken] =
      await Promise.all([
        getSettings(),
        listConnectedAccounts(),
        listBoards(),
        hasSecret(SECRET_NAMES.pinterestClientId),
        hasSecret(SECRET_NAMES.pinterestClientSecret),
        hasSecret(SECRET_NAMES.schedulerToken),
      ]);

    const connectedAccounts = accounts.filter((account) => account.status === "connected");
    const checks: ReadinessCheck[] = [
      {
        id: "app-namespace",
        label: "App namespace configured",
        ready: APP_NAMESPACE !== "@pinflow/pinflow",
        detail: APP_NAMESPACE !== "@pinflow/pinflow"
          ? "Scoped collection IDs use the configured Wix app namespace."
          : "Replace APP_NAMESPACE with the namespace from Wix Dev Center.",
      },
      {
        id: "pinterest-secrets",
        label: "Pinterest OAuth secrets",
        ready: hasClientId && hasClientSecret,
        detail: hasClientId && hasClientSecret
          ? "Pinterest client ID and secret are available."
          : "Add Pinterest client ID and client secret to Wix Secrets Manager.",
      },
      {
        id: "scheduler-secret",
        label: "Scheduler secret",
        ready: hasSchedulerToken,
        detail: hasSchedulerToken
          ? "External scheduler calls can be authenticated."
          : "Add the scheduler shared secret to Wix Secrets Manager.",
      },
      {
        id: "site-url",
        label: "Site URL",
        ready: Boolean(settings.siteUrl),
        detail: settings.siteUrl
          ? "Relative product and blog links can be resolved."
          : "Set the public site URL in Settings.",
      },
      {
        id: "pinterest-account",
        label: "Pinterest account connected",
        ready: connectedAccounts.length > 0,
        detail: connectedAccounts.length > 0
          ? `${connectedAccounts.length} Pinterest account(s) connected.`
          : "Connect at least one Pinterest account.",
      },
      {
        id: "boards",
        label: "Boards synced",
        ready: boards.length > 0,
        detail: boards.length > 0
          ? `${boards.length} board(s) available for publishing.`
          : "Sync or create at least one Pinterest board.",
      },
      {
        id: "pinterest-tag",
        label: "Pinterest tag state valid",
        ready: !settings.tagEnabled || Boolean(settings.pinterestTagId),
        detail: !settings.tagEnabled || settings.pinterestTagId
          ? "Pinterest tag settings are internally consistent."
          : "Enter a Pinterest tag ID or disable the tag.",
      },
    ];

    return json({
      ready: checks.every((check) => check.ready),
      checks,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to check readiness");
  }
};
