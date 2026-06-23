import React, { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import reactToWebComponent from 'react-to-webcomponent';
import { defaultSettings } from '../../../../data/seed.js';
import { getPublicLocations, getPublicLocatorSettings, submitLeadRequest, trackLocatorEvent } from '../../../../backend/store-locator.web';
import type { AnalyticsEventType, Coordinates, DistanceUnit, LeadRequest, LocatorSettings, SearchResult, StoreLocation } from '../../../../types.js';
import {
  buildLocalBusinessSchema,
  createAnalyticsEvent,
  fallbackOrigin,
  getDirectionsLinks,
  getFilterOptions,
  searchLocations as filterLocations,
} from '../../../../utils/locator.js';
import './styles.css';

type Props = {
  heading?: string;
  defaultRadius?: number;
  distanceUnit?: DistanceUnit;
};

type LeadMode = 'appointment' | 'callback' | 'contact';

type LeadDraft = {
  name: string;
  email: string;
  phone: string;
  preferredTime: string;
  message: string;
};

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function unique(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function MapMarker(props: { location: SearchResult; bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }; onSelect: () => void }) {
  const latRange = Math.max(props.bounds.maxLat - props.bounds.minLat, 1);
  const lngRange = Math.max(props.bounds.maxLng - props.bounds.minLng, 1);
  const top = 100 - ((props.location.address.lat - props.bounds.minLat) / latRange) * 100;
  const left = ((props.location.address.lng - props.bounds.minLng) / lngRange) * 100;

  return (
    <button
      className={`slp-marker slp-marker-${props.location.openingStatus.status}`}
      style={{ top: `${Math.min(Math.max(top, 7), 93)}%`, left: `${Math.min(Math.max(left, 7), 93)}%` }}
      onClick={props.onSelect}
      title={props.location.storeName}
      aria-label={`Select ${props.location.storeName}: ${props.location.openingStatus.label}`}
    >
      <span>{props.location.storeName.slice(0, 1)}</span>
    </button>
  );
}

function LocationCard(props: { location: SearchResult; selected: boolean; onSelect: () => void; onTrack: (type: 'direction_request' | 'call_click' | 'email_click' | 'appointment_click' | 'callback_request') => Promise<boolean> }) {
  const directions = getDirectionsLinks(props.location);
  return (
    <article className={`slp-card ${props.selected ? 'slp-card-selected' : ''}`}>
      <button className="slp-card-main" onClick={props.onSelect} aria-pressed={props.selected}>
        <span className="slp-status">{props.location.openingStatus.label}</span>
        <strong>{props.location.storeName}</strong>
        <span>{props.location.address.line1}, {props.location.address.city}, {props.location.address.state} {props.location.address.postalCode}</span>
        <small>{props.location.distanceLabel} · {props.location.categories.join(', ')} · {props.location.services.slice(0, 2).join(', ')}</small>
      </button>
      <div className="slp-actions">
        <a href={`tel:${props.location.phone}`} onClick={() => props.onTrack('call_click')}>Call</a>
        <a href={`mailto:${props.location.email}`} onClick={() => props.onTrack('email_click')}>Email</a>
        <a href={directions.google} target="_blank" rel="noreferrer" onClick={() => props.onTrack('direction_request')}>Google</a>
        <a href={directions.apple} target="_blank" rel="noreferrer" onClick={() => props.onTrack('direction_request')}>Apple</a>
        <a href={directions.waze} target="_blank" rel="noreferrer" onClick={() => props.onTrack('direction_request')}>Waze</a>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <>
      <div className="slp-map slp-skeleton-panel" aria-hidden="true">
        <div className="slp-skeleton-block slp-skeleton-map" />
      </div>
      <div className="slp-results" aria-hidden="true">
        <div className="slp-skeleton-block" />
        <div className="slp-skeleton-block" />
        <div className="slp-skeleton-block" />
      </div>
      <aside className="slp-detail slp-skeleton-panel" aria-hidden="true">
        <div className="slp-skeleton-block" />
        <div className="slp-skeleton-block" />
        <div className="slp-skeleton-block" />
      </aside>
    </>
  );
}

function LocationDetail(props: { location: SearchResult; onTrack: (type: 'appointment_click' | 'callback_request' | 'form_submission') => Promise<boolean> }) {
  const schema = buildLocalBusinessSchema(props.location);
  const [leadMode, setLeadMode] = useState<LeadMode>('appointment');
  const [leadDraft, setLeadDraft] = useState<LeadDraft>({
    name: '',
    email: '',
    phone: '',
    preferredTime: '',
    message: '',
  });
  const [leadStatus, setLeadStatus] = useState('');
  const [leadSubmitting, setLeadSubmitting] = useState(false);

  const leadCopy = {
    appointment: {
      title: 'Book appointment',
      submit: 'Request appointment',
      event: 'appointment_click' as const,
      success: `Appointment request sent to ${props.location.storeName}.`,
    },
    callback: {
      title: 'Request callback',
      submit: 'Request callback',
      event: 'callback_request' as const,
      success: `Callback request sent to ${props.location.storeName}.`,
    },
    contact: {
      title: 'Contact form',
      submit: 'Send message',
      event: 'form_submission' as const,
      success: `Message sent to ${props.location.storeName}.`,
    },
  };

  const updateLead = (field: keyof LeadDraft, value: string) => {
    setLeadDraft((current) => ({ ...current, [field]: value }));
  };

  const submitLead = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^[+()\-\s0-9]{7,20}$/;

    if (leadDraft.name.trim().length < 2) {
      setLeadStatus('Enter your name before submitting.');
      return;
    }

    if (!emailPattern.test(leadDraft.email.trim())) {
      setLeadStatus('Enter a valid email address.');
      return;
    }

    if (leadMode === 'callback' && !phonePattern.test(leadDraft.phone.trim())) {
      setLeadStatus('Enter a valid phone number for the callback request.');
      return;
    }

    if (leadMode === 'appointment' && !leadDraft.preferredTime) {
      setLeadStatus('Choose a preferred appointment time.');
      return;
    }

    setLeadSubmitting(true);
    const leadRequest: Partial<LeadRequest> = {
      locationId: props.location.id,
      type: leadMode,
      name: leadDraft.name.trim(),
      email: leadDraft.email.trim(),
      phone: leadDraft.phone.trim() || undefined,
      preferredTime: leadDraft.preferredTime || undefined,
      message: leadDraft.message.trim() || undefined,
    };

    const result = await submitLeadRequest(leadRequest).catch(() => ({
      ok: false as const,
      error: {
        code: 'INTERNAL_ERROR' as const,
        message: 'Lead request is temporarily unavailable. Try again shortly.',
      },
    }));

    if (!result.ok) {
      setLeadSubmitting(false);
      setLeadStatus(result.error.code === 'VALIDATION_ERROR' || result.error.code === 'NOT_FOUND'
        ? result.error.message
        : 'Lead request is temporarily unavailable. Try again shortly.');
      return;
    }

    const tracked = await props.onTrack(leadCopy[leadMode].event);
    setLeadSubmitting(false);
    if (!tracked) {
      setLeadStatus('Lead request saved, but analytics tracking is temporarily unavailable.');
      return;
    }

    setLeadStatus(leadCopy[leadMode].success);
    setLeadDraft({
      name: '',
      email: '',
      phone: '',
      preferredTime: '',
      message: '',
    });
  };

  return (
    <aside className="slp-detail">
      <span className="slp-eyebrow">/locations/{props.location.slug}</span>
      <h3>{props.location.storeName}</h3>
      <p>{props.location.description}</p>
      <dl>
        <dt>Hours</dt>
        <dd>{props.location.openingStatus.detail}</dd>
        <dt>Categories</dt>
        <dd>{props.location.categories.join(', ')}</dd>
        <dt>Services</dt>
        <dd>{props.location.services.join(', ')}</dd>
        {props.location.dealer && (
          <>
            <dt>Dealer certification</dt>
            <dd>{props.location.dealer.brand} · {props.location.dealer.region} · {props.location.dealer.certificationLevel}</dd>
            <dt>Languages</dt>
            <dd>{props.location.dealer.languages.join(', ')}</dd>
          </>
        )}
      </dl>
      <div className="slp-leads">
        <button className={leadMode === 'appointment' ? 'slp-lead-active' : ''} onClick={() => setLeadMode('appointment')}>Book appointment</button>
        <button className={leadMode === 'callback' ? 'slp-lead-active' : ''} onClick={() => setLeadMode('callback')}>Request callback</button>
        <button className={leadMode === 'contact' ? 'slp-lead-active' : ''} onClick={() => setLeadMode('contact')}>Contact form</button>
      </div>
      <form className="slp-lead-form" onSubmit={submitLead}>
        <h4>{leadCopy[leadMode].title}</h4>
        <label>
          Name
          <input value={leadDraft.name} onChange={(event) => updateLead('name', event.currentTarget.value)} placeholder="Jane Merchant" />
        </label>
        <label>
          Email
          <input value={leadDraft.email} onChange={(event) => updateLead('email', event.currentTarget.value)} placeholder="jane@example.com" />
        </label>
        {(leadMode === 'callback' || leadMode === 'appointment') && (
          <label>
            Phone
            <input value={leadDraft.phone} onChange={(event) => updateLead('phone', event.currentTarget.value)} placeholder="+1 555 0100" />
          </label>
        )}
        {leadMode === 'appointment' && (
          <label>
            Preferred time
            <input type="datetime-local" value={leadDraft.preferredTime} onChange={(event) => updateLead('preferredTime', event.currentTarget.value)} />
          </label>
        )}
        <label>
          Message
          <textarea value={leadDraft.message} onChange={(event) => updateLead('message', event.currentTarget.value)} placeholder="Tell the location team what you need." />
        </label>
        <button type="submit" disabled={leadSubmitting}>{leadSubmitting ? 'Submitting...' : leadCopy[leadMode].submit}</button>
        {leadStatus && <p className="slp-form-status" role="status">{leadStatus}</p>}
      </form>
      <details>
        <summary>LocalBusiness schema preview</summary>
        <pre>{JSON.stringify(schema, null, 2)}</pre>
      </details>
      <script type="application/ld+json">{safeJsonLd(schema)}</script>
    </aside>
  );
}

