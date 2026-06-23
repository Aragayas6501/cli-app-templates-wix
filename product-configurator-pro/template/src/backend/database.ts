import { items } from "@wix/data";
import { auth } from "@wix/essentials";
import { SAMPLE_APP_DATA } from "../core/sample-data";
import type {
  AppData,
  ConfigurationSelections,
  OptionSet,
  ProductMapping
} from "../types";

const APP_NAMESPACE = "";

type CollectionSuffix = "option-sets" | "product-mappings";
type StoredOptionSet = OptionSet & { _id: string };
type StoredProductMapping = ProductMapping & { _id: string };

const now = () => new Date().toISOString();

const isPersistenceConfigured = () => APP_NAMESPACE.trim().length > 0;

const cloneDemoData = (): AppData => JSON.parse(JSON.stringify(SAMPLE_APP_DATA)) as AppData;

const collectionId = (suffix: CollectionSuffix) => {
  if (!isPersistenceConfigured()) {
    throw new Error(
      "Product Configurator Pro Wix Data collections are not configured. Create the Data Collection extensions with your Wix app namespace, then set APP_NAMESPACE in src/backend/database.ts."
    );
  }

  return `${APP_NAMESPACE}/${suffix}`;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const optionSetToItem = (optionSet: OptionSet): StoredOptionSet => ({
  ...optionSet,
  _id: optionSet.id
});

const optionSetFromItem = ({ _id, ...optionSet }: StoredOptionSet): OptionSet => optionSet;

const mappingToItem = (mapping: ProductMapping): StoredProductMapping => ({
  ...mapping,
  _id: mapping.id
});

const mappingFromItem = ({ _id, ...mapping }: StoredProductMapping): ProductMapping => mapping;

export const getAppData = async (): Promise<AppData> => {
  if (!isPersistenceConfigured()) {
    return cloneDemoData();
  }

  const elevatedQuery = auth.elevate(items.query);
  const [optionSets, productMappings] = await Promise.all([
    elevatedQuery(collectionId("option-sets"))
      .limit(1000)
      .find()
      .then((response) =>
        response.items.map((item) => optionSetFromItem(item as StoredOptionSet))
      ),
    elevatedQuery(collectionId("product-mappings"))
      .limit(1000)
      .find()
      .then((response) =>
        response.items.map((item) => mappingFromItem(item as StoredProductMapping))
      )
  ]);

  return { optionSets, productMappings };
};

export const saveOptionSet = async (optionSet: OptionSet): Promise<OptionSet> => {
  if (!optionSet.name.trim()) {
    throw new Error("Option set name is required.");
  }

  const normalized: OptionSet = {
    ...optionSet,
    slug: optionSet.slug || slugify(optionSet.name),
    updatedAt: now()
  };

  const elevatedSave = auth.elevate(items.save);
  await elevatedSave(collectionId("option-sets"), optionSetToItem(normalized));
  return normalized;
};

export const createOptionSet = async (name: string): Promise<OptionSet> => {
  const id = `set-${Date.now()}`;
  const created: OptionSet = {
    id,
    name,
    slug: slugify(name),
    status: "draft",
    version: 1,
    updatedAt: now(),
    options: [],
    rules: [],
    pricingRules: []
  };
  return saveOptionSet(created);
};

export const publishOptionSet = async (optionSetId: string): Promise<OptionSet> => {
  const { optionSets } = await getAppData();
  const optionSet = optionSets.find((candidate) => candidate.id === optionSetId);
  if (!optionSet) {
    throw new Error(`Option set ${optionSetId} was not found.`);
  }
  if (optionSet.options.length === 0) {
    throw new Error("Add at least one option before publishing.");
  }
  return saveOptionSet({
    ...optionSet,
    status: "published",
    version: optionSet.version + 1
  });
};

export const saveProductMapping = async (
  mapping: ProductMapping
): Promise<ProductMapping> => {
  const elevatedSave = auth.elevate(items.save);
  await elevatedSave(collectionId("product-mappings"), mappingToItem(mapping));
  return mapping;
};

export const buildDefaultSelections = (optionSet: OptionSet): ConfigurationSelections =>
  optionSet.options.reduce<ConfigurationSelections>((selections, option) => {
    if (option.defaultValue !== undefined) {
      selections[option.key] = option.defaultValue;
    }
    return selections;
  }, {});

export const resetAppData = async (): Promise<AppData> => {
  if (!isPersistenceConfigured()) {
    return cloneDemoData();
  }

  const elevatedSave = auth.elevate(items.save);
  const demoData = cloneDemoData();
  await Promise.all([
    ...demoData.optionSets.map((optionSet) =>
      elevatedSave(collectionId("option-sets"), optionSetToItem(optionSet))
    ),
    ...demoData.productMappings.map((mapping) =>
      elevatedSave(collectionId("product-mappings"), mappingToItem(mapping))
    )
  ]);
  return getAppData();
};
