# EtsySync Pro

EtsySync Pro is a Wix Studio dashboard app template for operating Etsy and Wix Stores as one multi-channel commerce workspace.

The template includes:

+ A Sapphire Precision dashboard experience for sync health, onboarding, product mappings, inventory, orders, conflicts, analytics, automations, settings, and billing plan visibility.
+ Backend web methods for dashboard data, manual sync runs, conflict resolution, sync profile updates, Etsy shop connection scaffolding, Wix app-instance readiness, and Wix Stores Catalog V1/V3 detection.
+ Domain types and seeded data aligned to the PRD collections: Etsy accounts, sync profiles, product and variant mappings, inventory events, order mappings, customer mappings, sync logs, automation rules, analytics events, settings, and audit logs.
+ App Market readiness surfaces for required Wix Stores installation, minimum permissions, Wix Billing, Etsy OAuth secrets, app-instance identity, site duplication, and data collection namespace setup.

Use this template as the starting point for a production Etsy integration. Replace the seeded backend with persisted Wix Data collections, complete the Etsy OAuth flow with encrypted token storage, and connect the web methods to Etsy and Wix Stores APIs before publishing to the Wix App Market.

## Wix App Market readiness

The generated app is structured for App Market preparation, but these Wix Dev Center and production integration steps must be completed before submission:

1. Configure the app namespace in Wix Dev Center, replace the `<app-namespace>` collection placeholder, then create the app data collections with full IDs like `<app-namespace>/sync-profiles`, `<app-namespace>/product-mappings`, and `<app-namespace>/audit-logs`.
2. Add only the required Wix permissions in Dev Center: `SCOPE.STORES.CATALOG_READ_LIMITED`, `SCOPE.DC-STORES.READ-PRODUCTS`, `SCOPE.DC-STORES.MANAGE-PRODUCTS`, `SCOPE.DC-STORES.READ-ORDERS`, `SCOPE.STORES.PRODUCT_READ_ADMIN`, `SCOPE.STORES.PRODUCT_WRITE`, `SCOPE.STORES.INVENTORY_ITEM_READ`, `SCOPE.STORES.INVENTORY_ITEM_WRITE`, `SCOPE.CATEGORIES.CATEGORY_READ`, and `SCOPE.CATEGORIES.CATEGORY_WRITE`.
3. Keep Wix Stores compatibility dual-path: call `catalogVersioning.getCatalogVersion()` before every Stores operation and route Catalog V1 to legacy products/inventory/collections APIs and Catalog V3 to productsV3, inventoryItemsV3, and categories APIs.
4. Configure Wix Billing plans for Free, Starter, Pro, Business, and Enterprise tiers. Do not use external upgrade or purchase links for paid app access.
5. Complete Etsy OAuth in backend code and store Etsy client secrets, refresh tokens, and sensitive credentials in Wix Secrets Manager or encrypted backend storage, not browser cookies or dashboard state.
6. Use Wix app instance identity for tenant isolation, and handle `originInstanceId` during site duplication so eligible settings can be copied safely.
7. Add lifecycle provisioning and cleanup in Dev Center with App Installed and App Removed webhooks for real collection initialization, token cleanup, and sync job teardown.
8. Before review, run dependency install, TypeScript, build, Wix preview, browser checks, support/contact/privacy listing checks, and clear dashboard console errors.

## Design system

This template ships a custom **Sapphire Precision** design system (`src/dashboard/styles/sapphire.css`) instead of building the UI from `@wix/design-system` components. This is a deliberate product choice from the PRD: the Wix App Market review guidelines do not require Wix Design System components, and the App Market review reference explicitly warns against treating optional conventions as universal requirements.

To stay aligned with Wix dashboard conventions, the dashboard is still wrapped in the standard provider stack in `src/dashboard/withProviders.tsx`:

+ `WixDesignSystemProvider` with `features={{ newColorsBranding: true }}` and `locale={i18n.getLocale()}` (from `@wix/essentials`) so the app inherits Wix theme tokens and the active dashboard locale.
+ `@wix/design-system/styles.global.css` is imported before `sapphire.css`, so Sapphire styles win the cascade while Wix Design System components (if you add any) render correctly.
+ `QueryClientProvider` (TanStack Query) for dashboard data fetching.

If you prefer a fully Wix-native look, you can replace the Sapphire markup with `@wix/design-system` components without changing the backend or data layer.
