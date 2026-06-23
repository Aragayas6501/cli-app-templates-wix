import React, { type FC, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import reactToWebComponent from "react-to-webcomponent";
import { Badge, Box, Text, WixDesignSystemProvider } from "@wix/design-system";
import { Tag as TagIcon } from "@wix/wix-ui-icons-common";
import { window as siteWindow } from "@wix/site-window";
import { getDisplayPrice } from "../../../../backend/rules.web";
import "@wix/design-system/styles.global.css";

type Props = {
  productId: string;
  quantity: number;
  headline: string;
  showTable: boolean;
};

type DisplayState = {
  currency: string;
  discountedUnitPrice: number;
  savingsAmount: number;
  appliedRuleName?: string;
};

const priceFormatterCache = new Map<string, Intl.NumberFormat>();

function formatPrice(amount: number, currency: string): string {
  const cacheKey = currency || "USD";
  const cachedFormatter = priceFormatterCache.get(cacheKey);
  if (cachedFormatter) {
    return cachedFormatter.format(amount);
  }
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: cacheKey,
  });
  priceFormatterCache.set(cacheKey, formatter);
  return formatter.format(amount);
}

const PriceFlowElement: FC<Props> = ({
  productId,
  quantity = 1,
  headline = "Bulk savings available",
  showTable = true,
}) => {
  const [display, setDisplay] = useState<DisplayState>();

  useEffect(() => {
    siteWindow.viewMode().then((mode) => {
      if (mode !== "Site") {
        setDisplay({
          currency: "USD",
          discountedUnitPrice: 22.5,
          savingsAmount: 25,
          appliedRuleName: "10% off when shoppers buy 10+",
        });
        return;
      }
      getDisplayPrice(productId, quantity)
        .then((result) => {
          const line = result.displayLines[0];
          if (line) {
            setDisplay({
              currency: line.currency,
              discountedUnitPrice: line.discountedUnitPrice,
              savingsAmount: line.savingsAmount,
              appliedRuleName: line.appliedRuleName,
            });
          }
        })
        .catch((error) => {
          console.error("Failed loading PriceFlow display price", error);
        });
    });
  }, [productId, quantity]);

  if (!display || display.savingsAmount <= 0) {
    return null;
  }

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <Box direction="vertical" gap="1" paddingTop={2}>
        <Box>
          <Badge prefixIcon={<TagIcon />} skin="standard" uppercase={false}>
            {headline}
          </Badge>
        </Box>
        <Text>{display.appliedRuleName ?? "PriceFlow discount applied"}</Text>
        <Text size="tiny" secondary>
          Estimated discounted unit price:{" "}
          {formatPrice(display.discountedUnitPrice, display.currency)}
        </Text>
        {showTable && (
          <Text size="tiny" secondary>
            Savings update automatically when shoppers change quantity.
          </Text>
        )}
      </Box>
    </WixDesignSystemProvider>
  );
};

const customElement = reactToWebComponent(
  PriceFlowElement,
  React,
  ReactDOM as unknown as typeof ReactDOM,
  {
    props: {
      productId: "string",
      quantity: "number",
      headline: "string",
      showTable: "boolean",
    },
  }
);

export default customElement;
