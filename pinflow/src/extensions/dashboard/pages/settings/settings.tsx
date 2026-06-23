import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Cell,
  FormField,
  Heading,
  Input,
  Layout,
  Loader,
  Page,
  Text,
  ToggleSwitch,
  WixDesignSystemProvider,
} from "@wix/design-system";
import "@wix/design-system/styles.global.css";
import { Settings } from "@wix/wix-ui-icons-common";
import { embeddedScripts } from "@wix/app-management";
import type { AppSettings } from "@/types";
import { TIER_LIMITS, type TierId } from "@/consts";
import { settingsApi } from "../../lib/api-client";
import { errorMessage, formatNumber } from "../../lib/format";

const EMBED_COMPONENT_ID = "a3c45b8c-f124-4222-80a2-541d2a331f19";

type SettingsForm = {
  siteUrl: string;
  defaultUtmCampaign: string;
  pinterestTagId: string;
  tagEnabled: boolean;
};

const SettingsPage: FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [form, setForm] = useState<SettingsForm>({
    siteUrl: "",
    defaultUtmCampaign: "",
    pinterestTagId: "",
    tagEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [savedSettings, embeddedProps] = await Promise.all([
        settingsApi.get(),
        embeddedScripts.getEmbeddedScript({ componentId: EMBED_COMPONENT_ID }).catch(() => null),
      ]);
      const embeddedParameters = embeddedProps?.parameters;
      setSettings(savedSettings);
      setForm({
        siteUrl: savedSettings.siteUrl ?? "",
        defaultUtmCampaign: savedSettings.defaultUtmCampaign ?? "",
        pinterestTagId: embeddedParameters?.pinterestTagId ?? savedSettings.pinterestTagId ?? "",
        tagEnabled: embeddedParameters?.enabled ? embeddedParameters.enabled === "true" : savedSettings.tagEnabled ?? false,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    if (form.tagEnabled && !form.pinterestTagId.trim()) {
      setError("Pinterest tag ID is required when the tag is enabled.");
      setNotice(null);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    let saved: AppSettings | null = null;
    try {
      saved = await settingsApi.save({
        siteUrl: form.siteUrl.trim() || undefined,
        defaultUtmCampaign: form.defaultUtmCampaign.trim() || undefined,
        pinterestTagId: form.pinterestTagId.trim() || undefined,
        tagEnabled: form.tagEnabled,
      });
      setSettings(saved);
      setNotice("Settings saved.");
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
      return;
    }

    try {
      await embeddedScripts.embedScript(
        {
          parameters: {
            pinterestTagId: form.pinterestTagId.trim(),
            enabled: String(Boolean(form.tagEnabled)),
          },
          disabled: !form.tagEnabled,
        },
        { componentId: EMBED_COMPONENT_ID },
      );
      setNotice("Settings saved and Pinterest tag updated.");
    } catch (err) {
      setError(`Settings saved, but the Pinterest tag could not be updated: ${errorMessage(err)}`);
      if (saved) setSettings(saved);
    } finally {
      setSaving(false);
    }
  }, [form]);

  const tier = settings?.tier as TierId | undefined;
  const limits = tier ? TIER_LIMITS[tier] : undefined;

  return (
    <WixDesignSystemProvider>
      <Page>
        <Page.Header
          title="Settings"
          subtitle="Configure link defaults, Pinterest tag, and plan limits."
          actionsBar={<Button prefixIcon={<Settings />} onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>}
        />
        <Page.Content>
          <Box direction="vertical" gap="SP4">
            {error ? <Text skin="error">{error}</Text> : null}
            {notice ? <Text skin="success">{notice}</Text> : null}
            {loading ? (
              <Box align="center" padding="SP6"><Loader size="large" text="Loading settings…" /></Box>
            ) : (
              <>
                <Card>
                  <Card.Header title="App settings" subtitle="Used when PinFlow builds Pinterest links and tracking." />
                  <Card.Content>
                    <Box direction="vertical" gap="SP4">
                      <FormField label="Site URL" infoContent="Absolute site URL used to resolve relative product and blog links.">
                        <Input value={form.siteUrl} placeholder="https://example.com" onChange={(event) => setForm({ ...form, siteUrl: event.target.value })} />
                      </FormField>
                      <FormField label="Default UTM campaign">
                        <Input value={form.defaultUtmCampaign} placeholder="pinflow" onChange={(event) => setForm({ ...form, defaultUtmCampaign: event.target.value })} />
                      </FormField>
                    </Box>
                  </Card.Content>
                </Card>

                <Card>
                  <Card.Header title="Pinterest tag" subtitle="Embedded script parameters pushed to the connected Wix site." />
                  <Card.Content>
                    <Box direction="vertical" gap="SP4">
                      <FormField label="Pinterest tag ID">
                        <Input value={form.pinterestTagId} placeholder="2612345678901" onChange={(event) => setForm({ ...form, pinterestTagId: event.target.value })} />
                      </FormField>
                      <FormField label="Enable Pinterest tag">
                        <ToggleSwitch checked={form.tagEnabled} onChange={(event) => setForm({ ...form, tagEnabled: event.target.checked })} />
                      </FormField>
                    </Box>
                  </Card.Content>
                </Card>

                <Card>
                  <Card.Header title="Plan limits" subtitle="Current tier limits enforced by PinFlow." />
                  <Card.Content>
                    {tier && limits ? (
                      <Layout>
                        <Cell span={3}><Limit label="Tier" value={<Badge skin="premium" uppercase={false}>{tier}</Badge>} /></Cell>
                        <Cell span={3}><Limit label="Accounts" value={formatLimit(limits.maxAccounts)} /></Cell>
                        <Cell span={3}><Limit label="Pins/month" value={formatLimit(limits.maxPinsPerMonth)} /></Cell>
                        <Cell span={3}><Limit label="Scheduling" value={limits.scheduling ? "Included" : "Not included"} /></Cell>
                        <Cell span={3}><Limit label="Automations" value={limits.automations ? "Included" : "Not included"} /></Cell>
                      </Layout>
                    ) : (
                      <Text secondary>No tier information available yet.</Text>
                    )}
                  </Card.Content>
                </Card>
              </>
            )}
          </Box>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
};

const formatLimit = (value: number): string => {
  return value === Number.MAX_SAFE_INTEGER ? "Unlimited" : formatNumber(value);
};

const Limit: FC<{ label: string; value: string | React.ReactNode }> = ({ label, value }) => (
  <Box direction="vertical" gap="SP1">
    <Text secondary>{label}</Text>
    {typeof value === "string" ? <Heading size="tiny">{value}</Heading> : value}
  </Box>
);

export default SettingsPage;
