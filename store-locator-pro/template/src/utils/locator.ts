import { standardHours } from '../data/seed.js';
import type {
  AnalyticsEvent,
  AnalyticsEventType,
  Coordinates,
  CsvImportResult,
  DistanceUnit,
  HolidayHours,
  OpeningStatusResult,
  SearchFilters,
  SearchResult,
  StoreLocation,
  TimeRange,
  Weekday,
  WeeklyHours,
} from '../types.js';

const weekdays: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const earthRadius = {
  miles: 3958.8,
  kilometers: 6371,
};
let fallbackIdCounter = 0;

export const fallbackOrigin: Coordinates = {
  lat: 40.7484,
  lng: -73.9857,
};

export function normalize(value: unknown): string {
  return (typeof value === 'string' ? value : '').toLowerCase().trim();
}

export function sanitizePlainText(value: unknown, maxLength = 160): string {
  return (typeof value === 'string' ? value : '')
    .replace(/[<>`{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function createEntityId(prefix: string): string {
  const safePrefix = slugify(prefix) || 'item';
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${safePrefix}-${cryptoApi.randomUUID()}`;
  }

  fallbackIdCounter = (fallbackIdCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${safePrefix}-${Date.now().toString(36)}-${fallbackIdCounter.toString(36)}`;
}

export function isHttpsUrl(value: string): boolean {
  if (!value) {
    return false;
  }

  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateSearchFilters(filters: SearchFilters = {}): SearchFilters {
  const list = (value: unknown, maxLength = 80) => Array.isArray(value)
    ? value.map((item) => sanitizePlainText(item, maxLength)).filter(Boolean)
    : undefined;
  const requestedRadius = Number(filters.radius);
  const radius = filters.radius === undefined || !Number.isFinite(requestedRadius)
    ? undefined
    : Math.min(Math.max(requestedRadius, 1), 500);

  return {
    ...filters,
    query: filters.query ? sanitizePlainText(filters.query, 120) : undefined,
    categories: list(filters.categories),
    services: list(filters.services),
    tags: list(filters.tags),
    brands: list(filters.brands),
    regions: list(filters.regions),
    country: filters.country ? sanitizePlainText(filters.country, 80) : undefined,
    state: filters.state ? sanitizePlainText(filters.state, 80) : undefined,
    city: filters.city ? sanitizePlainText(filters.city, 80) : undefined,
    radius,
    unit: filters.unit === 'kilometers' ? 'kilometers' : 'miles',
    origin: filters.origin && Number.isFinite(filters.origin.lat) && Number.isFinite(filters.origin.lng)
      ? {
          lat: Math.min(Math.max(filters.origin.lat, -90), 90),
          lng: Math.min(Math.max(filters.origin.lng, -180), 180),
        }
      : undefined,
  };
}

export function slugify(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function calculateDistance(origin: Coordinates, destination: Coordinates, unit: DistanceUnit): number {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const latDelta = toRadians(destination.lat - origin.lat);
  const lngDelta = toRadians(destination.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const destinationLat = toRadians(destination.lat);

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(originLat) * Math.cos(destinationLat) *
    Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  return 2 * earthRadius[unit] * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function formatDistance(distance: number | undefined, unit: DistanceUnit): string {
  if (distance === undefined) {
    return 'Distance unavailable';
  }

  const suffix = unit === 'miles' ? 'mi' : 'km';
  return `${distance.toFixed(distance < 10 ? 1 : 0)} ${suffix}`;
}

function parseTime(value: string): number {
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }

  return Math.min(hours * 60 + minutes, 24 * 60);
}

function isAlwaysOpenRange(range: TimeRange): boolean {
  return !range.closed && range.opens === '00:00' && (range.closes === '24:00' || range.closes === '23:59');
}

export function isValidTimezone(timezone: string): boolean {
  if (!timezone) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getZonedNow(now: Date, timezone: string) {
  const safeTimezone = isValidTimezone(timezone) ? timezone : 'UTC';
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone: safeTimezone,
    weekday: 'long',
    year: 'numeric',
  }).formatToParts(now);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = normalize(byType.weekday) as Weekday;

  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    minute: Number(byType.hour) * 60 + Number(byType.minute),
    weekday: weekdays.includes(weekday) ? weekday : 'monday',
  };
}

function holidayForDate(holidayHours: HolidayHours[], date: string): HolidayHours | undefined {
  return holidayHours.find((holiday) => holiday.date === date);
}

export function getOpeningStatus(
  openingHours: WeeklyHours,
  holidayHours: HolidayHours[] = [],
  now: Date = new Date(),
  timezone = 'UTC'
): OpeningStatusResult {
  const zonedNow = getZonedNow(now, timezone);
  const holiday = holidayForDate(holidayHours, zonedNow.date);
  const ranges = holiday ? holiday.ranges : openingHours[zonedNow.weekday];

  if (!ranges.length || ranges.every((range) => range.closed)) {
    return {
      status: holiday ? 'holiday-closed' : 'closed-today',
      label: holiday ? `Closed for ${holiday.label}` : 'Closed today',
      detail: holiday ? 'Holiday closure' : 'No hours scheduled today',
    };
  }

  if (ranges.some(isAlwaysOpenRange)) {
    return {
      status: 'open-24-hours',
      label: 'Open 24/7',
      detail: holiday ? `${holiday.label}: open all day` : 'Open all day',
    };
  }

  const currentMinute = zonedNow.minute;
  const upcoming = [...ranges].sort((a, b) => parseTime(a.opens) - parseTime(b.opens));

  for (const range of upcoming) {
    const opens = parseTime(range.opens);
    const closes = parseTime(range.closes);

    if (currentMinute >= opens && currentMinute < closes) {
      const minutesUntilClose = closes - currentMinute;
      return {
        status: minutesUntilClose <= 60 ? 'closing-soon' : holiday ? 'holiday-hours' : 'open',
        label: minutesUntilClose <= 60 ? `Closing soon at ${range.closes}` : 'Open now',
        detail: holiday ? `${holiday.label}: ${range.opens}-${range.closes}` : `Open until ${range.closes}`,
        nextChange: range.closes,
      };
    }

    if (currentMinute < opens) {
      const minutesUntilOpen = opens - currentMinute;
      return {
        status: minutesUntilOpen <= 60 ? 'opening-soon' : 'closed',
        label: minutesUntilOpen <= 60 ? `Opening soon at ${range.opens}` : `Closed - opens at ${range.opens}`,
        detail: holiday ? `${holiday.label}: opens at ${range.opens}` : `Next opening at ${range.opens}`,
        nextChange: range.opens,
      };
    }
  }

  return {
    status: 'closed',
    label: 'Closed',
    detail: `Closed after ${upcoming[upcoming.length - 1].closes}`,
  };
}

function textMatches(location: StoreLocation, query: string): boolean {
  if (!query) {
    return true;
  }

  const searchable = [
    location.storeName,
    location.description,
    location.kind,
    location.address.line1,
    location.address.city,
    location.address.state,
    location.address.country,
    location.address.postalCode,
    location.manager,
    location.phone,
    location.email,
    location.website,
    ...(location.categories),
    ...(location.services),
    ...(location.tags),
    location.dealer?.brand ?? '',
    location.dealer?.region ?? '',
    ...(location.dealer?.productsOffered ?? []),
    ...(location.dealer?.servicesOffered ?? []),
    ...(location.dealer?.languages ?? []),
  ].map(normalize);

  return searchable.some((field) => field.includes(query));
}

function intersects(values: string[], filters: string[] | undefined): boolean {
  if (!filters || filters.length === 0) {
    return true;
  }

  const normalizedValues = values.map(normalize);
  return filters.map(normalize).some((filter) => normalizedValues.includes(filter));
}

export function searchLocations(
  locations: StoreLocation[],
  filters: SearchFilters = {},
  now: Date = new Date()
): SearchResult[] {
  const unit = filters.unit ?? 'miles';
  const query = normalize(filters.query);

  return locations
    .filter((location) => location.status === 'active')
    .map<SearchResult>((location) => {
      const distance = filters.origin
        ? calculateDistance(filters.origin, location.address, unit)
        : undefined;
      return {
        ...location,
        distance,
        distanceLabel: formatDistance(distance, unit),
        openingStatus: getOpeningStatus(location.openingHours, location.holidayHours, now, location.address.timezone),
      };
    })
    .filter((location) => textMatches(location, query))
    .filter((location) => intersects(location.categories, filters.categories))
    .filter((location) => intersects(location.services, filters.services))
    .filter((location) => intersects(location.tags, filters.tags))
    .filter((location) => intersects(location.dealer ? [location.dealer.brand] : [], filters.brands))
    .filter((location) => intersects(location.dealer ? [location.dealer.region] : [], filters.regions))
    .filter((location) => !filters.country || normalize(location.address.country) === normalize(filters.country))
    .filter((location) => !filters.state || normalize(location.address.state) === normalize(filters.state))
    .filter((location) => !filters.city || normalize(location.address.city) === normalize(filters.city))
    .filter((location) => !filters.openNow || ['open', 'closing-soon', 'holiday-hours', 'open-24-hours'].includes(location.openingStatus.status))
    .filter((location) => !filters.radius || location.distance === undefined || location.distance <= filters.radius)
    .sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return a.storeName.localeCompare(b.storeName);
    });
}

export function getFilterOptions(locations: StoreLocation[]) {
  const unique = (values: string[]) => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

  return {
    categories: unique(locations.flatMap((location) => location.categories)),
    services: unique(locations.flatMap((location) => location.services)),
    tags: unique(locations.flatMap((location) => location.tags)),
    brands: unique(locations.flatMap((location) => location.dealer ? [location.dealer.brand] : [])),
    regions: unique(locations.flatMap((location) => location.dealer ? [location.dealer.region] : [])),
    countries: unique(locations.map((location) => location.address.country)),
    states: unique(locations.map((location) => location.address.state)),
    cities: unique(locations.map((location) => location.address.city)),
  };
}

export function getDirectionsLinks(location: StoreLocation) {
  const destination = encodeURIComponent(`${location.address.line1}, ${location.address.city}, ${location.address.state} ${location.address.postalCode}`);
  const coordinates = `${location.address.lat},${location.address.lng}`;

  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    apple: `https://maps.apple.com/?daddr=${coordinates}`,
    waze: `https://www.waze.com/ul?ll=${coordinates}&navigate=yes`,
  };
}

export function createAnalyticsEvent(
  type: AnalyticsEventType,
  details: Partial<Omit<AnalyticsEvent, 'id' | 'type' | 'timestamp'>> = {}
): AnalyticsEvent {
  return {
    id: createEntityId('evt'),
    type,
    timestamp: new Date().toISOString(),
    ...details,
  };
}

export function buildLocationMeta(location: StoreLocation) {
  const title = `${location.storeName} in ${location.address.city}, ${location.address.state} | Store Locator Pro`;
  const description = `${location.description} Visit ${location.storeName} at ${location.address.line1}, ${location.address.city}.`;
  const canonical = `/locations/${location.slug}`;

  return {
    title,
    description,
    canonical,
    openGraph: {
      title,
      description,
      url: canonical,
      image: location.imageUrls[0] ?? location.logoUrl,
    },
  };
}

export function buildLocalBusinessSchema(location: StoreLocation) {
  const directions = getDirectionsLinks(location);
  return {
    '@context': 'https://schema.org',
    '@type': location.kind === 'service-center' ? 'LocalBusiness' : 'Store',
    name: location.storeName,
    description: location.description,
    image: location.imageUrls,
    logo: location.logoUrl,
    telephone: location.phone,
    email: location.email,
    url: location.website,
    address: {
      '@type': 'PostalAddress',
      streetAddress: location.address.line1,
      addressLocality: location.address.city,
      addressRegion: location.address.state,
      postalCode: location.address.postalCode,
      addressCountry: location.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: location.address.lat,
      longitude: location.address.lng,
    },
    hasMap: directions.google,
    openingHoursSpecification: weekdays.flatMap((day) =>
      location.openingHours[day]
        .filter((range) => !range.closed)
        .map((range) => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: day,
          opens: range.opens,
          closes: range.closes === '24:00' ? '23:59' : range.closes,
        }))
    ),
  };
}

