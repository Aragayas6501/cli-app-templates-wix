/**
 * Minimal typed client for the Pinterest API v5.
 *
 * Handles auth headers and retries with exponential backoff on rate-limit (429)
 * and transient 5xx responses — Pinterest allows ~1000 calls/hour, so automation
 * bursts must back off rather than hammer the API.
 */
import { PINTEREST } from "@/consts";
import type {
  CreatePinInput,
  PinterestBoard,
  PinterestPin,
  PinterestUserAccount,
} from "@/types";

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pinterestFetch<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${PINTEREST.apiBaseUrl}${path}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (res.status === 429 || res.status >= 500) {
      if (attempt === MAX_RETRIES) {
        const text = await res.text();
        throw new Error(`Pinterest API ${res.status} after ${attempt} retries: ${text}`);
      }
      const retryAfter = Number(res.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : BASE_DELAY_MS * 2 ** attempt;
      await sleep(delay);
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Pinterest API error ${res.status}: ${text}`);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  throw new Error("Pinterest API: exhausted retries");
}

export async function getUserAccount(accessToken: string): Promise<PinterestUserAccount> {
  return pinterestFetch<PinterestUserAccount>(accessToken, "/user_account");
}

export async function listBoards(accessToken: string): Promise<PinterestBoard[]> {
  const boards: PinterestBoard[] = [];
  let bookmark: string | undefined;
  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (bookmark) query.set("bookmark", bookmark);
    const page = await pinterestFetch<{ items: PinterestBoard[]; bookmark?: string }>(
      accessToken,
      `/boards?${query.toString()}`,
    );
    boards.push(...(page.items ?? []));
    bookmark = page.bookmark;
  } while (bookmark);
  return boards;
}

export async function createBoard(
  accessToken: string,
  input: { name: string; description?: string; privacy?: PinterestBoard["privacy"] },
): Promise<PinterestBoard> {
  return pinterestFetch<PinterestBoard>(accessToken, "/boards", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      privacy: input.privacy ?? "PUBLIC",
    }),
  });
}

export async function createPin(
  accessToken: string,
  input: CreatePinInput,
): Promise<PinterestPin> {
  return pinterestFetch<PinterestPin>(accessToken, "/pins", {
    method: "POST",
    body: JSON.stringify({
      board_id: input.boardId,
      title: input.title,
      description: input.description,
      link: input.link,
      alt_text: input.altText,
      media_source: {
        source_type: "image_url",
        url: input.imageUrl,
      },
    }),
  });
}

export interface PinMetric {
  date: string;
  metric: "impression" | "save" | "pin_click" | "outbound_click";
  value: number;
}

/**
 * Pull daily metrics for a single pin. The v5 analytics response is keyed by
 * metric name with a daily breakdown; we flatten it to a tidy list.
 */
export async function getPinAnalytics(
  accessToken: string,
  pinId: string,
  startDate: string,
  endDate: string,
): Promise<PinMetric[]> {
  const query = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    metric_types: "IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK",
  });
  const raw = await pinterestFetch<{
    all?: { daily_metrics?: Array<{ date: string; metrics: Record<string, number> }> };
  }>(accessToken, `/pins/${pinId}/analytics?${query.toString()}`);

  const map: Record<string, PinMetric["metric"]> = {
    IMPRESSION: "impression",
    SAVE: "save",
    PIN_CLICK: "pin_click",
    OUTBOUND_CLICK: "outbound_click",
  };
  const out: PinMetric[] = [];
  for (const day of raw.all?.daily_metrics ?? []) {
    for (const [key, value] of Object.entries(day.metrics ?? {})) {
      const metric = map[key];
      if (metric && typeof value === "number") {
        out.push({ date: day.date, metric, value });
      }
    }
  }
  return out;
}
