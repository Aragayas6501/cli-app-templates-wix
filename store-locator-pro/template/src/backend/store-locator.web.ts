import { webMethod, Permissions } from '@wix/web-methods';
import { defaultSettings, standardHours } from '../data/seed.js';
import type { AnalyticsEvent, AnalyticsEventType, ApiError, ApiResult, LeadRequest, LocatorSettings, SearchFilters, StoreLocation } from '../types.js';
import { createEntityId, isHttpsUrl, isValidTimezone, sanitizePlainText, searchLocations as filterStoreLocations, slugify, validateSearchFilters } from '../utils/locator.js';
import {
  archiveLocation,
  deleteLocation,
  getStoredSettings,
  listAnalyticsEvents,
  listActiveLocations,
  listLeadRequests,
  listLocations,
  recordAnalyticsEvent,
  saveLeadRequest,
  saveLocation,
  saveStoredSettings,
  searchStoreLocations,
} from './database.js';

const analyticsEventTypes: AnalyticsEventType[] = [
  'location_search',
  'map_view',
  'location_view',
  'direction_request',
  'call_click',
  'email_click',
  'appointment_click',
  'form_submission',
  'callback_request',
];

const locationKinds: StoreLocation['kind'][] = [
  'store',
  'dealer',
  'distributor',
  'franchise',
  'partner',
  'reseller',
  'service-center',
  'pickup-point',
  'office',
];

const locationStatuses: StoreLocation['status'][] = ['active', 'archived'];

function success<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

function failure<T>(code: ApiError['code'], message: string, fields?: Record<string, string>): ApiResult<T> {
  return { ok: false, error: { code, message, fields } };
}

async function guarded<T>(operation: () => Promise<T>): Promise<ApiResult<T>> {
  try {
    return success(await operation());
  } catch (error) {
    return failure<T>(
      'CONFIGURATION_REQUIRED',
      'Store Locator Pro data collections are not ready. Open the dashboard as an admin to initialize data permissions, then retry.'
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown, maxLength = 80, maxItems = 24): string[] {
  return Array.isArray(value)
    ? value.slice(0, maxItems).map((item) => sanitizePlainText(item, maxLength)).filter(Boolean)
    : [];
}

function stringRecord(value: unknown, maxEntries = 50): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, maxEntries)
      .map(([key, item]) => [sanitizePlainText(key, 80), sanitizePlainText(item, 240)])
      .filter(([key, item]) => key && item)
  );
}

function httpsUrl(value: unknown): string {
  const candidate = sanitizePlainText(value, 500);
  if (!candidate) {
    return '';
  }

  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.href : candidate;
  } catch {
    return candidate;
  }
}

function sanitizeLocalizedContent(value: unknown): StoreLocation['localizedContent'] {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 12)
      .filter(([, content]) => isRecord(content))
      .map(([locale, content]) => {
        const source = content as Record<string, unknown>;
        return [
          sanitizePlainText(locale, 12),
          {
            storeName: sanitizePlainText(source.storeName, 80) || undefined,
            description: sanitizePlainText(source.description, 300) || undefined,
            addressLine: sanitizePlainText(source.addressLine, 160) || undefined,
            services: stringList(source.services, 80, 12),
            businessHoursNote: sanitizePlainText(source.businessHoursNote, 160) || undefined,
          },
        ];
      })
      .filter(([locale]) => Boolean(locale))
  );
}

function sanitizeDealer(value: unknown): StoreLocation['dealer'] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    brand: sanitizePlainText(value.brand, 80),
    region: sanitizePlainText(value.region, 80),
    certificationLevel: 'authorized',
    productsOffered: stringList(value.productsOffered),
    servicesOffered: stringList(value.servicesOffered),
    languages: stringList(value.languages, 40),
  };
}

function validLocationKind(value: unknown): StoreLocation['kind'] {
  return locationKinds.includes(value as StoreLocation['kind']) ? value as StoreLocation['kind'] : 'store';
}

