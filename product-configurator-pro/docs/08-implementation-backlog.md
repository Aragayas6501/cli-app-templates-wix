# 08 — Implementation Backlog

**Scope:** Phase 8. The execution-ready engineering backlog, decomposed **Epic → Feature → Story →
Technical Task → Test Task**. Every item is cross-referenced to the user stories (doc 01), TDD (doc 02),
collections (doc 04), UX screens (doc 05), and roadmap phase (doc 06).

**ID scheme:** `E#` epic · `F#.#` feature · stories reuse doc 01 IDs (`PCP-*`) · `T-*` technical task ·
`QA-*` test task. **Phase** = roadmap phase (doc 06). Tasks are written to be picked up without
re-reading the source PRD.

**Definition of Ready (every story):** referenced collections + web methods named; Sapphire screen +
components identified (doc 05); acceptance criteria from doc 01 attached.
**Definition of Done (every story):** code + tests merged; token-lint + visual-regression + axe gates
green (doc 05 §9); web methods use `Permissions.Admin`; no `alert/confirm`; docs/links updated.

---

## Epic index

| Epic | Title | Phase(s) | Wave |
|------|-------|----------|------|
| E1 | Foundation & App Shell | P1 | MVP |
| E2 | Data Layer & Persistence | P2 | MVP |
| E3 | Option Builder | P3 | MVP |
| E4 | Product Assignment (Stores V1/V3) | P3 | MVP |
| E5 | Conditional Logic Engine | P4 | V2 |
| E6 | Pricing Engine & Checkout SPIs | P5 | MVP→V2 |
| E7 | Storefront Configurator | P6 | MVP |
| E8 | Upload System | P7 | V2 |
| E9 | Analytics | P8 | V2 |
| E10 | Templates | P3/V2 | V2 |
| E11 | B2B Quotes & Audit (Enterprise) | P6/V3 | V3 |
| E12 | AI Assist | V4 | V4 |
| E13 | Marketplace Readiness | P9 | gate |
| E14 | Production Launch & Observability | P10 | gate |

---

## E1 — Foundation & App Shell (Phase 1)

**F1.1 Sapphire theme layer**
- `T-1.1.1` Build `SapphireThemeProvider` + scoped global token stylesheet mapping Sapphire tokens → WDS
  vars (doc 05 §2).
- `T-1.1.2` Implement Sapphire primitives: Canvas, Priority Status Rail, Detail Inspector Drawer, Empty
  State, Diagnostic Error Panel, Command Palette, button/form/table/card classes.
- `T-1.1.3` CI: token-lint (palette/spacing/font/radius/motion), visual-regression harness, axe harness.
- `QA-1.1.a` Token-lint fails on a seeded non-palette color / off-cadence spacing / non-SF font.
- `QA-1.1.b` Focus ring renders `rgba(0,82,255,0.34)` 3px, never hidden, on every primitive (keyboard).
- `QA-1.1.c` Visual-regression baseline captured; ≤0.25px drift threshold enforced.

