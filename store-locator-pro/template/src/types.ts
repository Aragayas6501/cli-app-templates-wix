export type DistanceUnit = 'miles' | 'kilometers';

export type LocationStatus = 'active' | 'archived';

export type LocationKind =
  | 'store'
  | 'dealer'
  | 'distributor'
  | 'franchise'
  | 'partner'
  | 'reseller'
  | 'service-center'
  | 'pickup-point'
  | 'office';

export type CertificationLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'authorized';

export type Weekday =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export type OpeningStatus =
  | 'open'
  | 'closed'
  | 'opening-soon'
  | 'closing-soon'
  | 'closed-today'
  | 'holiday-closed'
  | 'holiday-hours'
  | 'open-24-hours';

export type AnalyticsEventType =
  | 'location_search'
  | 'map_view'
  | 'location_view'
  | 'direction_request'
  | 'call_click'
  | 'email_click'
  | 'appointment_click'
  | 'form_submission'
  | 'callback_request';

export type UserRoleName =
  | 'Super Admin'
  | 'Admin'
  | 'Regional Manager'
  | 'Location Manager'
  | 'Editor'
  | 'Viewer';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationAddress extends Coordinates {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  timezone: string;
}

export interface TimeRange {
  opens: string;
  closes: string;
  label?: string;
  closed?: boolean;
}

export type WeeklyHours = Record<Weekday, TimeRange[]>;

export interface HolidayHours {
  date: string;
  label: string;
  ranges: TimeRange[];
}

export interface DealerAttributes {
  brand: string;
  region: string;
  certificationLevel: CertificationLevel;
  productsOffered: string[];
  servicesOffered: string[];
  languages: string[];
}

export interface LocalizedLocationContent {
  storeName?: string;
  description?: string;
  addressLine?: string;
  services?: string[];
  businessHoursNote?: string;
}

export interface StoreLocation {
  id: string;
  slug: string;
  kind: LocationKind;
  status: LocationStatus;
  storeName: string;
  description: string;
  address: LocationAddress;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  imageUrls: string[];
  manager: string;
  categories: string[];
  services: string[];
  tags: string[];
  openingHours: WeeklyHours;
  holidayHours: HolidayHours[];
  customFields: Record<string, string>;
  dealer?: DealerAttributes;
  localizedContent: Record<string, LocalizedLocationContent>;
  createdAt: string;
  updatedAt: string;
}

export interface OpeningStatusResult {
  status: OpeningStatus;
  label: string;
  detail: string;
  nextChange?: string;
}

export interface SearchFilters {
  query?: string;
  categories?: string[];
  services?: string[];
  tags?: string[];
  brands?: string[];
  regions?: string[];
  country?: string;
  state?: string;
  city?: string;
  openNow?: boolean;
  radius?: number;
  unit?: DistanceUnit;
  origin?: Coordinates;
}

export interface SearchResult extends StoreLocation {
  distance?: number;
  distanceLabel?: string;
  openingStatus: OpeningStatusResult;
}

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: string;
  locationId?: string;
  searchTerm?: string;
  city?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface LeadRequest {
  id: string;
  locationId: string;
  type: 'appointment' | 'callback' | 'contact';
  name: string;
  email: string;
  phone?: string;
  preferredTime?: string;
  message?: string;
  createdAt: string;
}

export interface ApiError {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'RATE_LIMITED' | 'UNAUTHORIZED' | 'CONFIGURATION_REQUIRED' | 'INTERNAL_ERROR';
  message: string;
  fields?: Record<string, string>;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: ApiError;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
}

export interface UserRole {
  name: UserRoleName;
  permissions: string[];
}

export interface LocatorSettings {
  defaultRadius: number;
  defaultUnit: DistanceUnit;
}

export interface CsvImportResult {
  imported: StoreLocation[];
  errors: string[];
}
