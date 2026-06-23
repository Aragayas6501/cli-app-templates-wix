# 01 — Product Requirements Analysis

**Product:** Product Configurator Pro · **Surface:** Wix Stores app (dashboard + storefront) ·
**Audience for this doc:** product, design, engineering, GTM.

This document translates the PRD into an actionable requirements baseline: the business case, the
people who use the product, and a complete, versioned user-story backlog with acceptance criteria,
edge cases, failure states, and permissions. Downstream docs (02 TDD, 04 DB, 05 UX, 08 Backlog)
reference the story IDs defined here (`PCP-<area>-<n>`).

---

## 1. Business Analysis

### 1.1 Core business problem

Wix Stores natively supports **product options** but stops short of what configurable-product
merchants need:

- Options cannot **drive each other** (no "show lining color only when jacket type = wool").
- Options cannot carry **rich pricing** (no per-character engraving fee, no area-based pricing, no
  tiered/quantity breaks, no formula pricing).
- There is no first-class **file upload** option (artwork, proof, spec sheet) with validation and
  security.
- Merchants cannot **reuse** option groups across products, nor template them.
- There is no **configuration analytics** to see where customers drop off.

The result: merchants selling customizable goods (print, signage, apparel, furniture, food, jewelry,
industrial parts) either leave Wix, bolt on brittle custom code, or under-serve customers. Product
Configurator Pro closes this gap with an enterprise-grade option, logic, and pricing engine that
keeps pricing **server-authoritative** through checkout.

### 1.2 Merchant workflows (happy path)

1. **Install & onboard** → app seeds demo data, merchant lands on a guided setup checklist.
2. **Build an Option Set** → add options (types, values, validation), arrange order, set defaults.
3. **Add conditional rules** → "if A then show/hide/require B", with AND/OR and nesting.
4. **Add pricing rules** → fixed, percentage, formula, tier, quantity, or conditional adjustments.
5. **Assign to products** → map the Option Set to one/many Wix Stores products (V1 or V3 catalog).
6. **Preview & publish** → preview the live configurator, then publish.
7. **Operate** → review configured orders, manage uploaded files, watch analytics, iterate.

### 1.3 Customer (storefront) workflow

1. Open a product with a configurator → see options rendered in Sapphire styling.
2. Make selections → conditional rules reveal/hide/require options in real time.
3. See **live price** update (<100ms) as a preview.
4. Upload files where required; see validation feedback.
5. Add to cart → server recomputes the authoritative surcharge (Additional Fees SPI) and blocks
   checkout if required fields are missing (Validations SPI).
6. Complete purchase → the exact configuration is captured onto the order.

### 1.4 Revenue model

Subscription SaaS billed through **Wix Billing** (per app instance / site). Plan ladder:

| Plan | Price (USD/mo) | Primary gates |
|------|----------------|---------------|
| **Free** | $0 | 1 Option Set, basic option types, fixed pricing only, Wix branding, capped configurations/mo. |
| **Starter** | $15 | Multiple Option Sets, all basic option types, percentage pricing, no branding, email support. |
| **Pro** | $39 | Conditional logic, formula/tier/quantity pricing, file uploads, templates, analytics dashboard. |
| **Business** | $79 | Visual Preview (V2), option-level inventory (V2), advanced analytics, priority support. |
| **Enterprise** | $199 | B2B/quote flow (V3), AI assist (V4), audit logs export, SLA, dedicated onboarding. |

Gating is enforced by `appInstances.getAppInstance()` + a plan→feature-flag matrix (doc 03 §Billing).
Plan prices and vendor product IDs are **MA-3** (created in Dev Center).

### 1.5 Marketplace positioning

- **Category:** Store tools / Product options & customization.
- **One-liner:** "Enterprise product options, conditional logic, and live pricing — native to Wix
  Stores, priced honestly at checkout."
- **Differentiators:** server-authoritative checkout pricing; reusable Option Sets + templates;
  conditional logic with nesting; secure file uploads; configuration analytics; Sapphire-grade UX;
  full Stores V1+V3 support.

### 1.6 Competitive landscape

| Competitor archetype | Strength | Gap PCP exploits |
|----------------------|----------|------------------|
| Native Wix Stores options | Free, native | No logic, no rich pricing, no uploads, no reuse. |
| Generic "product options" apps | Many option types | Client-only pricing (tamperable), weak logic, non-native UX. |
| Single-vertical configurators (e.g. print-only) | Deep vertical fit | Not reusable across verticals; lock-in; poor analytics. |
| Headless/custom builds | Unlimited flexibility | High cost, no merchant self-service, no marketplace support. |