**F1.2 App shell & navigation**
- `T-1.2.1` Init Wix CLI app; `wix.config.json`; scripts; `src/extensions.ts` bootstrap.
- `T-1.2.2` Overview page (S1) with nav/breadcrumb chrome (WDS structural), Status Rail, Command Palette.
- `QA-1.2.a` ⌘/Ctrl-K opens palette < 50ms; arrow-navigable; ESC closes with focus restore.
- `QA-1.2.b` Exactly one H1 on the dashboard page; no skipped heading levels (#55 dashboard side).

**F1.3 Billing gating**
- `T-1.3.1` `appInstance.ts`: `getAppInstanceElevated`, `isPremiumInstance`; plan→feature flag map (doc 03 §6).
- `T-1.3.2` `useFeatureFlags` hook; locked features render Sapphire Upgrade affordance → Wix pricing (#125).
- `QA-1.3.a` Free vs Pro vs Business vs Enterprise toggles correct feature visibility (mock instance).
- `QA-1.3.b` No cross-instance unlock; gating keyed to `instanceId` (#116).

**F1.4 Lifecycle events**
- `T-1.4.1` App Installed handler → seed Settings singleton + demo data (#37); App Removed → cleanup hook.
- `T-1.4.2` Site-duplication: copy settings/sets from `originInstanceId` when present (#122).
- `QA-1.4.a` Fresh install seeds one sample set + mapping; returns HTTP 200 (#114).
- `QA-1.4.b` Duplicated site links to origin and copies applicable content (#51/#122).

**F1.5 Shared engine scaffolds**
- `T-1.5.1` `@configurator/core` types; empty pure `rules-engine.ts`/`pricing-engine.ts`.
- `T-1.5.2` `stores-catalog.ts` abstraction with cached `getCatalogVersion()` + `STORES_NOT_INSTALLED` handling.
- `QA-1.5.a` `getCatalogVersion()` cached; V1 and V3 mock sites both resolve a version (#130/#120).

---

## E2 — Data Layer & Persistence (Phase 2)

**F2.1 Collections** (story `PCP-SET-*`, doc 04)
- `T-2.1.1` Generate Data Collection extensions for all 12 core collections with scoped IDs, fields,
  indexes (incl. unique), per-op permissions (doc 04 §2).
- `T-2.1.2` Generate V2/V3 extension collections (PreviewLayers, QuoteRequests) behind feature flags.
- `T-2.1.3` `Settings` singleton bootstrap; retention-policy config stubs (MA-7).
- `QA-2.1.a` Each collection created on install with correct scoped ID `<namespace>/<idSuffix>` (MA-1).
- `QA-2.1.b` Unique indexes reject duplicates at insert path; permission contexts verified per op.

**F2.2 Typed repositories**
- `T-2.2.1` `database.ts`-style repository per collection (mirrors `shipping-rates`); insert-path
  validation for required/unique/default (Wix Data has no field-level constraints).
- `T-2.2.2` Product IDs persisted as TEXT in `ProductMappings`; resolver via `stores-catalog.ts` (no
  Wix-entity references).
- `QA-2.2.a` Required-field omission rejected before insert with a typed error.
- `QA-2.2.b` Money fields persisted/read as strings without precision loss.

---

## E3 — Option Builder (Phase 3) — stories `PCP-OPT-*`

**F3.1 Option Set list (S2)**
- `T-3.1.1` Sapphire Table: search/filter/chips/sort/pagination/selection/bulk/row-actions + empty/
  loading/error/permission states + row-open inspector (doc 05 §6).
- `T-3.1.2` Web methods: list/create/clone/delete option sets (`Permissions.Admin`); React Query hooks + invalidation.
- `QA-3.1.a` Row hover exactly `rgba(0,82,255,0.08)`; prices/counts tabular numerals.
- `QA-3.1.b` Filtered-empty vs true-empty states differ (doc 05 §3.5).

**F3.2 Options tab (S3)** (`PCP-OPT-1..4`)
- `T-3.2.1` Ordered option list with drag **and** keyboard reorder; type picker (all option types).
- `T-3.2.2` Detail Inspector Drawer: label/key/help/required/default/type-config/validation; debounced autosave.
- `T-3.2.3` Section options for multi-step grouping; section-level save.
- `QA-3.2.a` Keyboard-only reorder works and is announced (#53).
- `QA-3.2.b` Resting builder viewport ≤7 interactive elements / ≤3 decisions (doc 05 §1).
- `QA-3.2.c` Autosave debounton; no layout shift on save (Δy ≤0.25px).

**F3.3 Publish & versioning (S8)**
- `T-3.3.1` Create/clone/delete/publish modals (Dashboard Modal; Pages can't host `<Modal/>`).
- `T-3.3.2` Draft→published version bump; child validation on publish.
- `QA-3.3.a` Publishing an invalid set is blocked with a Diagnostic Error Panel listing causes.
- `QA-3.3.b` Destructive actions use `#BF3003` + confirmation; never `confirm()` (#45).

**F3.4 Builder Preview tab (S7)**
- `T-3.4.1` Embed storefront core in advisory mode against the draft.
- `QA-3.4.a` Preview matches published behavior for the same selections (#170 parity).

---

## E4 — Product Assignment (Phase 3) — stories `PCP-MAP-*`

**F4.1 Assign tab (S6)**
- `T-4.1.1` Stores product picker via `stores-catalog.ts` (V1/V3 gated); current mappings Table with stale flags.
- `T-4.1.2` `ProductMappings` CRUD web methods; conflict handling (one active set per product scope).
- `T-4.1.3` Bulk assign by collection/category (V2) with preview count + per-item status.
- `QA-4.1.a` Assign + storefront flow verified on a V1 site **and** a V3 site (#130).
- `QA-4.1.b` `STORES_NOT_INSTALLED` shows setup guidance, not an error crash (#120).

---

## E5 — Conditional Logic Engine (Phase 4) — stories `PCP-RUL-*`

**F5.1 Rule evaluator**
- `T-5.1.1` `rules-engine.ts`: nested AND/OR trees; `evaluateRules(config, rules)` pure/deterministic;
  cycle detection; stable ordering.
- `QA-5.1.a` Golden-file suite: representative rule sets produce expected visibility/required/availability.
- `QA-5.1.b` Evaluation ≤16.67ms for a worst-case set; cyclic rules rejected at save.

**F5.2 Rule builder (S4)**
- `T-5.2.1` Condition-tree builder (combinator toggles, nestable groups), actions editor, Inspector Drawer.
- `T-5.2.2` Simulator panel (enter selections → live result); invalid-rule diagnostics.
- `T-5.2.3` `ConditionalRules` persistence + versioning; storefront wiring.
- `QA-5.2.a` Simulator output matches storefront engine for identical inputs (single-engine guarantee).
- `QA-5.2.b` Invalid rule shows actionable reasons; cannot be saved.

---

## E6 — Pricing Engine & Checkout SPIs (Phase 5) — stories `PCP-PRC-*`

**F6.1 Pricing evaluator**
- `T-6.1.1` `pricing-engine.ts`: composition order base→fixed→tier→quantity→percentage→formula→
  conditional→rounding; money-as-string; currency-safe.
- `T-6.1.2` Formula engine: **whitelisted grammar, no `eval`/`Function`**, bounded <100ms.
- `QA-6.1.a` Pricing golden-file suite (all strategies + combinations) matches expected totals.
- `QA-6.1.b` Malicious/invalid formula is rejected by the parser (no code execution) (#64/#78).
- `QA-6.1.c` Full price calc <100ms worst case; deterministic across client/server.

**F6.2 Pricing tab (S5)**
- `T-6.2.1` Per-type rule editors; inline formula validation (`aria-describedby`); live preview.
- `T-6.2.2` `PricingRules` CRUD web methods + hooks.
- `QA-6.2.a` Invalid formula shows error border + screen-reader text; save blocked.

**F6.3 Additional Fees SPI**
- `T-6.3.1` Generate `ECOM_ADDITIONAL_FEES` service plugin; `provideHandlers({ calculateAdditionalFees })`.
- `T-6.3.2` Read config via elevated query; per-line-item surcharge as STRING; **fail-open** to no fee on error.
- `QA-6.3.a` Configured line item shows correct surcharge at checkout; currency correct.
- `QA-6.3.b` Engine error returns `{additionalFees:[]}` (fail-open), never blocks checkout.

**F6.4 Validations SPI**
- `T-6.4.1` Generate `ECOM_VALIDATIONS` service plugin; **fail-closed** when required config missing.
- `QA-6.4.a` Missing required option blocks checkout with a clear violation message.
- `QA-6.4.b` Complete config passes validation.

---

## E7 — Storefront Configurator (Phase 6) — stories `PCP-CFG-*`

**F7.1 Delivery surfaces**
- `T-7.1.1` Site Plugin (W1, product-page slot, `reactToWebComponent`, `viewMode()`); Custom Element (W2).
- `T-7.1.2` Shared `@configurator/core`; full Sapphire CSS pipeline, zero WDS; no `<h1>` (#55).
- `QA-7.1.a` Renders only for mapped + published products; otherwise nothing.
- `QA-7.1.b` Responsive mobile/tablet/desktop; 44px touch targets; reduced-motion honored (#52).

**F7.2 Live behavior**
- `T-7.2.1` Selection state; rules-engine live visibility/required; pricing-engine advisory preview in a
  **fixed slot** (<100ms, CLS≤0.005).
- `T-7.2.2` Multi-step flow + progress rail (W3, V2) for large sets.
- `QA-7.2.a` Price/preview updates cause no layout shift (Δy≤0.25px).
- `QA-7.2.b` Storefront shows no high-priority alert rail (keeps host page calm).

**F7.3 Cart & order capture**
- `T-7.3.1` Add-to-cart writes configuration; checkout triggers Fees + Validations SPIs (server authority).
- `T-7.3.2` `Configurations` draft persistence; `OrderConfigurations` capture via order event/webhook.
- `QA-7.3.a` Server-recomputed price is authoritative; client preview advisory only.
- `QA-7.3.b` Completed order persists full selections + price breakdown (S11 shows them).

---

## E8 — Upload System (Phase 7) — stories `PCP-UPL-*`

**F8.1 Storefront upload (W4)**
- `T-8.1.1` Upload control: type/size allow-list, progress, inline validation, mobile photo capture.
- `T-8.1.2` Wix Media storage; signed short-lived URLs.
- `QA-8.1.a` Disallowed type/oversize rejected client + server with clear messaging.

**F8.2 Virus scan & quarantine**
- `T-8.2.1` External virus-scan integration (MA-4); `Uploads` scan-status states (pending/clean/failed).
- `T-8.2.2` Quarantine before merchant access; scan-failed files non-downloadable; graceful provider-outage degrade.
- `QA-8.2.a` Simulated infected file is quarantined and never downloadable by merchant.
- `QA-8.2.b` Scan-provider outage degrades gracefully (queued/pending, no data loss).

**F8.3 Merchant access (S11)**
- `T-8.3.1` Order inspector file list with scan status + per-order bulk download (clean only).
- `QA-8.3.a` Download enabled only for `clean`; signed URLs expire.

---

## E9 — Analytics (Phase 8) — stories `PCP-ANL-*`

**F9.1 Event capture**
- `T-9.1.1` Emit view/start/step/option-select/complete/add-to-cart to `AnalyticsEvents`; batched writes.
- `T-9.1.2` Consent gating: **no pre-consent tracking**; event-level non-PII default; retention (MA-7).
- `QA-9.1.a` No events/cookies before consent; consent toggle activates/deactivates correctly (#92/#97).

**F9.2 Analytics dashboard (S12)**
- `T-9.2.1` Metric Cards (views/completion/revenue/AOV), funnel, drop-off, option-popularity Table; date filter.
- `T-9.2.2` Per-tile Diagnostic Error Panel isolation; empty/low-data states.
- `QA-9.2.a` Metrics reconcile with seeded event fixtures; one failing tile doesn't break the page.

---

## E10 — Templates (Phase 3 / V2) — stories `PCP-OPT` (templates)

**F10.1 Template gallery (S9)**
- `T-10.1.1` Save set as `Templates`; instantiate template → new draft set; gallery cards + Inspector.
- `QA-10.1.a` Instantiated set is independent (no shared mutation with template).

---

## E11 — B2B Quotes & Audit (Phase 6 / V3, Enterprise) — `PCP-B2B-*`

**F11.1 Request-a-quote (W6, S15)**
- `T-11.1.1` Storefront quote CTA + flow; `QuoteRequests` persistence; dashboard Quotes list + detail.
- `QA-11.1.a` Quote captures full configuration + price snapshot; status workflow transitions valid.

**F11.2 Audit logs (S14)**
- `T-11.2.1` Write `AuditLogs` on config-affecting changes; Operational Timeline view + filters + export.
- `QA-11.2.a` Every create/update/delete/publish writes an immutable audit entry; export matches filter.

---

## E12 — AI Assist (V4, Enterprise) — `PCP-AI-*`

**F12.1 AI draft review (S17)**
- `T-12.1.1` Generate proposed option set/rules from a prompt; render as a **reviewable draft** (never auto-publish).
- `QA-12.1.a` AI output lands as an editable draft; merchant must explicitly review/publish.

---

## E13 — Marketplace Readiness (Phase 9)

**F13.1 Review gates** (doc 07)
- `T-13.1.1` Run/clear doc 07 §10 submission checklist; map each result to its taxonomy ID.
- `T-13.1.2` Sapphire-over-WDS pre-submission review sign-off (doc 07 §9.2).
- `T-13.1.3` Reduce permission scopes to minimum-used set (#111/#112; MA-6).
- `QA-13.1.a` Per-plan checkout (purchase/upgrade/cancel) verified (#33).
- `QA-13.1.b` Signed-instance + `signDate` enforced on every web method/SPI (#74/#76).
- `QA-13.1.c` No `alert/confirm`; no widget `<h1>`; demo data on install; webhooks 200 (#45/#55/#37/#114).
- `QA-13.1.d` Browser/device matrix + V1/V3 + duplication paths pass (#59/#60/#61/#130/#122).
- `QA-13.1.e` Token-lint + visual-regression + axe + CLS/perf gates green; zero console errors (#48/#49).

---

## E14 — Production Launch & Observability (Phase 10)

**F14.1 Release & rollback**
- `T-14.1.1` `wix app release`; phased rollout; documented rollback.
- `QA-14.1.a` Rollback restores prior release cleanly in a drill.

**F14.2 Observability & support**
- `T-14.2.1` Structured logs; alarms for SPI error-rate/latency (fail-open fees, validation blocks),
  upload-scan failures, install/billing funnels.
- `T-14.2.2` Support runbook (Stores-not-installed, scan outage, pricing dispute, V1/V3 edge cases).
- `QA-14.2.a` Synthetic SPI error triggers an alarm; runbook entry resolves it.

---

## Cross-reference matrix (story → epic/feature → phase → key collections/SPIs)

| Story group (doc 01) | Epic/Feature | Phase | Collections / SPIs |
|----------------------|--------------|-------|--------------------|
| `PCP-ONB-*` | E1 F1.2/F1.4 | P1 | Settings; App Installed |
| `PCP-OPT-*` | E3 | P3 | OptionSets, Options |
| `PCP-MAP-*` | E4 | P3 | ProductMappings (TEXT ids) |
| `PCP-RUL-*` | E5 | P4 | ConditionalRules; rules-engine |
| `PCP-PRC-*` | E6 | P5 | PricingRules; AdditionalFees + Validations SPI |
| `PCP-CFG-*` | E7 | P6 | Configurations, OrderConfigurations |
| `PCP-UPL-*` | E8 | P7 | Uploads; Media + virus scan (MA-4) |
| `PCP-ANL-*` | E9 | P8 | AnalyticsEvents |
| `PCP-SET-*` | E2 | P2 | all collections; Settings |
| `PCP-VIS-*` | E7 F7.x + S16 | P6/V2 | PreviewLayers |
| `PCP-B2B-*` | E11 | P6/V3 | QuoteRequests, AuditLogs |
| `PCP-AI-*` | E12 | V4 | OptionSets/ConditionalRules (draft) |

Every `T-*`/`QA-*` inherits the Definition of Ready/Done above and the Sapphire compliance gates
(doc 05 §9) and Marketplace gates (doc 07 §10).