function validLocationStatus(value: unknown): StoreLocation['status'] {
  return locationStatuses.includes(value as StoreLocation['status']) ? value as StoreLocation['status'] : 'active';
}

function sanitizeLocation(location: unknown): StoreLocation {
  const source = isRecord(location) ? location : {};
  const address = isRecord(source.address) ? source.address : {};
  const storeName = sanitizePlainText(source.storeName, 80);
  const city = sanitizePlainText(address.city, 80);
  const slug = slugify(sanitizePlainText(source.slug, 120) || `${city}-${storeName}`);
  const timestamp = new Date().toISOString();

  return {
    id: sanitizePlainText(source.id, 120) || createEntityId(`loc-${slug}`),
    slug,
    kind: validLocationKind(source.kind),
    status: validLocationStatus(source.status),
    storeName,
    description: sanitizePlainText(source.description, 300),
    address: {
      line1: sanitizePlainText(address.line1, 120),
      line2: sanitizePlainText(address.line2, 120) || undefined,
      city,
      state: sanitizePlainText(address.state, 80),
      country: sanitizePlainText(address.country, 80),
      postalCode: sanitizePlainText(address.postalCode, 20),
      lat: Number(address.lat),
      lng: Number(address.lng),
      timezone: sanitizePlainText(address.timezone, 80),
    },
    phone: sanitizePlainText(source.phone, 30),
    email: sanitizePlainText(source.email, 120),
    website: httpsUrl(source.website),
    logoUrl: httpsUrl(source.logoUrl),
    imageUrls: stringList(source.imageUrls, 500, 12).map(httpsUrl).filter(Boolean),
    manager: sanitizePlainText(source.manager, 80) || 'Unassigned',
    categories: stringList(source.categories),
    services: stringList(source.services),
    tags: stringList(source.tags),
    openingHours: isRecord(source.openingHours) ? source.openingHours as StoreLocation['openingHours'] : standardHours,
    holidayHours: Array.isArray(source.holidayHours) ? source.holidayHours as StoreLocation['holidayHours'] : [],
    customFields: stringRecord(source.customFields),
    dealer: sanitizeDealer(source.dealer),
    localizedContent: sanitizeLocalizedContent(source.localizedContent),
    createdAt: sanitizePlainText(source.createdAt, 40) || timestamp,
    updatedAt: timestamp,
  };
}

function validateLocation(location: StoreLocation): Record<string, string> {
  const fields: Record<string, string> = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[+()\-\s0-9]{7,20}$/;

  if (!location.storeName) {
    fields.storeName = 'Store name is required.';
  }

  if (!location.address.line1) {
    fields.line1 = 'Street address is required.';
  }

  if (!location.address.city) {
    fields.city = 'City is required.';
  }

  if (!location.address.state) {
    fields.state = 'State or region is required.';
  }

  if (!location.address.postalCode) {
    fields.postalCode = 'ZIP or postal code is required.';
  }

  if (!Number.isFinite(location.address.lat) || !Number.isFinite(location.address.lng)) {
    fields.coordinates = 'Latitude and longitude must be valid numbers.';
  }

  if (!isValidTimezone(location.address.timezone)) {
    fields.timezone = 'Timezone must be a valid IANA timezone such as America/New_York.';
  }

  if (!phonePattern.test(location.phone)) {
    fields.phone = 'A valid phone number is required.';
  }

  if (!emailPattern.test(location.email)) {
    fields.email = 'A valid email address is required.';
  }

  if (!isHttpsUrl(location.website)) {
    fields.website = 'Website must be a valid HTTPS URL.';
  }

  if (location.logoUrl && !isHttpsUrl(location.logoUrl)) {
    fields.logoUrl = 'Logo URL must be a valid HTTPS URL.';
  }

  const invalidImage = location.imageUrls.find((url) => !isHttpsUrl(url));
  if (invalidImage) {
    fields.imageUrls = 'Image URLs must be valid HTTPS URLs.';
  }

  return fields;
}

