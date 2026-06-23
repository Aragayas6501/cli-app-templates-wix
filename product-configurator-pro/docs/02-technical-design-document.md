# 02 — Technical Design Document (TDD)

**Scope:** Phase 3 (feature architecture). For each feature: **architecture**, **UX flow**, **data
models** (→ doc 04), **APIs** (web-method / SPI signatures), **validation**, and **performance**.
Type signatures are illustrative TypeScript to fix contracts — not final code. Story IDs reference
doc 01; collections reference doc 04; extensions reference doc 03.

**Shared engines (used by multiple features):** `rules-engine.ts` and `pricing-engine.ts` are pure,
isomorphic modules imported by both the storefront (preview) and backend SPIs (authoritative). This
"one engine, two call sites" rule is the backbone of every feature below.

```ts
// rules-engine.ts (pure)
type Selections = Record<string /*optionKey*/, string | string[] | number | UploadId | null>;
interface RuleContext { options: OptionMeta[]; rules: ConditionalRule[]; settings: SafeSettings; }
interface DerivedState { visible: Record<string, boolean>; required: Record<string, boolean>;
  availableValues: Record<string, string[]>; setValues: Selections; diagnostics: Diagnostic[]; }
function evaluateRules(sel: Selections, ctx: RuleContext): DerivedState;

// pricing-engine.ts (pure)
interface PriceContext { basePrice: string; currency: string; rules: PricingRule[];
  quantity: number; settings: SafeSettings; }
interface PriceResult { lineFees: { code: string; name: string; price: string }[];
  total: string; breakdown: PriceLine[]; diagnostics: Diagnostic[]; }
function evaluatePrice(sel: Selections, derived: DerivedState, ctx: PriceContext): PriceResult;
```

Both engines are **deterministic, I/O-free, and bounded** (≤100ms). On any internal error they return a
safe result (no-op visibility / zero fee) plus a `diagnostic`, never throw into the host.

---

## 1. Option Builder (`PCP-OPT`)

### 1.1 Architecture
- **Dashboard page** "Option Set Builder" (`DASHBOARD_PAGE`) with the Detail Inspector Drawer pattern:
  left = ordered option list (drag/keyboard reorder), right = inspector for the selected option.
- **Local draft reducer** holds the in-progress set; autosave debounced (800ms) via web methods.
- **Optimistic list CRUD** via `@wix/patterns` actions (adopted from `custom-products-catalog`).
- Option **values embedded** in `Options.values` (doc 04 §2.2) — no separate fetch.

### 1.2 UX flow
Create set → add option (pick type) → configure in inspector (label, key auto-from-label, help,
required, default, type config, validation) → reorder/group into sections → preview → publish.
Publish bumps `OptionSets.version` and flips `status=published` (storefront reads published only).

### 1.3 Data models
`OptionSets`, `Options` (with embedded `values`, `validation`). Ordering authoritative via
`OptionSets.optionOrder` + `Options.order`.

### 1.4 APIs (`option-sets.web.ts`)
```ts
createOptionSet(input: { name: string }): Promise<OptionSet>            // Permissions.Admin
updateOptionSet(id: string, patch: Partial<OptionSet>): Promise<OptionSet>
cloneOptionSet(id: string): Promise<OptionSet>                          // PCP-OPT-6 (transactional)
publishOptionSet(id: string): Promise<{version:number}>                // validates all children
addOption(setId: string, option: NewOption): Promise<Option>
updateOption(id: string, patch: Partial<Option>): Promise<Option>
reorderOptions(setId: string, orderedIds: string[]): Promise<void>      // PCP-OPT-4
deleteOption(id: string): Promise<void>
listOptionSets(query: ListQuery): Promise<Paged<OptionSet>>
getBuilderBundle(setId: string): Promise<BuilderBundle>                 // set+options+rules+pricing
```
All gated by `entitlements` server-side (e.g. `createOptionSet` checks Free 1-set cap → `PCP-OPT-12`).

### 1.5 Validation
Insert-path `validateAndWrite` (doc 04 §6): unique name/slug/key; type-specific config (swatch needs
values; number min≤max; valid regex); publish blocks if any child `isValid=false`. Drafts may be
invalid.

### 1.6 Performance
Builder bundle is one round-trip; option list virtualizes at 16+ items; reorder is optimistic.
Publish runs full validation server-side (bounded). Storefront never reads the builder bundle (it reads
the denormalized published bundle, §4.6).

