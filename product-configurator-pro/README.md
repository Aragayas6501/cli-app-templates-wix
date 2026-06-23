# Wix CLI App Template: Product Configurator Pro

Product Configurator Pro is a Wix CLI app template for building configurable Wix Stores product
experiences: merchant-managed option sets, conditional rules, live pricing, checkout fees, checkout
validation, and shopper-facing product-page configurators.

The template is grounded in the accompanying enterprise blueprint under [`docs/`](./docs) and includes:

- A Wix dashboard page for option-set management.
- Shared conditional-rule and pricing engines.
- Backend web methods following the `webMethod(Permissions.Admin, ...)` pattern.
- Wix Stores V1/V3 catalog detection scaffolding.
- eCommerce Additional Fees and Validations service plugin handlers.
- A Stores product-page site plugin and standalone custom element widget.
- Sapphire Precision styling for dashboard and storefront surfaces.

> Note: This app is intended for Wix sites with Wix Stores installed. The generated template ships with
> read-only demo data until Wix Data collections are created with your app namespace. Set
> `APP_NAMESPACE` in `src/backend/database.ts` after creating the Data Collection extensions described in
> [`docs/04-database-design-specification.md`](./docs/04-database-design-specification.md).

## Local development

Create an app from this template, then run:

```bash
npm run dev
```

Use the dashboard page to inspect the sample option set. Create/publish actions require the Wix Data
collections and namespace setup below. Service plugin behavior is verified after building and releasing
an app version.

## Manual setup

1. Install Wix Stores on the test site.
2. Configure Wix App Billing plans if using paid feature gating.
3. Create the app namespace in Wix Dev Center, scaffold the Data Collection extensions, and set
   `APP_NAMESPACE` in `src/backend/database.ts`.
4. Attach storefront selections to cart line items under a `productConfiguratorPro` payload shaped as
   `{ optionSetId, selections }`; the custom element emits `product-configurator-change` and
   `product-configurator-file-selected` events for that integration.
5. Add the minimum permission scopes for Wix Stores V1/V3, Wix Data, eCommerce SPIs, App Instance, and Billing.
6. Configure Wix Media storage and a virus-scanning provider before enabling production file uploads.
