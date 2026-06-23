import React, { useCallback } from "react";
import {
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Card,
  Cell,
  EmptyState,
  Heading,
  Layout,
  Loader,
  Page,
  Table,
  Text,
} from "@wix/design-system";
import { Add, Delete } from "@wix/wix-ui-icons-common";
import { dashboard } from "@wix/dashboard";
import { withProviders } from "../withProviders";
import { usePriceFlowData } from "../hooks/use-priceflow-data";
import { WixPageId } from "../../consts";
import { id as pageId } from "./page.json";
import { id as ruleBuilderModalId } from "../modals/rule-builder/modal.json";
import { UpgradeCard } from "../components/UpgradeCard";
import type { PricingRule } from "../../types";

function statusSkin(status: PricingRule["status"]) {
  if (status === "active") {
    return "success" as const;
  }
  if (status === "paused") {
    return "neutral" as const;
  }
  return "standard" as const;
}

function PriceFlowPage() {
  const { dashboardData, deleteRule } = usePriceFlowData();
  const openRuleBuilder = useCallback(() => {
    dashboard.openModal(ruleBuilderModalId);
  }, []);
  const handleDeleteRule = useCallback(
    (rule: PricingRule) => {
      deleteRule.mutate(rule._id, {
        onSuccess: () => {
          dashboard.showToast({ message: "Pricing rule deleted.", type: "success" });
        },
        onError: (error) => {
          dashboard.showToast({
            message:
              error instanceof Error ? error.message : "Failed to delete pricing rule.",
            type: "error",
          });
        },
      });
    },
    [deleteRule]
  );

  const rows = dashboardData.data?.rules ?? [];
  const activeRules = rows.filter((rule) => rule.status === "active").length;
  const savingsPreview = rows.reduce(
    (total, rule) => total + (rule.status === "active" ? rule.amount : 0),
    0
  );
  const ruleLimit = dashboardData.data?.ruleLimit ?? 1;
  const isAtLimit = Number.isFinite(ruleLimit) && rows.length >= ruleLimit;

  return (
    <Page height="100vh">
      <Page.Header
        title="PriceFlow Pro"
        subtitle="Create quantity-based Wix Stores discounts with storefront tier displays and checkout enforcement."
        actionsBar={
          <Button prefixIcon={<Add />} disabled={isAtLimit} onClick={openRuleBuilder}>
            New pricing rule
          </Button>
        }
        breadcrumbs={
          <Breadcrumbs
            activeId={pageId}
            items={[
              { id: WixPageId.MANAGE_APPS, value: "Apps" },
              { id: pageId, value: "PriceFlow Pro" },
            ]}
            onClick={({ id }) => dashboard.navigate({ pageId: id as string })}
          />
        }
      />
      <Page.Content>
        {dashboardData.isLoading ? (
          <Box align="center" padding="SP6">
            <Loader />
          </Box>
        ) : dashboardData.isError ? (
          <EmptyState
            title="PriceFlow could not load"
            subtitle={
              dashboardData.error instanceof Error
                ? dashboardData.error.message
                : "Refresh the dashboard and try again."
            }
            theme="page"
          >
            <Button onClick={() => dashboardData.refetch()}>Retry</Button>
          </EmptyState>
        ) : (
          <Layout>
            <Cell span={4}>
              <Card>
                <Card.Content>
                  <Box direction="vertical" gap="SP1">
                    <Text secondary>Active rules</Text>
                    <Heading size="medium">{activeRules}</Heading>
                  </Box>
                </Card.Content>
              </Card>
            </Cell>
            <Cell span={4}>
              <Card>
                <Card.Content>
                  <Box direction="vertical" gap="SP1">
                    <Text secondary>Plan</Text>
                    <Heading size="medium">{dashboardData.data?.planTier ?? "free"}</Heading>
                  </Box>
                </Card.Content>
              </Card>
            </Cell>
            <Cell span={4}>
              <Card>
                <Card.Content>
                  <Box direction="vertical" gap="SP1">
                    <Text secondary>Preview savings</Text>
                    <Heading size="medium">{savingsPreview}%</Heading>
                  </Box>
                </Card.Content>
              </Card>
            </Cell>
            <Cell span={8}>
              <Card>
                <Card.Header
                  title="Pricing rules"
                  subtitle="Checkout enforcement is handled by the Discount Triggers service plugin."
                />
                <Card.Content>
                  {rows.length === 0 ? (
                    <EmptyState
                      title="Create your first pricing rule"
                      subtitle="Start with a quantity discount and show the tier table on your product page."
                      theme="page"
                    >
                      <Button onClick={openRuleBuilder}>Create rule</Button>
                    </EmptyState>
                  ) : (
                    <Table
                      data={rows}
                      columns={[
                        {
                          title: "Rule",
                          render: (rule) => (
                            <Box direction="vertical">
                              <Text weight="normal">{rule.name}</Text>
                              <Text size="tiny" secondary>
                                {rule.scopeType} · {rule.ruleType}
                              </Text>
                            </Box>
                          ),
                        },
                        {
                          title: "Discount",
                          render: (rule) => <Text>{rule.amount}% off</Text>,
                        },
                        {
                          title: "Status",
                          render: (rule) => (
                            <Badge skin={statusSkin(rule.status)}>{rule.status}</Badge>
                          ),
                        },
                        {
                          title: "",
                          render: (rule) => (
                            <Button
                              disabled={deleteRule.isLoading}
                              priority="secondary"
                              size="small"
                              prefixIcon={<Delete />}
                              onClick={() => handleDeleteRule(rule)}
                            >
                              Delete
                            </Button>
                          ),
                        },
                      ]}
                    >
                      <Table.Content />
                    </Table>
                  )}
                </Card.Content>
              </Card>
            </Cell>
            <Cell span={4}>
              <Page.Sticky>
                <Box direction="vertical" gap="SP4">
                  {isAtLimit && (
                    <UpgradeCard
                      feature="more pricing rules"
                      instanceId={dashboardData.data?.instanceId}
                      freeTrialAvailable={dashboardData.data?.freeTrialAvailable}
                    />
                  )}
                  <Card>
                    <Card.Header title="Storefront widget" />
                    <Card.Content>
                      <Box direction="vertical" gap="SP3">
                        <Heading size="tiny">Live product-page tiers</Heading>
                        <Text secondary>
                          The site plugin auto-adds to old and new Wix Stores product pages.
                          It displays discounted prices while checkout applies Wix-native
                          discounts through eligible triggers.
                        </Text>
                        <Button
                          priority="secondary"
                          onClick={() => dashboard.navigate({ pageId: WixPageId.PRODUCTS_LIST })}
                        >
                          Open products
                        </Button>
                      </Box>
                    </Card.Content>
                  </Card>
                </Box>
              </Page.Sticky>
            </Cell>
          </Layout>
        )}
      </Page.Content>
    </Page>
  );
}

export default withProviders(PriceFlowPage);