function requiredId(value: unknown, fieldName: string) {
  const sanitized = sanitizePlainText(value, 120);
  if (!sanitized) {
    return { value: sanitized, error: `${fieldName} is required.` };
  }
  return { value: sanitized };
}

function validateLeadRequest(leadRequest: Partial<LeadRequest>): Record<string, string> {
  const fields: Record<string, string> = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[+()\-\s0-9]{7,20}$/;
  const type = sanitizePlainText(leadRequest.type, 30);

  if (!sanitizePlainText(leadRequest.locationId, 120)) {
    fields.locationId = 'Location is required.';
  }

  if (!['appointment', 'callback', 'contact'].includes(type)) {
    fields.type = 'Lead request type is invalid.';
  }

  if (sanitizePlainText(leadRequest.name, 100).length < 2) {
    fields.name = 'Name must be at least 2 characters.';
  }

  if (!emailPattern.test(sanitizePlainText(leadRequest.email, 120))) {
    fields.email = 'A valid email address is required.';
  }

  if (type === 'callback' && !phonePattern.test(sanitizePlainText(leadRequest.phone, 30))) {
    fields.phone = 'A valid phone number is required for callback requests.';
  }

  const preferredTime = sanitizePlainText(leadRequest.preferredTime, 80);
  if (type === 'appointment' && !preferredTime) {
    fields.preferredTime = 'Preferred appointment time is required.';
  }

  if (preferredTime && Number.isNaN(new Date(preferredTime).getTime())) {
    fields.preferredTime = 'Preferred appointment time must be a valid date and time.';
  }

  return fields;
}

function sanitizeMetadata(metadata: unknown): Record<string, string | number | boolean> {
  if (!isRecord(metadata)) {
    return {};
  }

  const entries: Array<[string, string | number | boolean]> = [];
  for (const [key, value] of Object.entries(metadata).slice(0, 20)) {
    const safeKey = sanitizePlainText(key, 60);
    if (!safeKey) {
      continue;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      entries.push([safeKey, value]);
      continue;
    }

    if (typeof value === 'boolean') {
      entries.push([safeKey, value]);
      continue;
    }

    const safeValue = sanitizePlainText(value, 120);
    if (safeValue) {
      entries.push([safeKey, safeValue]);
    }
  }

  return Object.fromEntries(entries);
}

function sanitizeSettings(settings: unknown): LocatorSettings {
  const source = isRecord(settings) ? settings : {};
  const radius = Number(source.defaultRadius);

  return {
    defaultRadius: Number.isFinite(radius) ? Math.min(Math.max(radius, 1), 500) : defaultSettings.defaultRadius,
    defaultUnit: source.defaultUnit === 'kilometers' ? 'kilometers' : 'miles',
  };
}

function toPublicLocation(location: StoreLocation): StoreLocation {
  return {
    ...location,
    customFields: {},
    localizedContent: sanitizeLocalizedContent(location.localizedContent),
    manager: '',
  };
}

export const getPublicLocations = webMethod(Permissions.Anyone, async (filters: SearchFilters = {}) => {
  return guarded(async () => filterStoreLocations(
    (await listActiveLocations()).map(toPublicLocation),
    validateSearchFilters(filters)
  ));
});

export const getPublicLocatorSettings = webMethod(Permissions.Anyone, async () => {
  return guarded(async () => sanitizeSettings(await getStoredSettings()));
});

export const getLocations = webMethod(Permissions.Admin, async () => {
  return guarded(() => listLocations());
});

export const getLocatorSettings = webMethod(Permissions.Admin, async () => {
  return guarded(async () => sanitizeSettings(await getStoredSettings()));
});

export const updateLocatorSettings = webMethod(Permissions.Admin, async (settings: LocatorSettings) => {
  return guarded(() => saveStoredSettings(sanitizeSettings(settings)));
});

export const searchLocations = webMethod(Permissions.Admin, async (filters: SearchFilters) => {
  return guarded(() => searchStoreLocations(validateSearchFilters(filters)));
});

