import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Breadcrumbs,
  Cell,
  Layout,
  Loader,
  Page,
  Text
} from "@wix/design-system";
import { dashboard } from "@wix/dashboard";
import { evaluatePrice } from "../../core/pricing-engine";
import { evaluateRules } from "../../core/rules-engine";
import { useConfiguratorData } from "../hooks/use-configurator-data";
import { withProviders } from "../withProviders";
import type { ConfiguratorOption, OptionSet } from "../../types";
import { id as pageId } from "./page.json";
import styles from "./page.module.css";

type Tab = "overview" | "options" | "pricing" | "assign" | "analytics" | "settings";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "options", label: "Option Builder" },
  { id: "pricing", label: "Pricing" },
  { id: "assign", label: "Assign Products" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" }
];

const buildOption = (key: string): ConfiguratorOption => ({
  key,
  label: "New option",
  type: "select",
  required: false,
  values: [
    { key: "standard", label: "Standard", priceDelta: "0" },
    { key: "premium", label: "Premium", priceDelta: "10" }
  ]
});

function ProductConfiguratorPage() {
  const { showToast, navigate } = dashboard;
  const {
    query,
    createOptionSet,
    saveOptionSet,
    publishOptionSet,
    resetDemoData
  } = useConfiguratorData();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [draftName, setDraftName] = useState("New configurable product");
  const [selectedSetId, setSelectedSetId] = useState<string>();

  const data = query.data;
  const selectedSet = useMemo(
    () =>
      data?.optionSets.find((optionSet) => optionSet.id === selectedSetId) ??
      data?.optionSets[0],
    [data?.optionSets, selectedSetId]
  );

  useEffect(() => {
    if (!selectedSetId && data?.optionSets[0]) {
      setSelectedSetId(data.optionSets[0].id);
    }
  }, [data?.optionSets, selectedSetId]);

  const defaultSelections = useMemo(() => {
    const entries = selectedSet?.options
      .filter((option) => option.defaultValue !== undefined)
      .map((option) => [option.key, option.defaultValue]);
    return Object.fromEntries(entries ?? []);
  }, [selectedSet]);

  const pricing = selectedSet
    ? evaluatePrice({
        options: selectedSet.options,
        pricingRules: selectedSet.pricingRules,
        selections: defaultSelections,
        currency: "USD"
      })
    : undefined;

  const ruleEvaluation = selectedSet
    ? evaluateRules(selectedSet.options, selectedSet.rules, defaultSelections)
    : undefined;

  const createSet = async () => {
    try {
      const created = await createOptionSet.mutateAsync(draftName);
      setSelectedSetId(created.id);
      showToast({ message: "Option set created.", type: "success" });
    } catch (error) {
      console.error("Failed to create option set.", error);
      showToast({ message: "Failed to create option set.", type: "error" });
    }
  };

  const updateSet = async (next: OptionSet) => {
    try {
      await saveOptionSet.mutateAsync(next);
      showToast({ message: "Option set saved.", type: "success" });
    } catch (error) {
      console.error("Failed to save option set.", error);
      showToast({ message: "Failed to save option set.", type: "error" });
    }
  };

  const publishSet = async () => {
    if (!selectedSet) {
      return;
    }

    try {
      await publishOptionSet.mutateAsync(selectedSet.id);
      showToast({ message: "Option set published.", type: "success" });
    } catch (error) {
      console.error("Failed to publish option set.", error);
      showToast({ message: "Add at least one option before publishing.", type: "error" });
    }
  };

  const addOption = () => {
    if (!selectedSet) {
      return;
    }

    const key = `option-${Date.now()}`;
    void updateSet({
      ...selectedSet,
      options: [...selectedSet.options, buildOption(key)]
    });
  };

  const updateSelectedSetName = (name: string) => {
    if (!selectedSet) {
      return;
    }

    void updateSet({ ...selectedSet, name });
  };

  const renderOverview = () => (
    <Layout>
      <Cell span={4}>
        <section className={styles.card}>
          <Text size="small" secondary>Published option sets</Text>
          <div className={styles.metric}>
            {data?.optionSets.filter((optionSet) => optionSet.status === "published").length ?? 0}
          </div>
        </section>
      </Cell>
      <Cell span={4}>
        <section className={styles.card}>
          <Text size="small" secondary>Assigned products</Text>
          <div className={styles.metric}>{data?.productMappings.length ?? 0}</div>
        </section>
      </Cell>
      <Cell span={4}>
        <section className={styles.card}>
          <Text size="small" secondary>Preview surcharge</Text>
          <div className={styles.metric}>${pricing?.totalDelta ?? "0.00"}</div>
        </section>
      </Cell>
    </Layout>
  );

  const renderOptions = () => (
    <Layout>
      <Cell span={8}>
        <section className={styles.card}>
          <Box direction="vertical" gap="SP4">
            <Text weight="bold">Option set</Text>
            <input
              className={styles.input}
              aria-label="Option set name"
              value={selectedSet?.name ?? ""}
              onChange={(event) => updateSelectedSetName(event.target.value)}
            />
            <button className={styles.primaryButton} onClick={addOption}>
              Add option
            </button>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Type</th>
                  <th>Required</th>
                </tr>
              </thead>
              <tbody>
                {selectedSet?.options.map((option) => (
                  <tr key={option.key}>
                    <td>{option.label}</td>
                    <td>{option.type}</td>
                    <td>{option.required ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </section>
      </Cell>
      <Cell span={4}>
        <aside className={styles.softPanel}>
          <Text weight="bold">Rule status</Text>
          <Text size="small">
            Visible: {ruleEvaluation?.visibleOptions.length ?? 0}. Required:{" "}
            {ruleEvaluation?.requiredOptions.length ?? 0}.
          </Text>
        </aside>
      </Cell>
    </Layout>
  );

  const renderPricing = () => (
    <section className={styles.card}>
      <Box direction="vertical" gap="SP4">
        <Text weight="bold">Pricing rules</Text>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {selectedSet?.pricingRules.map((rule) => (
              <tr key={rule.id}>
                <td>{rule.name}</td>
                <td>{rule.type}</td>
                <td>{"amount" in rule ? rule.amount : "unitAmount" in rule ? rule.unitAmount : rule.percentage}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Text>Current preview delta: ${pricing?.totalDelta ?? "0.00"}</Text>
      </Box>
    </section>
  );

  const renderAssign = () => (
    <section className={styles.card}>
      <Box direction="vertical" gap="SP4">
        <Text weight="bold">Assigned products</Text>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Product ID</th>
              <th>Option set</th>
            </tr>
          </thead>
          <tbody>
            {data?.productMappings.map((mapping) => (
              <tr key={mapping.id}>
                <td>{mapping.productName}</td>
                <td>{mapping.productId}</td>
                <td>{mapping.optionSetId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </section>
  );

  const renderPlaceholder = (title: string, copy: string) => (
    <section className={styles.card}>
      <Text weight="bold">{title}</Text>
      <Text>{copy}</Text>
    </section>
  );

  const renderContent = () => {
    if (query.isLoading) {
      return <Loader />;
    }

    switch (activeTab) {
      case "overview":
        return renderOverview();
      case "options":
        return renderOptions();
      case "pricing":
        return renderPricing();
      case "assign":
        return renderAssign();
      case "analytics":
        return renderPlaceholder("Analytics", "Funnel and option analytics are prepared for the V2 event pipeline.");
      case "settings":
        return renderPlaceholder("Settings", "Configure currency, upload policy, retention, and storefront defaults.");
      default: {
        const exhaustive: never = activeTab;
        return exhaustive;
      }
    }
  };

  return (
    <Page height="100vh">
      <div className={styles.canvas}>
        <Page.Header
          breadcrumbs={
            <Breadcrumbs
              activeId={pageId}
              items={[
                { id: "manage-apps", value: "Apps" },
                { id: pageId, value: "Product Configurator Pro" }
              ]}
              onClick={({ id }) => navigate(id as string)}
            />
          }
          title="Product Configurator Pro"
          subtitle="Create product options, conditional logic, and live checkout pricing for Wix Stores."
          actionsBar={
            <Box gap="SP2">
              <button className={styles.secondaryButton} onClick={() => resetDemoData.mutate()}>
                Reset demo
              </button>
              <button className={styles.primaryButton} onClick={publishSet}>
                Publish set
              </button>
            </Box>
          }
        />
        <Page.Content>
          <Box direction="vertical" gap="SP4">
            <div className={styles.statusRail}>
              <strong>Setup:</strong> Create an option set, assign it to a Store product, then publish.
              Wix Stores V1/V3 support and checkout SPIs are wired into the template.
            </div>
            <section className={styles.card}>
              <Box gap="SP2" verticalAlign="middle">
                <input
                  className={styles.input}
                  aria-label="New option set name"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                />
                <button className={styles.primaryButton} onClick={createSet}>
                  New option set
                </button>
              </Box>
            </section>
            <div className={styles.tabs}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {renderContent()}
          </Box>
        </Page.Content>
      </div>
    </Page>
  );
}

export default withProviders(ProductConfiguratorPage);