export function buildSeoBundle(
  location: StoreLocation,
  locations: StoreLocation[] = [],
  merchant?: { name: string; url: string }
) {
  return {
    meta: buildLocationMeta(location),
    localBusinessSchema: buildLocalBusinessSchema(location),
    organizationSchema: merchant ? {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: merchant.name,
      url: merchant.url,
      department: locations.slice(0, 20).map((item) => ({
        '@type': 'LocalBusiness',
        name: item.storeName,
        url: `/locations/${item.slug}`,
      })),
    } : undefined,
    faqSchema: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `What services does ${location.storeName} offer?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: location.services.join(', '),
          },
        },
        {
          '@type': 'Question',
          name: `How do I get directions to ${location.storeName}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Use the directions links for Google Maps, Apple Maps, or Waze on this location page.`,
          },
        },
      ],
    },
    breadcrumbSchema: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Locations', item: '/locations' },
        { '@type': 'ListItem', position: 2, name: location.address.city, item: `/locations/${slugify(location.address.city)}` },
        { '@type': 'ListItem', position: 3, name: location.storeName, item: `/locations/${location.slug}` },
      ],
    },
  };
}

export function createLocationFromDraft(draft: {
  storeName: string;
  line1: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  timezone: string;
  phone: string;
  email: string;
  website: string;
  category: string;
  service: string;
  lat: number;
  lng: number;
}): StoreLocation {
  const safeStoreName = sanitizePlainText(draft.storeName, 80);
  const safeLine1 = sanitizePlainText(draft.line1, 120);
  const safeCity = sanitizePlainText(draft.city, 80);
  const safeState = sanitizePlainText(draft.state, 80);
  const safeCountry = sanitizePlainText(draft.country, 80);
  const safePostalCode = sanitizePlainText(draft.postalCode, 20);
  const safeTimezone = sanitizePlainText(draft.timezone, 80);
  const safePhone = sanitizePlainText(draft.phone, 30);
  const safeEmail = sanitizePlainText(draft.email, 120);
  const safeWebsite = sanitizePlainText(draft.website, 500);
  const safeCategory = sanitizePlainText(draft.category, 80);
  const safeService = sanitizePlainText(draft.service, 80);
  const slug = slugify(`${safeCity}-${safeStoreName}`);
  return {
    id: createEntityId(`loc-${slug || 'location'}`),
    slug,
    kind: draft.category === 'Dealer' ? 'dealer' : draft.category === 'Service Center' ? 'service-center' : 'store',
    status: 'active',
    storeName: safeStoreName,
    description: `${safeStoreName} supports ${safeService} in ${safeCity}.`,
    address: {
      line1: safeLine1,
      city: safeCity,
      state: safeState,
      country: safeCountry,
      postalCode: safePostalCode,
      lat: draft.lat,
      lng: draft.lng,
      timezone: safeTimezone,
    },
    phone: safePhone,
    email: safeEmail,
    website: safeWebsite,
    logoUrl: '',
    imageUrls: [],
    manager: 'Unassigned',
    categories: [safeCategory],
    services: [safeService],
    tags: ['imported'],
    openingHours: standardHours,
    holidayHours: [],
    customFields: { source: 'Manual entry' },
    localizedContent: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function parseCsvLine(line: string): string[] {
  const columns: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === ',' && !quoted) {
      columns.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  if (quoted) {
    throw new Error('Unclosed quoted field.');
  }

  columns.push(current.trim());
  return columns;
}

export function parseCsvLocations(csv: string): CsvImportResult {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const errors: string[] = [];

  if (lines.length <= 1) {
    return { imported: [], errors: ['CSV must include a header row and at least one location row.'] };
  }

  let headers: string[];
  try {
    headers = parseCsvLine(lines[0]).map((header) => normalize(header));
  } catch (error) {
    return { imported: [], errors: [`Header row is invalid: ${error instanceof Error ? error.message : 'Unable to parse CSV.'}`] };
  }

  const required = ['name', 'line1', 'city', 'state', 'country', 'postalcode', 'timezone', 'phone', 'email', 'website', 'category', 'service', 'lat', 'lng'];
  const missing = required.filter((header) => !headers.includes(header));

  if (missing.length) {
    return { imported: [], errors: [`Missing required headers: ${missing.join(', ')}`] };
  }

  const indexOf = (header: string) => headers.indexOf(header);
  const imported = lines.slice(1).flatMap((line, rowIndex) => {
    let columns: string[];
    try {
      columns = parseCsvLine(line);
    } catch (error) {
      errors.push(`Row ${rowIndex + 2}: ${error instanceof Error ? error.message : 'invalid CSV row.'}`);
      return [];
    }

    const storeName = columns[indexOf('name')];
    const line1 = columns[indexOf('line1')];
    const city = columns[indexOf('city')];
    const state = columns[indexOf('state')];
    const country = columns[indexOf('country')];
    const postalCode = columns[indexOf('postalcode')];
    const timezone = columns[indexOf('timezone')];
    const phone = columns[indexOf('phone')];
    const email = columns[indexOf('email')];
    const website = columns[indexOf('website')];
    const category = columns[indexOf('category')];
    const service = columns[indexOf('service')];
    const lat = Number(columns[indexOf('lat')]);
    const lng = Number(columns[indexOf('lng')]);

    if (!storeName || !line1 || !city || !state || !country || !postalCode || !timezone || !phone || !email || !website || !category || !service) {
      errors.push(`Row ${rowIndex + 2}: missing a required value.`);
      return [];
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      errors.push(`Row ${rowIndex + 2}: latitude and longitude are required numbers.`);
      return [];
    }

    if (!/^[+()\-\s0-9]{7,20}$/.test(phone)) {
      errors.push(`Row ${rowIndex + 2}: phone must be a valid phone number.`);
      return [];
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Row ${rowIndex + 2}: email must be a valid email address.`);
      return [];
    }

    if (!isHttpsUrl(website)) {
      errors.push(`Row ${rowIndex + 2}: website must be a valid HTTPS URL.`);
      return [];
    }

    if (!isValidTimezone(timezone)) {
      errors.push(`Row ${rowIndex + 2}: timezone must be a valid IANA timezone such as America/New_York.`);
      return [];
    }

    return createLocationFromDraft({
      storeName,
      line1,
      city,
      state,
      country,
      postalCode,
      timezone,
      phone,
      email,
      website,
      category,
      service,
      lat,
      lng,
    });
  });

  return { imported, errors };
}
