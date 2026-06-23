# 05 — UX Architecture Specification

**Scope:** Phase 5 (UX & design). Defines information architecture, the complete screen inventory, the
core UX flows, and the **screen → Sapphire Precision component** mapping. The application **must**
follow Sapphire Precision exactly (decision D2: Sapphire is the visual source of truth on every
surface). This doc also specifies the **Sapphire-over-WDS strategy** that reconciles Sapphire with
Wix's `@wix/design-system` and the App Market review risk that strategy introduces (audited in doc 07).

Story IDs reference doc 01; collections reference doc 04; technical contracts reference doc 02/03.

---

## 1. Sapphire Precision compliance baseline (applies to every screen)

These are hard gates, not guidelines. Any violation is a release-blocking defect.

| Category | Rule |
|----------|------|
| **Color** | 5-color palette only: primary `#0052FF`, secondary `#EBF1FF`, tertiary `#BF3003`, neutral `#0F172A`, white. All other tones via opacity / `rgba` / `color-mix`. `#0052FF` is the only primary fill; `#BF3003` the only destructive fill. |
| **Type** | SF Pro Display (headings), SF Pro Text (body/labels). h1 28 / h2 24 / h3 20; body lg/md/sm; label md/sm/micro. Line length 55–80 chars; line-height ≥ 1.24. |
| **Spacing** | {4, 8, 16, 24, 40, 64}px; 8px primary cadence, 4px optical only. Page margin 32, gutter 24. Alignment ≤ ±0.5px to 8px grid; baseline drift ≤ ±0.25px. |
| **Radius** | 8px standard; 16–20px showcase/workspace panels. |
| **Motion** | fast 80 / standard 160 / smooth 240ms; ease `cubic-bezier(0.16,1,0.3,1)`. Respect `prefers-reduced-motion`. |
| **Layout stability** | CLS ≤ 0.005; layout-shift lockdown Δy ≤ 0.25px; no floating popup sheets; price/preview occupy fixed slots. |
| **Cognitive load** | 7-Action Cap (≤7 interactive elements in resting viewport), 3-Decision Limit, Single Alert Constraint (≤1 high-priority alert → Priority Status Rail). |
| **Focus** | `outline: 3px solid rgba(0,82,255,0.34); outline-offset: 2px;` never hidden; modals trap focus; drawers manage focus. |
| **Density** | Comfortable / Standard / Compact modes (doc design §6.5); Compact still meets a11y. |
| **A11y** | WCAG 2.2 AA; body contrast ≥ 4.5:1; icons/focus ≥ 3:1; touch targets ≥ 44px (32px dense desktop w/ tooltip+aria); semantic landmarks; `aria-describedby` on errors; `aria-busy` on loading; polite live-region toasts. |