const StoreLocatorElement: FC<Props> = ({
  heading = 'Find a location near you',
  defaultRadius = defaultSettings.defaultRadius,
  distanceUnit = defaultSettings.defaultUnit,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [service, setService] = useState('');
  const [settings, setSettings] = useState<LocatorSettings>({
    ...defaultSettings,
    defaultRadius,
    defaultUnit: distanceUnit,
  });
  const [radius, setRadius] = useState(defaultRadius);
  const [unit, setUnit] = useState<DistanceUnit>(distanceUnit);
  const [openNow, setOpenNow] = useState(false);
  const [origin, setOrigin] = useState<Coordinates | undefined>(fallbackOrigin);
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [analyticsCount, setAnalyticsCount] = useState(0);
  const [geoMessage, setGeoMessage] = useState('Using a safe default origin. Visitors can opt into browser geolocation.');
  const hasSearchInteraction = useRef(false);
  const cursorFrame = useRef<number | null>(null);

  const filterOptions = useMemo(() => getFilterOptions(locations), [locations]);
  const categoryOptions = useMemo(() => unique(filterOptions.categories), [filterOptions.categories]);
  const serviceOptions = useMemo(() => unique(filterOptions.services), [filterOptions.services]);
  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    const [locationResult, settingsResult] = await Promise.all([
      getPublicLocations({}).catch(() => ({
        ok: false as const,
        error: {
          code: 'INTERNAL_ERROR' as const,
          message: 'Unable to load locations right now.',
        },
      })),
      getPublicLocatorSettings().catch(() => ({
        ok: false as const,
        error: {
          code: 'INTERNAL_ERROR' as const,
          message: 'Unable to load saved locator settings right now.',
        },
      })),
    ]);

    if (settingsResult.ok) {
      setSettings(settingsResult.data);
      if (!hasSearchInteraction.current) {
        setRadius(settingsResult.data.defaultRadius);
        setUnit(settingsResult.data.defaultUnit);
      }
    } else {
      setGeoMessage('Using widget defaults because saved locator settings could not be loaded.');
    }

    if (!locationResult.ok) {
      setLoadError(locationResult.error.message);
      setLocations([]);
      setSelectedId('');
      setIsLoading(false);
      return;
    }

    setLocations(locationResult.data);
    setSelectedId((current) => locationResult.data.some((location) => location.id === current) ? current : locationResult.data[0]?.id ?? '');
    setLoadError('');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    setSettings((current) => ({
      ...current,
      defaultRadius,
      defaultUnit: distanceUnit,
    }));
    if (!hasSearchInteraction.current) {
      setRadius(defaultRadius);
      setUnit(distanceUnit);
    }
  }, [defaultRadius, distanceUnit]);

  const results = useMemo(() => filterLocations(locations, {
    query,
    categories: category ? [category] : undefined,
    services: service ? [service] : undefined,
    radius,
    unit,
    origin,
    openNow,
  }), [category, locations, openNow, origin, query, radius, service, unit]);

  const selected = results.find((location) => location.id === selectedId) ?? results[0];
  const bounds = useMemo(() => {
    const points = results.length ? results : filterLocations(locations);
    if (!points.length) {
      return {
        minLat: fallbackOrigin.lat - 0.05,
        maxLat: fallbackOrigin.lat + 0.05,
        minLng: fallbackOrigin.lng - 0.05,
        maxLng: fallbackOrigin.lng + 0.05,
      };
    }

    return {
      minLat: Math.min(...points.map((location) => location.address.lat)),
      maxLat: Math.max(...points.map((location) => location.address.lat)),
      minLng: Math.min(...points.map((location) => location.address.lng)),
      maxLng: Math.max(...points.map((location) => location.address.lng)),
    };
  }, [locations, results]);

  const track = useCallback(async (type: AnalyticsEventType, location = selected) => {
    const event = createAnalyticsEvent(type, {
      locationId: location?.id,
      city: location?.address.city,
      searchTerm: query,
      metadata: { surface: 'site_widget', resultCount: results.length },
    });
    const result = await trackLocatorEvent(event).catch(() => ({
      ok: false as const,
      error: { code: 'INTERNAL_ERROR' as const, message: 'Analytics tracking failed.' },
    }));

    if (!result.ok) {
      return false;
    }

    setAnalyticsCount((count) => count + 1);
    return true;
  }, [query, results.length, selected]);

  useEffect(() => {
    if (!hasSearchInteraction.current) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      void track('location_search');
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [category, openNow, query, radius, service, track, unit]);

  const resetFilters = () => {
    hasSearchInteraction.current = true;
    setQuery('');
    setCategory('');
    setService('');
    setRadius(settings.defaultRadius);
    setUnit(settings.defaultUnit);
    setOpenNow(false);
    setSelectedId(locations[0]?.id ?? '');
  };

  const useMyLocation = () => {
    hasSearchInteraction.current = true;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setOrigin(fallbackOrigin);
      setGeoMessage('Browser geolocation is unavailable, so the locator kept the default origin.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({ lat: position.coords.latitude, lng: position.coords.longitude });
        setGeoMessage('Using your browser location for radius sorting.');
        void track('location_search');
      },
      () => {
        setOrigin(fallbackOrigin);
        setGeoMessage('Location permission was not granted, so the locator kept the default origin.');
      },
      { timeout: 5000 }
    );
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

  const hasFilters = Boolean(query || category || service || openNow || radius !== settings.defaultRadius || unit !== settings.defaultUnit);
  const statusClass = loadError ? 'slp-helper-critical' : isLoading ? 'slp-helper-active' : 'slp-helper-ready';
  const statusText = isLoading
    ? 'Loading locations and saved locator settings.'
    : `${geoMessage} · ${results.length} matching locations · ${analyticsCount} local analytics events captured.`;

  return (
    <main className="slp-root" dir="auto" onMouseMove={updateSapphireCursor} aria-busy={isLoading}>
      <section className="slp-hero">
        <span className="slp-eyebrow">Sapphire Precision</span>
        <h2>{heading}</h2>
        <p>Search stores, dealers, distributors, franchises, offices, service centers, and pickup points with radius sorting, directions, opening-hours status, and lead actions.</p>
        <div className="slp-hero-strip" aria-label="Store Locator Pro capabilities">
          <span>Radius search</span>
          <span>Open-now engine</span>
          <span>Lead capture</span>
          <span>SEO-ready details</span>
        </div>
      </section>

      <section className="slp-controls" aria-label="Location search and filters">
        <label>
          Search
          <input
            value={query}
            disabled={isLoading}
            onChange={(event) => {
              hasSearchInteraction.current = true;
              setQuery(event.currentTarget.value);
            }}
            placeholder="Store, city, ZIP, dealer, service, category..."
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => {
            hasSearchInteraction.current = true;
            setCategory(event.currentTarget.value);
          }} disabled={isLoading}>
            <option value="">All categories</option>
            {categoryOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Service
          <select value={service} onChange={(event) => {
            hasSearchInteraction.current = true;
            setService(event.currentTarget.value);
          }} disabled={isLoading}>
            <option value="">All services</option>
            {serviceOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Radius
          <select value={radius} onChange={(event) => {
            hasSearchInteraction.current = true;
            setRadius(Number(event.currentTarget.value));
          }} disabled={isLoading}>
            {[5, 10, 25, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          Units
          <select value={unit} onChange={(event) => {
            hasSearchInteraction.current = true;
            setUnit(event.currentTarget.value as DistanceUnit);
          }} disabled={isLoading}>
            <option value="miles">Miles</option>
            <option value="kilometers">Kilometers</option>
          </select>
        </label>
        <label className="slp-checkbox">
          <input type="checkbox" checked={openNow} onChange={(event) => {
            hasSearchInteraction.current = true;
            setOpenNow(event.currentTarget.checked);
          }} disabled={isLoading} />
          Open now
        </label>
        <button className="slp-primary" onClick={useMyLocation} disabled={isLoading}>Use my location</button>
      </section>

      <p className={`slp-helper ${statusClass}`} role="status" aria-live="polite">
        {statusText}
        {loadError && (
          <>
            {' '}Location API issue: {loadError}. No locations are shown until the backend recovers. <button className="slp-inline-button" onClick={() => void loadLocations()}>Retry</button>
          </>
        )}
      </p>

      <section className="slp-layout">
        {isLoading ? (
          <LoadingState />
        ) : (
          <>
        <div className="slp-map" aria-label="Credential-free map with location markers">
          <div className="slp-map-grid" />
          {results.map((location) => (
            <MapMarker
              key={location.id}
              location={location}
              bounds={bounds}
              onSelect={() => {
                setSelectedId(location.id);
                void track('location_view', location);
              }}
            />
          ))}
          <div className="slp-map-caption">
            <strong>Credential-free coordinate canvas</strong>
            <span>Individual marker mode is active with keyboard-selectable location pins.</span>
          </div>
        </div>

        <div className="slp-results" aria-live="polite">
          <div className="slp-results-header">
            <strong>{results.length} matches</strong>
            <span>{category || service || openNow ? 'Filtered locator view' : 'All active locations'}</span>
          </div>
          {results.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              selected={selected?.id === location.id}
              onSelect={() => {
                setSelectedId(location.id);
                void track('location_view', location);
              }}
              onTrack={(type) => track(type, location)}
            />
          ))}
          {!results.length && (
            <div className="slp-empty">
              <strong>{locations.length ? 'No locations match these filters.' : 'No active locations are available.'}</strong>
              <span>{locations.length ? 'Reset filters to return to the full locator view.' : 'The merchant has not published active locations yet.'}</span>
              {hasFilters && <button className="slp-inline-button" onClick={resetFilters}>Reset filters</button>}
            </div>
          )}
        </div>

        {selected && <LocationDetail location={selected} onTrack={(type) => track(type, selected)} />}
          </>
        )}
      </section>
    </main>
  );
};

const WrappedCustomElement = (props: Props) => <StoreLocatorElement {...props} />;

const customElement = reactToWebComponent(
  WrappedCustomElement,
  React,
  ReactDOM as typeof ReactDOM,
  {
    props: {
      heading: 'string',
      defaultRadius: 'number',
      distanceUnit: 'string',
    },
  }
);

export default customElement;
