import { booleanField, collection, numberField, objectField, textField, uniqueIndex } from "./shared";

export const collectionIdSuffix = "settings";

export default collection(
  collectionIdSuffix,
  "Settings",
  "instanceId",
  [
    textField("rounding", "Rounding"),
    booleanField("defaultStackable", "Default Stackable"),
    textField("displayTimezone", "Display Timezone"),
    objectField("widgetAppearance", "Widget Appearance"),
    booleanField("whiteLabel", "White Label"),
    booleanField("onboardingComplete", "Onboarding Complete"),
    numberField("cacheVersion", "Cache Version"),
  ],
  [uniqueIndex("instanceId")]
);

