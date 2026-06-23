import { app } from "@wix/astro/builders";

// Dashboard pages
import overview from "./extensions/dashboard/pages/overview/overview.extension.ts";
import accounts from "./extensions/dashboard/pages/accounts/accounts.extension.ts";
import boards from "./extensions/dashboard/pages/boards/boards.extension.ts";
import scheduler from "./extensions/dashboard/pages/scheduler/scheduler.extension.ts";
import content from "./extensions/dashboard/pages/content/content.extension.ts";
import analytics from "./extensions/dashboard/pages/analytics/analytics.extension.ts";
import settings from "./extensions/dashboard/pages/settings/settings.extension.ts";

// Backend
import dataCollections from "./extensions/backend/data-collections/data-collections.extension.ts";
import productV3Created from "./extensions/backend/events/product-v3-created/product-v3-created.extension.ts";
import productV3Updated from "./extensions/backend/events/product-v3-updated/product-v3-updated.extension.ts";
import productV1Created from "./extensions/backend/events/product-v1-created/product-v1-created.extension.ts";
import productV1Changed from "./extensions/backend/events/product-v1-changed/product-v1-changed.extension.ts";
import postCreated from "./extensions/backend/events/post-created/post-created.extension.ts";
import postUpdated from "./extensions/backend/events/post-updated/post-updated.extension.ts";

// Site
import pinterestTag from "./extensions/site/embedded-scripts/pinterest-tag/pinterest-tag.extension.ts";

export default app()
  .use(overview)
  .use(accounts)
  .use(boards)
  .use(scheduler)
  .use(content)
  .use(analytics)
  .use(settings)
  .use(dataCollections)
  .use(productV3Created)
  .use(productV3Updated)
  .use(productV1Created)
  .use(productV1Changed)
  .use(postCreated)
  .use(postUpdated)
  .use(pinterestTag);
