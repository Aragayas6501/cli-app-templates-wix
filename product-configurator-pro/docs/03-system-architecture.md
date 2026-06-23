# 03 — System Architecture

**Scope:** Phase 1 (repository & platform analysis) + Phase 4 (technical architecture). This document
defines how Product Configurator Pro is assembled from Wix CLI extensions, how data and pricing flow
end-to-end, and which existing Wix patterns are **adopted** versus **built**. It is the contract that
docs 02 (TDD), 04 (DB), 06 (Roadmap), and 08 (Backlog) implement against.

---

## 1. Repository & Platform Analysis (Phase 1)

### 1.1 Templates surveyed

| Template | What it demonstrates | What PCP reuses |
|----------|----------------------|-----------------|
| **`shipping-rates`** | Full-stack app: backend data layer over `@wix/data`, `webMethod` RPC, React Query hooks, `appInstances` billing gating, eCom **service plugin** (`provideHandlers`), dashboard `Page` layout, dashboard modal. | **The reference architecture** — PCP mirrors its backend/data/billing/SPI/dashboard structure wholesale. |
| **`custom-products-catalog`** | `@wix/stores` product CRUD + `@wix/patterns` optimistic actions in a dashboard. | Product picker + optimistic dashboard CRUD pattern (PCP adds V3). |
| **`inventory-countdown`** | **Site Plugin** custom element on the Stores product page: `reactToWebComponent`, `@wix/site-window` `viewMode()`, `plugin.json` placement (`product-page-details-5`, `autoAddToSite`). | The storefront configurator placement + Site vs Editor detection. |
| **`chart-widget`** | Dashboard data-viz with React Query. | Analytics dashboard charting approach. |
| **`mixpanel-analytics`** | Event tracking / external analytics wiring + settings. | Analytics event pipeline + settings patterns. |
| **`site-popup`** | Storefront UI with its own styling pipeline (Tailwind) inside a custom element. | Proof that a custom element can carry a **bespoke design system** (→ Sapphire on the storefront). |

### 1.2 Standard stack (observed, adopted verbatim)

- **Frontend:** React 16.14 + TypeScript; `@wix/design-system` (structural primitives only, skinned to
  Sapphire — see doc 05); TanStack **React Query v4**.
- **Platform SDKs:** `@wix/essentials` (`auth.elevate`, web-method context), `@wix/web-methods`
  (`webMethod` + `Permissions`), `@wix/dashboard` (toast/navigate/openModal), `@wix/app-management`
  (`appInstances`), `@wix/ecom` (+ `@wix/ecom/service-plugins`), `@wix/stores`, `@wix/data`,
  `@wix/site-window`.
- **CLI:** `npx wix generate --params` scaffolds every extension except Backend API; `wix app
  build/release/dev/preview`; config in `wix.config.json` (`appId`, `projectId` → **MA-2**).

### 1.3 Reusable modules — adopt vs build