export const upsertLocation = webMethod(Permissions.Admin, async (location: StoreLocation) => {
  const sanitized = sanitizeLocation(location);
  const fields = validateLocation(sanitized);
  if (Object.keys(fields).length) {
    return failure<StoreLocation>('VALIDATION_ERROR', 'Location validation failed.', fields);
  }

  return guarded(() => saveLocation(sanitized));
});

export const archiveStoreLocation = webMethod(Permissions.Admin, async (locationId: string) => {
  const id = requiredId(locationId, 'Location ID');
  if (id.error) {
    return failure<StoreLocation>('VALIDATION_ERROR', id.error, { locationId: id.error });
  }

  const result = await guarded(() => archiveLocation(id.value));
  if (!result.ok) {
    return result;
  }

  if (!result.data) {
    return failure<StoreLocation>('NOT_FOUND', 'Location was not found.');
  }

  return success(result.data);
});

export const removeStoreLocation = webMethod(Permissions.Admin, async (locationId: string) => {
  const id = requiredId(locationId, 'Location ID');
  if (id.error) {
    return failure<string>('VALIDATION_ERROR', id.error, { locationId: id.error });
  }

  const existing = await guarded(() => listLocations());
  if (!existing.ok) {
    return failure<string>(existing.error.code, existing.error.message, existing.error.fields);
  }

  if (!existing.data.some((location) => location.id === id.value)) {
    return failure<string>('NOT_FOUND', 'Location was not found.');
  }

  return guarded(() => deleteLocation(id.value));
});

export const trackLocatorEvent = webMethod(Permissions.Anyone, async (event: Partial<AnalyticsEvent>) => {
  const type = sanitizePlainText(event?.type, 40) as AnalyticsEventType;
  if (!analyticsEventTypes.includes(type)) {
    return failure<AnalyticsEvent>('VALIDATION_ERROR', 'Analytics event type is invalid.', { type: 'Invalid event type.' });
  }

  return guarded(() => recordAnalyticsEvent({
    id: createEntityId('evt'),
    type,
    timestamp: new Date().toISOString(),
    locationId: sanitizePlainText(event.locationId, 120) || undefined,
    searchTerm: sanitizePlainText(event.searchTerm, 120) || undefined,
    city: sanitizePlainText(event.city, 80) || undefined,
    metadata: sanitizeMetadata(event.metadata),
  }));
});

export const submitLeadRequest = webMethod(Permissions.Anyone, async (leadRequest: Partial<LeadRequest>) => {
  const fields = validateLeadRequest(leadRequest);
  if (Object.keys(fields).length) {
    return failure<LeadRequest>('VALIDATION_ERROR', 'Lead request validation failed.', fields);
  }

  const locationId = sanitizePlainText(leadRequest.locationId, 120);
  const locations = await guarded(() => listLocations());
  if (!locations.ok) {
    return failure<LeadRequest>(locations.error.code, locations.error.message, locations.error.fields);
  }

  const location = locations.data.find((item) => item.id === locationId && item.status === 'active');
  if (!location) {
    return failure<LeadRequest>('NOT_FOUND', 'Location was not found or is archived.');
  }

  return guarded(async () => {
    return saveLeadRequest({
      id: createEntityId('lead'),
      locationId,
      type: sanitizePlainText(leadRequest.type, 30) as LeadRequest['type'],
      name: sanitizePlainText(leadRequest.name, 100),
      email: sanitizePlainText(leadRequest.email, 120),
      phone: sanitizePlainText(leadRequest.phone, 30) || undefined,
      preferredTime: sanitizePlainText(leadRequest.preferredTime, 80) || undefined,
      message: sanitizePlainText(leadRequest.message, 500) || undefined,
      createdAt: new Date().toISOString(),
    });
  });
});

export const getAnalyticsEvents = webMethod(Permissions.Admin, async () => {
  return guarded(() => listAnalyticsEvents());
});

export const getLeadRequests = webMethod(Permissions.Admin, async () => {
  return guarded(() => listLeadRequests());
});
