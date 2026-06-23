import { collections, items } from '@wix/data';
import { defaultSettings } from '../data/seed.js';
import type { AnalyticsEvent, LeadRequest, LocatorSettings, SearchFilters, StoreLocation } from '../types.js';
import { searchLocations, validateSearchFilters } from '../utils/locator.js';

const locationCollectionId = 'StoreLocatorProLocations';
const analyticsCollectionId = 'StoreLocatorProAnalytics';
const leadCollectionId = 'StoreLocatorProLeads';
const settingsCollectionId = 'StoreLocatorProSettings';
const settingsItemId = 'global';

type StoredItem<T extends object> = {
  _id: string;
  payload: T;
  status?: string;
  storeName?: string;
  city?: string;
  type?: string;
  locationId?: string;
  createdAt?: string;
  updatedAt?: string;
  timestamp?: string;
};

type CollectionDefinition = {
  id: string;
  displayName: string;
  publicRead: boolean;
  fields: Array<{
    key: string;
    displayName: string;
    type: 'TEXT' | 'OBJECT' | 'DATETIME';
    encrypted?: boolean;
    objectOptions?: Record<string, never>;
  }>;
};

const collectionDefinitions: CollectionDefinition[] = [
  {
    id: locationCollectionId,
    displayName: 'Store Locator Pro Locations',
    publicRead: false,
    fields: [
      { key: 'payload', displayName: 'Location payload', type: 'OBJECT', objectOptions: {} },
      { key: 'status', displayName: 'Status', type: 'TEXT' },
      { key: 'storeName', displayName: 'Store name', type: 'TEXT' },
      { key: 'city', displayName: 'City', type: 'TEXT' },
      { key: 'updatedAt', displayName: 'Updated at', type: 'DATETIME' },
    ],
  },
  {
    id: analyticsCollectionId,
    displayName: 'Store Locator Pro Analytics',
    publicRead: false,
    fields: [
      { key: 'payload', displayName: 'Analytics payload', type: 'OBJECT', objectOptions: {} },
      { key: 'type', displayName: 'Event type', type: 'TEXT' },
      { key: 'locationId', displayName: 'Location ID', type: 'TEXT' },
      { key: 'timestamp', displayName: 'Timestamp', type: 'DATETIME' },
    ],
  },
  {
    id: leadCollectionId,
    displayName: 'Store Locator Pro Leads',
    publicRead: false,
    fields: [
      { key: 'payload', displayName: 'Lead payload', type: 'OBJECT', encrypted: true, objectOptions: {} },
      { key: 'type', displayName: 'Lead type', type: 'TEXT' },
      { key: 'locationId', displayName: 'Location ID', type: 'TEXT' },
      { key: 'createdAt', displayName: 'Created at', type: 'DATETIME' },
    ],
  },
  {
    id: settingsCollectionId,
    displayName: 'Store Locator Pro Settings',
    publicRead: false,
    fields: [
      { key: 'payload', displayName: 'Settings payload', type: 'OBJECT', objectOptions: {} },
      { key: 'updatedAt', displayName: 'Updated at', type: 'DATETIME' },
    ],
  },
];

let setupPromise: Promise<void> | undefined;

async function ensureCollection(definition: CollectionDefinition) {
  try {
    await collections.getDataCollection(definition.id, { consistentRead: true });
    return;
  } catch {
    try {
      await collections.createDataCollection({
        _id: definition.id,
        displayName: definition.displayName,
        fields: definition.fields,
        permissions: {
          insert: 'ADMIN',
          read: definition.publicRead ? 'ANYONE' : 'ADMIN',
          remove: 'ADMIN',
          update: 'ADMIN',
        },
      });
    } catch (error) {
      try {
        await collections.getDataCollection(definition.id, { consistentRead: true });
      } catch {
        throw error;
      }
    }
  }
}

async function countCollection(collectionId: string) {
  return items.count(collectionId, { consistentRead: true });
}

function locationItem(location: StoreLocation): StoredItem<StoreLocation> {
  return {
    _id: location.id,
    payload: location,
    status: location.status,
    storeName: location.storeName,
    city: location.address.city,
    updatedAt: location.updatedAt,
  };
}

function analyticsItem(event: AnalyticsEvent): StoredItem<AnalyticsEvent> {
  return {
    _id: event.id,
    payload: event,
    type: event.type,
    locationId: event.locationId,
    timestamp: event.timestamp,
  };
}

function leadItem(leadRequest: LeadRequest): StoredItem<LeadRequest> {
  return {
    _id: leadRequest.id,
    payload: leadRequest,
    type: leadRequest.type,
    locationId: leadRequest.locationId,
    createdAt: leadRequest.createdAt,
  };
}

