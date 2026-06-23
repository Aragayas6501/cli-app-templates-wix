# PinFlow — Pinterest Marketing & Automation for Wix Studio

PinFlow turns a Wix Studio site into an automated Pinterest publishing engine: connect a
Pinterest account, auto‑publish products and blog posts as pins, schedule pins, manage
boards, install the Pinterest tag, and report analytics — packaged as a tiered app for the
Wix App Market.

This folder is a **Wix CLI app** (Astro "new generation" runtime: `@wix/astro` + Astro 5 +
React 18 + `@wix/design-system`).

---

## ⚠️ Status & honest framing (read first)

This codebase was **hand‑authored to mirror the output of the Wix CLI generators**, not produced
by running `wix generate` against a real Dev Center app. It is a complete, reviewable MVP
skeleton with full backend logic, but it is **not yet bound to a real app** and therefore has
**not** been through `astro check` / `wix build` (both require Wix environment variables that
only exist once the project is linked to a Dev Center app — see below).

What that means in practice:

| Aspect | State |
|---|---|
| TypeScript type‑check (`npx tsc --noEmit`) | ✅ Passes clean |
| Backend logic, API routes, extensions, data model | ✅ Implemented |
| Dashboard UI (7 pages, WDS) | ✅ Implemented |
| Bound to a Dev Center app (`appId`, namespace) | ❌ Placeholders — you must create the app |
| Pinterest developer app + secrets | ❌ You must provision these |
| `wix dev` / `wix preview` / `wix build` | ❌ Blocked until the manual setup below is done |

**Before treating this as production code, reconcile it with the CLI.** Once you have a Dev
Center app, run `wix generate` for each extension type and diff the generated scaffolding
against the files here, so registration IDs and config match exactly what the CLI expects.
The extension **IDs** in this repo are placeholders (valid UUIDs, but not issued by Dev Center).

---

## Architecture

```
External scheduler (cron/Lambda/Cloud Scheduler/GitHub Actions)
        │  POST  + header x-pinflow-scheduler-token
        ▼
┌──────────────────────── PinFlow (Wix CLI app) ───────────────────────┐
│  Dashboard pages (WDS)        Backend                                  │
│  • Overview                   • API routes  src/pages/api/*            │
│  • Accounts (OAuth)           • Pinterest client + token refresh       │
│  • Boards                     • publish core (products/blog/manual)    │
│  • Scheduler                  • repositories → Wix Data collections    │
│  • Content (rules + pins)     • app‑instance / tier gating             │
│  • Analytics                  Backend events (Stores V1+V3, Blog)      │
│  • Settings (+ Pinterest tag) Embedded script (Pinterest tag, HEAD)    │
└───────────────────────────────────────────────────────────────────────┘
        │ REST v5
        ▼
   Pinterest API
```

Time‑based work (scheduled pins, analytics backfill) is triggered by an **external scheduler**
because Wix CLI apps have no native cron. See "External scheduler" below.

### Project structure

```
pinflow/
├─ wix.config.json            # appId (placeholder) + projectId
├─ astro.config.mjs           # wix() + react() integrations, aliases, cloudflare adapter on build
├─ tsconfig.json              # extends astro/tsconfigs/strict; @/* and backend/* aliases
├─ package.json
└─ src/
   ├─ consts.ts               # APP_NAMESPACE (placeholder), collection ids, Pinterest endpoints, secret names, tier limits
   ├─ types.ts                # domain + Pinterest API types
   ├─ extensions.ts           # registers every extension (app().use(...))
   ├─ backend/                # http, data, appInstance, tiers, publish, pinterest/*, repositories/*
   ├─ pages/api/              # 16 Backend API routes (OAuth, accounts, boards, pins, scheduler, analytics, settings, rules)
   └─ extensions/
      ├─ backend/
      │  ├─ data-collections/ # 8 Wix Data collections + aggregator
      │  └─ events/           # product-v1-created/changed, product-v3-created/updated, post-created/updated
      ├─ dashboard/
      │  ├─ lib/api-client.ts # typed fetchWithAuth client used by the pages
      │  └─ pages/            # overview, accounts, boards, scheduler, content, analytics, settings
      └─ site/
         └─ embedded-scripts/pinterest-tag/  # Pinterest tag (HEAD, ADVERTISING)
```

### Data model (8 collections, MVP)

`pinterest-accounts` (tokens stored encrypted), `boards`, `automation-rules`, `product-mappings`,
`published-pins`, `scheduled-pins`, `analytics-events`, `settings`. Collections are scoped by app
namespace (`<namespace>/<suffix>`); Wix product/post IDs are stored as **TEXT**, never as Wix
references. (`pin-templates`, `ai-content`, `audit-logs` are deferred to Phase 2 — see `../plan.md`.)

---

## Prerequisites & manual setup (app owner)

