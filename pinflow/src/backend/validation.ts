const MAX_LIMIT = 100;

export function requiredText(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== "string") throw new Error(`${field} is required`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} is required`);
  if (trimmed.length > maxLength) throw new Error(`${field} is too long`);
  return trimmed;
}

export function optionalText(value: unknown, field: string, maxLength = 1000): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`${field} must be text`);
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > maxLength) throw new Error(`${field} is too long`);
  return trimmed;
}

export function optionalBoolean(value: unknown, fallback: boolean): boolean {
  if (value == null) return fallback;
  if (typeof value !== "boolean") throw new Error("Boolean value expected");
  return value;
}

export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  fallback?: T,
): T {
  if (value == null || value === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`${field} is required`);
  }
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new Error(`${field} is invalid`);
}

export function optionalOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T | undefined {
  if (value == null || value === "") return undefined;
  return oneOf(value, allowed, field);
}

export function httpUrl(value: unknown, field: string): string {
  const text = requiredText(value, field, 2048);
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error();
    }
    return url.toString();
  } catch {
    throw new Error(`${field} must be a valid HTTP(S) URL`);
  }
}

export function optionalHttpUrl(value: unknown, field: string): string | undefined {
  if (value == null || value === "") return undefined;
  return httpUrl(value, field);
}

export function futureEpochMillis(value: unknown, field: string): number {
  const num = Number(value);
  if (!Number.isFinite(num)) throw new Error(`${field} must be a timestamp`);
  if (num <= Date.now()) throw new Error(`${field} must be in the future`);
  return num;
}

export function boundedLimit(value: unknown, fallback: number, max = MAX_LIMIT): number {
  const raw = Number(value ?? fallback);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(Math.floor(raw), max);
}
