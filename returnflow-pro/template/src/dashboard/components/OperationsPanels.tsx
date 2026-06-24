import React, { useEffect, useState } from "react";
import { Box, Button, Card, FormField, Input, ToggleSwitch, Text } from "@wix/design-system";
import type { DashboardTab, ReturnFlowDashboardData, ReturnFlowSettings } from "../../types";

interface OperationsPanelsProps {
  activeTab: DashboardTab;
  data: ReturnFlowDashboardData & { catalogVersion: string };
  onSettingsChange: (settings: ReturnFlowSettings) => void;
}

export function OperationsPanels({ activeTab, data, onSettingsChange }: OperationsPanelsProps) {
  const [draftSettings, setDraftSettings] = useState(data.settings);
  const showPolicies = activeTab === "overview" || activeTab === "policies";
  const showAnalytics = activeTab === "overview" || activeTab === "analytics";
  const showAutomations = activeTab === "overview" || activeTab === "fraud" || activeTab === "automations";
  const showExchanges = activeTab === "overview" || activeTab === "exchanges";
  const showSettings = activeTab === "overview" || activeTab === "settings";

  useEffect(() => {
    setDraftSettings(data.settings);
  }, [data.settings]);

  return (
    <Box direction="vertical" gap="SP4">
      {showPolicies && (
        <Card className="rf-card">
          <Card.Header title="Policies" subtitle="Eligibility and approval rules" />
          <Card.Content>
            <Box direction="vertical" gap="SP2">
              {data.policies.map((policy) => (
                <Box key={policy.id} align="space-between">
                  <Box direction="vertical">
                    <Text weight="bold">{policy.name}</Text>
                    <Text size="small" secondary>
                      {policy.returnWindowDays} days • {policy.approvalMode} approval • priority {policy.priority}
                    </Text>
                  </Box>
                  <Text size="small">{policy.isActive ? "Active" : "Paused"}</Text>
                </Box>
              ))}
            </Box>
          </Card.Content>
        </Card>
      )}
      {showAnalytics && (
        <Card className="rf-card">
          <Card.Header title="Analytics and insights" subtitle="Return causes and recovery health" />
          <Card.Content>
            <Box direction="vertical" gap="SP2">
              {data.productInsights.length === 0 ? (
                <Box className="rf-soft-panel" padding="SP3" direction="vertical" gap="SP1">
                  <Text weight="bold">No product insights yet</Text>
                  <Text secondary>Insights populate after verified customers submit return requests.</Text>
                </Box>
              ) : (
                data.productInsights.map((insight) => (
                  <Box key={insight.sku} direction="vertical">
                    <Text weight="bold">{insight.productName}</Text>
                    <Text size="small" secondary>
                      {insight.returnRate}% return rate • Top reason: {insight.topReason}
                    </Text>
                    <Text size="small">{insight.recommendation}</Text>
                  </Box>
                ))
              )}
            </Box>
          </Card.Content>
        </Card>
      )}
      {showExchanges && (
        <Card className="rf-card">
          <Card.Header title="Exchange fulfillment queue" subtitle="Exchange intents created from approved return requests" />
          <Card.Content>
            <Box direction="vertical" gap="SP2">
              {data.exchanges.length === 0 ? (
                <Box className="rf-soft-panel" padding="SP3" direction="vertical" gap="SP1">
                  <Text weight="bold">No exchange intents yet</Text>
                  <Text secondary>
                    Approved exchange returns can be moved into this queue from the return inspector.
                  </Text>
                </Box>
              ) : (
                data.exchanges.map((exchange) => (
                  <Box key={exchange.id} direction="vertical">
                    <Text weight="bold">{exchange.originalSku}</Text>
                    <Text size="small" secondary>
                      {exchange.status} • {exchange.replacementSku ?? "Replacement SKU pending merchant selection"}
                    </Text>
                  </Box>
                ))
              )}
            </Box>
          </Card.Content>
        </Card>
      )}
      {showAutomations && (
        <Card className="rf-card">
          <Card.Header title="Fraud and automations" subtitle="Rules that compress manual review" />
          <Card.Content>
            <Box direction="vertical" gap="SP2">
              {data.automations.map((rule) => (
                <Box key={rule.id} direction="vertical">
                  <Text weight="bold">{rule.name}</Text>
                  <Text size="small" secondary>
                    {rule.conditionSummary} → {rule.actionSummary}
                  </Text>
                </Box>
              ))}
            </Box>
          </Card.Content>
        </Card>
      )}
      {showSettings && (
        <Card className="rf-card">
          <Card.Header title="Settings" subtitle={`Stores catalog: ${data.catalogVersion.replace(/_/g, " ").toLowerCase()}`} />
          <Card.Content>
            <Box direction="vertical" gap="SP4">
              <Box align="space-between" verticalAlign="middle">
                <Box direction="vertical">
                  <Text weight="bold">Customer portal</Text>
                  <Text size="small" secondary>
                    Allow verified customers to submit return and exchange requests.
                  </Text>
                </Box>
                <ToggleSwitch
                  checked={draftSettings.portalEnabled}
                  onChange={() =>
                    setDraftSettings((current) => ({
                      ...current,
                      portalEnabled: !current.portalEnabled,
                    }))
                  }
                />
              </Box>
              <Box align="space-between" verticalAlign="middle">
                <Box direction="vertical">
                  <Text weight="bold">Auto approve low-risk requests</Text>
                  <Text size="small" secondary>
                    Applies only to requests that match policy and risk checks.
                  </Text>
                </Box>
                <ToggleSwitch
                  checked={draftSettings.autoApproveLowRisk}
                  onChange={() =>
                    setDraftSettings((current) => ({
                      ...current,
                      autoApproveLowRisk: !current.autoApproveLowRisk,
                    }))
                  }
                />
              </Box>
              <Box direction="vertical" gap="SP3">
                <FormField label="Default return window">
                  <Input
                    value={String(draftSettings.defaultReturnWindowDays)}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        defaultReturnWindowDays: Number(event.currentTarget.value),
                      }))
                    }
                    suffix={<Text size="small">days</Text>}
                  />
                </FormField>
                <FormField label="Store credit bonus">
                  <Input
                    value={String(draftSettings.storeCreditBonusPercent)}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        storeCreditBonusPercent: Number(event.currentTarget.value),
                      }))
                    }
                    suffix={<Text size="small">%</Text>}
                  />
                </FormField>
                <FormField label="Primary locale">
                  <Input
                    value={draftSettings.primaryLocale}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        primaryLocale: event.currentTarget.value,
                      }))
                    }
                  />
                </FormField>
                <Box align="right">
                  <Button onClick={() => onSettingsChange(draftSettings)}>Save settings</Button>
                </Box>
              </Box>
            </Box>
          </Card.Content>
        </Card>
      )}
    </Box>
  );
}