1. **Create the Wix app in Dev Center** (https://dev.wix.com → Build Apps). Capture the **App ID**
   and the **App Namespace** (Settings → App Namespace, e.g. `@your-company/pinflow`).
2. **Register a Pinterest developer app** (https://developers.pinterest.com): get the **client ID**
   and **client secret**, set the **redirect URI** (see OAuth below), and request the scopes in
   `src/consts.ts → PINTEREST.scopes`. New Pinterest apps start in *trial*; apply for *standard*
   access for production traffic.
3. **Add secrets** to the Wix Secrets Manager (Dev Center → your app → Secrets), matching the names
   in `src/consts.ts → SECRET_NAMES`:
   - `PINFLOW_PINTEREST_CLIENT_ID`
   - `PINFLOW_PINTEREST_CLIENT_SECRET`
   - `PINFLOW_SCHEDULER_TOKEN` (any long random string; shared with your external scheduler)
4. **Enable permissions/scopes** in Dev Center:
   - Wix Stores read — **both V1 and V3** (the app handles both catalog versions).
   - Wix Blog read.
   - `SCOPE.DC-APPS.MANAGE-EMBEDDED-SCRIPTS` (required for the Settings page to install the Pinterest tag).
   - App instance / billing (used for tier gating).
5. **Provision an external scheduler** + shared token for `/api/scheduler/run` (and optionally
   `/api/analytics/pull`). See below.

### Wire the placeholders

| Placeholder | File | Replace with |
|---|---|---|
| `REPLACE_WITH_DEV_CENTER_APP_ID` | `wix.config.json` → `appId` | your Dev Center App ID |
| `@pinflow/pinflow` | `src/consts.ts` → `APP_NAMESPACE` | your real app namespace |
| OAuth scopes | `src/consts.ts` → `PINTEREST.scopes` | trim to what your Pinterest app is approved for |
| Extension IDs | `src/**/**.extension.ts` | reconcile with `wix generate` output once the app exists |

---

## Install & run

Requires Node (see `.nvmrc`).

```bash
cd pinflow
npm install

# Pull Wix environment variables (needs the app created + you logged in via `wix login`).
# Without this, astro check / wix dev / wix build cannot start.
npx wix env pull

# Type-check (works without Wix env):
npx tsc --noEmit

# Local development against your Dev Center app:
npm run dev        # wix dev
npm run preview    # wix preview
npm run build      # wix build  (production)
```

> `npm run dev`/`build` fail with `Missing environment variable WIX_CLIENT_ID` until
> `npx wix env pull` has populated the Wix env from a real, linked Dev Center app.

---

## OAuth connect flow

The Accounts page opens Pinterest's authorize URL in a popup. Because the OAuth **callback**
(`/api/pinterest/oauth/callback`) is hit by a raw browser redirect — with no Wix app‑instance auth
context — it cannot safely write app data. Instead it returns a small HTML page that `postMessage`s
the `code`/`state` back to the dashboard window, which then calls `/api/pinterest/oauth/exchange`
(this request *does* carry instance auth) to exchange the code and persist the encrypted tokens.

**Redirect URI to whitelist in your Pinterest app:**

```
https://<your-app-host>/api/pinterest/oauth/callback
```

The dashboard computes this at runtime via `oauthRedirectUri()`; it must exactly match the value
registered in the Pinterest developer console.

Access tokens are refreshed **lazily** on use when near expiry (there is no token‑refresh cron).

---

## External scheduler

Wix CLI apps have no built‑in scheduler, so PinFlow exposes secured endpoints an external
scheduler calls on a cadence (e.g. every 5–15 minutes). Authenticate with the shared token in the
`x-pinflow-scheduler-token` header (compared against the `PINFLOW_SCHEDULER_TOKEN` secret).

```bash
# Publish any pins whose scheduledFor time has passed:
curl -X POST "https://<your-app-host>/api/scheduler/run" \
  -H "x-pinflow-scheduler-token: $PINFLOW_SCHEDULER_TOKEN"

# (Optional) pull fresh Pinterest analytics into analytics-events:
curl -X POST "https://<your-app-host>/api/analytics/pull" \
  -H "x-pinflow-scheduler-token: $PINFLOW_SCHEDULER_TOKEN"
```

`/api/scheduler/run` **requires** the token (returns 401 otherwise). `/api/analytics/pull` is also
callable from the dashboard (instance auth); when called with the scheduler token it validates it.
Any cron platform works — Google Cloud Scheduler, AWS EventBridge/Lambda, GitHub Actions, etc.

---

## Tiers & quotas

Billing tiers are enforced via `appInstances` + counts (`src/consts.ts → TIER_LIMITS`):

| Tier | Accounts | Pins / month | Scheduling | Automations |
|---|---|---|---|---|
| Free | 1 | 50 | – | – |
| Starter | 1 | 500 | ✓ | ✓ |
| Pro | 3 | 2,000 | ✓ | ✓ |
| Business | 10 | 10,000 | ✓ | ✓ |
| Enterprise | ∞ | ∞ | ✓ | ✓ |

API routes return **HTTP 402** when a limit is hit; the dashboard surfaces the message.

---

## Known limitations / deferred to Phase 2+

- No native scheduling → external scheduler dependency (above).
- Pinterest publishes pins immediately on create (no native future‑scheduling) → app‑managed queue.
- Rich Pins, AI pin/image generation, pin templates, bulk pinning, catalog feed, full UTM editor,
  enhanced tag e‑commerce events, scheduled analytics backfill, audit logs → Phase 2.
- See `../plan.md` for the full PRD → phase breakdown and risk register.
