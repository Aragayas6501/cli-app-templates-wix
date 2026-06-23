# Product Configurator Pro — Enterprise Implementation Blueprint

> **Status:** Blueprint / pre-implementation. This folder contains the complete architecture
> documentation set for **Product Configurator Pro**, a Wix Stores app for advanced product options,
> conditional logic, and live pricing, targeting a top-tier Wix App Market listing.
>
> **This is documentation, not application code.** No extensions have been scaffolded yet. The
> engineering team (or an autopilot fleet) executes the build from these specs.

---

## Why this blueprint exists

Product Configurator Pro lets merchants attach configurable options (dropdowns, swatches, text,
file uploads, etc.) to Wix Stores products, drive option visibility with conditional rules, and
compute live prices that flow correctly into the cart and order. The blueprint reverse-engineers the
patterns Wix uses in its own CLI app templates so the app behaves like a native Wix product, and it
maps every screen onto the **Sapphire Precision** design system.

Three evidence bases ground every recommendation:

1. **Repository templates** — `shipping-rates` (full-stack gold standard), `custom-products-catalog`,
   `inventory-countdown`, `chart-widget`, `mixpanel-analytics`, `site-popup`.
2. **Wix platform** — CLI extension model, Wix Data, Stores V1/V3, billing/app-instance, service
   plugins (Additional Fees, Validations), App Market review taxonomy.
3. **Product inputs** — the Product Configurator Pro PRD and the Sapphire Precision design system.

---

## Document map

Read in this order. Docs 01 and 03 are the foundation; the rest build on them.

| # | Document | Covers (PRD task phase) |
|---|----------|--------------------------|
| [00](./00-README.md) | This index, glossary, manual action items | — |
| [01](./01-product-requirements-analysis.md) | Business analysis, personas, user stories | Phase 2 |
| [02](./02-technical-design-document.md) | Feature-by-feature technical design (MVP + V2/V3/V4) | Phase 3 |
| [03](./03-system-architecture.md) | Platform analysis, extension map, frontend/backend services | Phase 1 + 4 |
| [04](./04-database-design-specification.md) | All 12 core (+2 V2/V3 extension) collections: fields, indexes, permissions, retention | Phase 4 |
| [05](./05-ux-architecture-specification.md) | IA, screens, flows, Sapphire component mapping | Phase 5 |
| [06](./06-engineering-roadmap.md) | 10-phase delivery plan | Phase 6 |
| [07](./07-marketplace-readiness-report.md) | App Market checklists mapped to taxonomy IDs | Phase 7 |
| [08](./08-implementation-backlog.md) | Epic → Feature → Story → Task → Test | Phase 8 |

---

## Architectural pillars (one-line each)

- **Native by mimicry** — mirror `shipping-rates`: backend data layer over `@wix/data`, type-safe
  `webMethod` RPC, React Query hooks, `appInstances` billing gating, `provideHandlers` SPIs.
- **Server-authoritative pricing** — the storefront preview is advisory; the **Additional Fees SPI**
  computes the real surcharge at checkout so totals can never be tampered with client-side.
- **Required-field enforcement** — the **Validations SPI** blocks checkout when mandatory
  configuration is missing.
- **Dual delivery on the storefront** — a **Site Plugin** (native slot on the Stores product page)
  and a **Custom Element** widget share one Sapphire-skinned React core.
- **Wix Data within its rules** — no references to Wix entities (product IDs stored as TEXT),
  validation at the insert path, unique constraints via indexes, IDs scoped to the app namespace.
- **Stores V1 + V3** — every Stores call gates on `getCatalogVersion()`; both catalogs supported
  (App Market requirement #130).
- **Sapphire Precision everywhere** — Sapphire is the visual source of truth on every surface; WDS is
  used only as a structural primitive, skinned to Sapphire tokens (see risk note below).

---

## Glossary

### Product / domain terms (from the PRD)

| Term | Meaning |
|------|---------|
| **Option Set** | A reusable group of options that can be assigned to one or more products. |
| **Option** | A single configurable input (dropdown, swatch, text, number, file upload, etc.). |
| **Option Value** | A selectable choice within an option (e.g. "Red", "Large"). |
| **Conditional Rule** | A logic rule that shows/hides/requires an option based on other selections. |
| **Pricing Rule** | A rule that adjusts price (fixed, percent, formula, tier, quantity, conditional). |
| **Product Mapping** | The association between an Option Set and a Wix Stores product. |
| **Configuration** | A customer's in-progress or completed set of option selections for a product. |
| **Order Configuration** | The immutable snapshot of a configuration captured onto a placed order. |
| **Template** | A saved, reusable Option Set preset merchants can clone. |

### Sapphire Precision canonical terms (frozen — synonyms forbidden)

| Canonical | Do **not** say |
|-----------|----------------|
| **Adaptive Substrate** | "card" (in design discussion) |
| **Sapphire Canvas** | "background", "page area" |
| **Priority Status Rail** | "status bar", "badges row" |
| **Detail Inspector Drawer** | "side panel", "flyout" |
| **Filter Command Bar** | "toolbar", "filter row" |
| **Visual Silence** | "minimalism", "whitespace" |

*(Component-level mapping lives in doc 05; this table only fixes vocabulary.)*

---

## Consolidated manual action items

These cannot be resolved in the blueprint and must be done by a human during execution. Each downstream
doc references this list rather than repeating it.

| # | Action | Needed for | Where used |
|---|--------|-----------|------------|
| MA-1 | Obtain the **app namespace** from Wix Dev Center | Scoping Data Collection IDs (`<namespace>/<idSuffix>`) | Doc 04 |
| MA-2 | Create the app in Dev Center; capture `appId` / `projectId` into `wix.config.json` | All extension scaffolding | Doc 03, 06 |
| MA-3 | Define **billing plans** (Free / Starter $15 / Pro $39 / Business $79 / Enterprise $199) in Dev Center | Billing gating, vendor product IDs | Doc 01, 03, 07 |
| MA-4 | Select & provision an **external virus-scanning provider** for uploads | File Upload System security | Doc 02, 07 |
| MA-5 | Configure **App Market listing** assets (icon, screenshots, privacy policy, support URL) | Submission | Doc 07 |
| MA-6 | Request **Stores V1 + V3 permission scopes** and eCom SPI permissions in Dev Center | Stores read + checkout SPIs | Doc 03, 07 |
| MA-7 | Provision **analytics retention / export** settings (if external sink used) | Analytics pipeline | Doc 02, 04 |

---

## Key risk to keep visible

**Aggressive WDS override to enforce Sapphire Precision** can create Wix App Market review friction,
visual drift, and upgrade breakage. The mitigation strategy — use WDS structural primitives
(`Page`/`Layout`/`Cell`) for native chrome, skin via a Sapphire ThemeProvider + scoped CSS tokens,
replace only leaf components where Sapphire diverges, and lock with visual-regression + token-lint
gates — is specified in **doc 05 (§ Sapphire-over-WDS strategy)** and audited in **doc 07**.
