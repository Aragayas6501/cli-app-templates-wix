import React, { useMemo, useState } from "react";
import {
  Box,
  Breadcrumbs,
  Button,
  Cell,
  Layout,
  Loader,
  Page,
  Text,
} from "@wix/design-system";
import { dashboard } from "@wix/dashboard";
import { WixPageId } from "../../consts";
import type { DashboardTab, ReturnRequest } from "../../types";
import { withProviders } from "../withProviders";
import { useReturnFlowData } from "../hooks/use-returnflow-data";
import { MetricCard } from "../components/MetricCard";
import { OperationsPanels } from "../components/OperationsPanels";
import { ReturnInspector } from "../components/ReturnInspector";
import { ReturnsTable } from "../components/ReturnsTable";
import { id as actionModalId } from "../modals/returnflow-action/modal.json";
import { id as returnFlowPageId } from "./page.json";
import "../styles.css";

const tabs: { id: DashboardTab; title: string }[] = [
  { id: "overview", title: "Overview" },
  { id: "returns", title: "Returns" },
  { id: "policies", title: "Policies" },
  { id: "refunds", title: "Refunds" },
  { id: "exchanges", title: "Exchanges" },
  { id: "analytics", title: "Analytics" },
  { id: "fraud", title: "Fraud" },
  { id: "automations", title: "Automations" },
  { id: "settings", title: "Settings" },
];

function filterReturnsForTab(returns: ReturnRequest[], tab: DashboardTab): ReturnRequest[] {
  if (tab === "refunds") {
    return returns.filter((request) => request.resolutionPreference === "refund");
  }
  if (tab === "exchanges") {
    return returns.filter((request) => request.resolutionPreference === "exchange");
  }
  if (tab === "fraud") {
    return returns.filter((request) => request.riskLevel !== "low" || request.priority !== "normal");
  }
  return returns;
}