PCP wins on **breadth + trustworthy pricing + native Wix integration + self-service UX**.

---

## 2. User Personas

### 2.1 Merchant (Owner-Operator) — *primary buyer*
- **Context:** Runs a small/mid Wix Stores business selling customizable goods. Time-poor, not a
  developer.
- **Goals:** Stand up configurable products fast; never lose money to mispriced customizations;
  look professional.
- **Frustrations:** Native options too limited; fear of pricing errors; coding is a non-starter.
- **Success:** First configurable product live the same day; orders carry correct prices + specs.
- **Permissions:** Full app admin (manage Option Sets, rules, pricing, mappings, settings, billing).

### 2.2 Store Manager / Staff — *primary operator*
- **Context:** Operates the store day-to-day on behalf of the owner.
- **Goals:** Process configured orders, manage uploaded files, tweak options, read analytics.
- **Frustrations:** Needs clarity on what the customer actually ordered; doesn't want billing access.
- **Success:** Can fulfil a configured order without ambiguity; can edit options but not billing.
- **Permissions:** App operator — CRUD on domain entities, **no** billing/settings-destructive actions.

### 2.3 Customer (Shopper) — *end user*
- **Context:** Buying a customizable product on the merchant's live site; may be on mobile.
- **Goals:** Configure quickly, understand price, trust the total, upload artwork easily.
- **Frustrations:** Confusing forms; surprise prices at checkout; broken uploads on mobile.
- **Success:** Sub-2s load, live price, no checkout surprises, configuration honored on the order.
- **Permissions:** Public/storefront — read published configurator, create their own Configuration.

### 2.4 Agency Partner — *implementer at scale*
- **Context:** Builds/maintains many client stores; values reuse and repeatability.
- **Goals:** Template Option Sets, clone across clients, hand off to client staff cleanly.
- **Frustrations:** Re-building the same configurator per client; inconsistent governance.
- **Success:** Build once, reuse as Template; client staff operate with scoped permissions.
- **Permissions:** Same as Merchant on client sites they're granted access to; heavy Template use.

### 2.5 Enterprise Customer — *high-volume / regulated buyer org*
- **Context:** B2B buyer or large brand; needs quotes, audit trails, SLAs, data governance.
- **Goals:** Quote flow (V3), audit logs, export, role separation, reliability at volume.
- **Frustrations:** Consumer-grade tools lack auditability and approval workflows.
- **Success:** Configurations become quotes; every change is audit-logged and exportable.
- **Permissions:** Enterprise plan; audit-log read/export; quote approval roles (V3).

---

## 3. User Stories

Format: each story has **ID**, **As-a / I-want / so-that**, **Acceptance criteria (AC)**, **Edge
cases (EC)**, **Failure states (FS)**, **Permissions (P)**, and a **Version** tag (MVP / V2 / V3 / V4).
Stories are grouped by feature area. IDs are stable and referenced by docs 02/04/05/08.

### 3.1 Onboarding & Installation — `PCP-ONB`

**PCP-ONB-1 — Seed demo data on install** · *MVP*
- *As a* merchant, *I want* sample Option Sets/rules/pricing on install *so that* I can learn by example.
- **AC:** On `App Installed` event, a demo Option Set + rules + pricing + one product mapping (if a
  product exists) are created; a "Demo" badge marks seeded items; merchant can delete all demo data
  in one action.
- **EC:** No Stores products yet → seed Option Set + Template only, defer mapping. Stores not installed
  → seed Option Set, surface a "Connect Wix Stores" prompt.
- **FS:** Seeding partially fails → idempotent retry; never block app load; log to AuditLogs.
- **P:** System (elevated) on install; merchant can purge.
- *Satisfies App Market #37 (demo content on install).*

**PCP-ONB-2 — Guided setup checklist** · *MVP*
- *As a* merchant, *I want* a setup checklist *so that* I know the steps to go live.
- **AC:** Checklist shows: create Option Set → add options → assign product → preview → publish; each
  item reflects real state and links to the relevant screen; dismissible; reappears from Help.
