import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  Cell,
  Dropdown,
  type DropdownLayoutValueOption,
  EmptyState,
  FormField,
  Heading,
  Layout,
  Loader,
  Page,
  Text,
  WixDesignSystemProvider,
} from "@wix/design-system";
import "@wix/design-system/styles.global.css";
import { Refresh } from "@wix/wix-ui-icons-common";
import { analyticsApi, type MetricTotals } from "../../lib/api-client";
import { errorMessage, formatDate, formatNumber } from "../../lib/format";

type SelectOption = { id: string; value: string; label: string };

type Summary = {
  sinceDate: string;
  totals: MetricTotals;
  pinsThisMonth: number;
};

const emptyTotals: MetricTotals = {
  impression: 0,
  save: 0,
  pin_click: 0,
  outbound_click: 0,
};

const dayOptions: SelectOption[] = [
  { id: "7", value: "Last 7 days", label: "Last 7 days" },
  { id: "30", value: "Last 30 days", label: "Last 30 days" },
  { id: "90", value: "Last 90 days", label: "Last 90 days" },
];

const metricLabels: Record<keyof MetricTotals, string> = {
  impression: "Impressions",
  save: "Saves",
  pin_click: "Pin clicks",
  outbound_click: "Outbound clicks",
};

const AnalyticsPage: FC = () => {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<Summary>({ sinceDate: "", totals: emptyTotals, pinsThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await analyticsApi.summary(days));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const pullLatest = useCallback(async () => {
    setPulling(true);
    setError(null);
    setNotice(null);
    try {
      const result = await analyticsApi.pull();
      setNotice(`Updated ${formatNumber(result.updated)} metrics from Pinterest.`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPulling(false);
    }
  }, [load]);

  const allTotalsZero = Object.values(summary.totals).every((value) => value === 0);

  return (
    <WixDesignSystemProvider>
      <Page>
        <Page.Header
          title="Analytics"
          subtitle="Pinterest performance pulled into PinFlow."
          actionsBar={
            <Box gap="SP2" verticalAlign="middle">
              <FormField label="Window">
                <Dropdown
                  options={dayOptions}
                  selectedId={String(days)}
                  valueParser={(option: DropdownLayoutValueOption) => option.label ?? String(option.value)}
                  onSelect={(option: DropdownLayoutValueOption) => setDays(Number(option.id))}
                />
              </FormField>
              <Button priority="secondary" prefixIcon={<Refresh />} onClick={() => void pullLatest()} disabled={pulling}>
                {pulling ? "Pulling…" : "Pull latest from Pinterest"}
              </Button>
            </Box>
          }
        />
        <Page.Content>
          <Box direction="vertical" gap="SP4">
            {error ? <Text skin="error">{error}</Text> : null}
            {notice ? <Text skin="success">{notice}</Text> : null}
            {loading ? (
              <Box align="center" padding="SP6"><Loader size="large" text="Loading analytics…" /></Box>
            ) : (
              <>
                <Layout>
                  {(Object.keys(metricLabels) as Array<keyof MetricTotals>).map((metric) => (
                    <Cell span={3} key={metric}>
                      <StatCard label={metricLabels[metric]} value={formatNumber(summary.totals[metric])} />
                    </Cell>
                  ))}
                  <Cell span={6}><StatCard label="Pins this month" value={formatNumber(summary.pinsThisMonth)} /></Cell>
                  <Cell span={6}><StatCard label="Since" value={formatDate(summary.sinceDate)} /></Cell>
                </Layout>
                {allTotalsZero ? (
                  <Card>
                    <Card.Content>
                      <EmptyState title="No analytics yet" subtitle="Pull latest Pinterest metrics or publish pins to start collecting performance data." />
                    </Card.Content>
                  </Card>
                ) : null}
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

export default AnalyticsPage;