**H1 reconciliation (critical):** Sapphire requires *exactly one H1 per page area*; the Wix App Market
requires storefront **widgets to not render `<h1>`** (#55). Resolution: **Dashboard pages** render one
H1 (the page title). **Storefront configurator** starts at `<h2>` and uses `aria-label`/landmarks for
structure — satisfying both rules because the widget is *not* a page area, it's embedded in the
merchant's product page which owns the H1.

---

## 2. Sapphire-over-WDS strategy (D2)

Sapphire is the source of truth; WDS is used only where it buys native dashboard behavior. The strategy
has four layers:

1. **Structural primitives (keep WDS):** `Page`, `Page.Header`, `Page.Content`, `Layout`, `Cell`,
   `Page.Sticky`, `Page.FixedFooter`, Breadcrumbs, and `dashboard.*` (toast/navigate/openModal). These
   give native chrome, routing, and modal plumbing that App Market expects. They are **skinned**, not
   replaced.
2. **Sapphire theme layer:** a `SapphireThemeProvider` + a scoped global stylesheet that maps Sapphire
   tokens (color/type/space/radius/motion/focus) onto WDS CSS variables and wraps WDS structural nodes
   in Sapphire surfaces (`sapphire-card`, `sapphire-soft-panel`, `sapphire-workspace-container`,
   `Sapphire Canvas` dotted background).
3. **Sapphire leaf components (replace WDS):** all *interactive leaves and signature patterns* are
   Sapphire components, not WDS: Buttons (`.sapphire-button-*`), Forms (`.sc-input/.sc-select/.sc-btn`),
   Tables, Filter Command Bar, Priority Status Rail, Detail Inspector Drawer, Empty State, Command
   Palette, Metric/Command cards. **Do not mix WDS form controls with Sapphire controls** (design §11.4).
4. **Storefront = full Sapphire:** the configurator custom element/site plugin carries its own Sapphire
   CSS pipeline (the `site-popup` template proves a custom element can ship a bespoke design system),
   with zero WDS dependency.

**Risk & mitigation (full audit in doc 07):** aggressive WDS override risks review friction (#45 no
native alert/confirm — we already forbid them; #107 settings UI must remain usable), visual drift on WDS
upgrades, and CSS specificity fragility. Mitigations:
- **Token-lint gate** — CI fails on any non-palette color, off-cadence spacing, or non-SF font.
- **Visual-regression gate** — subpixel sweeps (≤0.25px drift) on every dashboard screen.
- **WDS-pin + upgrade test** — pin WDS; run the visual-regression suite before any WDS bump.
- **Scoped overrides** — theme layer scopes all overrides under a Sapphire root class to avoid leaking
  into Wix-owned chrome.
- **Accessibility parity tests** — automated axe + manual keyboard pass per screen (the override must
  not regress the native a11y WDS provides).

---

## 3. Information Architecture

### 3.1 Navigation map (dashboard)

```
Product Configurator Pro (app area in Wix dashboard)
├── Overview                     (home: setup checklist, health, KPIs)
├── Option Sets                  (list → builder)
│    └── Option Set Builder      (Options · Rules · Pricing · Assign · Preview  — internal tabs)
├── Templates                    (gallery; Pro+)
├── Orders & Configurations      (configured orders + files)
├── Analytics                    (funnel + option metrics; Pro+)
├── Quotes                       (B2B; V3, Enterprise)
└── Settings                     (global config; #107)
         └── (Audit Logs view/export — Enterprise)
```

- **No duplication of host nav** (design §6.2): internal navigation uses horizontal **Tabs**,
  **Breadcrumbs**, the **Filter Command Bar**, and the **Detail Inspector Drawer** — not a second
  sidebar. A **Command Palette** (⌘/Ctrl-K) provides keyboard-first jump-to.

### 3.2 Dashboard structure
Every workspace screen sits on the **Sapphire Canvas** with: page **H1** + Breadcrumb in `Page.Header`,
a **Priority Status Rail** (single highest-priority status: Error > Warning > Success > Info), the
screen body, and a right **Detail Inspector Drawer** for object detail. One primary action per region
(`Page.Header` primary button).

### 3.3 Settings structure
A single sectioned form (section-level save, not hidden global save — design §11.4): General, Pricing &
Currency, Checkout (required-field policy), Uploads, Analytics & Consent, Branding (plan-gated),
Retention, and (Enterprise) Audit Logs. Backed by the `Settings` singleton (doc 04 §2.11).

### 3.4 Inspector patterns
The Detail Inspector Drawer is the signature object-detail surface (design §6.3): title, status,
key metadata, primary action, secondary actions, timeline/detail sections, close control, focus
handling. Used for: an Option (in the builder), a Rule, a Pricing rule, a Product mapping, an Order
configuration, an Audit entry. Filters persist when the inspector opens/closes (design §11.7).

### 3.5 Empty states (Sapphire Empty State — design §11.2.9)
Minimal technical illustration + concise explanation + one primary CTA. Distinguish **filtered-empty**
from **true-empty** (design §11.7). Examples: no Option Sets yet → "Create your first option set";
analytics pre-data → "No configuration activity yet"; orders pre-data → "Configured orders will appear
here".

### 3.6 Error states (Diagnostic Error Panel — design §11.2.10)
Trust-building pattern: what happened, what was affected, what to do. Per-widget isolation (one failing
analytics tile doesn't take down the page). Never `alert/confirm` (App Market #45); use modals/toasts.

---

## 4. Screen Inventory

Tagged by version. "Type" = primary Wix extension surface (doc 03 §2).

| # | Screen | Type | Version | Purpose |
|---|--------|------|---------|---------|
| S1 | Overview / Home | Dashboard Page | MVP | Setup checklist, Health Stack, top KPIs. |
| S2 | Option Sets list | Dashboard Page | MVP | Manage all sets (table + filters). |
| S3 | Option Set Builder — Options tab | Dashboard Page | MVP | Build options/values/validation. |
| S4 | Option Set Builder — Rules tab | Dashboard Page | V2 (Pro) | Conditional rule builder + simulator. |
| S5 | Option Set Builder — Pricing tab | Dashboard Page | MVP→V2 | Pricing rules (fixed MVP; rich V2). |
| S6 | Option Set Builder — Assign tab | Dashboard Page | MVP | Map products (V1/V3 picker). |
| S7 | Option Set Builder — Preview tab | Dashboard Page | MVP | Live preview of the configurator. |
| S8 | Create/Edit/Confirm modals | Dashboard Modal | MVP | New set, clone, delete, publish, reassign. |
| S9 | Templates gallery | Dashboard Page | V2 (Pro) | Save/instantiate templates. |
| S10 | Orders & Configurations | Dashboard Page | MVP | Configured orders, files, status. |
| S11 | Order Configuration detail | Inspector/Drawer | MVP | Selections + price breakdown + files. |
| S12 | Analytics | Dashboard Page | V2 (Pro) | Funnel, drop-off, popularity, revenue. |
| S13 | Settings | Dashboard Page | MVP | Global config (#107). |
| S14 | Audit Logs | Dashboard Page | V3 (Ent.) | View/filter/export change trail. |
| S15 | Quotes list + detail | Dashboard Page | V3 (Ent.) | B2B quote workflow. |
| S16 | Visual Preview asset mapper | Dashboard Page | V2 (Bus.) | Map value→layer + z-order. |
| S17 | AI Assist draft review | Dashboard Modal/Page | V4 (Ent.) | Review AI-proposed set. |
| **W1** | Storefront Configurator | Site Plugin | MVP | Options + live price on product page. |
| **W2** | Storefront Configurator (flexible) | Custom Element | MVP | Standalone placement. |
| W3 | Storefront multi-step flow | (within W1/W2) | V2 (Pro) | Stepped flow + progress. |
| W4 | Storefront file upload | (within W1/W2) | V2 (Pro) | Upload + validation + progress. |
| W5 | Storefront visual preview | (within W1/W2) | V2 (Bus.) | Layered live preview. |
| W6 | Storefront quote request | (within W1/W2) | V3 (Ent.) | Request-a-quote CTA + flow. |

---

## 5. UX Flows

Each flow lists steps and the **Sapphire surfaces** used. All flows obey the compliance baseline (§1).

### 5.1 Onboarding (PCP-ONB)
1. Install → demo data seeded → land on **Overview (S1)**.
2. **Setup checklist** (Sapphire cards, one primary CTA each): create set → add options → assign
   product → preview → publish. Items reflect real state; **Health Stack** shows Stores connection +
   plan.
3. Plan-aware: locked features show an **Upgrade** affordance (Wix Billing). Fetch failure → least
   privilege.
Surfaces: Sapphire Canvas · Priority Status Rail · Sapphire Cards · Health Stack · Empty State.

### 5.2 Create Option Set (PCP-OPT)
1. **S2** list → primary "New option set" → **S8 modal** (name) → creates draft → opens **S3**.
2. **S3 builder**: left = ordered option list (drag/keyboard reorder), right = **Detail Inspector
   Drawer** to configure the selected option (label, key, help, required, default, type config,
   validation). Add option via a type picker.
3. Group with `section` options for multi-step; autosave (debounced); section-level save.
4. Publish (S8 confirm) → validates children → bumps version.
Surfaces: Table (S2) · Modal (S8) · Inspector Drawer · Sapphire Forms (`.sc-input/.sc-select`) ·
Priority Status Rail (validation status).

### 5.3 Create Rules (PCP-RUL, V2)
1. **S4 Rules tab**: list of rules (Table) → "New rule" → Inspector Drawer with the **condition-tree
   builder** (combinator toggles, condition rows, nestable groups) + **actions** editor.
2. **Simulator panel**: enter selections → see live visibility/required/price; invalid rules flagged
   with reasons. Save runs validation + cycle detection.
Surfaces: Table · Inspector Drawer · Sapphire Forms · Diagnostic Error Panel (invalid rule) · Empty
State (no rules).

### 5.4 Assign Products (PCP-MAP)
1. **S6 Assign tab**: product **search/select** via Stores picker (catalog-version gated); shows
   current mappings (Table) with stale flags.
2. Single or **bulk** assign (by collection/category, V2) → preview count → apply → per-item status.
Surfaces: Filter Command Bar (search) · Table · Chips (applied filters) · Modal (reassign confirm).

### 5.5 Configure Pricing (PCP-PRC)
1. **S5 Pricing tab**: list pricing rules (Table) grouped by type → Inspector Drawer to edit a rule
   (type-specific form: fixed/%/formula/tier/quantity/conditional).
2. Formula editor validates grammar inline (error border + `aria-describedby`); composition order shown
   as read-only guidance; preview reflects changes.
Surfaces: Table · Inspector Drawer · Sapphire Forms · CodeBlock (formula) · Diagnostic Error Panel.

### 5.6 View Analytics (PCP-ANL, V2)
1. **S12**: KPI row (**Sapphire Metric Cards**: views, completion %, revenue, AOV) → funnel chart →
   drop-off by step/option → option popularity table. Date-range filter; empty/low-data states.
Surfaces: Metric Cards · chart cards · Filter Command Bar (date range) · Empty State · per-tile
Diagnostic Error Panel.

### 5.7 Manage Uploads (PCP-UPL, V2)
1. **S10 Orders** → open an order → **S11 inspector**: selections + price breakdown + **file list**
   with scan status; download enabled only for `clean` files; bulk download per order.
Surfaces: Table (S10) · Detail Inspector Drawer (S11) · status dots (scan status) · ImageCard/file rows.

### 5.8 Storefront Configurator (PCP-CFG) — W1/W2
1. Product page renders the configurator (mapped + published only; else nothing). Starts at `<h2>`.
2. Customer selects → **rules-engine** updates visibility/required live → **price preview** updates in a
   fixed slot (<100ms, no shift). Uploads where required (W4). Multi-step with a progress rail for big
   sets (W3). Visual preview (W5, V2).
3. Add to cart → server recomputes fee + validates required → checkout.
Surfaces (full Sapphire CSS): Sapphire Forms · fixed price slot · progress rail · upload control ·
inline validation (`aria-describedby`) · reduced-motion compliant.

---

## 6. Component Mapping (screen → Sapphire components)

| Screen | Sapphire Canvas | Priority Status Rail | Filter Command Bar | Table | Inspector Drawer | Cards | Forms | Empty State | Modal | Command Palette | Metric/Chart |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| S1 Overview | ✓ | ✓ | – | – | – | ✓ (checklist, Health Stack) | – | ✓ (pre-setup) | – | ✓ | ✓ (KPIs) |
| S2 Option Sets list | ✓ | ✓ | ✓ | ✓ | ✓ (set detail) | – | – | ✓ | ✓ | ✓ | – |
| S3 Builder·Options | ✓ | ✓ | – | ✓ (option list) | ✓ (option) | – | ✓ | ✓ (no options) | ✓ | ✓ | – |
| S4 Builder·Rules | ✓ | ✓ | – | ✓ (rules) | ✓ (rule + simulator) | – | ✓ | ✓ | – | ✓ | – |
| S5 Builder·Pricing | ✓ | ✓ | – | ✓ (pricing) | ✓ (rule) | – | ✓ | ✓ | – | ✓ | – |
| S6 Builder·Assign | ✓ | ✓ | ✓ (product search) | ✓ (mappings) | – | – | ✓ | ✓ | ✓ (reassign) | ✓ | – |
| S7 Builder·Preview | ✓ | ✓ | – | – | – | ✓ | – | – | – | ✓ | – |
| S9 Templates | ✓ | ✓ | ✓ | – | ✓ (template) | ✓ (gallery) | – | ✓ | ✓ | ✓ | – |
| S10 Orders & Config | ✓ | ✓ | ✓ | ✓ | ✓ (S11 detail) | – | – | ✓ | – | ✓ | – |
| S12 Analytics | ✓ | ✓ | ✓ (date) | ✓ (popularity) | – | ✓ | – | ✓ | – | ✓ | ✓ |
| S13 Settings | ✓ | ✓ | – | – | – | ✓ (sections) | ✓ | – | ✓ (reset) | ✓ | – |
| S14 Audit Logs | ✓ | ✓ | ✓ | ✓ (Operational Timeline) | ✓ (entry) | – | – | ✓ | – | ✓ | – |
| S15 Quotes | ✓ | ✓ | ✓ | ✓ | ✓ (quote) | – | ✓ | ✓ | ✓ | ✓ | – |
| S16 Visual mapper | ✓ | ✓ | – | ✓ (layers) | ✓ (layer) | ✓ (preview tester) | ✓ | ✓ | – | ✓ | – |
| W1/W2 Storefront | (own Sapphire CSS) | – (no widget alert) | – | – | – | ✓ | ✓ | ✓ (unavailable) | – | – | ✓ (price) |

Notes:
- **Buttons:** every screen uses `.sapphire-button-*` (primary only `#0052FF`; destructive only
  `#BF3003`, confirmation required). One primary per region.
- **Tables** must include the full required capability set (design §11.6): search, filters, chips, sort,
  pagination/virtualization, selection, bulk actions, row actions, empty/loading/error/permission
  states, right inspector on row open, keyboard nav. Row hover exactly `rgba(0,82,255,0.08)`; tabular
  numerals for prices/counts.
- **Storefront** never renders `<h1>`, never shows a high-priority alert rail (keeps the merchant page
  calm), and respects `prefers-reduced-motion`.

---

## 7. Responsiveness (design §6.4)

| Breakpoint | Behavior |
|-----------|----------|
| Mobile 0–639 | Single column; **tables → card/list**; filters → sheet; **inspector → full-screen**; primary action sticky bottom; no hover-only controls. Storefront configurator stacks; price sticky. |
| Tablet 640–1023 | Two-column where possible; inspector as overlay drawer. |
| Desktop 1024–1439 | Full embedded workspace; inspector side-by-side. |
| Wide 1440+ | Max-width or advanced split panels. |

Storefront W1/W2 are mobile-first (most shoppers are on mobile): 44px touch targets, upload supports
mobile photo capture, stepped flow reduces overwhelm.

---

## 8. Accessibility specification (WCAG 2.2 AA — design §12)

- **Keyboard:** logical tab order; skip-to-main on dashboard; all controls operable; modals trap focus;
  drawers manage focus; Command Palette + dropdowns arrow-navigable; **option reorder is keyboard
  operable** (PCP-OPT-4); focus never hidden.
- **Contrast:** body ≥ 4.5:1; large ≥ 3:1; icons/focus ≥ 3:1; disabled state never the only signal.
- **Screen readers:** semantic landmarks; **exactly one H1 per dashboard page** (storefront starts h2);
  no skipped levels; icon-only buttons `aria-label`; fields labelled; errors via `aria-describedby`;
  loading `aria-busy`; toasts polite (critical = assertive); modals use dialog semantics.
- **Reduced motion & touch:** respect `prefers-reduced-motion`; no info conveyed by animation alone;
  touch ≥ 44px (32px dense desktop w/ tooltip+aria).
- **Cognitive:** 7-Action Cap, 3-Decision Limit, Single Alert Constraint, layout-shift lockdown
  (≤0.25px), saturation-muted warnings (tertiary border, ≤10% fill).

---

## 9. Zero-drift governance (how "exactly Sapphire" is enforced)

| Gate | Mechanism | Blocks release? |
|------|-----------|-----------------|
| Token compliance | Lint: only palette colors, {4,8,16,24,40,64} spacing, SF fonts, 8/16/20 radius, defined motion tokens | ✓ |
| Subpixel drift | Visual-regression sweep ≤ ±0.5px alignment, ≤ ±0.25px baseline | ✓ |
| CLS / layout shift | Automated CLS ≤ 0.005; Δy ≤ 0.25px on dynamic content (price/preview) | ✓ |
| One-primary-per-region | Lint/manual review | ✓ |
| A11y | axe automated + manual keyboard pass per screen | ✓ |
| WDS-skin integrity | Visual-regression run before any WDS version bump | ✓ |
| Terminology | Copy lint against frozen canonical terms (doc 00 glossary) | warns |

These gates are the acceptance criteria for every UI task in the backlog (doc 08) and feed the
Marketplace accessibility/performance checklists (doc 07).
