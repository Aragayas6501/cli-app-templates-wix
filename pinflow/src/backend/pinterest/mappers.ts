/**
 * Map Wix Stores products (V1 + V3) and Blog posts into normalized pin drafts.
 *
 * Event payload shapes differ between catalog versions, so every field is read
 * defensively. A draft with a missing image or link is considered unpublishable
 * and is skipped by the publish core rather than creating a broken pin.
 */
import { DEFAULT_UTM } from "@/consts";
import type { AutomationSource } from "@/types";

export interface PinDraft {
  wixEntityId: string;
  source: AutomationSource;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
}

/** Replace {{title}}, {{price}}, {{description}} tokens in a template string. */
export function renderTemplate(
  template: string,
  vars: { title?: string; price?: string; description?: string },
  maxLength = 500,
): string {
  const rendered = template
    .replace(/\{\{\s*title\s*\}\}/gi, vars.title ?? "")
    .replace(/\{\{\s*price\s*\}\}/gi, vars.price ?? "")
    .replace(/\{\{\s*description\s*\}\}/gi, vars.description ?? "")
    .trim();
  return rendered.length > maxLength ? rendered.slice(0, maxLength).trim() : rendered;
}

/** Append PinFlow UTM parameters to a destination link. */
export function applyUtm(link: string, campaign: string = DEFAULT_UTM.campaign): string {
  if (!link) return link;
  try {
    const url = new URL(link);
    url.searchParams.set("utm_source", DEFAULT_UTM.source);
    url.searchParams.set("utm_medium", DEFAULT_UTM.medium);
    url.searchParams.set("utm_campaign", campaign);
    return url.toString();
  } catch {
    return link;
  }
}

function firstString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function absolute(link: string, siteUrl?: string): string {
  if (!link) return "";
  if (/^https?:\/\//i.test(link)) return link;
  if (!siteUrl) return "";
  return `${siteUrl.replace(/\/$/, "")}/${link.replace(/^\//, "")}`;
}

/** Normalize a Wix Stores V3 product entity. */
export function normalizeProductV3(entity: any, siteUrl?: string): PinDraft {
  const image = firstString(
    entity?.media?.main?.image?.url,
    entity?.media?.main?.image,
    entity?.media?.itemsInfo?.items?.[0]?.image?.url,
    entity?.media?.items?.[0]?.image?.url,
  );
  const rawLink = firstString(
    entity?.url?.url,
    entity?.url,
    entity?.productPageUrl?.url,
    entity?.slug && `/product-page/${entity.slug}`,
  );
  return {
    wixEntityId: firstString(entity?._id, entity?.id),
    source: "product",
    title: firstString(entity?.name, entity?.title),
    description: firstString(entity?.plainDescription, entity?.description),
    imageUrl: image,
    link: absolute(rawLink, siteUrl),
  };
}

/** Normalize a Wix Stores V1 product entity. */
export function normalizeProductV1(entity: any, siteUrl?: string): PinDraft {
  const image = firstString(
    entity?.media?.mainMedia?.image?.url,
    entity?.media?.items?.[0]?.image?.url,
    entity?.mainMedia?.image?.url,
  );
  const pageUrl = entity?.productPageUrl;
  const combined =
    pageUrl && typeof pageUrl === "object" && pageUrl.base && pageUrl.path
      ? `${pageUrl.base}${pageUrl.path}`
      : undefined;
  const rawLink = firstString(
    typeof pageUrl === "string" ? pageUrl : undefined,
    pageUrl?.url,
    combined,
    pageUrl?.path,
    entity?.slug && `/product-page/${entity.slug}`,
  );
  return {
    wixEntityId: firstString(entity?._id, entity?.id, entity?.productId),
    source: "product",
    title: firstString(entity?.name),
    description: firstString(entity?.description),
    imageUrl: image,
    link: absolute(rawLink, siteUrl),
  };
}

/** Normalize a Wix Blog post entity. */
export function normalizePost(entity: any, siteUrl?: string): PinDraft {
  const image = firstString(
    entity?.media?.wixMedia?.image?.url,
    entity?.coverMedia?.image?.url,
    entity?.heroImage?.url,
    entity?.media?.image?.url,
  );
  const rawLink = firstString(
    entity?.url?.url,
    entity?.url,
    entity?.link,
    entity?.slug && `/post/${entity.slug}`,
  );
  return {
    wixEntityId: firstString(entity?._id, entity?.id),
    source: "blog",
    title: firstString(entity?.title),
    description: firstString(entity?.excerpt, entity?.previewText),
    imageUrl: image,
    link: absolute(rawLink, siteUrl),
  };
}

export function isPublishable(draft: PinDraft): boolean {
  return Boolean(draft.wixEntityId && draft.title && draft.imageUrl && draft.link);
}
