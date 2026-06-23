import type { AppData } from "../types";

export const SAMPLE_APP_DATA: AppData = {
  optionSets: [
    {
      id: "sample-business-cards",
      name: "Business Card Configurator",
      slug: "business-card-configurator",
      status: "published",
      version: 1,
      updatedAt: "2026-06-23T00:00:00.000Z",
      options: [
        {
          key: "paper",
          label: "Paper stock",
          type: "select",
          required: true,
          helpText: "Choose the base material for the cards.",
          values: [
            { key: "matte", label: "Matte 300gsm", priceDelta: "0" },
            { key: "premium", label: "Premium cotton", priceDelta: "8" },
            { key: "recycled", label: "Recycled kraft", priceDelta: "4" }
          ],
          defaultValue: "matte"
        },
        {
          key: "finish",
          label: "Finish",
          type: "swatch",
          required: true,
          values: [
            { key: "standard", label: "Standard", priceDelta: "0" },
            { key: "spot-uv", label: "Spot UV", priceDelta: "12" },
            { key: "foil", label: "Blue foil", priceDelta: "18" }
          ],
          defaultValue: "standard"
        },
        {
          key: "quantity",
          label: "Quantity",
          type: "number",
          required: true,
          defaultValue: 250
        },
        {
          key: "artwork",
          label: "Artwork file",
          type: "file",
          required: false,
          helpText: "Upload a print-ready PDF, AI, or PSD file."
        }
      ],
      rules: [
        {
          id: "premium-requires-finish",
          name: "Premium stock highlights finish options",
          enabled: true,
          conditionTree: {
            all: [{ optionKey: "paper", operator: "equals", value: "premium" }]
          },
          actions: [{ type: "require", optionKey: "finish" }]
        }
      ],
      pricingRules: [
        { id: "premium-paper", name: "Premium paper", enabled: true, type: "fixed", amount: "8", optionKey: "paper", valueKey: "premium" },
        { id: "recycled-paper", name: "Recycled paper", enabled: true, type: "fixed", amount: "4", optionKey: "paper", valueKey: "recycled" },
        { id: "spot-uv", name: "Spot UV finish", enabled: true, type: "fixed", amount: "12", optionKey: "finish", valueKey: "spot-uv" },
        { id: "foil", name: "Blue foil finish", enabled: true, type: "fixed", amount: "18", optionKey: "finish", valueKey: "foil" },
        { id: "quantity-rush", name: "Large quantity handling", enabled: true, type: "quantity", optionKey: "quantity", unitAmount: "0.02" }
      ]
    }
  ],
  productMappings: [
    {
      id: "sample-mapping",
      optionSetId: "sample-business-cards",
      productId: "sample-product-id",
      productName: "Sample Business Cards",
      active: true
    }
  ]
};