- **EC:** Merchant completes steps out of order → checklist reflects actual completion, not sequence.
- **FS:** State read fails → checklist renders last-known/local state with a non-blocking retry.
- **P:** Merchant, Store Manager (read/act), no billing requirement.

**PCP-ONB-3 — Plan-aware onboarding** · *MVP*
- *As a* merchant on Free, *I want* to see what each plan unlocks *so that* I can decide to upgrade.
- **AC:** Locked features show an Upgrade affordance with the gating plan; upgrade uses Wix Billing.
- **EC:** Plan changes mid-session → UI reflects new entitlements within one app instance refresh.
- **FS:** App-instance fetch fails → assume **least** privilege (Free) and show a retry.
- **P:** Merchant (billing); Store Manager sees gates but cannot purchase.

### 3.2 Option Builder — `PCP-OPT`

**PCP-OPT-1 — Create an Option Set** · *MVP*
- *As a* merchant, *I want* to create a named Option Set *so that* I can group options for reuse.
- **AC:** Name required + unique per app instance; created Option Set is empty, draft by default;
  appears in the Option Sets list.
- **EC:** Duplicate name → inline validation, blocks save. Name only whitespace → invalid.
- **FS:** Insert fails → toast error, form retains input, no partial record.
- **P:** Merchant, Store Manager (create/edit); Free plan limited to 1 Option Set (PCP-OPT-12 gate).

**PCP-OPT-2 — Add an option of any supported type** · *MVP*
- *As a* merchant, *I want* to add options of many types *so that* I can model real products.
- **AC:** Supported types: short text, long text, number, dropdown, radio, checkbox, multi-select,
  swatch (color/image), button group, date, time, file upload, quantity, hidden, heading/section,
  rich-text note. Each option has label, key, help text, required flag, default, and type-specific
  config.
- **EC:** Option key collision within a set → auto-suffix + warn. 16+ options → list virtualizes.
- **FS:** Type-specific config invalid (e.g. swatch with no values) → cannot publish; draft allowed.
- **P:** Merchant, Store Manager. File-upload type gated to Pro+ (PCP-UPL gates).

**PCP-OPT-3 — Define option values** · *MVP*
- *As a* merchant, *I want* to define selectable values *so that* customers can choose.
- **AC:** Add/edit/remove/reorder values; each value has label, key, optional image/swatch, optional
  default; bulk add (paste newline-separated).
- **EC:** Empty value label → invalid; duplicate value keys → auto-suffix.
- **FS:** Reorder save fails → optimistic revert + toast.
- **P:** Merchant, Store Manager.

**PCP-OPT-4 — Reorder & group options** · *MVP*
- *As a* merchant, *I want* drag-and-drop ordering and sections *so that* the form reads logically.
- **AC:** Drag reorder persists `order`; section/heading options group following options; order is
  reflected in the storefront.
- **EC:** Drag onto self/no-op → ignored. Keyboard reorder supported (a11y).
- **FS:** Persist fails → revert to server order.
- **P:** Merchant, Store Manager.

**PCP-OPT-5 — Per-option validation rules** · *MVP*
- *As a* merchant, *I want* validation (min/max, length, regex, file constraints) *so that* inputs
  are correct.
- **AC:** Number min/max/step; text min/max length + optional regex with friendly message; file
  type/size/count; required toggle. Validation runs storefront (advisory) and server (authoritative).
- **EC:** Conflicting rules (min>max) → blocked at save. Regex invalid → blocked at save.
- **FS:** Server validation rejects at add-to-cart → Validations SPI blocks with field-level reasons.
- **P:** Merchant, Store Manager.

**PCP-OPT-6 — Duplicate / clone an Option Set** · *MVP*
- *As a* merchant, *I want* to clone an Option Set *so that* I can iterate without rebuilding.
- **AC:** Clone copies options, values, rules, pricing; new unique name ("… copy"); draft status.
- **EC:** Clone of a set with product mappings → mappings are **not** copied (clone is unassigned).
- **FS:** Partial clone failure → transactional rollback; nothing persisted.
- **P:** Merchant, Store Manager.

**PCP-OPT-7 — Save Option Set as Template** · *Pro*
- *As an* agency partner, *I want* to save a Template *so that* I can reuse across products/clients.
- **AC:** Template captures structure (no product mappings); appears in Template gallery; instantiating
  a Template creates a new Option Set.
