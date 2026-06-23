import React from "react";
import { Box, Button, Heading, Text } from "@wix/design-system";
import { appId } from "../../../wix.config.json";

interface UpgradeCardProps {
  instanceId?: string;
  freeTrialAvailable?: boolean;
  feature: string;
}

export function UpgradeCard({
  instanceId,
  freeTrialAvailable,
  feature,
}: UpgradeCardProps) {
  const pricingPageUrl =
    instanceId && `https://www.wix.com/apps/upgrade/${appId}?appInstanceId=${instanceId}`;

  return (
    <Box
      align="center"
      backgroundColor="D60"
      border="1px dashed"
      borderColor="D50"
      borderRadius="5px"
      direction="vertical"
      gap="SP3"
      padding="SP5"
    >
      <Heading size="medium">Unlock {feature}</Heading>
      <Text secondary align="center">
        Upgrade PriceFlow Pro to manage more quantity pricing rules for your store.
      </Text>
      <Button
        disabled={!pricingPageUrl}
        size="small"
        onClick={() => pricingPageUrl && window.open(pricingPageUrl)}
      >
        {freeTrialAvailable ? "Start Free Trial" : "Upgrade"}
      </Button>
    </Box>
  );
}