---

## 2. Conditional Logic Engine (`PCP-RUL`)

### 2.1 Rule-builder architecture
- **Dashboard page/section** "Conditional Rules" with a **visual condition-tree builder**: combinator
  toggles (ALL/ANY), condition rows (option → operator → value), nestable groups, and an **actions**
  editor (show/hide/require/optional/set_value/set_available_values).
- Persisted as `ConditionalRules.conditionTree` (`OBJECT`) + `actions` (`ARRAY`) (doc 04 §2.3).
- A **simulator panel** (PCP-RUL-5) runs `evaluateRules` on merchant-entered selections live.

### 2.2 Nested condition support
`conditionTree` is a recursive structure:
```ts
type Operator = 'eq'|'neq'|'in'|'nin'|'gt'|'gte'|'lt'|'lte'|'empty'|'nempty'|'contains';
interface Condition { optionKey: string; op: Operator; value?: unknown; }
interface Group { combinator: 'ALL'|'ANY'; conditions: Condition[]; groups: Group[]; }
```
Max depth default 5 (configurable, validated at save). References options by **key** (stable across
reorder/rename of labels).

### 2.3 Rule-evaluation engine
- **Topological + priority-ordered**: rules sorted by `priority`; each rule's tree evaluated
  depth-first with **short-circuit** (ALL stops on first false, ANY on first true).
- **Action application**: actions mutate a working `DerivedState`; later (higher-priority) rules win on
  conflict (PCP-RUL-4). A `hide` suppresses `require` for that option (PCP-RUL-1 EC).
- **Cycle/precedence safety**: a dependency graph is built at **save** time; cycles (A hides B hides A)
  are detected and the merchant is warned; at **runtime** evaluation is bounded (single pass over
  priority-ordered rules + capped fixpoint iterations) so it can never flicker or loop.
- **Invalid-rule isolation**: rules with `isValid=false` (dangling key, empty group) are excluded;
  evaluation never throws.

### 2.4 Performance
- Engine is memoized on `(selectionsHash, ruleSetVersion)`.
- Storefront debounces rapid input (e.g. typing in a number that gates rules).
- Evaluation is O(rules × avg-conditions) with short-circuit; bounded well under the 16.67ms frame
  budget for typical sets; large sets pre-index conditions by `optionKey` so only rules referencing the
  changed option re-evaluate.

### 2.5 APIs (`rules.web.ts`)
```ts
listRules(setId: string): Promise<ConditionalRule[]>
saveRule(setId: string, rule: RuleInput): Promise<ConditionalRule>   // validates + cycle-check
deleteRule(id: string): Promise<void>
simulateRules(setId: string, selections: Selections): Promise<DerivedState>  // PCP-RUL-5
```
All `Permissions.Admin` + Pro entitlement.

---

## 3. Live Pricing Engine (`PCP-PRC`)

### 3.1 Pricing architecture
The authoritative price never originates on the client. Flow:
1. Client `evaluatePrice` → **preview** only (advisory, shown to customer).
2. On checkout, the **Additional Fees SPI** re-reads `PricingRules` (elevated) and runs the **same**
   `evaluatePrice` → returns string fees per line. Preview is discarded.

### 3.2 Composition order (documented + unit-tested)
```
base product price
 → fixed adjustments
 → tier adjustments
 → quantity/volume adjustments
 → percentage adjustments (of product or running subtotal per rule.config.base)
 → formula adjustments
 → conditional adjustments (guarded by conditionTree)
 → final rounding (Settings.roundingRule)
```
Each step is a pure reducer over enabled, valid, applicable rules sorted by `priority`.

### 3.3 Formula engine (security-critical)
- **Whitelisted grammar only** — numbers, `+ - * / ( )`, and functions `min, max, round, ceil, floor,
  abs`, plus references to **numeric option keys**. No identifiers resolve to host objects; **no
  `eval`, no `Function`**. Implemented as a small parser → AST → interpreter.
- Validated at save (parse + variable existence + type). At runtime: missing/empty variable → default 0
  + diagnostic; divide-by-zero guarded → rule fallback; timeout/step-cap → fee 0 + diagnostic.
- Bounded execution (node/iteration caps) guarantees <100ms.

### 3.4 Quantity, tier, conditional pricing
- **Quantity** (`config.breaks`): pick the break matching line quantity; per-unit × qty or flat.
  Non-overlapping breaks enforced at save.
