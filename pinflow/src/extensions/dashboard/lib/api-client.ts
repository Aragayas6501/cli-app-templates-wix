/**
 * Typed client for the PinFlow Backend API (`src/pages/api/*`). Dashboard pages
 * call these helpers instead of using `fetch` directly. All requests go through
 * `httpClient.fetchWithAuth` so they carry the app-instance auth context.
 */
import type {
  AnalyticsEvent,
  AppSettings,
  AutomationRule,
  Board,
  PublishedPin,
  ScheduledPin,
} from "@/types";
import { httpClient } from "@wix/essentials";

const baseApiUrl = () => new URL(import.meta.url).origin;

export interface AccountSummary {
  id: string;
  pinterestUserId: string;
  username: string;
  status: "connected" | "disconnected" | "error";
  isBusiness: boolean;
  scopes: string[];
  tokenExpiresAt: number;
}

export type MetricTotals = Record<AnalyticsEvent["metric"], number>;

export interface ReadinessCheck {
  id: string;
  label: string;
  ready: boolean;
  detail: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await httpClient.fetchWithAuth(`${baseApiUrl()}/api${path}`, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

const post = (body?: unknown): RequestInit => ({
  method: "POST",
  body: body === undefined ? undefined : JSON.stringify(body),
});
const put = (body?: unknown): RequestInit => ({
  method: "PUT",
  body: body === undefined ? undefined : JSON.stringify(body),
});
const patch = (body?: unknown): RequestInit => ({
  method: "PATCH",
  body: body === undefined ? undefined : JSON.stringify(body),
});
const del = (): RequestInit => ({ method: "DELETE" });

/* -------------------------------- Accounts -------------------------------- */

export const accountsApi = {
  list: () => request<{ accounts: AccountSummary[] }>("/accounts").then((r) => r.accounts),
  disconnect: (id: string) => request<{ ok: true }>(`/accounts/${id}`, del()),
  /** Start OAuth: returns the Pinterest authorize URL to open in a popup. */
  oauthStart: (redirectUri: string, state: string) =>
    request<{ url: string; state: string }>(
      `/pinterest/oauth/start?redirectUri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`,
    ),
  /** Finish OAuth with the code relayed back from the popup. */
  oauthExchange: (code: string, redirectUri: string, state: string) =>
    request<{ id: string; username: string; status: string; isBusiness: boolean }>(
      "/pinterest/oauth/exchange",
      post({ code, redirectUri, state }),
    ),
};

/* --------------------------------- Boards --------------------------------- */

export const boardsApi = {
  list: (accountId?: string) =>
    request<{ boards: Board[] }>(`/boards${accountId ? `?accountId=${accountId}` : ""}`).then(
      (r) => r.boards,
    ),
  sync: (accountId?: string) =>
    request<{ boards: Board[] }>(
      `/boards?sync=true${accountId ? `&accountId=${accountId}` : ""}`,
    ).then((r) => r.boards),
  create: (input: {
    name: string;
    description?: string;
    privacy?: Board["privacy"];
    accountId?: string;
    assignedContentType?: Board["assignedContentType"];
  }) => request<{ board: Board }>("/boards", post(input)).then((r) => r.board),
  assign: (id: string, assignedContentType: Board["assignedContentType"]) =>
    request<{ board: Board }>(`/boards/${id}`, patch({ assignedContentType })).then(
      (r) => r.board,
    ),
  remove: (id: string) => request<{ ok: true }>(`/boards/${id}`, del()),
};

/* -------------------------------- Settings -------------------------------- */

export const settingsApi = {
  get: () => request<{ settings: AppSettings }>("/settings").then((r) => r.settings),
  save: (patchBody: Partial<AppSettings>) =>
    request<{ settings: AppSettings }>("/settings", put(patchBody)).then(
      (r) => r.settings,
    ),
};

/* ---------------------------------- Pins ---------------------------------- */

export const pinsApi = {
  listRecent: (limit = 25) =>
    request<{ pins: PublishedPin[] }>(`/pins?limit=${limit}`).then((r) => r.pins),
  publishNow: (input: {
    boardId: string;
    title: string;
    link: string;
    imageUrl: string;
    description?: string;
    accountId?: string;
  }) => request<{ pin: PublishedPin }>("/pins", post(input)).then((r) => r.pin),
};

/* ------------------------------- Scheduler -------------------------------- */

export const schedulerApi = {
  listUpcoming: (limit = 50) =>
    request<{ pins: ScheduledPin[] }>(`/scheduler/pins?limit=${limit}`).then((r) => r.pins),
  schedule: (input: {
    boardId: string;
    title: string;
    link: string;
    imageUrl: string;
    scheduledFor: number;
    description?: string;
    accountId?: string;
  }) =>
    request<{ pin: ScheduledPin }>("/scheduler/pins", post(input)).then(
      (r) => r.pin,
    ),
  cancel: (id: string) => request<{ ok: true }>(`/scheduler/pins/${id}`, del()),
};

/* ------------------------------- Analytics -------------------------------- */

export const analyticsApi = {
  summary: (sinceDays = 30) =>
    request<{ sinceDate: string; totals: MetricTotals; pinsThisMonth: number }>(
      `/analytics/summary?sinceDays=${sinceDays}`,
    ),
  pull: () => request<{ updated: number }>("/analytics/pull", post()),
};

/* ------------------------------- Readiness -------------------------------- */

export const readinessApi = {
  get: () => request<{ ready: boolean; checks: ReadinessCheck[] }>("/readiness"),
};

/* ---------------------------- Automation rules ---------------------------- */

export const rulesApi = {
  list: () => request<{ rules: AutomationRule[] }>("/automation-rules").then((r) => r.rules),
  save: (rule: Partial<AutomationRule>) =>
    request<{ rule: AutomationRule }>("/automation-rules", post(rule)).then(
      (r) => r.rule,
    ),
  remove: (id: string) => request<{ ok: true }>(`/automation-rules/${id}`, del()),
};

/** Build the OAuth callback redirect URI (must be whitelisted in Pinterest). */
export const oauthRedirectUri = () => `${baseApiUrl()}/api/pinterest/oauth/callback`;