- **EC:** Template name collision → auto-suffix. Free/Starter → gated.
- **FS:** Instantiate failure → no Option Set created; toast.
- **P:** Merchant, Agency Partner (Pro+).

**PCP-OPT-12 — Free-plan Option Set limit** · *MVP*
- *As the* system, *I want* to cap Free to 1 Option Set *so that* upgrade is incentivized.
- **AC:** Creating a 2nd set on Free is blocked with an Upgrade affordance; existing sets remain
  editable.
- **EC:** Downgrade to Free with N>1 sets → all remain readable; only 1 editable/publishable, others
  become read-only with an upgrade prompt (no data loss).
- **FS:** Entitlement check fails → block create (least privilege), allow retry.
- **P:** Merchant.

### 3.3 Conditional Logic Engine — `PCP-RUL`

**PCP-RUL-1 — Create a conditional rule** · *Pro*
- *As a* merchant, *I want* "if [conditions] then [actions]" rules *so that* options react to choices.
- **AC:** Conditions reference options/values with operators (equals, not-equals, in, not-in,
  greater/less for numbers, is-empty, contains for text); actions: show, hide, require, optional,
  set-value, set-available-values; multiple actions per rule.
- **EC:** Rule references a deleted option → rule flagged invalid, excluded from evaluation, surfaced
  for fixing. Hidden option that is required → required is suppressed while hidden.
- **FS:** Malformed rule → never crashes the configurator; skipped + logged.
- **P:** Merchant, Store Manager (Pro+).

**PCP-RUL-2 — AND / OR grouping** · *Pro*
- *As a* merchant, *I want* to combine conditions with AND/OR *so that* I can express real logic.
- **AC:** A rule has a condition group with a combinator (ALL/ANY); UI shows grouping clearly.
- **EC:** Empty group → rule invalid at save.
- **FS:** Evaluation of empty/partial group → treated as no-match, never an error.
- **P:** Merchant, Store Manager (Pro+).

**PCP-RUL-3 — Nested condition groups** · *Pro*
- *As a* merchant, *I want* nested groups *so that* I can model complex dependencies.
- **AC:** Groups nest to a documented max depth (default 5); each level has its own combinator;
  evaluation is deterministic and short-circuits.
- **EC:** Nesting beyond max → blocked at save with guidance. Circular show/hide (A hides B hides A)
  → cycle detection prevents flicker; documented precedence resolves it.
- **FS:** Cycle/deep recursion guard → bounded evaluation, logs a diagnostic.
- **P:** Merchant (Pro+).

**PCP-RUL-4 — Rule priority & conflict resolution** · *Pro*
- *As a* merchant, *I want* deterministic conflict handling *so that* outcomes are predictable.
- **AC:** Rules have explicit priority/order; last-write or highest-priority wins per a documented
  policy; the UI explains the effective state of an option ("hidden by Rule 3").
- **EC:** Two rules set conflicting values → priority decides; tie → stable order.
- **FS:** Indeterminate resolution → fall back to safe default (option visible & optional) + log.
- **P:** Merchant (Pro+).

**PCP-RUL-5 — Live rule preview / simulator** · *Pro*
- *As a* merchant, *I want* to simulate selections *so that* I can verify rules before publishing.
- **AC:** A simulator panel lets the merchant pick values and shows resulting visibility/requirement/
  price without affecting live data.
- **EC:** Simulating an invalid rule set → shows which rules are skipped and why.
- **FS:** Simulation error → isolated to the panel; never blocks editing.
- **P:** Merchant, Store Manager (Pro+).

### 3.4 Live Pricing Engine — `PCP-PRC`

**PCP-PRC-1 — Fixed-amount price adjustment** · *MVP*
- *As a* merchant, *I want* options/values to add a fixed amount *so that* customizations are priced.
- **AC:** Per value or per option selection, add a fixed surcharge (currency-aware, ≥0 by default,
  negatives allowed only with an explicit "discount" toggle); preview reflects it instantly.
- **EC:** Currency differs from store currency → store currency is authoritative; conversions not
  assumed. Zero surcharge → no fee line.
- **FS:** Checkout recompute mismatch vs preview → server value wins; logged for analytics.
- **P:** Merchant, Store Manager.

**PCP-PRC-2 — Percentage price adjustment** · *Starter*
- *As a* merchant, *I want* percentage adjustments *so that* price scales with base price.
- **AC:** Percent of base product price (or of running configured subtotal — configurable);
  rounding rule configurable; preview + server agree.
