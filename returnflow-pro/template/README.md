# ReturnFlow Pro

This template is wired for the provided Wix app identity and install-time permissions.

## App identity

The generated app reads its Wix app metadata from `wix.config.json` for `appId` and `projectId`, from `app-config.json` for the additional app identity and install-time scope details, and from `.wix/app.config.json` for the Wix runtime metadata used by the local app environment:
- `namespace`
- `codeIdentifier`
- `projectType`
- `permissions`
- `siteId`
- `devArmTag`

Update these values in `wix.config.json`, `app-config.json`, and `.wix/app.config.json` if you register a different Wix Dev Center app or want to point the template at a different local Wix environment.

## Required install-time permissions

The template requests the following scopes for install-time authorization:
- `SCOPE.DC-DATA.READ`
- `SCOPE.DC-DATA.WRITE`
- `SCOPE.STORES.CATALOG_READ_LIMITED`
- `SCOPE.DC-STORES.READ-PRODUCTS`
- `SCOPE.DC-STORES.READ-ORDERS`
- `SCOPE.STORES.PRODUCT_READ`
- `SCOPE.STORES.PRODUCT_READ_ADMIN`

The data layer collections in `src/backend/collections.ts` are scoped to the configured namespace so the app data is installed under the correct app identity.
