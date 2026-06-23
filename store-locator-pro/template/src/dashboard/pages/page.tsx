import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { categories, defaultSettings, roles, services } from '../../data/seed.js';
import {
  archiveStoreLocation,
  getAnalyticsEvents,
  getLeadRequests,
  getLocatorSettings,
  getLocations,
  removeStoreLocation,
  trackLocatorEvent,
  updateLocatorSettings,
  upsertLocation,
} from '../../backend/store-locator.web';
import type { AnalyticsEvent, ApiResult, LeadRequest, LocatorSettings, StoreLocation, UserRoleName } from '../../types.js';
import {
  buildSeoBundle,
  createAnalyticsEvent,
  createEntityId,
  createLocationFromDraft,
  getDirectionsLinks,
  getFilterOptions,
  isValidTimezone,
  parseCsvLocations,
  searchLocations,
  slugify,
} from '../../utils/locator.js';
import { dashboardStyles as styles, dashboardVisualCss, mergeStyles } from '../../design-system.js';
import { withProviders } from '../withProviders';

const emptyDraft = {
  storeName: '',
  line1: '',
  city: '',
  state: '',
  country: 'United States',
  postalCode: '',
  timezone: 'America/New_York',
  phone: '',
  email: '',
  website: '',
  lat: '',
  lng: '',
  category: 'Retail Store',
  service: 'Sales Consultation',
};

type LocationDraft = typeof emptyDraft;
type DraftErrorKey = keyof LocationDraft | 'coordinates';
type DraftErrors = Partial<Record<DraftErrorKey, string>>;

function Section(props: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section style={styles.card}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>{props.title}</h2>
          <p style={styles.sectionSubtitle}>{props.subtitle}</p>
        </div>
        <span style={styles.pill}>Live surface</span>
      </div>
      {props.children}
    </section>
  );
}