| Capability | Decision | Rationale |
|-----------|----------|-----------|
| Backend data access | **Adopt** `shipping-rates` `database.ts` pattern | A single typed module wrapping `@wix/data` (query/get/insert/update/save/remove/bulk*) keeps collection IDs + elevation centralized. |
| Billing / entitlements | **Adopt** `appInstance.ts` (`getAppInstanceElevated`, `isPremiumInstance`) | Native Wix Billing is mandatory (App Market #25); reuse the exact gating helper. |
| Type-safe RPC | **Adopt** `webMethod(Permissions.Admin, fn)` | Dashboard→backend calls without hand-rolled HTTP. |
| Data fetching/caching | **Adopt** React Query hooks w/ query-key arrays + invalidation | Matches every template; predictable cache. |
| Checkout pricing | **Adopt** eCom **Additional Fees SPI** | The only sanctioned way to add per-line surcharges server-side. |
| Required-field gate | **Adopt** eCom **Validations SPI** | Sanctioned checkout blocking. |
| Storefront placement | **Adopt** Site Plugin pattern from `inventory-countdown` | Native slot on the product page. |
| Optimistic dashboard CRUD | **Adopt** `@wix/patterns` actions (from `custom-products-catalog`) | Consistent optimistic UX. |
| Design system | **Build** Sapphire layer over WDS | Product mandate; mitigations in doc 05/07. |
| Conditional-logic engine | **Build** | No platform primitive exists. |
| Pricing/formula engine | **Build** (sandboxed) | No platform primitive; must be secure + bounded. |
| Upload scanning | **Build** integration to external scanner (**MA-4**) | Wix Media stores; scanning is external. |

**Principle:** *adopt the platform pattern wherever one exists; build only the configurator-specific
engines (logic, pricing, preview) and the Sapphire UI layer.*

---

## 2. Extension Map

PCP is composed of the following Wix CLI extensions. Each row is scaffolded with
`wix generate --params` (except Backend API) during the build (doc 06 / doc 08).

### 2.1 Dashboard (admin) extensions

| Extension | Type | Purpose |
|-----------|------|---------|
| Option Sets page | `DASHBOARD_PAGE` | List/manage Option Sets (Sapphire Canvas + Filter Command Bar + table). |
| Option Set Builder page | `DASHBOARD_PAGE` | Build options/values/validation (Inspector Drawer pattern). |
| Conditional Rules page/section | `DASHBOARD_PAGE` | Rule builder + simulator. |
| Pricing Rules page/section | `DASHBOARD_PAGE` | Pricing rule builder. |
| Product Assignment page | `DASHBOARD_PAGE` | Map Option Sets to Stores products (V1/V3 picker). |
| Order Configurations page | `DASHBOARD_PAGE` | View configurations captured on orders + files. |
| Analytics page | `DASHBOARD_PAGE` | Funnel + option metrics. |
| Templates gallery page | `DASHBOARD_PAGE` | Save/instantiate Templates (Pro+). |
| Settings page | `DASHBOARD_PAGE` | Global settings (App Market #107). |
| Editor / confirm modals | `DASHBOARD_MODAL` | Create/edit/confirm dialogs (Pages can't use `<Modal/>`). |
| Order-view plugin (optional) | `DASHBOARD_PLUGIN` | Surface configuration inside the native Stores order page. |

### 2.2 Storefront (site) extensions

| Extension | Type | Purpose |
|-----------|------|---------|
| Configurator (product page) | `SITE_PLUGIN` | Renders on the Stores product-page slot for mapped products. |
| Configurator (flexible) | `CUSTOM_ELEMENT` | Standalone placement anywhere; shares the same React core. |

Both share a single Sapphire-skinned `@configurator/core` React module (selections, rule evaluation,
price preview, validation, upload UI). Site vs Editor detected via `@wix/site-window` `viewMode()`.

### 2.3 Backend extensions

| Extension | Type | Purpose |
|-----------|------|---------|
| Additional Fees handler | `SERVICE_PLUGIN` (`ECOM_ADDITIONAL_FEES`) | Server-authoritative per-line surcharge at checkout. |
| Validations handler | `SERVICE_PLUGIN` (`ECOM_VALIDATIONS`) | Block checkout when required config is missing. |
| App lifecycle events | `EVENT` | `App Installed` (seed demo data) / `App Removed` (cleanup, retention). |
| Order events | `EVENT` | `Order Created/Updated` → capture `OrderConfigurations`. |
| Stores events | `EVENT` | Product deleted/updated → flag stale `ProductMappings`. |
| Web methods | `*.web.ts` (`webMethod`) | Dashboard ↔ backend RPC (CRUD, simulate, analytics queries). |
| Upload callbacks API | `BACKEND_API` (manual) | Receive virus-scan provider webhooks; update `Uploads` status. |
| Data collections | `DATA_COLLECTION` ×13 | The persistence layer (doc 04). |

### 2.4 Component & module hierarchy

```
src/
  backend/
    database.ts                 # @wix/data wrapper (adopted from shipping-rates)
    app-instance.ts             # billing/entitlements gating
    entitlements.ts             # plan -> feature-flag matrix
    engines/
      rules-engine.ts           # conditional logic evaluation (pure, isomorphic)
      pricing-engine.ts         # sandboxed pricing/formula evaluation (pure, isomorphic)
    services/
      option-sets.web.ts        # webMethods: CRUD option sets/options/values
      rules.web.ts              # webMethods: CRUD + simulate rules
      pricing.web.ts            # webMethods: CRUD pricing rules
      mappings.web.ts           # webMethods: assign products (Stores V1/V3)
      analytics.web.ts          # webMethods: dashboard metric queries
      uploads.web.ts            # webMethods: issue upload tokens, list files
    service-plugins/
      ecom-additional-fees/...  # calculateAdditionalFees
      ecom-validations/...      # validate checkout
    events/
      app-lifecycle/...         # installed/removed
      orders/...                # capture order configurations
      stores/...                # mapping integrity
    pages/api/
      scan-callback.ts          # BACKEND_API: virus-scan webhook
    stores/
      catalog.ts                # getCatalogVersion gate + V1/V3 dual recipes
  dashboard/
    pages/...                   # one folder per dashboard page
    modals/...                  # dashboard modals
    components/sapphire/...      # Sapphire component library (shared)
    hooks/...                    # React Query hooks (one per domain)
    theme/                       # Sapphire token + WDS theming layer
  site/
    configurator/core/          # shared React core (selections/rules/pricing/upload)
    plugins/product-page/...     # SITE_PLUGIN wrapper
    custom-elements/configurator # CUSTOM_ELEMENT wrapper
  extensions.ts                  # CLI-maintained registry
```

The **rules-engine** and **pricing-engine** are pure, dependency-free modules imported by both the
storefront (preview) and the backend SPIs (authoritative) — one source of truth, two call sites.

---

## 3. End-to-End Architecture

```mermaid
flowchart TB
  subgraph Storefront[Storefront - Customer]
    SP[Site Plugin / Custom Element\nConfigurator Core]
    SP -->|preview eval| ENG1[rules-engine + pricing-engine\n(client copy)]
  end
  subgraph Backend[Wix Backend - App]
    WM[web methods RPC]
    AF[Additional Fees SPI]
    VAL[Validations SPI]
    EV[Event handlers]
    API[Scan callback API]
    ENG2[rules-engine + pricing-engine\n(authoritative)]
    DB[(13 Data Collections)]
    AF --> ENG2
    VAL --> ENG2
    WM --> DB
    AF --> DB
    VAL --> DB
    EV --> DB
    API --> DB
  end
  subgraph Admin[Dashboard - Merchant]
    PG[Sapphire Dashboard Pages]
    PG -->|React Query| WM
  end
  subgraph Wix[Wix Platform]
    ECOM[eCom Cart/Checkout]
    STORES[Stores V1/V3]
    MEDIA[Wix Media]
    BILL[Wix Billing / App Instances]
  end
  SP -->|add to cart| ECOM
  ECOM -->|calculateAdditionalFees| AF
  ECOM -->|validate| VAL
  ECOM -->|order created| EV
  PG -->|product picker| STORES
  AF --> STORES
  SP -->|upload| MEDIA
  MEDIA -->|scan webhook| API
  PG -->|entitlements| BILL
  AF -. catalog gate .-> STORES
```

### 3.1 Configuration → cart → order flow

1. **Render:** Site Plugin loads the published Option Set + rules + pricing for the mapped product
   (catalog-version gated). Renders Sapphire UI.
2. **Configure:** Customer selects values → client `rules-engine` updates visibility/required →
   client `pricing-engine` shows a **preview** price (<100ms, no CLS).
3. **Add to cart:** Configuration (selections + preview) attaches to the eCom line item.
4. **Authoritative price:** At checkout, eCom calls the **Additional Fees SPI**; the backend re-reads
   rules from collections (elevated) and recomputes the fee with the **same engine** → returns string
   fees per line. Preview is never trusted.
5. **Validate:** eCom calls the **Validations SPI**; missing required fields block checkout with
   field-level messages.
6. **Capture:** On `Order Created`, the event handler writes an immutable `OrderConfigurations`
   snapshot (+ links uploaded files).
7. **Operate:** Merchant views configured orders, downloads clean files, reads analytics.

---

## 4. Frontend Architecture

### 4.1 Surfaces & rendering
- **Dashboard:** React + WDS structural primitives (`Page`/`Page.Header`/`Page.Content`/`Layout`/
  `Cell`/`Page.Sticky`/`Page.FixedFooter`) skinned by the Sapphire theme layer; `withProviders`
  wrapper; `@wix/dashboard` for toast/navigate/openModal. Pages never use `<Modal/>` — they call
  `dashboard.openModal()` against a `DASHBOARD_MODAL`.
- **Storefront:** Custom element / Site Plugin via `reactToWebComponent`; full Sapphire CSS (the
  storefront has styling freedom, like `site-popup`'s Tailwind). Detect Site vs Editor with
  `viewMode()` to render an editor-safe placeholder.

### 4.2 State management
- **Server state:** React Query (queries + mutations, query-key arrays, `invalidateQueries` on
  success, optimistic updates via `@wix/patterns` actions for list CRUD).
- **Builder/editor local state:** a typed reducer per builder (Option Set, Rules, Pricing) holding the
  in-progress draft; autosave-debounced mutations.
- **Configurator runtime state:** a finite, serializable `ConfigurationState` (selections, derived
  visibility/required, price preview) — serializable so it can be persisted as a draft (PCP-CFG-3) and
  attached to the cart line.
- **Entitlements:** an `useEntitlements()` hook derived from `appInstances.getAppInstance()`; gates
  render with Upgrade affordances. Defaults to **least privilege** on fetch failure.

### 4.3 Component hierarchy (dashboard)
`SapphireAppShell` → `SapphireCanvas` → (`FilterCommandBar` + `PriorityStatusRail` + content) →
domain views (`OptionSetsTable`, `OptionSetBuilder`, `RuleBuilder`, `PricingBuilder`, `AnalyticsBoard`)
→ `DetailInspectorDrawer` for contextual editing → `DASHBOARD_MODAL`s for create/confirm. Full mapping
in doc 05.

### 4.4 Routing
- Dashboard pages registered via extensions; intra-page navigation uses `@wix/dashboard` `navigate()`
  with typed `WixPageId` constants and Breadcrumbs. Deep links: `/option-sets/:id/(options|rules|
  pricing|assign)`.
- Storefront has no routing (embedded); multi-step flow (PCP-CFG-2) is internal step state.

### 4.5 Error handling
- **Dashboard:** React Query error boundaries per page region; non-blocking toasts; retry actions;
  empty/low-data and error states are first-class (doc 05). Never `alert/confirm` (App Market #45).
- **Storefront:** every fetch is wrapped to **fail safe** — the product page must never break
  (PCP-CFG-1). Engine errors degrade to last-known price + diagnostic event.

### 4.6 Caching
- React Query staleTime tuned per domain (config data longer, analytics shorter).
- Storefront fetches the published config bundle once per product view; client engines are memoized;
  rapid inputs debounced.
- Published config can be served from a compact, cacheable read shape (denormalized bundle) to hit the
  <2s load budget.

---

## 5. Backend Architecture

### 5.1 Services (web methods)
Type-safe RPC via `webMethod(Permissions.Admin, fn)` grouped by domain (`option-sets.web.ts`,
`rules.web.ts`, `pricing.web.ts`, `mappings.web.ts`, `analytics.web.ts`, `uploads.web.ts`). All admin
writes go through web methods, never direct client→data. Public storefront reads use the data
collection's `ANYONE` read permission for **published** content only.

### 5.2 Service plugins (hot path)
- **Additional Fees** (`calculateAdditionalFees`): reads configurations + pricing rules via
  `auth.elevate(items.query)`, runs `pricing-engine`, returns string fees with readable labels,
  per `lineItemIds`. **Fail-open to no fee** on any error.
- **Validations** (`validate`): runs required-field checks via `rules-engine`; returns violations to
  block checkout. **Fail-closed for required fields** (configurable policy, default block).
- Both must be fast and side-effect-free (they run on every cart/checkout mutation).

### 5.3 Event processing & webhooks
- **App lifecycle (`EVENT`):** `App Installed` → seed demo data (idempotent, elevated); `App Removed`
  → schedule data cleanup per retention policy.
- **Orders (`EVENT`):** `Order Created/Updated` → write/mirror `OrderConfigurations`. Idempotent on
  redelivery (keyed by order+line). Reconciliation job backfills misses.
- **Stores (`EVENT`):** product deleted/updated → mark `ProductMappings` stale.
- **Scan callback (`BACKEND_API`):** external scanner posts results → update `Uploads.scanStatus`;
  release from quarantine or block.

### 5.4 Background jobs & queues
- **Upload scan pipeline:** enqueue on upload → external scan → callback updates status. Files are
  quarantined until clean (PCP-UPL-2).
- **Analytics batching:** events buffered and written in batches; sampling configurable; retention
  enforced by a periodic prune.
- **Order reconciliation:** periodic sweep to capture any configuration missed by an event.
- **Stale-mapping sweep:** periodic integrity check of `ProductMappings` vs Stores.

> Implementation note: Wix backends don't expose a general queue primitive; "queues/jobs" are realized
> via event-driven handlers + idempotent retries + scheduled web methods. The blueprint treats them as
> logical queues; doc 06 lists the concrete mechanism per job.

### 5.5 Pricing-calculation strategy (authoritative)
- **One engine, two call sites.** `pricing-engine` is a pure module: `eval(ruleSet, selections,
  context) → {lineFees[], breakdown}`. The client calls it for preview; the Additional Fees SPI calls
  it for the real charge. This guarantees preview/charge parity by construction.
- **Composition order** (documented + tested): base → fixed → tier → quantity → percentage →
  formula → conditional adjustments, with explicit rounding at the end per `Settings.roundingRule`.
- **Determinism & bounds:** no I/O inside the engine; formula grammar is whitelisted (no `eval`);
  evaluation is depth/step-bounded (<100ms). Errors yield 0 for the offending rule + a diagnostic,
  never NaN/exception into the cart.
- **Currency:** store currency is authoritative; fees are strings; no implicit FX.

### 5.6 Security & permissions
- **Least privilege** (App Market #111/112): request only required scopes; storefront reads limited to
  published config; all writes via admin web methods or elevated system contexts.
- **Elevation** only where there is no user context (SPIs, events) via `auth.elevate`.
- **Signed-instance verification** for any externally reachable endpoint (App Market #74/#76); identify
  tenants by `instanceId` (#115); handle site duplication via `originInstanceId` (#122).
- **Upload security:** type/size/count validation client+server; quarantine until scanned; signed media
  references only.
- **Formula sandbox:** whitelisted expression grammar, no host access (PCP-PRC-3).

### 5.7 Observability
- **Structured logging** at every backend boundary (web method, SPI, event, API) with `instanceId`,
  correlation IDs, and outcome.
- **AuditLogs** collection captures domain mutations (actor/action/entity/before-after) — product-level
  audit, separate from infra logs.
- **Metrics:** SPI latency + fail-open counts, engine eval time, upload scan outcomes, event redelivery
  counts, storefront error rate. Surfaced internally; key health stats inform the analytics SLOs.
- **Alerting:** scanner failures, audit-write failures (Enterprise), SPI error-rate spikes.

---

## 6. Billing & Entitlements

### 6.1 Mechanism
`appInstances.getAppInstance()` → `{ billing, isFree }`; `isPremiumInstance(inst) = !!inst.billing &&
!inst.isFree`. Per-`instanceId` billing through Wix Billing (App Market #25). Upgrade affordances open
the Wix upgrade flow. Vendor product IDs per plan are **MA-3**.

### 6.2 Plan → feature matrix (enforced in `entitlements.ts`)

| Feature | Free | Starter | Pro | Business | Enterprise |
|---------|:----:|:-------:|:---:|:--------:|:----------:|
| Option Sets | 1 | ∞ | ∞ | ∞ | ∞ |
| Basic option types | ✓ | ✓ | ✓ | ✓ | ✓ |
| Fixed pricing | ✓ | ✓ | ✓ | ✓ | ✓ |
| Percentage pricing | — | ✓ | ✓ | ✓ | ✓ |
| Conditional logic | — | — | ✓ | ✓ | ✓ |
| Formula / tier / quantity pricing | — | — | ✓ | ✓ | ✓ |
| File uploads | — | — | ✓ | ✓ | ✓ |
| Templates | — | — | ✓ | ✓ | ✓ |
| Analytics dashboard | — | — | ✓ | ✓ | ✓ |
| Visual Preview (V2) | — | — | — | ✓ | ✓ |
| Option-level inventory (V2) | — | — | — | ✓ | ✓ |
| Advanced analytics | — | — | — | ✓ | ✓ |
| Remove app branding | — | ✓ | ✓ | ✓ | ✓ |
| B2B / quotes (V3) | — | — | — | — | ✓ |
| Audit-log view/export | — | — | — | — | ✓ |
| AI assist (V4) | — | — | — | — | ✓ |

- **Enforcement is server-side too:** entitlement checks run in web methods (not just UI) so gates
  can't be bypassed. Storefront features render only for entitled instances.
- **Downgrade safety:** never delete data on downgrade; excess entities become read-only with an
  upgrade prompt (PCP-OPT-12).

---

## 7. Compatibility: Wix Stores V1 + V3

`src/backend/stores/catalog.ts` centralizes:
- `getCatalogVersion()` **first**, cached; handle `STORES_NOT_INSTALLED` gracefully (configurator
  no-renders, dashboard shows "Connect Wix Stores").
- Dual recipes: list/get/search products, resolve price + currency, list collections (V1) / categories
  (V3). V3 specifics: string prices, UPPER_CASE enums, `revision` on writes, cursor paging, no `sort`
  on product queries, request `fields` for CURRENCY/MERCHANT_DATA/URL.
- Both V1 + V3 permission scopes requested (**MA-6**). Mandatory for App Market (#130).

---

## 8. Configuration vs Data boundary

- **Data (collections):** merchant-authored domain entities + runtime records (Option Sets, rules,
  pricing, mappings, configurations, uploads, analytics, audit) — see doc 04.
- **Config (not collections):** widget/panel presentation settings live in the extension's settings,
  not a collection, per Wix guidance. Global app behavior lives in the single `Settings` collection
  (one record per instance).

---

## 9. Architecture decision records (ADRs, condensed)

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-1 | Mirror `shipping-rates` full-stack structure | Accepted |
| ADR-2 | Pricing via Additional Fees SPI; preview is advisory | Accepted |
| ADR-3 | Required fields via Validations SPI (fail-closed for required) | Accepted |
| ADR-4 | One isomorphic engine for rules + pricing | Accepted |
| ADR-5 | Storefront = Site Plugin + Custom Element sharing a core | Accepted |
| ADR-6 | Sapphire over WDS (structural primitives only) | Accepted (risk-managed, doc 05/07) |
| ADR-7 | Product references stored as TEXT IDs (Wix Data constraint) | Accepted |
| ADR-8 | Dual Stores V1/V3 via catalog gate | Accepted |
| ADR-9 | Least-privilege perms + signed-instance verification | Accepted |
| ADR-10 | Server-side entitlement enforcement (not UI-only) | Accepted |
