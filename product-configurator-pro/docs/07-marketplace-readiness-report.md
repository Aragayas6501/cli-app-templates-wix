# 07 — Marketplace Readiness Report

**Scope:** Phase 7 (App Market readiness). Translates the Wix App Market technical review taxonomy into
a concrete, traceable readiness program for Product Configurator Pro, and dedicates a section to the
**Sapphire-over-WDS mitigation plan** (the highest review risk introduced by decision D2).

Every checklist item carries a **taxonomy ID** (`#n`) for traceability against review feedback, an
**applicability** call, and the **owning doc/extension**. Status uses the review vocabulary:
`Confirmed` (design satisfies it), `Plan` (design commits to it; implement + verify in build), or
`Needs config` (depends on a manual action item MA-* from doc 00).

> This is a **blueprint-stage** readiness report. Items that can only be verified at runtime (checkout
> tested per plan, no console errors, browser matrix) are marked `Plan` with the verification method the
> build team must run before submission.

---

## 1. Readiness summary

| Area | Blockers identified | Highest-risk item |
|------|---------------------|-------------------|
| Billing | 0 | Per-`instanceId` billing separation (#116) — design committed |
| Identity & Security | 0 | Server-side signed-instance verification (#74/#76) on every web method/SPI |
| Setup & Permissions | 0 | Minimum-permission scope set (#111/#112) incl. dual Stores scopes |
| Stores compatibility | 0 | V1 **and** V3 catalog support (#130) |
| UX & Accessibility | 1 risk | **Sapphire-over-WDS override** (#39/#45/#54/#55/#169/#170) — §9 mitigation |
| Performance | 0 | Storefront load + price calc budgets (#48/#49) |
| Privacy | 0 | Upload data + analytics consent (#69/#92/#97) |

**Net:** no architectural blockers. The single elevated risk is the aggressive Sapphire theming of WDS;
§9 defines the mitigation and gates that bring it to acceptable review risk.

---

## 2. Billing & Payments checklist

| ID | Requirement | Applicability | Status | Owner |
|----|-------------|---------------|--------|-------|
| #25 | All paid features route through **Wix App Billing** | App has paid tiers (Starter/Pro/Business/Enterprise) | Plan | `appInstance.ts` `isPremiumInstance`; doc 03 §6 |
| #29/#30/#123 | No custom unlock / external purchase links | Applicable | Confirmed | No external payment surfaces anywhere in design |
| #31 | Purchased credits never expire | **N/A** | N/A | No credit system |
| #33 | Checkout flow tested for **every plan** | Applicable | Plan | QA: install→purchase→upgrade→cancel per tier (MA-3 plans) |
| #35 | No direct user downgrade via pricing page | Applicable | Confirmed | Downgrade handled by Wix Billing UI |
| #116 | **Billing separated per `instanceId`** | Applicable | Confirmed | All gating keyed to app instance; no cross-site unlock |
| #125 | Premium features show a clear **upgrade CTA** | Applicable | Plan | Locked features render Sapphire "Upgrade" affordance → Wix pricing page (doc 05 §5.1) |

**Notes:** Plan tier → feature matrix lives in doc 03 §6. The build must not infer billing from
Business-Solutions Pricing Plans APIs (#125 caveat) — this app uses **App Plans** only. Billing-plan IDs
are **MA-3** (manual, Dev Center).

---

## 3. Identity & Instance checklist

| ID | Requirement | Status | Owner |
|----|-------------|--------|-------|
| #115 | Identify site/user by **`instanceId`**, not cookies/sessions | Confirmed | All persistence + gating keyed to instance (doc 04 permissions; doc 03) |
| #118 | **Auto-login** when reopened from Manage Apps | Confirmed | Standard Wix CLI dashboard session; no custom auth |
| #120 | Check required app (**Wix Stores**) and surface if missing | Confirmed | `getAppInstance` + `getCatalogVersion()` `STORES_NOT_INSTALLED` → Overview Health Stack guidance (doc 05 §5.1) |
| #122 | Handle **site duplication** via `originInstanceId` | Plan | App Installed event copies settings/sets from origin instance where present (doc 02 Analytics/Events; doc 04 retention) |
| #117 | Multi-site / one-account-per-site | Confirmed | Per-instance model inherently supports it |
| #133/#132 | No login/session/install errors | Plan | Install QA on clean + duplicated sites |

---

## 4. Security checklist

| ID | Requirement | Status | Owner |
|----|-------------|--------|-------|
| #74 | **Verify signed `instance` server-side** before trusting context | Confirmed | Every `webMethod` uses `Permissions.Admin`; SPIs run server-side with elevated auth (doc 02; `shipping-rates` pattern) |
| #76 | Validate **`signDate`** on signed-instance-backed edits; refuse stale | Plan | Edit/save web methods check signature freshness; refresh before continuing |
| #65/#77 | **HTTPS everywhere**, no HTTP fallback | Confirmed | Wix-hosted endpoints are HTTPS-only; virus-scan callout HTTPS (MA-4) |
| #64/#78 | **XSS/CSRF** protection on all inputs | Plan | Sanitize option labels/help/formula/upload filenames; render storefront text as data, never HTML; formula engine is a **whitelisted grammar, no `eval`/`Function`** (doc 02 Pricing) |
| #69 | Sensitive data not in cookies; encrypt at rest where needed | Confirmed | No PII in cookies; uploads stored as signed Media refs (doc 04 Uploads) |
| #72 | App secret / OAuth tokens secure | Plan | Secrets via Wix Secrets/env, never committed (doc 00 MA-4); repo secret-scan in CI |
| #73 | PCI/PA-DSS if handling financial data | **N/A** | N/A | No card/financial data handled; payments are Wix's |
| #63/#79/#80/#81/#119 | Password storage/reset | **N/A** | N/A | No app-managed passwords; identity is Wix instance |

**Upload-specific security (PCP-UPL):** type/size allow-list + **external virus scan (MA-4)** + quarantine
state before merchant download; download links are short-lived signed URLs; scan-failed files are never
downloadable. Detailed in doc 02 §File Upload.

---

## 5. Setup, Permissions & Webhooks checklist

| ID | Requirement | Status | Owner |
|----|-------------|--------|-------|
| #107 | Usable **settings/setup UI** | Confirmed | Settings dashboard page S13 (doc 05 §3.3) |
| #108 | No **localhost** config URLs | Confirmed | Wix-hosted; CI lint forbids localhost in config |
| #111/#112/#62 | **Minimum permissions**, no overlap | Plan | Scope set: Stores read (V1+V3), eCom read + Additional Fees/Validations SPI, Wix Data RW, Media, App Instance/Billing read, Orders read for OrderConfigurations. Drop anything unused before submission (MA-6) |
| #113 | **App Installed/Removed** webhooks for lifecycle | Plan | Installed → seed demo data (#37) + settings singleton; Removed → retention/cleanup per policy (doc 04) |
| #114 | Webhooks return **HTTP 200** on success | Plan | All event handlers ack 200; idempotent |
| #50/#51 | Multiple components → separate settings; site copy copies content | Confirmed | Per-instance settings; #122 duplication handling |
| #163 | Required service plugin (dropshipping) | **N/A** | N/A | Not a dropshipping app |

---

## 6. Stores compatibility checklist

| ID | Requirement | Status | Owner |
|----|-------------|--------|-------|
| #130 | Support **Catalog V1 and V3** | Plan | Dual-catalog abstraction; `getCatalogVersion()` gate on every Stores call; both scopes requested; V3 string-price/UPPER_CASE-enum/revision/cursor rules honored (doc 02/03; STORES_VERSIONING ref) |

Verification: run the full assign-products + storefront flow on a V1 site **and** a V3 site before
submission. Handle `STORES_NOT_INSTALLED` gracefully (#120).

---

## 7. UX, Performance & Accessibility checklist

| ID | Requirement | Status | Owner |
|----|-------------|--------|-------|
| #37 | **Realistic demo data** on first install | Plan | Installed event seeds a sample option set + mapping (doc 02; MA-2) |
| #39/#45 | Wix modal/toast patterns; **no `alert()`/`confirm()`** | Confirmed | Sapphire modals + Wix `dashboard.showToast`; banned-effects list (doc 05 §1) |
| #44 | Plugin content relates to host (Stores) | Confirmed | Configurator is a Stores product-page plugin |
| #48/#49 | **Load-time budget**; no console errors/bugs | Plan | Budgets: configurator load <2s, price calc <100ms, CLS ≤0.005 (doc 05 §9); zero-console-error gate in QA |
| #52/#54 | Responsive live-site; required desktop dashboard layout | Confirmed | Responsive matrix (doc 05 §7); dashboard desktop-first |
| #55 | **Widgets must not render `<h1>`** | Confirmed | Storefront starts at `<h2>` + landmarks; H1 only on dashboard pages (doc 05 §1 reconciliation) |
| #53/#57/#58 | Accessibility, alt-text controls, UTF-8 | Plan | WCAG 2.2 AA program (doc 05 §8); image options expose alt text; UTF-8 output |
| #59/#60/#61 | Desktop/mobile/tablet browser matrix | Plan | QA browser matrix before submission |
| #151/#154/#158/#160/#166/#167/#169/#170 | Component/extension quality; UX defaults & validation; editor-vs-published parity | Plan | Sapphire quality gates (doc 05 §9); sensible defaults + inline validation warnings (#169); test editor preview vs published (#170) |

---

## 8. Privacy checklist

| ID | Requirement | Status | Owner |
|----|-------------|--------|-------|
| #92/#97 | **Cookie/visitor consent** honored | Plan | Storefront analytics events respect visitor consent; no tracking cookies set pre-consent; analytics is server-event based, not cookie-based (doc 02 Analytics; doc 04 AnalyticsEvents) |
| #66 | Don't force login/PII unless core | Confirmed | Shoppers configure without login; uploads optional unless option requires |
| #69 | Encrypt/segregate sensitive data | Confirmed | Uploads as signed refs; PII retention policy (doc 04) |

**Privacy posture:** Analytics stores **event-level**, not personal, data by default; any
buyer-identifying fields follow the retention/erasure policy in doc 04. Surface a privacy/data-handling
note in the listing (MA-5).

---

## 9. Sapphire-over-WDS mitigation plan (elevated risk — D2)

**The risk:** Decision D2 mandates Sapphire Precision everywhere with aggressive WDS override. App
Market review prefers native Wix dashboard patterns; heavy restyling risks findings under #39
(in-product UX patterns), #45 (disruptive behavior), #54 (dashboard layout), #160/#167 (extension
quality), and #169/#170 (UX best practices / preview parity), plus self-inflicted visual drift on WDS
upgrades.

**Why it's acceptable with mitigation:** App Market reviews **behavior and quality**, not the specific
visual library. The strategy keeps WDS **structural primitives + native chrome** (which reviewers expect)
and re-skins via tokens, while replacing only leaf components — so the dashboard still *behaves* natively.

### 9.1 Mitigation controls

| Control | What it does | Maps to |
|---------|--------------|---------|
| Keep WDS structure | `Page/Layout/Cell/Header/Sticky/FixedFooter` + `dashboard.*` unchanged | #54, #160 |
| Scoped theme layer | All Sapphire overrides scoped under a root class; never touch Wix-owned chrome | #167, #170 |
| No native interrupts | Sapphire modals/toasts only; `alert`/`confirm` forbidden by lint | #39, #45 |
| Token-lint CI gate | Fails build on non-palette color / off-cadence spacing / non-SF font | quality |
| Visual-regression CI gate | Subpixel sweep (≤0.25px) per dashboard screen; **re-run before any WDS bump** | #170 |
| Accessibility parity tests | axe + manual keyboard per screen — override must not regress WDS a11y | #53, #57 |
| WDS version pin | Pin WDS; controlled upgrades behind the visual-regression gate | stability |
| Storefront isolation | Configurator ships its own Sapphire CSS, zero WDS — no override conflict on live site | #52, #55 |

### 9.2 Pre-submission Sapphire review
A dedicated reviewer pass confirms: every dashboard screen still exposes native breadcrumb/primary-action
chrome; no `alert/confirm`; settings UI fully usable (#107); storefront renders no `<h1>` and is
responsive; editor-preview matches published (#170). Sign-off is a release gate.

---

## 10. Submission checklist (operational)

Pre-submission gate — all must pass:

- [ ] Demo data seeds on a fresh install (#37) and on a duplicated site (#122/#51).
- [ ] Billing: purchase, upgrade, cancel tested per tier (#33); upgrade CTA visible on locked features (#125).
- [ ] Signed-instance verification + `signDate` freshness enforced on every web method/SPI (#74/#76).
- [ ] Permission scopes reduced to the minimum used set; dual Stores scopes present (#111/#112/#130).
- [ ] V1 **and** V3 store flows pass end-to-end (#130); `STORES_NOT_INSTALLED` handled (#120).
- [ ] No `alert/confirm`; Sapphire modals/toasts only (#45/#39).
- [ ] Storefront renders no `<h1>`; responsive on mobile/tablet/desktop (#55/#52).
- [ ] No console errors; load/price budgets met (#48/#49).
- [ ] Token-lint, visual-regression, axe a11y gates green (doc 05 §9).
- [ ] Upload virus-scan path verified; scan-failed files non-downloadable (security §4).
- [ ] Cookie/consent honored; no pre-consent tracking (#92/#97).
- [ ] App Installed/Removed webhooks return 200 and are idempotent (#113/#114).
- [ ] Listing assets, privacy note, and pricing copy prepared (MA-3, MA-5).

### Manual action items feeding submission (from doc 00)
MA-1 namespace · MA-2 demo-data content · MA-3 billing plans · MA-4 virus-scan provider + secret ·
MA-5 listing/privacy assets · MA-6 final permission scope review · MA-7 analytics retention window.

---

## 11. Traceability index (taxonomy → section)

`#25/#29/#30/#31/#33/#35/#116/#123/#125` → §2 · `#115/#117/#118/#120/#122/#132/#133` → §3 ·
`#63/#64/#65/#69/#72/#73/#74/#76/#77/#78/#79/#80/#81/#119` → §4 · `#50/#51/#62/#107/#108/#111/#112/#113/#114/#163` → §5 ·
`#130` → §6 · `#37/#39/#44/#45/#48/#49/#52/#53/#54/#55/#57/#58/#59/#60/#61/#151/#154/#158/#160/#166/#167/#169/#170` → §7 ·
`#66/#69/#92/#97` → §8 · `#39/#45/#54/#55/#160/#167/#169/#170` → §9 (Sapphire risk).