function Field(props: { label: string; hint?: string; error?: string; children: React.ReactElement }) {
  const fieldId = `slp-field-${props.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const descriptionId = props.error ? `${fieldId}-error` : props.hint ? `${fieldId}-hint` : undefined;
  const control = React.cloneElement(
    props.children as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
    {
      'aria-describedby': descriptionId,
      'aria-invalid': props.error ? true : undefined,
    }
  );

  return (
    <label style={styles.label}>
      {props.label}
      {control}
      {props.hint && !props.error && <span id={`${fieldId}-hint`} style={styles.fieldHint}>{props.hint}</span>}
      {props.error && <span id={`${fieldId}-error`} role="alert" style={styles.fieldError}>{props.error}</span>}
    </label>
  );
}

function Metric(props: { label: string; value: string | number; detail: string }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricValue}>{props.value}</div>
      <strong>{props.label}</strong>
      <p style={styles.metricDetail}>{props.detail}</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div style={styles.grid} aria-hidden="true">
      <div className="slp-ds-skeleton" />
      <div className="slp-ds-skeleton" />
      <div className="slp-ds-skeleton" />
      <div className="slp-ds-skeleton" />
    </div>
  );
}

function resultMessage(result: ApiResult<unknown>) {
  if (result.ok) {
    return '';
  }

  const fields = result.error.fields ? ` ${Object.values(result.error.fields).join(' ')}` : '';
  return `${result.error.message}${fields}`;
}

function LocationRow(props: {
  location: StoreLocation;
  disabled: boolean;
  pendingDelete: boolean;
  onEdit: (location: StoreLocation) => void;
  onDuplicate: (location: StoreLocation) => void;
  onArchive: (location: StoreLocation) => void;
  onDelete: (location: StoreLocation) => void;
  onCancelDelete: () => void;
}) {
  const directions = getDirectionsLinks(props.location);
  return (
    <article style={mergeStyles(styles.rowCard, props.location.status === 'archived' && styles.rowCardArchived)}>
      <strong style={{ fontSize: 18 }}>{props.location.storeName}</strong>
      <p style={{ margin: '8px 0' }}>
        {props.location.address.line1}, {props.location.address.city}, {props.location.address.state} {props.location.address.postalCode}
      </p>
      <small style={styles.mutedText}>
        {props.location.kind} · {props.location.categories.join(', ')} · {props.location.services.join(', ')}
      </small>
      {props.location.dealer && (
        <p style={mergeStyles(styles.mutedText, { margin: '8px 0 0' })}>
          {props.location.dealer.brand} · {props.location.dealer.region} · {props.location.dealer.certificationLevel}
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        <button className="slp-ds-button" style={styles.secondaryButton} disabled={props.disabled} onClick={() => props.onEdit(props.location)}>Edit</button>
        <button className="slp-ds-button" style={styles.secondaryButton} disabled={props.disabled} onClick={() => props.onDuplicate(props.location)}>Duplicate</button>
        <button className="slp-ds-button" style={styles.secondaryButton} disabled={props.disabled} onClick={() => props.onArchive(props.location)}>Archive</button>
        <button className="slp-ds-button" style={styles.dangerButton} disabled={props.disabled} onClick={() => props.onDelete(props.location)}>
          {props.pendingDelete ? 'Confirm delete' : 'Delete'}
        </button>
        {props.pendingDelete && (
          <button className="slp-ds-button" style={styles.secondaryButton} disabled={props.disabled} onClick={props.onCancelDelete}>Cancel delete</button>
        )}
        <a style={mergeStyles(styles.secondaryButton, { textDecoration: 'none' })} href={directions.google} target="_blank" rel="noreferrer">Directions</a>
      </div>
      {props.pendingDelete && (
        <p role="status" style={mergeStyles(styles.mutedText, { margin: '8px 0 0' })}>
          Select Confirm delete to permanently remove this location from the backend data collection.
        </p>
      )}
    </article>
  );
}

function buildLocationFromDraft(draft: LocationDraft, existing?: StoreLocation): StoreLocation {
  const lat = Number(draft.lat);
  const lng = Number(draft.lng);

  if (!existing) {
    return createLocationFromDraft({
      storeName: draft.storeName,
      line1: draft.line1,
      city: draft.city,
      state: draft.state,
      country: draft.country,
      postalCode: draft.postalCode,
      timezone: draft.timezone,
      phone: draft.phone,
      email: draft.email,
      website: draft.website,
      category: draft.category,
      service: draft.service,
      lat,
      lng,
    });
  }

  return {
    ...existing,
    slug: slugify(`${draft.city}-${draft.storeName}`),
    storeName: draft.storeName.trim(),
    description: `${draft.storeName.trim()} supports ${draft.service} in ${draft.city.trim()}.`,
    address: {
      ...existing.address,
      line1: draft.line1.trim(),
      city: draft.city.trim(),
      state: draft.state.trim(),
      country: draft.country.trim(),
      postalCode: draft.postalCode.trim(),
      timezone: draft.timezone.trim(),
      lat,
      lng,
    },
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    website: draft.website.trim(),
    categories: [draft.category],
    services: [draft.service],
    updatedAt: new Date().toISOString(),
  };
}

function StoreLocatorProDashboard() {
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [leadRequests, setLeadRequests] = useState<LeadRequest[]>([]);
  const [locatorSettings, setLocatorSettings] = useState<LocatorSettings>(defaultSettings);
  const [settingsDraft, setSettingsDraft] = useState<LocatorSettings>(defaultSettings);
  const [draft, setDraft] = useState<LocationDraft>(emptyDraft);
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [csv, setCsv] = useState('name,line1,city,state,country,postalCode,timezone,phone,email,website,category,service,lat,lng');
  const [role, setRole] = useState<UserRoleName>('Super Admin');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState('Loading Store Locator Pro data.');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const cursorFrame = useRef<number | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    const [locationResult, analyticsResult, leadResult, settingsResult] = await Promise.all([
      getLocations(),
      getAnalyticsEvents(),
      getLeadRequests(),
      getLocatorSettings(),
    ]);

    if (locationResult.ok) {
      setLocations(locationResult.data);
    }

    if (analyticsResult.ok) {
      setAnalyticsEvents(analyticsResult.data);
    }

    if (leadResult.ok) {
      setLeadRequests(leadResult.data);
    }

    if (settingsResult.ok) {
      setLocatorSettings(settingsResult.data);
      setSettingsDraft(settingsResult.data);
    }

    const firstError = [locationResult, analyticsResult, leadResult, settingsResult]
      .find((result) => !result.ok);
    setLoading(false);
    if (firstError && !firstError.ok) {
      setMessage(resultMessage(firstError));
    } else {
      setMessage('Ready to manage locations.');
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const activeLocations = locations.filter((location) => location.status === 'active');
  const filters = useMemo(() => getFilterOptions(locations), [locations]);
  const searchResults = useMemo(() => searchLocations(locations, { query, unit: locatorSettings.defaultUnit }), [locations, locatorSettings.defaultUnit, query]);
  const selectedLocation = searchResults[0] ?? locations[0];
  const seoBundle = selectedLocation ? buildSeoBundle(selectedLocation, locations) : undefined;
  const selectedRole = useMemo(
    () => roles.find((item) => item.name === role) ?? roles[0] ?? { name: 'Viewer' as UserRoleName, permissions: ['locations:read'] },
    [role]
  );
  const roleAllows = useCallback((permission: string) => {
    const permissions = selectedRole?.permissions ?? [];
    return permissions.includes('all') || permissions.includes(permission);
  }, [selectedRole]);
  const canWriteLocations = roleAllows('locations:write');
  const canImportLocations = roleAllows('imports:write');
  const canWriteSettings = roleAllows('settings:write');
  const topCities = useMemo(() => {
    const counts = locations.reduce<Record<string, number>>((acc, location) => {
      acc[location.address.city] = (acc[location.address.city] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [locations]);

  const recordEvent = useCallback(async (event: AnalyticsEvent) => {
    const result = await trackLocatorEvent(event);
    if (result.ok) {
      setAnalyticsEvents((current) => [result.data, ...current].slice(0, 50));
      return true;
    }

    setMessage(resultMessage(result));
    return false;
  }, []);

  const validateDraft = (): DraftErrors => {
    const errors: DraftErrors = {};

    if (!draft.storeName.trim()) {
      errors.storeName = 'Store name is required.';
    } else if (!/^[A-Za-z0-9][A-Za-z0-9\s.'-]{1,80}$/.test(draft.storeName.trim())) {
      errors.storeName = 'Use 2-80 characters: letters, numbers, spaces, apostrophes, periods, or hyphens.';
    }

    if (!draft.line1.trim()) {
      errors.line1 = 'Street address is required.';
    }

    if (!draft.city.trim()) {
      errors.city = 'City is required.';
    }

    if (!draft.state.trim()) {
      errors.state = 'State or region is required.';
    }

    if (!/^[A-Za-z0-9\s-]{3,12}$/.test(draft.postalCode.trim())) {
      errors.postalCode = 'Use 3-12 letters, numbers, spaces, or hyphens.';
    }

    if (!isValidTimezone(draft.timezone.trim())) {
      errors.timezone = 'Use a valid IANA timezone, such as America/New_York.';
    }

    if (!/^[+()\-\s0-9]{7,20}$/.test(draft.phone.trim())) {
      errors.phone = 'Enter a valid phone number.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }

    try {
      const url = new URL(draft.website.trim());
      if (url.protocol !== 'https:') {
        errors.website = 'Use an HTTPS URL.';
      }
    } catch {
      errors.website = 'Enter a valid HTTPS URL.';
    }

    if (!Number.isFinite(Number(draft.lat)) || !Number.isFinite(Number(draft.lng))) {
      errors.coordinates = 'Latitude and longitude are required for radius search and map placement.';
    }

    return errors;
  };

  const updateDraftField = <Key extends keyof LocationDraft>(field: Key, value: LocationDraft[Key]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setDraftErrors((current) => {
      const next = { ...current };
      delete next[field];
      if (field === 'lat' || field === 'lng') {
        delete next.coordinates;
      }
      return next;
    });
  };

  const updateSettingsDraftField = <Key extends keyof LocatorSettings>(field: Key, value: LocatorSettings[Key]) => {
    setSettingsDraft((current) => ({ ...current, [field]: value }));
  };

  const saveLocation = async () => {
    if (!canWriteLocations) {
      setMessage(`${selectedRole.name} can preview data but cannot create or modify locations.`);
      return;
    }

    const validationErrors = validateDraft();
    setDraftErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      setMessage(Object.values(validationErrors)[0] ?? 'Resolve field errors before saving.');
      return;
    }

    const existing = editingId ? locations.find((location) => location.id === editingId) : undefined;
    const location = buildLocationFromDraft(draft, existing);
    setSaving(true);
    const result = await upsertLocation(location);
    setSaving(false);

    if (!result.ok) {
      setMessage(resultMessage(result));
      return;
    }

    setLocations((current) => {
      const exists = current.some((item) => item.id === result.data.id);
      return exists
        ? current.map((item) => item.id === result.data.id ? result.data : item)
        : [result.data, ...current];
    });
    await recordEvent(createAnalyticsEvent('location_view', {
      locationId: result.data.id,
      city: result.data.address.city,
      metadata: { source: editingId ? 'admin_edit' : 'admin_create' },
    }));
    setMessage(`${result.data.storeName} ${editingId ? 'updated' : 'created'}.`);
    setEditingId(null);
    setPendingDeleteId(null);
    setDraft(emptyDraft);
    setDraftErrors({});
  };

  const editLocation = (location: StoreLocation) => {
    if (!canWriteLocations) {
      setMessage(`${selectedRole.name} can view locations but cannot open edit mode.`);
      return;
    }

    setEditingId(location.id);
    setPendingDeleteId(null);
    setDraft({
      storeName: location.storeName,
      line1: location.address.line1,
      city: location.address.city,
      state: location.address.state,
      country: location.address.country,
      postalCode: location.address.postalCode,
      timezone: location.address.timezone,
      phone: location.phone,
      email: location.email,
      website: location.website,
      lat: String(location.address.lat),
      lng: String(location.address.lng),
      category: location.categories[0] ?? 'Retail Store',
      service: location.services[0] ?? 'Sales Consultation',
    });
    setMessage(`Editing ${location.storeName}. Save changes or cancel.`);
  };

  const duplicateLocation = async (location: StoreLocation) => {
    if (!canWriteLocations) {
      setMessage(`${selectedRole.name} can view locations but cannot duplicate records.`);
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const duplicated: StoreLocation = {
      ...location,
      id: createEntityId(`${location.id}-copy`),
      slug: `${location.slug}-copy`,
      storeName: `${location.storeName} Copy`,
      createdAt: now,
      updatedAt: now,
    };
    const result = await upsertLocation(duplicated);
    setSaving(false);

    if (!result.ok) {
      setMessage(resultMessage(result));
      return;
    }

    setLocations((current) => [result.data, ...current]);
    setPendingDeleteId(null);
    setMessage(`${location.storeName} duplicated.`);
  };

  const archiveLocationAction = async (location: StoreLocation) => {
    if (!canWriteLocations) {
      setMessage(`${selectedRole.name} can view locations but cannot archive records.`);
      return;
    }

    setSaving(true);
    const result = await archiveStoreLocation(location.id);
    setSaving(false);

    if (!result.ok) {
      setMessage(resultMessage(result));
      return;
    }

    setLocations((current) => current.map((item) => item.id === location.id ? result.data : item));
    setPendingDeleteId(null);
    setMessage(`${location.storeName} archived.`);
  };

  const deleteLocationAction = async (location: StoreLocation) => {
    if (!canWriteLocations) {
      setMessage(`${selectedRole.name} can view locations but cannot delete records.`);
      return;
    }

    if (pendingDeleteId !== location.id) {
      setPendingDeleteId(location.id);
      setMessage(`Confirm delete for ${location.storeName}. This permanently removes the backend data item.`);
      return;
    }

    setSaving(true);
    const result = await removeStoreLocation(location.id);
    setSaving(false);

    if (!result.ok) {
      setMessage(resultMessage(result));
      return;
    }

    setLocations((current) => current.filter((item) => item.id !== result.data));
    if (editingId === location.id) {
      setEditingId(null);
      setDraft(emptyDraft);
    }
    setPendingDeleteId(null);
    setMessage(`${location.storeName} deleted from the backend data collection.`);
  };

  const importLocations = async () => {
    if (!canImportLocations) {
      setMessage(`${selectedRole.name} does not have CSV import permission.`);
      return;
    }

    const result = parseCsvLocations(csv);
    if (result.errors.length) {
      setMessage(result.errors.join(' '));
      return;
    }

    setSaving(true);
    const saved: StoreLocation[] = [];
    for (const location of result.imported) {
      const saveResult = await upsertLocation(location);
      if (!saveResult.ok) {
        setSaving(false);
        setMessage(`${location.storeName}: ${resultMessage(saveResult)}`);
        return;
      }
      saved.push(saveResult.data);
    }
    setSaving(false);

    setLocations((current) => [...saved, ...current.filter((item) => !saved.some((location) => location.id === item.id))]);
    await recordEvent(createAnalyticsEvent('form_submission', { metadata: { source: 'csv_import', imported: saved.length } }));
    setMessage(`${saved.length} locations imported into the backend data collection.`);
  };

  const saveSettings = async () => {
    if (!canWriteSettings) {
      setMessage(`${selectedRole.name} can review settings but cannot save changes.`);
      return;
    }

    setSaving(true);
    const result = await updateLocatorSettings(settingsDraft);
    setSaving(false);

    if (!result.ok) {
      setMessage(resultMessage(result));
      return;
    }

    setLocatorSettings(result.data);
    setSettingsDraft(result.data);
    setMessage('Locator settings saved to Wix Data.');
  };

  const updateSapphireCursor = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const target = event.currentTarget;
    const x = `${event.clientX - rect.left}px`;
    const y = `${event.clientY - rect.top}px`;

    if (cursorFrame.current !== null) {
      window.cancelAnimationFrame(cursorFrame.current);
    }

    cursorFrame.current = window.requestAnimationFrame(() => {
      target.style.setProperty('--mouse-x', x);
      target.style.setProperty('--mouse-y', y);
      cursorFrame.current = null;
    });
  };

  useEffect(() => () => {
    if (cursorFrame.current !== null) {
      window.cancelAnimationFrame(cursorFrame.current);
    }
  }, []);

  const statusHasWarning = /not ready|unavailable|required|failed|invalid|cannot|permission/i.test(message);
  const statusCopy = loading ? 'Loading backend data collections and saved settings.' : message;

  return (
    <main className="slp-dashboard" style={styles.page} onMouseMove={updateSapphireCursor} aria-busy={loading || saving}>
      <style>{dashboardVisualCss}</style>
      <header style={styles.hero}>
        <span style={styles.heroBadge}>Store Locator Pro · Sapphire Precision</span>
        <h1 style={styles.heroTitle}>Enterprise store locator dashboard</h1>
        <p style={styles.heroText}>
          Manage locations, dealers, distributors, franchises, service centers, pickup points, SEO pages, analytics, imports, roles, and settings from one Wix dashboard surface backed by Wix Data collections.
        </p>
      </header>

      <Section title="Dashboard" subtitle="MVP acceptance criteria and operational health.">
        {loading ? (
          <SkeletonGrid />
        ) : (
          <div style={styles.grid}>
            <Metric label="Active locations" value={activeLocations.length} detail={`${locations.length - activeLocations.length} archived`} />
            <Metric label="Categories" value={filters.categories.length} detail="Category and service filters ready" />
            <Metric label="Analytics events" value={analyticsEvents.length} detail="Search, directions, calls, and forms tracked in Wix Data" />
            <Metric label="Lead requests" value={leadRequests.length} detail="Appointments, callbacks, and contact forms captured" />
          </div>
        )}
        <div role="status" aria-live="polite" style={styles.statusRail}>
          <span style={{ alignItems: 'center', display: 'inline-flex', gap: 8 }}>
            <span style={mergeStyles(styles.statusDot, statusHasWarning && styles.statusDotWarning)} />
            {statusCopy}
          </span>
          <button className="slp-ds-button" style={styles.secondaryButton} onClick={() => void loadDashboardData()} disabled={loading || saving}>Refresh backend data</button>
        </div>
      </Section>

      <Section title="Locations" subtitle="Create, edit by replacement, duplicate, archive, delete, import, and search merchant locations.">
        <div style={styles.grid}>
          <Field label="Store name" error={draftErrors.storeName}>
            <input style={styles.input} value={draft.storeName} onChange={(event) => updateDraftField('storeName', event.currentTarget.value)} placeholder="Downtown Showroom" />
          </Field>
          <Field label="Street address" error={draftErrors.line1}>
            <input style={styles.input} value={draft.line1} onChange={(event) => updateDraftField('line1', event.currentTarget.value)} placeholder="350 5th Avenue" />
          </Field>
          <Field label="City" error={draftErrors.city}>
            <input style={styles.input} value={draft.city} onChange={(event) => updateDraftField('city', event.currentTarget.value)} placeholder="New York" />
          </Field>
          <Field label="State / Region" error={draftErrors.state}>
            <input style={styles.input} value={draft.state} onChange={(event) => updateDraftField('state', event.currentTarget.value)} placeholder="NY" />
          </Field>
          <Field label="ZIP / Postal code" error={draftErrors.postalCode}>
            <input style={styles.input} value={draft.postalCode} onChange={(event) => updateDraftField('postalCode', event.currentTarget.value)} placeholder="10001" />
          </Field>
          <Field label="Timezone" hint="Use an IANA timezone." error={draftErrors.timezone}>
            <input style={styles.input} value={draft.timezone} onChange={(event) => updateDraftField('timezone', event.currentTarget.value)} placeholder="America/New_York" />
          </Field>
          <Field label="Latitude" error={draftErrors.coordinates}>
            <input style={styles.input} value={draft.lat} onChange={(event) => updateDraftField('lat', event.currentTarget.value)} inputMode="decimal" placeholder="40.7484" />
          </Field>
          <Field label="Longitude" error={draftErrors.coordinates}>
            <input style={styles.input} value={draft.lng} onChange={(event) => updateDraftField('lng', event.currentTarget.value)} inputMode="decimal" placeholder="-73.9857" />
          </Field>
          <Field label="Phone" error={draftErrors.phone}>
            <input style={styles.input} value={draft.phone} onChange={(event) => updateDraftField('phone', event.currentTarget.value)} placeholder="+1 (212) 555-0100" />
          </Field>
          <Field label="Email" error={draftErrors.email}>
            <input style={styles.input} value={draft.email} onChange={(event) => updateDraftField('email', event.currentTarget.value)} placeholder="location@example.com" />
          </Field>
          <Field label="Website" hint="HTTPS is required for Marketplace-safe links." error={draftErrors.website}>
            <input style={styles.input} value={draft.website} onChange={(event) => updateDraftField('website', event.currentTarget.value)} placeholder="https://example.com/location" />
          </Field>
          <Field label="Category">
            <select style={styles.input} value={draft.category} onChange={(event) => updateDraftField('category', event.currentTarget.value)}>
              {categories.map((category) => <option key={category.id}>{category.name}</option>)}
            </select>
          </Field>
          <Field label="Primary service">
            <select style={styles.input} value={draft.service} onChange={(event) => updateDraftField('service', event.currentTarget.value)}>
              {services.map((service) => <option key={service.id}>{service.name}</option>)}
            </select>
          </Field>
        </div>
        <div style={styles.toolbar}>
          <button className="slp-ds-button" style={styles.button} onClick={() => void saveLocation()} disabled={loading || saving || !canWriteLocations}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create location'}</button>
          {editingId && (
            <button
              className="slp-ds-button"
              style={styles.secondaryButton}
              disabled={saving}
              onClick={() => {
                setEditingId(null);
                setDraft(emptyDraft);
                setDraftErrors({});
                setMessage('Edit cancelled.');
              }}
            >
              Cancel edit
            </button>
          )}
          <span style={styles.mutedText}>{canWriteLocations ? message : `${selectedRole.name} preview is read-only for global location records.`}</span>
        </div>
        <div style={{ marginTop: 16 }}>
          <Field label="Search existing locations">
            <input
              style={styles.input}
              value={query}
              onChange={(event) => {
                const next = event.currentTarget.value;
                setQuery(next);
              }}
              placeholder="Search by store, city, dealer, service, category, tag, ZIP..."
            />
          </Field>
        </div>
        <div style={{ ...styles.grid, marginTop: 16 }}>
          {searchResults.slice(0, 8).map((location) => (
            <LocationRow
              key={location.id}
              disabled={saving || !canWriteLocations}
              pendingDelete={pendingDeleteId === location.id}
              location={location}
              onEdit={editLocation}
              onDuplicate={(item) => void duplicateLocation(item)}
              onArchive={(item) => void archiveLocationAction(item)}
              onDelete={(item) => void deleteLocationAction(item)}
              onCancelDelete={() => {
                setPendingDeleteId(null);
                setMessage(`${location.storeName} was not deleted.`);
              }}
            />
          ))}
          {!loading && !searchResults.length && (
            <div style={styles.emptyState}>
              <strong style={{ color: 'var(--slp-ds-neutral)' }}>{locations.length ? 'No locations match this search.' : 'No locations are loaded yet.'}</strong>
              <span>{locations.length ? 'Clear the search query to return to the full location list.' : 'Create a validated location or import CSV rows to initialize the locator.'}</span>
              {query && <button className="slp-ds-button" style={styles.secondaryButton} onClick={() => setQuery('')}>Clear search</button>}
            </div>
          )}
        </div>
      </Section>

      <Section title="Bulk imports" subtitle="CSV import path for large location networks with strict validation and no fake fallback fields.">
        <p>Required headers: name, line1, city, state, country, postalCode, timezone, phone, email, website, category, service, lat, lng.</p>
        <textarea style={mergeStyles(styles.input, { fontFamily: 'monospace', minHeight: 120 })} value={csv} onChange={(event) => setCsv(event.currentTarget.value)} disabled={!canImportLocations} />
        <button className="slp-ds-button" style={mergeStyles(styles.button, { marginTop: 16 })} disabled={saving || !canImportLocations} onClick={() => void importLocations()}>{saving ? 'Importing...' : 'Import CSV'}</button>
        {!canImportLocations && <p style={styles.fieldError}>{selectedRole.name} does not include imports:write permission.</p>}
      </Section>

      <Section title="Categories, services, dealers, and filters" subtitle="Advanced filters for dealer networks and service providers.">
        <div style={styles.grid}>
          <p><strong>Categories:</strong> {filters.categories.join(', ') || 'No categories yet'}</p>
          <p><strong>Services:</strong> {filters.services.join(', ') || 'No services yet'}</p>
          <p><strong>Brands:</strong> {filters.brands.join(', ') || 'No dealer brands yet'}</p>
          <p><strong>Regions:</strong> {filters.regions.join(', ') || 'No dealer regions yet'}</p>
        </div>
      </Section>

      <Section title="SEO and dynamic location pages" subtitle="Generated metadata/schema preview for local SEO pages.">
        {seoBundle ? (
          <div style={styles.grid}>
            <div>
              <p><strong>Location URL:</strong> {seoBundle.meta.canonical}</p>
              <p><strong>Meta title:</strong> {seoBundle.meta.title}</p>
              <p><strong>Meta description:</strong> {seoBundle.meta.description}</p>
              <p><strong>Organization schema:</strong> Configure merchant name and canonical site URL before publishing organization-level JSON-LD.</p>
            </div>
            <pre style={styles.codeBlock}>
              {JSON.stringify({
                localBusinessSchema: seoBundle.localBusinessSchema,
                organizationSchema: seoBundle.organizationSchema,
                faqSchema: seoBundle.faqSchema,
                breadcrumbSchema: seoBundle.breadcrumbSchema,
              }, null, 2)}
            </pre>
          </div>
        ) : (
          <p>Create or load a location before previewing SEO metadata.</p>
        )}
      </Section>

      <Section title="Analytics and leads" subtitle="Searches, map views, location views, directions, calls, emails, appointments, forms, top locations, cities, terms, and lead requests.">
        <div style={styles.grid}>
          <div>
            <h3>Top cities</h3>
            {topCities.map(([city, count]) => <p key={city}>{city}: {count}</p>)}
            {!topCities.length && <p>No cities available yet.</p>}
          </div>
          <div>
            <h3>Recent events</h3>
            {analyticsEvents.slice(0, 7).map((event) => (
              <p key={event.id}>{event.type} {event.city ? `· ${event.city}` : ''} {event.searchTerm ? `· "${event.searchTerm}"` : ''}</p>
            ))}
            {!analyticsEvents.length && <p>No analytics events captured yet.</p>}
          </div>
          <div>
            <h3>Recent leads</h3>
            {leadRequests.slice(0, 7).map((lead) => (
              <p key={lead.id}>{lead.type} · {lead.name} · {lead.email}</p>
            ))}
            {!leadRequests.length && <p>No lead requests captured yet.</p>}
          </div>
        </div>
      </Section>

      <Section title="Users, permissions, settings, and billing readiness" subtitle="Role-based access, saved locator settings, and Marketplace-safe billing status.">
        <div style={styles.grid}>
          <Field label="Preview role">
            <select style={styles.input} value={role} onChange={(event) => setRole(event.currentTarget.value as UserRoleName)}>
              {roles.map((item) => <option key={item.name}>{item.name}</option>)}
            </select>
          </Field>
          <p><strong>Permissions:</strong> {selectedRole.permissions.join(', ')}</p>
          <p><strong>Role effect:</strong> {canWriteLocations ? 'Location write actions enabled.' : 'Location write actions disabled in this dashboard preview.'}</p>
        </div>
        <div style={mergeStyles(styles.grid, { marginTop: 16 })}>
          <Field label="Default radius" hint="Saved to Wix Data and used by the site widget on load.">
            <select
              style={styles.input}
              value={settingsDraft.defaultRadius}
              onChange={(event) => updateSettingsDraftField('defaultRadius', Number(event.currentTarget.value))}
              disabled={!canWriteSettings}
            >
              {[5, 10, 25, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </Field>
          <Field label="Default unit">
            <select
              style={styles.input}
              value={settingsDraft.defaultUnit}
              onChange={(event) => updateSettingsDraftField('defaultUnit', event.currentTarget.value as LocatorSettings['defaultUnit'])}
              disabled={!canWriteSettings}
            >
              <option value="miles">Miles</option>
              <option value="kilometers">Kilometers</option>
            </select>
          </Field>
        </div>
        <div style={styles.toolbar}>
          <button className="slp-ds-button" style={styles.button} disabled={saving || !canWriteSettings} onClick={() => void saveSettings()}>
            {saving ? 'Saving...' : 'Save locator settings'}
          </button>
          <span style={styles.mutedText}>Saved widget defaults: {locatorSettings.defaultRadius} {locatorSettings.defaultUnit}</span>
        </div>
        <div style={mergeStyles(styles.emptyState, { marginTop: 16 })}>
          <strong style={{ color: 'var(--slp-ds-neutral)' }}>Billing is Marketplace-safe.</strong>
          <span>Template price cards were removed from the dashboard because billing enforcement must be configured through Wix Billing before public sale. The app code exposes no external checkout path or unsupported subscription action.</span>
        </div>
        <p style={styles.mutedText}>
          Wix Data permissions and Admin-only web methods enforce backend access for location, analytics, lead, and settings management.
        </p>
      </Section>
    </main>
  );
}

export default withProviders(StoreLocatorProDashboard);
