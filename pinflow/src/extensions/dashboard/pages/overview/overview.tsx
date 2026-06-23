import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Card,
  Cell,
  EmptyState,
  Heading,
  Layout,
  Loader,
  Page,
  Table,
  TableToolbar,
  Text,
  WixDesignSystemProvider,
} from "@wix/design-system";
import "@wix/design-system/styles.global.css";
import type { PublishedPin } from "@/types";
import {
  accountsApi,
  analyticsApi,
  boardsApi,
  pinsApi,
  readinessApi,
  type AccountSummary,
  type MetricTotals,
  type ReadinessCheck,
} from "../../lib/api-client";
import { errorMessage, formatDateTime, formatNumber } from "../../lib/format";

const emptyTotals: MetricTotals = {
  impression: 0,
  save: 0,
  pin_click: 0,
  outbound_click: 0,
};

const statusSkin = (status: PublishedPin["status"]) => {
  if (status === "published") return "success";
  if (status === "failed") return "danger";
  return "neutral";
};

const OverviewPage: FC = () => {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [boardsCount, setBoardsCount] = useState(0);
  const [summary, setSummary] = useState({
    pinsThisMonth: 0,
    totals: emptyTotals,
  });
  const [readiness, setReadiness] = useState<{ ready: boolean; checks: ReadinessCheck[] }>({
    ready: false,
    checks: [],
  });
  const [recentPins, setRecentPins] = useState<PublishedPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountRows, boardRows, analyticsSummary, pins, readinessState] = await Promise.all([
        accountsApi.list(),
        boardsApi.list(),
        analyticsApi.summary(30),
        pinsApi.listRecent(5),
        readinessApi.get(),
      ]);
      setAccounts(accountRows);
      setBoardsCount(boardRows.length);
      setSummary({ pinsThisMonth: analyticsSummary.pinsThisMonth, totals: analyticsSummary.totals });
      setRecentPins(pins);
      setReadiness(readinessState);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const connectedAccounts = accounts.filter((account) => account.status === "connected").length;
  const recentColumns = [
    { title: "Title", render: (pin: PublishedPin) => pin.title },
    {
      title: "Status",
      render: (pin: PublishedPin) => (
        <Badge skin={statusSkin(pin.status)} uppercase={false}>{pin.status}</Badge>
      ),
    },
    { title: "Published", render: (pin: PublishedPin) => formatDateTime(pin.publishedAt) },
  ];

  return (
    <WixDesignSystemProvider>
      <Page>
        <Page.Header title="PinFlow" subtitle="Pinterest marketing and automation for Wix Studio." />
        <Page.Content>
          <Box direction="vertical" gap="SP4">
            {loading ? (
              <Box align="center" padding="SP6">
                <Loader size="large" text="Loading PinFlow dashboard…" />
              </Box>
            ) : (
              <>
                {error ? <Text skin="error">{error}</Text> : null}
                <Layout>
                  <Cell span={3}><StatCard label="Connected accounts" value={formatNumber(connectedAccounts)} /></Cell>
                  <Cell span={3}><StatCard label="Boards" value={formatNumber(boardsCount)} /></Cell>
                  <Cell span={3}><StatCard label="Pins this month" value={formatNumber(summary.pinsThisMonth)} /></Cell>
                  <Cell span={3}><StatCard label="Impressions" value={formatNumber(summary.totals.impression)} /></Cell>
                </Layout>

                <Card>
                  <Card.Header
                    title="Launch readiness"
                    subtitle={readiness.ready ? "All operational setup checks are passing." : "Resolve these setup items before launch."}
                  />
                  <Card.Content>
                    <Box direction="vertical" gap="SP3">
                      {readiness.checks.map((check) => (
                        <Box key={check.id} gap="SP3" verticalAlign="middle">
                          <Badge skin={check.ready ? "success" : "danger"} uppercase={false}>
                            {check.ready ? "Ready" : "Action needed"}
                          </Badge>
                          <Box direction="vertical" gap="SP1">
                            <Text weight="bold">{check.label}</Text>
                            <Text size="small" secondary>{check.detail}</Text>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Card.Content>
                </Card>

                {accounts.length === 0 ? (
                  <Card>
                    <Card.Content>
                      <EmptyState
                        title="Connect your Pinterest account to get started"
                        subtitle="Once connected, PinFlow can sync boards, publish pins, and track Pinterest analytics."
                      />
                    </Card.Content>
                  </Card>
                ) : null}

                <Card hideOverflow>
                  <Table data={recentPins} columns={recentColumns} rowVerticalPadding="medium">
                    <TableToolbar>
                      <TableToolbar.Title>Recent pins</TableToolbar.Title>
                    </TableToolbar>
                    {recentPins.length > 0 ? (
                      <Table.Content />
                    ) : (
                      <Card.Content>
                        <EmptyState title="No pins yet" subtitle="Published pins will appear here." />
                      </Card.Content>
                    )}
                  </Table>
                </Card>
              </>
            )}
          </Box>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
};

const StatCard: FC<{ label: string; value: string }> = ({ label, value }) => (
  <Card>
    <Card.Content>
      <Box direction="vertical" gap="SP2">
        <Text secondary>{label}</Text>
        <Heading size="medium">{value}</Heading>
      </Box>
    </Card.Content>
  </Card>
);

export default OverviewPage;
