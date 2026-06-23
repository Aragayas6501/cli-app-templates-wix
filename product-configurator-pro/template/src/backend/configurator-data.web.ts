import { Permissions, webMethod } from "@wix/web-methods";
import {
  createOptionSet,
  getAppData,
  publishOptionSet,
  resetAppData,
  saveOptionSet,
  saveProductMapping
} from "./database";
import { listProducts } from "./stores-catalog";
import type { OptionSet, ProductMapping } from "../types";

export const getConfiguratorData = webMethod(Permissions.Admin, async () => getAppData());

export const getPublishedConfiguratorForProduct = webMethod(
  Permissions.Anyone,
  async (productId?: string) => {
    const data = await getAppData();
    const mapping = productId
      ? data.productMappings.find(
          (candidate) => candidate.active && candidate.productId === productId
        )
      : undefined;

    if (productId && !mapping) {
      return null;
    }

    return (
      data.optionSets.find(
        (optionSet) =>
          optionSet.status === "published" &&
          (!mapping || optionSet.id === mapping.optionSetId)
      ) ?? null
    );
  }
);

export const createConfiguratorOptionSet = webMethod(
  Permissions.Admin,
  async (name: string) => createOptionSet(name)
);

export const saveConfiguratorOptionSet = webMethod(
  Permissions.Admin,
  async (optionSet: OptionSet) => saveOptionSet(optionSet)
);

export const publishConfiguratorOptionSet = webMethod(
  Permissions.Admin,
  async (optionSetId: string) => publishOptionSet(optionSetId)
);

export const saveConfiguratorProductMapping = webMethod(
  Permissions.Admin,
  async (mapping: ProductMapping) => saveProductMapping(mapping)
);

export const listStoreProducts = webMethod(Permissions.Admin, async () => listProducts());

export const resetConfiguratorDemoData = webMethod(Permissions.Admin, async () => resetAppData());