function settingsItem(settings: LocatorSettings): StoredItem<LocatorSettings> {
  return {
    _id: settingsItemId,
    payload: settings,
    updatedAt: new Date().toISOString(),
  };
}

async function ensureDataLayer() {
  if (!setupPromise) {
    setupPromise = (async () => {
      await Promise.all(collectionDefinitions.map(ensureCollection));
      await Promise.all(collectionDefinitions.map((definition) => countCollection(definition.id)));
    })();
    setupPromise.catch(() => {
      setupPromise = undefined;
    });
  }

  return setupPromise;
}

async function listPayloads<T extends object>(
  collectionId: string,
  options: { status?: StoreLocation['status']; maxItems?: number } = {}
): Promise<T[]> {
  await ensureDataLayer();
  const pageSize = 1000;
  const maxItems = options.maxItems ?? 5000;
  const payloads: T[] = [];

  for (let offset = 0; offset < maxItems; offset += pageSize) {
    let query = items.query(collectionId);
    if (options.status) {
      query = query.eq('status', options.status);
    }

    const result = await query
      .limit(Math.min(pageSize, maxItems - offset))
      .skip(offset)
      .find({ consistentRead: true });
    const pagePayloads = ((result.items ?? []) as Array<Partial<StoredItem<T>>>)
      .map((item) => item.payload)
      .filter((payload): payload is T => Boolean(payload));

    payloads.push(...pagePayloads);

    if ((result.items ?? []).length < pageSize || payloads.length >= maxItems) {
      break;
    }
  }

  return payloads.slice(0, maxItems);
}

export async function listLocations(): Promise<StoreLocation[]> {
  return listPayloads<StoreLocation>(locationCollectionId, { maxItems: 10000 });
}

export async function listActiveLocations(): Promise<StoreLocation[]> {
  return listPayloads<StoreLocation>(locationCollectionId, { status: 'active', maxItems: 5000 });
}

export async function searchStoreLocations(filters: SearchFilters) {
  return searchLocations(await listActiveLocations(), validateSearchFilters(filters));
}

export async function saveLocation(location: StoreLocation): Promise<StoreLocation> {
  await ensureDataLayer();
  const updated = {
    ...location,
    updatedAt: new Date().toISOString(),
  };

  await items.save(locationCollectionId, locationItem(updated));
  return updated;
}

export async function archiveLocation(locationId: string): Promise<StoreLocation | undefined> {
  const location = (await listLocations()).find((item) => item.id === locationId);
  if (!location) {
    return undefined;
  }

  return saveLocation({ ...location, status: 'archived' });
}

export async function deleteLocation(locationId: string): Promise<string> {
  await ensureDataLayer();
  const existing = await items.get<StoredItem<StoreLocation>>(locationCollectionId, locationId, { consistentRead: true });
  if (!existing) {
    throw new Error(`Location ${locationId} was not found.`);
  }

  await items.remove(locationCollectionId, locationId);
  return locationId;
}

export async function recordAnalyticsEvent(event: AnalyticsEvent): Promise<AnalyticsEvent> {
  await ensureDataLayer();
  await items.save(analyticsCollectionId, analyticsItem(event));
  return event;
}

export async function listAnalyticsEvents(): Promise<AnalyticsEvent[]> {
  return (await listPayloads<AnalyticsEvent>(analyticsCollectionId))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 500);
}

export async function saveLeadRequest(leadRequest: LeadRequest): Promise<LeadRequest> {
  await ensureDataLayer();
  await items.save(leadCollectionId, leadItem(leadRequest));
  return leadRequest;
}

export async function listLeadRequests(): Promise<LeadRequest[]> {
  return (await listPayloads<LeadRequest>(leadCollectionId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 500);
}

export async function getStoredSettings(): Promise<LocatorSettings> {
  await ensureDataLayer();
  const result = await items.query(settingsCollectionId)
    .limit(1)
    .find({ consistentRead: true });
  const existing = (result.items?.[0] as Partial<StoredItem<LocatorSettings>> | undefined)?.payload;

  if (existing) {
    return { ...defaultSettings, ...existing };
  }

  await items.save(settingsCollectionId, settingsItem(defaultSettings));
  return defaultSettings;
}

export async function saveStoredSettings(settings: LocatorSettings): Promise<LocatorSettings> {
  await ensureDataLayer();
  const updated = { ...defaultSettings, ...settings };
  await items.save(settingsCollectionId, settingsItem(updated));
  return updated;
}
