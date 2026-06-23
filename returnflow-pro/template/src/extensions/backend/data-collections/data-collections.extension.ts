import { extensions } from "@wix/astro/builders";
import exchangesCollection from "./returnflow-exchanges";
import lookupTokensCollection from "./returnflow-lookup-tokens";
import ordersCollection from "./returnflow-orders";
import refundsCollection from "./returnflow-refunds";
import returnsCollection from "./returnflow-returns";
import settingsCollection from "./returnflow-settings";
import storeCreditsCollection from "./returnflow-store-credits";

export default extensions.dataCollections({
  id: "39eec8f7-43cf-4a11-b612-5a6962230b6f",
  name: "ReturnFlow Data Collections",
  collections: [
    settingsCollection,
    ordersCollection,
    returnsCollection,
    refundsCollection,
    exchangesCollection,
    storeCreditsCollection,
    lookupTokensCollection,
  ],
});
