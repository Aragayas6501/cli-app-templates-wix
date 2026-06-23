import { extensions } from "@wix/astro/builders";

import pinterestAccounts from "./PinterestAccounts";
import boards from "./Boards";
import automationRules from "./AutomationRules";
import productMappings from "./ProductMappings";
import publishedPins from "./PublishedPins";
import scheduledPins from "./ScheduledPins";
import analyticsEvents from "./AnalyticsEvents";
import settings from "./Settings";

export default extensions.dataCollections({
  id: "c94f4186-5ba3-4009-93b5-95f487f3ef32",
  name: "Data Collections",
  collections: [
    pinterestAccounts,
    boards,
    automationRules,
    productMappings,
    publishedPins,
    scheduledPins,
    analyticsEvents,
    settings,
  ],
});
