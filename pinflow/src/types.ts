import type { TierId } from "./consts";

/** Status of the connection to a Pinterest account. */
export type AccountStatus = "connected" | "disconnected" | "error";

/** A connected Pinterest account (collection: pinterest-accounts). */
export interface PinterestAccount {
  _id?: string;
  /** Pinterest user/account id. */
  pinterestUserId: string;
  username: string;
  status: AccountStatus;
  /** OAuth access token — stored encrypted at rest. */
  accessToken: string;
  /** OAuth refresh token — stored encrypted at rest. */
  refreshToken: string;
  /** Epoch millis when the access token expires. */
  tokenExpiresAt: number;
  /** Pinterest business account flag (catalogs require business). */
  isBusiness?: boolean;
  scopes?: string[];
  _createdDate?: Date;
  _updatedDate?: Date;
}

/** A Pinterest board mirrored locally (collection: boards). */
export interface Board {
  _id?: string;
  accountId: string;
  pinterestBoardId: string;
  name: string;
  description?: string;
  privacy?: "PUBLIC" | "PROTECTED" | "SECRET";
  /** Which content type auto-publishes here. */
  assignedContentType?: "product" | "blog" | "none";
  pinCount?: number;
  _createdDate?: Date;
  _updatedDate?: Date;
}

export type AutomationSource = "product" | "blog";

/** A rule that maps a Wix content source to a target board (collection: automation-rules). */
export interface AutomationRule {
  _id?: string;
  accountId: string;
  source: AutomationSource;
  /** Target Pinterest board id. */
  boardId: string;
  enabled: boolean;
  /** Publish on create. */
  onCreate: boolean;
  /** Publish on update. */
  onUpdate: boolean;
  /** Optional title template, supports {{title}}, {{price}}, {{description}}. */
  titleTemplate?: string;
  descriptionTemplate?: string;
  _createdDate?: Date;
  _updatedDate?: Date;
}

/** Tracks which Wix product/post has been pinned, to avoid duplicates (collection: product-mappings). */
export interface ProductMapping {
  _id?: string;
  accountId: string;
  source: AutomationSource;
  /** Wix product id or blog post id (stored as TEXT — never a REFERENCE). */
  wixEntityId: string;
  pinterestPinId?: string;
  lastPublishedAt?: number;
  _createdDate?: Date;
  _updatedDate?: Date;
}

export type PinStatus = "published" | "failed" | "deleted";

/** A pin that was published to Pinterest (collection: published-pins). */
export interface PublishedPin {
  _id?: string;
  accountId: string;
  pinterestPinId: string;
  boardId: string;
  source: AutomationSource | "manual" | "scheduled";
  wixEntityId?: string;
  title: string;
  link: string;
  imageUrl: string;
  status: PinStatus;
  errorMessage?: string;
  publishedAt: number;
  _createdDate?: Date;
  _updatedDate?: Date;
}

export type ScheduledPinStatus = "pending" | "publishing" | "published" | "failed" | "cancelled";

/** A pin queued for future publishing (collection: scheduled-pins). */
export interface ScheduledPin {
  _id?: string;
  accountId: string;
  boardId: string;
  title: string;
  description?: string;
  link: string;
  imageUrl: string;
  /** Epoch millis when the pin should publish. */
  scheduledFor: number;
  status: ScheduledPinStatus;
  attempts?: number;
  lastError?: string;
  publishedPinId?: string;
  _createdDate?: Date;
  _updatedDate?: Date;
}

/** A snapshot of Pinterest metrics for a pin/account (collection: analytics-events). */
export interface AnalyticsEvent {
  _id?: string;
  accountId: string;
  pinterestPinId?: string;
  metric: "impression" | "save" | "pin_click" | "outbound_click";
  value: number;
  /** Date the metric is attributed to (YYYY-MM-DD). */
  date: string;
  _createdDate?: Date;
  _updatedDate?: Date;
}

/** App-wide settings, single row per site (collection: settings). */
export interface AppSettings {
  _id?: string;
  /** Pinterest tag id used by the embedded script. */
  pinterestTagId?: string;
  tagEnabled?: boolean;
  /** Absolute site base URL, used to resolve relative product/post links. */
  siteUrl?: string;
  defaultUtmCampaign?: string;
  tier?: TierId;
  _createdDate?: Date;
  _updatedDate?: Date;
}

/* ----------------------------- Pinterest API ----------------------------- */

export interface PinterestTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_token_expires_in?: number;
  scope: string;
}

export interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  privacy?: "PUBLIC" | "PROTECTED" | "SECRET";
  pin_count?: number;
}

export interface PinterestUserAccount {
  username: string;
  account_type?: "BUSINESS" | "PINNER";
  id?: string;
}

export interface CreatePinInput {
  boardId: string;
  title: string;
  description?: string;
  link: string;
  imageUrl: string;
  altText?: string;
}

export interface PinterestPin {
  id: string;
  link?: string;
  title?: string;
  board_id?: string;
}