- **Tier** (`config.tiers`): map selected value/range → adjustment; one active tier (priority breaks
  ties).
- **Conditional**: any rule may carry a `conditionTree`; applies only if it matches the current
  selections **and** the target option is visible (hidden = not selected).

### 3.5 Calculation strategy & integrity
```ts
// Additional Fees SPI handler (server-authoritative)
async function calculateAdditionalFees(payload: AdditionalFeesPayload): Promise<AdditionalFeesResponse> {
  try {
    const version = await getCatalogVersion();                 // cached
    const lines = payload.lineItems;
    const fees = [];
    for (const line of lines) {
      const cfg = await elevate(getConfigForCartLine)(line);    // Configurations by cartLineRef
      if (!cfg) continue;                                       // no config → no fee
      const rules = await elevate(getPricingRules)(cfg.optionSetId);
      const base = await elevate(resolveBasePrice)(line, version);
      const res = evaluatePrice(cfg.selections, deriveFor(cfg), { basePrice: base, /*...*/ });
      for (const f of res.lineFees) fees.push({ ...f, lineItemId: line.id, price: f.price /* string */ });
    }
    return { additionalFees: fees, currency: payload.currency };
  } catch (e) {
    logDiagnostic('additional-fees', e);
    return { additionalFees: [], currency: payload.currency }; // FAIL-OPEN: never a wrong fee
  }
}
```
- **Price is a string**; store currency authoritative; no implicit FX.
- **Fail-open to no fee** on any error (never block a sale on a pricing bug; under-charge risk is logged
  and surfaced in analytics for the merchant).

### 3.6 Performance
Preview <100ms p95 (memoized, debounced); SPI adds minimal latency (cached catalog version, indexed
reads by `optionSetId`/`cartLineRef`, engine bounded). SPI is side-effect-free.

---

## 4. Product Configurator (storefront) (`PCP-CFG`)

### 4.1 Delivery & multi-step flow
- **Two thin shells, one core:** `SITE_PLUGIN` (product-page slot) and `CUSTOM_ELEMENT` both mount
  `@configurator/core`. `viewMode()` renders an editor-safe placeholder in the Wix editor.
- **Flow controller:** if the set has `section` options and `multiStep` is on → render steps with a
  progress rail; else single page. Conditional rules can hide an entire step → it's skipped and
  progress recalculated (PCP-CFG-2 EC).

### 4.2 State management
```ts
interface ConfigurationState {
  productId: string; optionSetId: string; optionSetVersion: number;
  selections: Selections; derived: DerivedState; previewPrice: string;
  step: number; uploads: Record<string, UploadId>; dirty: boolean;
}
```
Serializable → persisted as a draft (`Configurations`, doc 04 §2.7) and attached to the cart line on
add. Reducer actions: `select`, `setValue`, `clear`, `nextStep`, `prevStep`, `attachUpload`,
`hydrateDraft`.

### 4.3 Draft persistence (PCP-CFG-3)
- Anonymous → `sessionId` scope; logged-in → `memberId` scope. Saved on debounce; resume prompt on
  return; cleared on successful add-to-cart. Backend failure → in-memory fallback + subtle warning.

### 4.4 Validation architecture
- **Client (advisory):** `evaluateRules` + per-field validation give instant feedback; block local
  "add to cart" if required-visible fields are empty.
