import { extensions } from "@wix/astro/builders";
import pricingRules from "./pricing-rules";
import ruleConditions from "./rule-conditions";
import ruleActions from "./rule-actions";
import customerGroups from "./customer-groups";
import productMappings from "./product-mappings";
import collectionMappings from "./collection-mappings";
import schedules from "./schedules";
import promotionEvents from "./promotion-events";
import analyticsEvents from "./analytics-events";
import abTests from "./ab-tests";
import settings from "./settings";
import auditLogs from "./audit-logs";

export default extensions.dataCollections({
  id: "c07bd4b2-a680-4af8-a2db-09e50fc23118",
  name: "PriceFlow Pro Data",
  collections: [
    pricingRules,
    ruleConditions,
    ruleActions,
    customerGroups,
    productMappings,
    collectionMappings,
    schedules,
    promotionEvents,
    analyticsEvents,
    abTests,
    settings,
    auditLogs,
  ],
});