- **EC:** Base price unknown (V3 fields not requested) → request fields or treat as 0 with a warning.
- **FS:** Division/precision error → safe rounding; never NaN into cart.
- **P:** Merchant (Starter+).

**PCP-PRC-3 — Formula pricing** · *Pro*
- *As a* merchant, *I want* formulas (e.g. width×height×rate) *so that* I can price by dimensions.
- **AC:** A sandboxed expression engine supports +,−,×,÷, parentheses, min/max/round, and references
  to numeric option keys; formulas are validated at save; evaluation is server-authoritative and
  bounded (<100ms).
- **EC:** Reference to a non-numeric/empty option → defined default (0) + validation hint. Divide by
  zero → guarded → rule-defined fallback.
- **FS:** Formula throws/timeout → fee = 0 for that rule + diagnostic; checkout not blocked by engine
  errors (only by Validations SPI).
- **P:** Merchant (Pro+). **Security:** no arbitrary code; whitelisted grammar only (doc 02 §Pricing).

**PCP-PRC-4 — Quantity / volume pricing** · *Pro*
- *As a* merchant, *I want* quantity breaks *so that* bulk orders price correctly.
- **AC:** Define quantity thresholds with per-unit or total adjustments; applied against line-item
  quantity; preview shows the active break.
- **EC:** Quantity below first threshold → base pricing. Overlapping thresholds → blocked at save.
- **FS:** Quantity missing at checkout → treat as 1 + recompute server-side.
- **P:** Merchant (Pro+).

**PCP-PRC-5 — Tier pricing** · *Pro*
- *As a* merchant, *I want* tiered pricing by selected value/range *so that* I can model good/better/
  best.
- **AC:** Tiers map values/ranges → adjustments; one active tier per rule; preview shows active tier.
- **EC:** Value matches no tier → no adjustment. Multiple tiers match → priority decides.
- **FS:** Tier lookup error → 0 adjustment + log.
- **P:** Merchant (Pro+).

**PCP-PRC-6 — Conditional pricing** · *Pro*
- *As a* merchant, *I want* price rules guarded by conditions *so that* surcharges apply only when
  relevant.
- **AC:** A pricing rule can carry the same condition grammar as PCP-RUL; applies only when conditions
  match; composes with other active pricing rules per a documented order.
- **EC:** Conditions reference hidden option → rule does not apply (hidden = not selected).
- **FS:** Condition eval error → rule skipped (no fee) + log.
- **P:** Merchant (Pro+).

**PCP-PRC-7 — Server-authoritative checkout pricing** · *MVP*
- *As the* system, *I want* the cart surcharge computed server-side *so that* totals can't be tampered.
- **AC:** The Additional Fees SPI computes per-line-item fees from stored rules via elevated data
  reads; price is a string; on any error returns `{additionalFees:[], currency}` (fail-open to no fee,
  never a wrong fee); fee labels are human-readable.
- **EC:** Line item without a configuration → no fee. Multiple configured items → per-line fees.
- **FS:** SPI exception/timeout → empty fees + log; checkout proceeds at base price (never blocks sale
  on engine error).
- **P:** System (elevated). *Satisfies the pricing-integrity NFR.*

**PCP-PRC-8 — Price preview performance** · *MVP*
- *As a* customer, *I want* the price to update in <100ms *so that* configuration feels instant.
- **AC:** Client preview recomputes within 100ms p95 on a mid-tier mobile device; no layout shift
  (CLS ≤ 0.005) when the price changes.
- **EC:** Very large rule sets → memoized evaluation; debounce rapid input.
- **FS:** Preview compute slow → show last value + subtle pending state; never block input.
- **P:** Customer (public).

### 3.5 Product Configurator (storefront) — `PCP-CFG`

**PCP-CFG-1 — Render configurator on product page** · *MVP*
- *As a* customer, *I want* the configurator on the product page *so that* I can customize before
  buying.
- **AC:** Site Plugin renders in the Stores product-page slot for mapped products; unmapped products
  show nothing; respects published (not draft) Option Sets; loads <2s p95.
- **EC:** Product mapped to a draft set → nothing renders on the live site. Stores uninstalled →
  graceful no-render + dashboard warning.
- **FS:** Config fetch fails → retry with backoff; show a non-blocking "options unavailable" notice;
  never break the product page.