- **Server (authoritative):** the **Validations SPI** re-checks required-visible fields at checkout:
```ts
async function validate(payload: ValidationsPayload): Promise<ValidationsResponse> {
  const violations = [];
  for (const line of payload.lineItems) {
    const cfg = await elevate(getConfigForCartLine)(line);
    if (!cfg) continue;
    const derived = deriveFor(cfg);                       // same rules-engine
    for (const opt of requiredVisibleOptions(cfg, derived)) {
      if (isEmpty(cfg.selections[opt.key])) violations.push({
        lineItemId: line.id, message: friendly(opt) });   // localized, field-level
    }
  }
  // requiredFieldPolicy: 'block' (default) → return violations; 'warn' → return warnings
  return policyToResponse(violations, settings.requiredFieldPolicy);
}
```
Required fields **fail-closed** (block) by default (contrast with pricing's fail-open) because an
unfulfillable order is worse than a blocked checkout.

### 4.5 Add-to-cart & order capture
- Add-to-cart attaches `configurationId` to the eCom line (`cartLineRef` stored back on the
  Configuration). Distinct configurations → distinct cart lines (PCP-CFG-4 EC).
- On `Order Created` (`EVENT`), write immutable `OrderConfigurations` (idempotent by
  `orderId+lineItemId`); a reconciliation sweep backfills any missed capture (PCP-CFG-6 FS).

### 4.6 Performance (load <2s, CLS ≤ 0.005)
- Storefront fetches **one denormalized published bundle** by `productId` (set + options + valid rules
  + valid pricing + preview layers), cacheable, avoiding N+1 (doc 04 §5).
- Skeleton reserves layout space (no shift); price updates occupy a fixed slot; images lazy-load with
  intrinsic sizing. Engines memoized; inputs debounced.

---

## 5. File Upload System (`PCP-UPL`)

### 5.1 Upload architecture
- File option renders an uploader that requests a **scoped upload token** from `uploads.web.ts`, uploads
  to **Wix Media**, then records metadata in `Uploads` (`scanStatus=pending`, `quarantined=true`).
- Client validates type/size/count first; **server re-validates** (never trust the client).

### 5.2 Storage strategy
- Binaries in Wix Media; only **signed references** in `Uploads.mediaRef`. Files are linked to a
  `Configurations` record (and later `OrderConfigurations.uploadRefs`).

### 5.3 Virus scanning (security requirement, MA-4)
```
upload → Uploads(pending, quarantined) → enqueue scan
       → external scanner → scan-callback (BACKEND_API) → update scanStatus
       → clean: quarantined=false (attachable/downloadable)
       → infected: block + purge binary + log + ask re-upload
       → error/timeout: status=held (configurable: hold [default] | allow-with-flag)
```
- `scan-callback.ts` (`BACKEND_API`) **verifies the signed instance** and a provider signature before
  trusting the result.
- A file may **not** be downloaded by the merchant or finalized onto a placed order unless
  `scanStatus=clean` (PCP-UPL-2/3).

### 5.4 Validation & security
- Allowed types/size/count from the option's `validation`; filename sanitized; MIME sniffed server-side
  (not just extension). Quarantine until clean. Infected binaries purged immediately. Retention per
  `Settings.retention` (doc 04 §7).

### 5.5 APIs (`uploads.web.ts`)
```ts
issueUploadToken(input:{ optionKey:string; configurationId?:string; mime:string; size:number }):
  Promise<{ token: string; mediaTarget: string }>            // validates constraints
finalizeUpload(input:{ mediaRef:string; ... }): Promise<Upload>  // creates Uploads(pending)
listOrderFiles(orderId: string): Promise<Upload[]>           // Admin; clean-only download links
// scan-callback: POST /api/scan-callback (BACKEND_API, signed)
```

---

## 6. Visual Preview System (`PCP-VIS`, V2)

### 6.1 Rendering strategy
- **Layered composition**: each selected value maps to a `PreviewLayers` asset with `zIndex` +
  `transform`; the configurator composites them (stacked `<img>`/`<canvas>`), updating on selection.
- Real-time, **no layout shift** (fixed preview frame), mobile-friendly; missing layer → skipped
  gracefully; conflicting layers resolved by `zIndex`/priority.

### 6.2 Asset management
- Merchant uploads layer assets to Wix Media and maps value→layer + z-order + transform in a dashboard
  tester (`PreviewLayers`, doc 04 §3.1). Re-mapping is versioned so existing order snapshots are
  unaffected.

### 6.3 Real-time updates & performance
- Layers preloaded/lazy via CDN; compositing memoized on selection hash; capped layer count per set;
  uses `requestAnimationFrame` batching to stay within the frame budget. Business+ gated.

---

## 7. Analytics (`PCP-ANL`)

### 7.1 Event architecture
- Storefront/core emits typed events to `analytics.web.ts` (batched, debounced) → elevated batched
  insert into `AnalyticsEvents` (doc 04 §2.9). Respects consent/DNT (drop or anonymize); no PII beyond
  a salted `sessionHash`.

### 7.2 Tracking plan
| Event | Emitted when | Key payload |
|-------|--------------|-------------|
| `viewed` | configurator mounts | productId, optionSetId |
| `option_changed` | selection changes | optionKey, valueKey |
| `validation_failed` | required-visible empty at add | optionKey |
| `file_uploaded` | upload finalized | optionKey, sizeBytes |
| `add_to_cart` | item added | previewPrice |
| `checkout_started` | checkout begins | line count |
| `purchased` | order created | authoritative total |
| `abandoned` | draft TTL elapses w/o cart | last step |

### 7.3 Dashboard metrics
- Funnel (viewed→changed→add_to_cart→purchased), completion rate, drop-off by step/option,
  most-selected values, revenue from configurations, average configured order value; date filters;
  explicit empty/low-data states (PCP-ANL-2 EC). Advanced metrics Business+.
- Charts follow the `chart-widget` template approach + React Query; queries are pre-aggregated where
  possible to cap read volume. Per-widget error isolation.

### 7.4 APIs (`analytics.web.ts`)
```ts
trackBatch(events: AnalyticsEventInput[]): Promise<void>      // elevated, batched, consent-checked
queryFunnel(range: DateRange, filter?: AnalyticsFilter): Promise<FunnelResult>   // Admin
queryOptionPopularity(setId: string, range: DateRange): Promise<PopularityResult>
queryRevenue(range: DateRange): Promise<RevenueResult>
```

---

## 8. B2B / Quotes (`PCP-B2B`, V3)

### 8.1 Architecture
- "Request quote" on the storefront captures the current `Configurations` into a `QuoteRequests`
  record (doc 04 §3.2) with status `requested`. Merchant reviews in a dashboard page, adjusts pricing
  (`quotedBreakdown`), and approves → converts to a cart/order. Status workflow
  `requested→quoted→approved→ordered`; expiry; renegotiation = new `version`. Every transition
  audit-logged.

### 8.2 APIs
```ts
requestQuote(configurationId: string): Promise<QuoteRequest>          // buyer (scoped)
quoteRespond(id: string, breakdown: PriceBreakdown, expiresDate: Date): Promise<QuoteRequest> // Admin
approveQuote(id: string): Promise<QuoteRequest>                        // Admin
convertQuoteToOrder(id: string): Promise<{ orderId: string }>         // Admin; idempotent
```

### 8.3 Validation/performance
Conversion idempotent (no double-charge); expired quotes blocked from conversion; audit trail mandatory
(Enterprise).

---

## 9. AI Assist (`PCP-AI`, V4)

### 9.1 Architecture
- Given product info, an AI service proposes an Option Set **draft** (options/values/rules/pricing) that
  is **never auto-published** — it populates the builder for merchant review (PCP-AI-1). Low-confidence
  items flagged; regenerate supported. AI failure leaves the manual builder fully functional.
- The AI integration is isolated behind a web method; outputs pass through the **same insert-path
  validation** as manual edits (no privileged bypass).

### 9.2 API
```ts
suggestOptionSet(input:{ productId?:string; description:string }): Promise<DraftOptionSet>  // Admin, Enterprise
```

---

## 10. Cross-cutting technical concerns

| Concern | Approach |
|--------|----------|
| **Idempotency** | Order capture + scan callbacks keyed by natural unique indexes (doc 04). |
| **Elevation** | `auth.elevate` only in SPIs/events/system reads; never to widen client perms. |
| **Tenant isolation** | Every record carries `instanceId`; reads filtered by it + `_owner`. |
| **Signed instance** | External endpoints (scan callback) verify signed instance + provider sig. |
| **Stores V1/V3** | All product/price/category reads go through `catalog.ts` (version-gated). |
| **Error budget** | Storefront fail-safe; pricing fail-open; required-validation fail-closed. |
| **i18n** | Validation/checkout messages localized; labels merchant-authored. |
| **Testing** | Engines unit-tested (pure); SPIs contract-tested; flows e2e (doc 08 test tasks). |
| **Observability** | Structured logs + AuditLogs + SPI/engine metrics (doc 03 §5.7). |

---

## 11. Performance budget summary

| Surface | Budget | Mechanism |
|---------|--------|-----------|
| Price preview | <100ms p95 | memoized pure engine, debounced input, bounded formula |
| Configurator load | <2s p95 | single denormalized bundle, lazy assets, skeletons |
| Visual integrity | CLS ≤ 0.005 | fixed slots for price/preview, intrinsic image sizing |
| Interaction | ≤16.67ms/frame | indexed re-eval (only rules touching the changed option) |
| Checkout SPI | minimal added latency | cached catalog version, indexed reads, side-effect-free |
