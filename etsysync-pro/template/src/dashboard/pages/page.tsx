import React, { useEffect, useMemo, useRef, useState } from "react";
import { dashboard } from "@wix/dashboard";
import { withProviders } from "../withProviders";
import { useEtsySyncData } from "../hooks/use-etsysync-data";
import type {
  AnalyticsEvent,
  AnalyticsMetric,
  AppMarketReadinessItem,
  Conflict,
  EtsySyncDashboardData,
  ManualSyncScope,
  OrderMapping,
  ProductMapping,
  SyncProfile,
  SyncStatus,
} from "../../types";
import "../styles/sapphire.css";

type TabId =
  | "overview"
  | "products"
  | "orders"
  | "automation"
  | "analytics"
  | "settings";

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "products", label: "Products & inventory" },
  { id: "orders", label: "Orders & customers" },
  { id: "automation", label: "Automation & conflicts" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings & billing" },
];

function statusTone(status: SyncStatus | string): "primary" | "tertiary" | "neutral" {
  if (
    status === "healthy" ||
    status === "syncing" ||
    status === "Complete" ||
    status === "Current" ||
    status === "Confirmed" ||
    status === "Info"
  ) {
    return "primary";
  }

  if (status === "warning" || status === "failed" || status === "Failed" || status === "Action required") {
    return "tertiary";
  }

  return "neutral";
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function isProfileDirty(initialProfile: SyncProfile, currentProfile: SyncProfile) {
  return (
    initialProfile.mode !== currentProfile.mode ||
    initialProfile.inventoryBuffer !== currentProfile.inventoryBuffer ||
    initialProfile.pricingFormula !== currentProfile.pricingFormula
  );
}

function validateProfile(profile: SyncProfile): string | null {
  if (!Number.isInteger(profile.inventoryBuffer) || profile.inventoryBuffer < 0 || profile.inventoryBuffer > 9999) {
    return "Inventory buffer must be a whole number between 0 and 9,999.";
  }

  if (!profile.pricingFormula.trim()) {
    return "Pricing formula is required.";
  }

  if (profile.pricingFormula.length > 120) {
    return "Pricing formula must be 120 characters or less.";
  }

  return null;
}

function StatusBadge({ label }: { label: SyncStatus | string }) {
  return (
    <span className="sc-badge" data-tone={statusTone(label)}>
      <span className="sc-status-dot" data-tone={statusTone(label)} />
      {label}
    </span>
  );
}

function MetricCard({ metric }: { metric: AnalyticsMetric }) {
  return (
    <article className="sapphire-card sc-metric">
      <p className="sc-metric-label">{metric.label}</p>
      <p className="sc-metric-value">{metric.value}</p>
      <p className="sc-card-caption">{metric.caption}</p>
      <p className="sc-metric-trend">{metric.trend}</p>
    </article>
  );
}

function Card({
  title,
  caption,
  action,
  children,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="sapphire-card">
      <header className="sc-card-header">
        <div>
          <h2 className="sc-card-title">{title}</h2>
          {caption && <p className="sc-card-caption">{caption}</p>}
        </div>
        {action}
      </header>
      <div className="sc-card-content">{children}</div>
    </section>
  );
}

function OnboardingWizard({ data }: { data: EtsySyncDashboardData }) {
  return (
    <Card
      title="Store connection wizard"
      caption="Wix Store -> Etsy Shop -> Import Settings -> Sync Rules -> Launch"
    >
      <div className="sc-onboarding">
        {data.onboardingSteps.map((step) => (
          <div className="sc-step" key={step.id}>
            <span className="sc-status-dot" data-tone={statusTone(step.status)} />
            <div>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
              <StatusBadge label={step.status} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Overview({
  data,
  onRunSync,
  isSyncing,
  onViewLogs,
}: {
  data: EtsySyncDashboardData;
  onRunSync: () => void;
  isSyncing: boolean;
  onViewLogs: () => void;
}) {
  return (
    <div className="sc-grid">
      <div className="sc-grid sc-metrics">
        {data.analyticsMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="sc-grid sc-grid-two">
        <OnboardingWizard data={data} />
        <Card
          title="Connected shops"
          caption="Single-shop, multi-shop, agency, and team account readiness"
          action={<StatusBadge label={data.etsyAccounts[0]?.status ?? "stale"} />}
        >
          <ul className="sc-list">
            {data.etsyAccounts.map((account) => (
              <li className="sc-list-item" key={account.id}>
                <span className="sc-status-dot" data-tone={statusTone(account.status)} />
                <div>
                  <strong>{account.shopName}</strong>
                  <p>{account.shopUrl}</p>
                  <p>
                    Connected by {account.connectedBy} at {formatDate(account.lastConnectedAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="sc-grid sc-grid-two">
        <Card
          title="Active sync profiles"
          caption="Direction, pricing formulas, order import, customers, and image handling"
          action={
            <button className="sc-btn sc-btn-primary" disabled={isSyncing} onClick={onRunSync} type="button">
              {isSyncing ? "Queueing..." : "Run manual sync"}
            </button>
          }
        >
          <table className="sc-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Mode</th>
                <th>Scope</th>
                <th>Pricing</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.syncProfiles.map((profile) => (
                <tr key={profile.id}>
                  <td data-label="Profile">
                    <strong>{profile.name}</strong>
                    <p className="sc-card-caption">Buffer: {profile.inventoryBuffer} units</p>
                  </td>
                  <td data-label="Mode">{profile.mode}</td>
                  <td data-label="Scope">{profile.productScope}</td>
                  <td data-label="Pricing">{profile.pricingFormula}</td>
                  <td data-label="Status"><StatusBadge label={profile.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Inspector data={data} onViewLogs={onViewLogs} />
      </div>
    </div>
  );
}

function ProductWorkspace({
  data,
  onRunBulkSync,
  isSyncing,
}: {
  data: EtsySyncDashboardData;
  onRunBulkSync: () => void;
  isSyncing: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const products = useMemo(() => {
    return data.productMappings.filter((product) => {
      const matchesQuery = `${product.title} ${product.sku} ${product.category}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesStatus = status === "all" || product.status === status;

      return matchesQuery && matchesStatus;
    });
  }, [data.productMappings, query, status]);

  return (
    <div className="sc-grid sc-grid-two">
      <Card
        title="Product synchronization"
        caption="Titles, descriptions, prices, SKUs, inventory, categories, tags, images, videos, attributes, materials, variations, digital files, and shipping profiles"
      >
        <div className="sc-toolbar" role="search">
          <input
            aria-label="Search products"
            className="sc-input"
            placeholder="Search by title, SKU, or category"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            aria-label="Filter by sync status"
            className="sc-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All status</option>
            <option value="healthy">Healthy</option>
            <option value="warning">Warning</option>
            <option value="stale">Stale</option>
          </select>
          <button
            className="sc-btn sc-btn-secondary"
            disabled={isSyncing || products.length === 0}
            type="button"
            onClick={onRunBulkSync}
          >
            {isSyncing ? "Queueing..." : `Bulk sync ${products.length} item(s)`}
          </button>
        </div>

        {products.length === 0 ? (
          <div className="sc-empty">
            <h2 className="sc-card-title">No products match this filter</h2>
            <p>Reset filters or import Etsy listings by category, tag, collection, or selected listing.</p>
          </div>
        ) : (
          <table className="sc-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Channels</th>
                <th className="sc-number">Wix</th>
                <th className="sc-number">Etsy</th>
                <th className="sc-number">Inventory</th>
                <th>Media</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product: ProductMapping) => (
                <tr key={product.id}>
                  <td data-label="Product">
                    <strong>{product.title}</strong>
                    <p className="sc-card-caption">{product.sku} / {product.category}</p>
                  </td>
                  <td data-label="Channels">{product.channel}</td>
                  <td data-label="Wix" className="sc-number">{formatCurrency(product.price)}</td>
                  <td data-label="Etsy" className="sc-number">{formatCurrency(product.etsyPrice)}</td>
                  <td data-label="Inventory" className="sc-number">
                    {product.inventory} stock / {product.reservedInventory} reserved
                  </td>
                  <td data-label="Media">{product.images} images / {product.variations} variations</td>
                  <td data-label="Status"><StatusBadge label={product.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="sc-grid">
        <Card title="Variation mapping" caption="Wix variants mapped to Etsy variations">
          <ul className="sc-list">
            {data.variantMappings.map((variant) => (
              <li className="sc-list-item" key={variant.id}>
                <span className="sc-status-dot" data-tone={statusTone(variant.status)} />
                <div>
                  <strong>{variant.sku}</strong>
                  <p>{variant.wixVariant}</p>
                  <p>{variant.etsyVariation}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Inventory events" caption="Buffers, reservations, and oversell prevention">
          <ul className="sc-list">
            {data.inventoryEvents.map((event) => (
              <li className="sc-list-item" key={event.id}>
                <span className="sc-status-dot" data-tone="primary" />
                <div>
                  <strong>{event.productTitle}</strong>
                  <p>{event.source}: {event.previousQuantity} {"->"} {event.newQuantity}</p>
                  <p>Buffer applied: {event.bufferApplied} / {formatDate(event.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function OrdersWorkspace({ data }: { data: EtsySyncDashboardData }) {
  return (
    <div className="sc-grid sc-grid-two">
      <Card
        title="Order management"
        caption="Orders, customers, addresses, payments, products, shipping details, notes, and tracking numbers"
      >
        <table className="sc-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Source</th>
              <th>Customer</th>
              <th className="sc-number">Total</th>
              <th>Status</th>
              <th>Tracking</th>
            </tr>
          </thead>
          <tbody>
            {data.orderMappings.map((order: OrderMapping) => (
              <tr key={order.id}>
                <td data-label="Order">
                  <strong>{order.orderNumber}</strong>
                  <p className="sc-card-caption">{order.items} item(s) / {formatDate(order.createdAt)}</p>
                </td>
                <td data-label="Source">{order.source}</td>
                <td data-label="Customer">{order.customerName}</td>
                <td data-label="Total" className="sc-number">{formatCurrency(order.total)}</td>
                <td data-label="Status"><StatusBadge label={order.status} /></td>
                <td data-label="Tracking">{order.trackingNumber ?? "Needs tracking"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="sc-grid">
        <Card title="Customer synchronization" caption="Customer tags, lifetime value, and order history">
          <ul className="sc-list">
            {data.customerMappings.map((customer) => (
              <li className="sc-list-item" key={customer.id}>
                <span className="sc-status-dot" data-tone="primary" />
                <div>
                  <strong>{customer.name}</strong>
                  <p>{customer.emailAvailability} / {customer.orderCount} orders</p>
                  <p>{formatCurrency(customer.lifetimeValue)} lifetime value / {customer.tags.join(", ")}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Shipping profiles" caption="Costs, processing times, tracking, delivery, and carrier support">
          <ul className="sc-list">
            {data.shippingProfiles.map((profile) => (
              <li className="sc-list-item" key={profile.id}>
                <span className="sc-status-dot" data-tone={statusTone(profile.status)} />
                <div>
                  <strong>{profile.name}</strong>
                  <p>{profile.carriers.join(", ")}</p>
                  <p>{profile.processingTime}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function AutomationWorkspace({
  data,
  onResolveConflict,
  resolvingConflict,
}: {
  data: EtsySyncDashboardData;
  onResolveConflict: (conflict: Conflict) => void;
  resolvingConflict: boolean;
}) {
  return (
    <div className="sc-grid sc-grid-two">
      <Card title="Automation engine" caption="Product created, updated, inventory changed, and Etsy order received flows">
        <table className="sc-table">
          <thead>
            <tr>
              <th>Trigger</th>
              <th>Action</th>
              <th>Runs</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.automationRules.map((rule) => (
              <tr key={rule.id}>
                <td data-label="Trigger"><strong>{rule.trigger}</strong></td>
                <td data-label="Action">{rule.action}</td>
                <td data-label="Runs">{rule.runCount} / {formatDate(rule.lastRunAt)}</td>
                <td data-label="Status"><StatusBadge label={rule.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Smart conflict resolution" caption="Price, inventory, listing, and variant conflicts">
        {data.conflicts.length === 0 ? (
          <div className="sc-empty">
            <h2 className="sc-card-title">No conflicts require review</h2>
            <p>New conflicts will appear here with a safe recommended action and impact summary.</p>
          </div>
        ) : (
          <ul className="sc-list">
            {data.conflicts.map((conflict) => (
              <li className="sc-list-item" key={conflict.id}>
                <span className="sc-status-dot" data-tone="tertiary" />
                <div>
                  <strong>{conflict.type}: {conflict.object}</strong>
                  <p>Wix: {conflict.wixValue} / Etsy: {conflict.etsyValue}</p>
                  <p>{conflict.impact}</p>
                  <button
                    className="sc-btn sc-btn-secondary"
                    disabled={resolvingConflict}
                    type="button"
                    onClick={() => onResolveConflict(conflict)}
                  >
                    {resolvingConflict ? "Resolving..." : `Apply ${conflict.recommendation}`}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Sync log stream" caption="Queued jobs, warnings, failures, and replay diagnostics">
        <ul className="sc-list">
          {data.syncLogs.map((log) => (
            <li className="sc-list-item" key={log.id}>
              <span className="sc-status-dot" data-tone={statusTone(log.level)} />
              <div>
                <strong>{log.event}</strong>
                <p>{log.object}</p>
                <p>
                  {formatDate(log.createdAt)}
                  {log.diagnosticId ? ` / ${log.diagnosticId}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function AnalyticsWorkspace({ data }: { data: EtsySyncDashboardData }) {
  const maxRevenue = Math.max(1, ...data.analyticsEvents.map((event) => event.revenue));

  return (
    <div className="sc-grid">
      <div className="sc-grid sc-metrics">
        {data.analyticsMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
      <Card title="Marketplace performance" caption="Revenue by channel, orders by channel, top products, best sellers, and conversion trends">
        <table className="sc-table">
          <thead>
            <tr>
              <th>Channel</th>
              <th className="sc-number">Revenue</th>
              <th className="sc-number">Orders</th>
              <th>Top product</th>
              <th>Conversion</th>
              <th>Signal</th>
            </tr>
          </thead>
          <tbody>
            {data.analyticsEvents.map((event: AnalyticsEvent) => (
              <tr key={event.id}>
                <td data-label="Channel"><strong>{event.channel}</strong></td>
                <td data-label="Revenue" className="sc-number">{formatCurrency(event.revenue)}</td>
                <td data-label="Orders" className="sc-number">{event.orders}</td>
                <td data-label="Top product">{event.topProduct}</td>
                <td data-label="Conversion">{event.conversionTrend}</td>
                <td data-label="Signal">
                  <div
                    aria-label={`${event.channel} revenue signal`}
                    style={{
                      width: `${Math.round((event.revenue / maxRevenue) * 100)}%`,
                      minWidth: "24px",
                      height: "8px",
                      borderRadius: "9999px",
                      background: "var(--sc-color-primary)",
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SettingsWorkspace({
  data,
  onSaveProfile,
  savingProfile,
}: {
  data: EtsySyncDashboardData;
  onSaveProfile: (profile: SyncProfile) => void;
  savingProfile: boolean;
}) {
  const firstProfile = data.syncProfiles[0] ?? null;
  const [profile, setProfile] = useState<SyncProfile | null>(firstProfile);

  useEffect(() => {
    setProfile(firstProfile);
  }, [firstProfile]);

  const validationError = profile ? validateProfile(profile) : "No sync profile is available to edit.";
  const hasChanges = Boolean(firstProfile && profile && isProfileDirty(firstProfile, profile));

  return (
    <div className="sc-grid">
      <div className="sc-grid sc-grid-two">
        <Card
          title="Sync settings"
          caption="Performance, reliability, security, OAuth, encrypted tokens, and audit readiness"
          action={
            <button
              className="sc-btn sc-btn-primary"
              disabled={!profile || Boolean(validationError) || !hasChanges || savingProfile}
              type="button"
              onClick={() => {
                if (profile && !validationError) {
                  onSaveProfile(profile);
                }
              }}
            >
              {savingProfile ? "Saving..." : "Save settings"}
            </button>
          }
        >
          {profile ? (
            <>
              <div className="sc-form-grid">
                <div className="sc-field">
                  <label htmlFor="sync-mode">Sync mode</label>
                  <select
                    id="sync-mode"
                    className="sc-select"
                    value={profile.mode}
                    onChange={(event) => setProfile({ ...profile, mode: event.target.value as SyncProfile["mode"] })}
                  >
                    <option value="wix-to-etsy">Wix {"->"} Etsy</option>
                    <option value="etsy-to-wix">Etsy {"->"} Wix</option>
                    <option value="two-way">Two-way sync</option>
                  </select>
                </div>
                <div className="sc-field">
                  <label htmlFor="inventory-buffer">Inventory buffer</label>
                  <input
                    id="inventory-buffer"
                    className="sc-input"
                    min={0}
                    max={9999}
                    step={1}
                    type="number"
                    value={profile.inventoryBuffer}
                    onChange={(event) =>
                      setProfile({ ...profile, inventoryBuffer: Number(event.target.value) })
                    }
                  />
                </div>
                <div className="sc-field">
                  <label htmlFor="pricing-formula">Pricing formula</label>
                  <input
                    id="pricing-formula"
                    className="sc-input"
                    maxLength={120}
                    value={profile.pricingFormula}
                    onChange={(event) => setProfile({ ...profile, pricingFormula: event.target.value })}
                  />
                </div>
                <div className="sc-field">
                  <label htmlFor="low-stock">Low stock alert threshold</label>
                  <input
                    id="low-stock"
                    className="sc-input"
                    type="number"
                    value={data.settings.lowStockAlertThreshold}
                    readOnly
                  />
                </div>
              </div>
              {validationError && <p className="sc-form-error">{validationError}</p>}
            </>
          ) : (
            <div className="sc-empty">
              <h2 className="sc-card-title">No sync profile available</h2>
              <p>Create a sync profile before editing catalog, inventory, and pricing settings.</p>
            </div>
          )}
        </Card>

        <Card title="Database architecture" caption="PRD-aligned Wix Data collection blueprint">
          <ul className="sc-list">
            {data.dataCollectionBlueprints.map((collection) => (
              <li className="sc-list-item" key={collection.idSuffix}>
                <span className="sc-status-dot" data-tone="primary" />
                <div>
                  <strong>{collection.fullCollectionId}</strong>
                  <p>{collection.purpose}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Pricing plans" caption="Subscription tiers from Free through Enterprise">
        <div className="sc-pricing-grid">
          {data.pricingPlans.map((plan) => (
            <article className="sapphire-card sc-plan" data-active={plan.name === data.settings.activePlan} key={plan.name}>
              <div>
                <h3 className="sc-card-title">{plan.name}</h3>
                <p className="sc-card-caption">{plan.limit}</p>
              </div>
              <p className="sc-metric-value">{plan.price}</p>
              <ul className="sc-list">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {plan.name === data.settings.activePlan && <StatusBadge label="Current" />}
            </article>
          ))}
        </div>
      </Card>

      <Card
        title="App Market readiness"
        caption="Code-facing Wix review checks for setup, identity, Stores, billing, security, UX, and permissions"
      >
        <table className="sc-table">
          <thead>
            <tr>
              <th>Area</th>
              <th>Requirement</th>
              <th>Status</th>
              <th>Evidence / next step</th>
            </tr>
          </thead>
          <tbody>
            {data.appMarketReadiness.map((item: AppMarketReadinessItem) => (
              <tr key={item.id}>
                <td data-label="Area">{item.area}</td>
                <td data-label="Requirement">{item.requirement}</td>
                <td data-label="Status"><StatusBadge label={item.status} /></td>
                <td data-label="Evidence">
                  {item.evidence}
                  {item.nextStep && <p className="sc-card-caption">{item.nextStep}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="sc-grid sc-grid-two">
        <Card title="Wix Stores compatibility" caption="Every production Stores flow must detect Catalog V1 or V3 before reading or writing catalog data">
          <dl className="sc-key-value">
            <div>
              <dt>Catalog version</dt>
              <dd>{data.wixSiteReadiness.catalogVersion}</dd>
            </div>
            <div>
              <dt>Stores status</dt>
              <dd><StatusBadge label={data.wixSiteReadiness.storesStatus} /></dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>{data.wixSiteReadiness.storesEvidence}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Minimum permissions" caption="Configure only these scopes in Wix Dev Center for App Market review">
          <ul className="sc-list">
            {data.requiredPermissions.map((permission) => (
              <li className="sc-list-item" key={permission.id}>
                <span className="sc-status-dot" data-tone="primary" />
                <div>
                  <strong>{permission.scope}</strong>
                  <p>{permission.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Inspector({
  data,
  onViewLogs,
}: {
  data: EtsySyncDashboardData;
  onViewLogs: () => void;
}) {
  const highestPriorityLog = data.syncLogs.find((log) => log.level === "Warning") ?? data.syncLogs[0];

  if (!highestPriorityLog) {
    return (
      <aside className="sapphire-card sc-inspector" aria-label="Operational inspector">
        <header className="sc-card-header">
          <div>
            <h2 className="sc-card-title">Inspector</h2>
            <p className="sc-card-caption">No sync events have been recorded yet.</p>
          </div>
          <StatusBadge label="healthy" />
        </header>
      </aside>
    );
  }

  return (
    <aside className="sapphire-card sc-inspector" aria-label="Operational inspector">
      <header className="sc-card-header">
        <div>
          <h2 className="sc-card-title">Inspector</h2>
          <p className="sc-card-caption">Highest priority sync event</p>
        </div>
        <StatusBadge label={highestPriorityLog.level === "Warning" ? "warning" : "healthy"} />
      </header>
      <div className="sc-inspector-section">
        <h3 className="sc-card-title">{highestPriorityLog.event}</h3>
        <p className="sc-card-caption">{highestPriorityLog.object}</p>
      </div>
      <div className="sc-inspector-section">
        <dl className="sc-key-value">
          <div>
            <dt>Diagnostic</dt>
            <dd>{highestPriorityLog.diagnosticId ?? "No diagnostic required"}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDate(highestPriorityLog.createdAt)}</dd>
          </div>
          <div>
            <dt>Target SLA</dt>
            <dd>{data.settings.syncUpdateTargetSeconds}s sync update</dd>
          </div>
          <div>
            <dt>Data safety</dt>
            <dd>Existing records remain unchanged until sync jobs complete.</dd>
          </div>
        </dl>
      </div>
      <div className="sc-inspector-section">
        <button
          className="sc-btn sc-btn-secondary"
          type="button"
          onClick={onViewLogs}
        >
          View sync logs
        </button>
      </div>
    </aside>
  );
}

function LoadingState() {
  return (
    <div className="sc-loading sapphire-card" aria-busy="true">
      <div>
        <h1 className="sc-title">Loading EtsySync Pro</h1>
        <p className="sc-subtitle">Preparing the catalog, inventory, order, automation, and analytics workspace.</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="sc-error">
      <div>
        <h1 className="sc-title">Dashboard data could not be loaded</h1>
        <p>{message}. Existing site data was not changed. Retry after checking backend permissions and web method deployment.</p>
      </div>
    </div>
  );
}

function EtsySyncProPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const rafId = useRef<number | null>(null);
  const {
    dashboardData,
    resolveConflict,
    runManualSync,
    updateSyncProfile,
  } = useEtsySyncData();

  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = `${Math.round(event.clientX - rect.left)}px`;
    const y = `${Math.round(event.clientY - rect.top)}px`;

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      target.style.setProperty("--mouse-x", x);
      target.style.setProperty("--mouse-y", y);
    });
  };

  const handleRunSync = async (scope: ManualSyncScope = "full-catalog") => {
    try {
      await runManualSync.mutateAsync(scope);
      dashboard.showToast({
        message: "Manual sync was queued. Existing data remains unchanged until completion.",
        type: "success",
      });
    } catch (error) {
      dashboard.showToast({
        message: error instanceof Error ? error.message : "Manual sync could not be queued.",
        type: "error",
      });
    }
  };

  const handleSaveProfile = async (profile: SyncProfile) => {
    try {
      await updateSyncProfile.mutateAsync(profile);
      dashboard.showToast({
        message: "Sync settings were saved.",
        type: "success",
      });
    } catch (error) {
      dashboard.showToast({
        message: error instanceof Error ? error.message : "Sync settings could not be saved.",
        type: "error",
      });
    }
  };

  const handleExportReport = () => {
    if (!data) {
      dashboard.showToast({ message: "Dashboard data is still loading.", type: "error" });
      return;
    }

    try {
      downloadCsv("etsysync-pro-performance-report.csv", [
        ["Channel", "Revenue", "Orders", "Top product", "Conversion"],
        ...data.analyticsEvents.map((event) => [
          event.channel,
          event.revenue,
          event.orders,
          event.topProduct,
          event.conversionTrend,
        ]),
      ]);
      dashboard.showToast({ message: "Performance report exported.", type: "success" });
    } catch (error) {
      dashboard.showToast({
        message: error instanceof Error ? error.message : "Performance report could not be exported.",
        type: "error",
      });
    }
  };

  const handleViewLogs = () => {
    setActiveTab("automation");
  };

  const handleResolveConflict = async (conflict: Conflict) => {
    try {
      await resolveConflict.mutateAsync({
        conflictId: conflict.id,
        resolution: conflict.recommendation,
      });
      dashboard.showToast({
        message: `${conflict.type} conflict resolved with ${conflict.recommendation}.`,
        type: "success",
      });
    } catch (error) {
      dashboard.showToast({
        message: error instanceof Error ? error.message : "Conflict could not be resolved.",
        type: "error",
      });
    }
  };

  const data = dashboardData.data;
  const conflictCount = data?.conflicts.length ?? 0;

  return (
    <div>
      <div className="sapphire-canvas" onMouseMove={handleMouseMove}>
        <main className="etsysync-shell sapphire-workspace" aria-label="EtsySync Pro dashboard">
          <header className="sc-header">
            <div>
              <p className="sc-kicker">EtsySync Pro / Wix Studio commerce operations</p>
              <h1 className="sc-title">Unified Etsy and Wix commerce control surface</h1>
              <p className="sc-subtitle">
                Synchronize products, inventory, pricing, orders, images, variations,
                customers, shipping, SEO data, digital products, and automation across Etsy and Wix.
              </p>
            </div>
            <div className="sc-actions">
              <button
                className="sc-btn sc-btn-secondary"
                type="button"
                onClick={handleExportReport}
              >
                Export report
              </button>
              <button
                className="sc-btn sc-btn-primary"
                disabled={runManualSync.isLoading}
                type="button"
                onClick={() => handleRunSync("priority-conflicts")}
              >
                {runManualSync.isLoading ? "Queueing..." : "Start priority sync"}
              </button>
            </div>
          </header>

          <section className="sc-status-rail" aria-live="polite">
            <span className="sc-status-dot" data-tone="tertiary" />
            <div>
              <strong>{conflictCount > 0 ? "Inventory conflict requires review" : "App Market readiness checks are available"}</strong>
              <span>
                {conflictCount > 0
                  ? `${conflictCount} records need action. No existing Wix or Etsy records were overwritten.`
                  : "Open Settings & billing to review Wix Stores, billing, permissions, and OAuth readiness."}
              </span>
            </div>
            <button
              className="sc-row-button"
              type="button"
              onClick={() => setActiveTab(conflictCount > 0 ? "automation" : "settings")}
            >
              Review
            </button>
          </section>

          <nav className="sc-tabs" aria-label="EtsySync sections" role="tablist">
            {tabs.map((tab) => (
              <button
                aria-selected={activeTab === tab.id}
                className="sc-tab"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {dashboardData.isLoading && <LoadingState />}
          {dashboardData.isError && (
            <ErrorState
              message={
                dashboardData.error instanceof Error
                  ? dashboardData.error.message
                  : "The backend returned an unexpected response"
              }
            />
          )}
          {data && activeTab === "overview" && (
            <Overview
              data={data}
              onRunSync={() => handleRunSync("full-catalog")}
              isSyncing={runManualSync.isLoading}
              onViewLogs={handleViewLogs}
            />
          )}
          {data && activeTab === "products" && (
            <ProductWorkspace
              data={data}
              onRunBulkSync={() => handleRunSync("filtered-catalog")}
              isSyncing={runManualSync.isLoading}
            />
          )}
          {data && activeTab === "orders" && <OrdersWorkspace data={data} />}
          {data && activeTab === "automation" && (
            <AutomationWorkspace
              data={data}
              onResolveConflict={handleResolveConflict}
              resolvingConflict={resolveConflict.isLoading}
            />
          )}
          {data && activeTab === "analytics" && <AnalyticsWorkspace data={data} />}
          {data && activeTab === "settings" && (
            <SettingsWorkspace
              data={data}
              onSaveProfile={(profile) => {
                void handleSaveProfile(profile);
              }}
              savingProfile={updateSyncProfile.isLoading}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default withProviders(EtsySyncProPage);
