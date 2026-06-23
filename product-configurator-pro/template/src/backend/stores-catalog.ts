import { catalogVersioning, products, productsV3 } from "@wix/stores";

export type CatalogVersion = "V1_CATALOG" | "V3_CATALOG" | "STORES_NOT_INSTALLED";

export type StoreProductSummary = {
  id: string;
  name: string;
  price: string;
};

let cachedVersion: CatalogVersion | undefined;

export const getCatalogVersion = async (): Promise<CatalogVersion> => {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    const { catalogVersion } = await catalogVersioning.getCatalogVersion();
    cachedVersion = (catalogVersion ?? "STORES_NOT_INSTALLED") as CatalogVersion;
    return cachedVersion;
  } catch (error) {
    console.error("Failed to read Wix Stores catalog version.", error);
    return "STORES_NOT_INSTALLED";
  }
};

const priceFromV1 = (product: { priceData?: { price?: number | null } }) =>
  product.priceData?.price == null ? "0.00" : product.priceData.price.toFixed(2);

const priceFromV3 = (product: {
  actualPriceRange?: { minValue?: { amount?: string } };
}) => product.actualPriceRange?.minValue?.amount ?? "0.00";

export const listProducts = async (limit = 20): Promise<StoreProductSummary[]> => {
  const version = await getCatalogVersion();
  if (version === "STORES_NOT_INSTALLED") {
    return [];
  }

  if (version === "V3_CATALOG") {
    const response = await productsV3.queryProducts().limit(limit).find();
    return response.items.map((product) => ({
      id: product._id ?? "",
      name: product.name ?? "Untitled product",
      price: priceFromV3(product)
    }));
  }

  const response = await products.queryProducts().limit(limit).find();
  return response.items.map((product) => ({
    id: product._id ?? "",
    name: product.name ?? "Untitled product",
    price: priceFromV1(product)
  }));
};