- **P:** Customer (public read of published config). Widget must **not** render `<h1>` (App Market #55).

**PCP-CFG-2 — Multi-step configurator flow** · *Pro*
- *As a* customer, *I want* a stepped flow for complex products *so that* it isn't overwhelming.
- **AC:** Sections become steps with a progress indicator; next/back; per-step validation; final
  review step; single-page fallback for small sets.
- **EC:** Conditional rules hide an entire step → step is skipped and progress recalculated.
- **FS:** Step state lost (reload) → restored from draft persistence (PCP-CFG-3).
- **P:** Customer (Pro+ merchant feature).

**PCP-CFG-3 — Draft configuration persistence** · *Pro*
- *As a* customer, *I want* my in-progress configuration saved *so that* I don't lose work.
- **AC:** Draft persists across reloads for the session (and across devices if logged in); resume
  prompt on return; cleared on successful add-to-cart.
- **EC:** Anonymous customer → device/session scoped. Logged-in → member scoped.
- **FS:** Persistence backend error → fall back to in-memory; warn subtly.
- **P:** Customer; member-scoped reads require member auth.

**PCP-CFG-4 — Add configured item to cart** · *MVP*
- *As a* customer, *I want* to add my configuration to the cart *so that* I can purchase it.
- **AC:** Add-to-cart attaches the configuration (selections + computed preview) to the line item;
  server recomputes the fee (PCP-PRC-7); required-field validation passes (PCP-CFG-5) before add.
- **EC:** Same product, different configurations → distinct cart lines. Editing cart line → re-open
  configurator (V2) or replace line.
- **FS:** Cart attach fails → item not added; clear error; no orphaned fee.
- **P:** Customer (public).

**PCP-CFG-5 — Required-field enforcement at checkout** · *MVP*
- *As the* system, *I want* checkout blocked when required config is missing *so that* orders are
  fulfillable.
- **AC:** Validations SPI inspects each configured line; missing required fields block checkout with
  specific, localized messages; passing lines proceed.
- **EC:** Field became required after item was in cart → re-validated at checkout, customer is
  prompted to fix.
- **FS:** SPI error → fail-open is **not** allowed for hard-required legal fields; default policy is
  configurable (block vs warn) per merchant, defaulting to block for required fields.
- **P:** System (elevated).

**PCP-CFG-6 — Capture configuration onto the order** · *MVP*
- *As a* merchant, *I want* the exact configuration on the order *so that* I can fulfil it.
- **AC:** On order placement (order event/webhook), the configuration snapshot is written to
  `OrderConfigurations` (immutable), linked by order ID + line-item ID; visible in the dashboard order
  view and the order-configurations screen.
- **EC:** Partial order updates / cancellations → snapshot retained; status mirrored.
- **FS:** Snapshot write fails → retried via event redelivery; reconciliation job backfills; never
  lose the customer's spec.
- **P:** System (elevated write); Merchant/Store Manager read.

### 3.6 File Upload System — `PCP-UPL`

**PCP-UPL-1 — Upload a file as an option** · *Pro*
- *As a* customer, *I want* to upload artwork/spec files *so that* the merchant can produce my item.
- **AC:** Supported types incl. images, PDF, AI, PSD, ZIP; per-option constraints (types, max size,
  max count); progress + cancel; uploaded files stored in Wix Media; a signed reference saved in
  `Uploads` and attached to the configuration.
- **EC:** Disallowed type/oversized → rejected client-side with reason and **again** server-side.
  Mobile photo upload → supported.
- **FS:** Upload interrupted → resumable/retryable; partial files never attached.
- **P:** Customer (public create within constraints); Pro+ merchant feature.

**PCP-UPL-2 — Virus / malware scanning** · *Pro*
- *As the* system, *I want* uploads scanned *so that* merchants are protected.
- **AC:** Each upload is queued for scanning (external provider, **MA-4**); files are quarantined
  until clean; infected files are blocked and the customer is asked to re-upload; merchant never
  accesses an unscanned file.
- **EC:** Scanner slow → upload accepted as "pending scan", not attachable to a placed order until
  clean. Scanner down → configurable hold vs allow-with-flag (default hold).
- **FS:** Scan error → file held in quarantine + alert; documented manual override path.
- **P:** System (elevated). *Security requirement; see doc 02 §Upload security & doc 07.*

**PCP-UPL-3 — Merchant file management** · *Pro*
- *As a* store manager, *I want* to view/download configured-order files *so that* I can fulfil.
- **AC:** Files listed per order/configuration with scan status; download only clean files; bulk
  download per order.
- **EC:** File expired/retention-purged → shows status, not a broken link.
- **FS:** Download of a non-clean file → blocked with explanation.
- **P:** Merchant, Store Manager.

### 3.7 Visual Preview System — `PCP-VIS` *(V2)*

**PCP-VIS-1 — Layered image preview** · *V2 (Business)*
- *As a* customer, *I want* a live visual of my configuration *so that* I can see it before buying.
- **AC:** Option values map to image layers with z-order; selections compose a real-time preview;
  preview updates without layout shift; mobile-friendly.
- **EC:** Missing layer asset → skip layer gracefully. Conflicting layers → z-order/priority resolves.
- **FS:** Asset load failure → placeholder + retry; never block configuration.
- **P:** Customer (public); Business+ merchant feature.

**PCP-VIS-2 — Layer/asset management** · *V2 (Business)*
- *As a* merchant, *I want* to upload and map layer assets *so that* previews render correctly.
- **AC:** Upload assets to Wix Media; map value→layer + z-order + offset/scale; preview tester in
  dashboard.
- **EC:** Large asset sets → lazy load + CDN. Re-mapping → versioned, doesn't break existing orders.
- **FS:** Mapping save fails → optimistic revert.
- **P:** Merchant (Business+).

### 3.8 Analytics — `PCP-ANL`

**PCP-ANL-1 — Track configuration events** · *Pro*
- *As the* system, *I want* to record configuration events *so that* merchants get insight.
- **AC:** Events: configurator viewed, option changed, validation failed, file uploaded, add-to-cart,
  checkout started, purchased, abandoned; batched, privacy-safe (no PII beyond IDs), written to
  `AnalyticsEvents` with retention policy.
- **EC:** High traffic → batching + sampling configurable. Consent/Do-Not-Track → respect; drop or
  anonymize.
- **FS:** Event write fails → buffered/retried; analytics loss never affects storefront UX.
- **P:** System (elevated write).

**PCP-ANL-2 — Analytics dashboard** · *Pro*
- *As a* merchant, *I want* a dashboard *so that* I can see funnel + popular options.
- **AC:** Metrics: configurator views, completion rate, drop-off by step/option, most-selected values,
  revenue from configurations, average configured order value; date filters; empty state pre-data.
- **EC:** Sparse data → clear empty/low-data states, never misleading. Plan-gated advanced metrics
  (Business+).
- **FS:** Query failure → per-widget error + retry; rest of dashboard renders.
- **P:** Merchant, Store Manager (Pro+; advanced Business+).

### 3.9 Settings & Governance — `PCP-SET`

**PCP-SET-1 — App settings** · *MVP*
- *As a* merchant, *I want* a settings screen *so that* I can configure global behavior.
- **AC:** Settings: default currency display, rounding rule, required-field policy (block/warn),
  upload defaults, analytics consent mode, branding toggle (plan-gated); persisted in `Settings`;
  changes audit-logged. *(Settings UI satisfies App Market #107.)*
- **EC:** Invalid combos → validated. Reset to defaults available.
- **FS:** Save fails → no partial apply; toast.
- **P:** Merchant (full); Store Manager (read or limited per role).

**PCP-SET-2 — Audit logs** · *Enterprise (read/export); MVP (capture)*
- *As an* enterprise admin, *I want* an audit trail *so that* I can govern changes.
- **AC:** Every create/update/delete on domain entities + settings writes an `AuditLogs` entry
  (actor, action, entity, before/after summary, timestamp); Enterprise can view/filter/export; capture
  happens on all plans, **viewing/export** is Enterprise-gated.
- **EC:** High-volume changes → batched writes; retention policy enforced.
- **FS:** Audit write failure → must not silently drop on Enterprise; retried + alert.
- **P:** Capture: system. View/export: Enterprise admin.

### 3.10 Product Assignment — `PCP-MAP`

**PCP-MAP-1 — Assign Option Set to products** · *MVP*
- *As a* merchant, *I want* to map an Option Set to one/many products *so that* they show the
  configurator.
- **AC:** Search/select Stores products (V1 or V3 via catalog-version gate); map one Option Set per
  product (a product has at most one active set); mapping stores product **ID as TEXT**; bulk assign.
- **EC:** Product deleted in Stores → mapping flagged stale, excluded from storefront, surfaced to fix.
  Product already mapped → reassign confirms overwrite.
- **FS:** Stores query fails → retry; partial bulk assign reports per-item status.
- **P:** Merchant, Store Manager.

**PCP-MAP-2 — Bulk assignment by collection/category** · *Pro*
- *As a* merchant, *I want* to assign by collection/category *so that* I can scale.
- **AC:** Select a Stores collection (V1) / category (V3) → assign the Option Set to all members;
  preview count before applying; idempotent.
- **EC:** Members change later → optional auto-apply to new members (toggle) vs snapshot.
- **FS:** Partial failure → per-product status + safe re-run.
- **P:** Merchant (Pro+).

### 3.11 B2B / Quotes — `PCP-B2B` *(V3)*

**PCP-B2B-1 — Convert configuration to quote** · *V3 (Enterprise)*
- *As an* enterprise buyer, *I want* to request a quote from a configuration *so that* I can purchase
  at volume.
- **AC:** "Request quote" captures the configuration as a quote record; merchant reviews, adjusts
  pricing, approves → converts to an order/cart; status workflow (requested→quoted→approved→ordered).
- **EC:** Quote expiry; renegotiation creates a new version; audit-logged.
- **FS:** Conversion failure → quote retained; no double-charge.
- **P:** Enterprise buyer (create), Merchant (approve), audit-logged.

### 3.12 AI Assist — `PCP-AI` *(V4)*

**PCP-AI-1 — AI-suggested Option Set** · *V4 (Enterprise)*
- *As a* merchant, *I want* AI to draft an Option Set from a product description *so that* setup is
  faster.
- **AC:** Given product info, AI proposes options/values/rules/pricing as an **editable draft**
  (never auto-published); merchant reviews and accepts/edits.
- **EC:** Low-confidence suggestions flagged; merchant can regenerate.
- **FS:** AI service error → manual builder unaffected; graceful degrade.
- **P:** Merchant (Enterprise); suggestions are advisory only.

---

## 4. Cross-cutting requirements (NFRs → stories)

| NFR | Requirement | Verified by |
|-----|-------------|-------------|
| Performance | Price preview <100ms p95; configurator load <2s p95 | PCP-PRC-8, PCP-CFG-1 |
| Pricing integrity | Server-authoritative checkout pricing | PCP-PRC-7 |
| Stability | Storefront never breaks on app/engine error | PCP-CFG-1, PCP-PRC-7 |
| Accessibility | WCAG 2.2 AA; keyboard reorder; focus management | PCP-OPT-4, doc 05 |
| Visual integrity | CLS ≤ 0.005; no layout shift on price/preview change | PCP-PRC-8, PCP-VIS-1 |
| Security | Upload scanning; sandboxed formula engine; least-privilege data perms | PCP-UPL-2, PCP-PRC-3 |
| Compatibility | Stores V1 + V3 | PCP-MAP-1, doc 03 |
| Compliance | Demo data on install; no widget `<h1>`; settings UI; min permissions | PCP-ONB-1, PCP-CFG-1, PCP-SET-1, doc 07 |
| Auditability | Full change audit trail | PCP-SET-2 |

---

## 5. Versioning summary

| Version | Theme | Headline stories |
|---------|-------|------------------|
| **MVP** | Options + fixed pricing + configurator + cart integrity | ONB-1/2/3, OPT-1..6/12, PRC-1/7/8, CFG-1/4/5/6, MAP-1, SET-1 |
| **V2** | Logic + rich pricing + uploads + analytics + visual preview | RUL-1..5, PRC-2..6, UPL-1..3, ANL-1/2, OPT-7, MAP-2, VIS-1/2, CFG-2/3 |
| **V3** | B2B / quotes / governance | B2B-1, SET-2 (view/export) |
| **V4** | AI assist | AI-1 |

> Note: the PRD positions conditional logic, formula/tier/quantity pricing, uploads, templates, and
> analytics as **Pro**-tier features that are part of the post-MVP build waves (V2). Visual Preview and
> option-level inventory are **Business**-tier (V2); B2B/quotes and audit export are **Enterprise**
> (V3); AI is **V4**. Plan tier (what a merchant pays for) and build version (when we ship it) are
> tracked separately — see doc 06 for the build sequence and doc 03 §Billing for the plan→feature
> matrix.
