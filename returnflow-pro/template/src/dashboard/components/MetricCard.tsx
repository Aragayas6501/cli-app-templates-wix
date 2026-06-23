import React from "react";
import { Box, Card, Text } from "@wix/design-system";

interface MetricCardProps {
  label: string;
  value: string;
  caption: string;
  tone?: "primary" | "tertiary" | "neutral";
}

export function MetricCard({ label, value, caption, tone = "primary" }: MetricCardProps) {
  return (
    <Card className="rf-card">
      <Card.Content>
        <Box direction="vertical" gap="SP1">
          <Text size="small" secondary>
            {label}
          </Text>
          <Box verticalAlign="middle" gap="SP1">
            <span className="rf-status-dot" data-tone={tone} />
            <Text size="medium" weight="bold">
              {value}
            </Text>
          </Box>
          <Text size="tiny" secondary>
            {caption}
          </Text>
        </Box>
      </Card.Content>
    </Card>
  );
}