function ReturnFlowProPage() {
  const { data, approve, reject, refund, exchange, credit, saveSettings } = useReturnFlowData();
  const [selectedTab, setSelectedTab] = useState<DashboardTab>("overview");
  const [selectedReturnId, setSelectedReturnId] = useState<string | undefined>();
  const [query, setQuery] = useState("");

  const selectedReturn = useMemo<ReturnRequest | undefined>(() => {
    if (!data.data) {
      return undefined;
    }
    const visibleReturns = filterReturnsForTab(data.data.returns, selectedTab);
    return visibleReturns.find((request) => request.id === selectedReturnId) ?? visibleReturns[0];
  }, [data.data, selectedReturnId, selectedTab]);

  const handleMutation = async (mutation: () => Promise<unknown>, successMessage: string) => {
    try {
      await mutation();
      dashboard.showToast({ message: successMessage, type: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ReturnFlow action failed.";
      dashboard.showToast({ message, type: "error" });
    }
  };

  const confirmAction = async (request: ReturnRequest, action: string, impact: string): Promise<boolean> => {
    const { modalClosed } = dashboard.openModal({
      modalId: actionModalId,
      params: {
        rmaNumber: request.rmaNumber,
        action,
        impact,
      },
    });
    const result = await modalClosed;
    return Boolean(result && typeof result === "object" && "confirmed" in result && result.confirmed);
  };

  const handleConfirmedMutation = async (
    request: ReturnRequest,
    action: string,
    impact: string,
    mutation: () => Promise<unknown>,
    successMessage: string
  ) => {
    if (await confirmAction(request, action, impact)) {
      await handleMutation(mutation, successMessage);
    }
  };

  const showReturns = selectedTab === "overview" || selectedTab === "returns" || selectedTab === "refunds" || selectedTab === "exchanges" || selectedTab === "fraud";
  const showOperations = selectedTab !== "returns";
  const visibleReturns = data.data ? filterReturnsForTab(data.data.returns, selectedTab) : [];

  return (
    <Page height="100vh">
      <Page.Header
        breadcrumbs={
          <Breadcrumbs
            activeId={returnFlowPageId}
            items={[
              { id: WixPageId.MANAGE_APPS, value: "Apps" },
              { id: returnFlowPageId, value: "ReturnFlow Pro" },
            ]}
            onClick={({ id }) => dashboard.navigate(id as string)}
          />
        }
        title="ReturnFlow Pro"
        subtitle="Returns, exchanges, refunds, store credit, RMA status, and recovery analytics for Wix Stores."
        actionsBar={
          <Box gap="SP2">
            <Button onClick={() => setSelectedTab("settings")}>Configure portal</Button>
          </Box>
        }
      />
      <Page.Content>
        <Box className="rf-canvas" padding="SP4" direction="vertical" gap="SP4">
          <div className={`rf-status-rail ${data.data?.returns.some((request) => request.priority === "critical") ? "rf-critical" : ""}`}>
            <Box direction="vertical">
              <Text weight="bold">Operational rail</Text>
              <Text size="small">
                {data.data
                  ? `${data.data.returns.filter((request) => request.status === "pending_approval").length} returns need approval. Customer portal is ${data.data.settings.portalEnabled ? "online" : "paused"}.`
                  : "Loading ReturnFlow health."}
              </Text>
            </Box>
            <Text size="small">
              Stores catalog: {data.data?.catalogVersion.replace(/_/g, " ").toLowerCase() ?? "checking"}
            </Text>
          </div>
          {data.isError ? (
            <Box className="rf-soft-panel" padding="SP4" direction="vertical" gap="SP2">
              <Text weight="bold">ReturnFlow could not load</Text>
              <Text secondary>
                {data.error instanceof Error ? data.error.message : "Refresh the dashboard and try again."}
              </Text>
            </Box>
          ) : data.isLoading || !data.data ? (
            <Box align="center" padding="SP6">
              <Loader />
            </Box>
          ) : (
            <Box direction="vertical" gap="SP4">
              <Layout>
                <Cell span={3}>
                  <MetricCard
                    label="Return rate"
                    value={`${data.data.analytics.returnRate}%`}
                    caption="Last 30 days"
                  />
                </Cell>
                <Cell span={3}>
                  <MetricCard
                    label="Exchange rate"
                    value={`${data.data.analytics.exchangeRate}%`}
                    caption="Refunds converted"
                  />
                </Cell>
                <Cell span={3}>
                  <MetricCard
                    label="Recovery revenue"
                    value={`$${data.data.analytics.recoveryRevenue}`}
                    caption="Exchange value retained"
                  />
                </Cell>
                <Cell span={3}>
                  <MetricCard
                    label="Ticket reduction"
                    value={`${data.data.analytics.supportTicketsReduced}%`}
                    caption="Estimated deflection"
                  />
                </Cell>
              </Layout>
              <Box gap="SP1" className="rf-tabs">
                {tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    size="small"
                    priority={tab.id === selectedTab ? "primary" : "secondary"}
                    onClick={() => setSelectedTab(tab.id)}
                  >
                    {tab.title}
                  </Button>
                ))}
              </Box>
              <Layout>
                <Cell span={8}>
                  <Box direction="vertical" gap="SP4">
                    {showReturns && (
                      <ReturnsTable
                        returns={visibleReturns}
                        selectedId={selectedReturn?.id}
                        query={query}
                        onQueryChange={setQuery}
                        onSelect={(request) => setSelectedReturnId(request.id)}
                      />
                    )}
                    {showOperations && (
                      <OperationsPanels
                        activeTab={selectedTab}
                        data={data.data}
                        onSettingsChange={(settings) =>
                          handleMutation(
                            () => saveSettings.mutateAsync(settings),
                            "ReturnFlow settings saved."
                          )
                        }
                      />
                    )}
                  </Box>
                </Cell>
                <Cell span={4}>
                  <ReturnInspector
                    request={showReturns ? selectedReturn : undefined}
                    approving={approve.isLoading}
                    rejecting={reject.isLoading}
                    onApprove={(request) =>
                      handleConfirmedMutation(
                        request,
                        "Approve return",
                        "Approval moves the request forward and records approved quantities on eligible items.",
                        () => approve.mutateAsync(request.id),
                        "Return approved."
                      )
                    }
                    onReject={(request) =>
                      handleConfirmedMutation(
                        request,
                        "Reject return",
                        "Rejection closes the approval path and records the merchant decision in the return timeline.",
                        () => reject.mutateAsync(request.id),
                        "Return rejected."
                      )
                    }
                    onRefund={(request) =>
                      handleConfirmedMutation(
                        request,
                        "Create refund intent",
                        "A refund intent will be created for merchant action in the native Wix order refund flow.",
                        () => refund.mutateAsync(request.id),
                        "Refund intent created."
                      )
                    }
                    onExchange={(request) =>
                      handleConfirmedMutation(
                        request,
                        "Create exchange intent",
                        "An exchange intent will be created for merchant fulfillment and the return timeline will be updated.",
                        () => exchange.mutateAsync(request.id),
                        "Exchange intent created."
                      )
                    }
                    onCredit={(request) =>
                      handleConfirmedMutation(
                        request,
                        "Issue store credit",
                        "Store credit will be issued for merchant confirmation and the return timeline will be updated.",
                        () => credit.mutateAsync(request.id),
                        "Store credit issued."
                      )
                    }
                  />
                </Cell>
              </Layout>
            </Box>
          )}
        </Box>
      </Page.Content>
    </Page>
  );
}

export default withProviders(ReturnFlowProPage);
