import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  EmptyState,
  Loader,
  Page,
  Table,
  TableActionCell,
  TableToolbar,
  Text,
  WixDesignSystemProvider,
} from "@wix/design-system";
import "@wix/design-system/styles.global.css";
import { Pinterest } from "@wix/wix-ui-icons-common";
import { accountsApi, oauthRedirectUri, type AccountSummary } from "../../lib/api-client";
import { errorMessage, formatDateTime } from "../../lib/format";

type OAuthMessage = {
  source: "pinflow-oauth";
  code?: string;
  state?: string;
  error?: string;
};

const statusSkin = (status: AccountSummary["status"]) => {
  if (status === "connected") return "success";
  if (status === "error") return "danger";
  return "neutral";
};

const AccountsPage: FC = () => {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [oauthMessageHandler, setOauthMessageHandler] = useState<((event: MessageEvent) => void) | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAccounts(await accountsApi.list());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (oauthMessageHandler) window.removeEventListener("message", oauthMessageHandler);
    };
  }, [oauthMessageHandler]);

  const disconnect = useCallback(async (id: string) => {
    setBusyAccountId(id);
    setError(null);
    setNotice(null);
    try {
      await accountsApi.disconnect(id);
      setNotice("Pinterest account disconnected.");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyAccountId(null);
    }
  }, [load]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    setNotice(null);
    if (oauthMessageHandler) window.removeEventListener("message", oauthMessageHandler);

    try {
      const redirectUri = oauthRedirectUri();
      const redirectOrigin = new URL(redirectUri).origin;
      const { url, state } = await accountsApi.oauthStart(redirectUri, crypto.randomUUID());
      const popup = window.open(url, "pinflow-oauth", "width=600,height=800");
      if (!popup) {
        setError("Popup blocked. Allow popups for this site and try again.");
        setConnecting(false);
        return;
      }

      const onMessage = async (event: MessageEvent) => {
        if (event.origin !== redirectOrigin || event.source !== popup) return;
        const data = event.data as Partial<OAuthMessage> | null;
        if (!data || data.source !== "pinflow-oauth") return;
        window.removeEventListener("message", onMessage);
        setOauthMessageHandler(null);
        try {
          popup.close();
        } catch {
          // Popup may already be closed by the browser.
        }

        if (data.error) {
          setError(data.error);
          setConnecting(false);
          return;
        }
        if (data.state !== state) {
          setError("Pinterest authorization failed: state mismatch.");
          setConnecting(false);
          return;
        }
        if (!data.code) {
          setError("Pinterest authorization did not return a code.");
          setConnecting(false);
          return;
        }

        try {
          await accountsApi.oauthExchange(data.code, redirectUri, state);
          setNotice("Pinterest account connected.");
          await load();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setConnecting(false);
        }
      };

      setOauthMessageHandler(() => onMessage);
      window.addEventListener("message", onMessage);
    } catch (err) {
      setError(errorMessage(err));
      setConnecting(false);
    }
  }, [load, oauthMessageHandler]);

  const columns = [
    { title: "Username", render: (account: AccountSummary) => account.username },
    {
      title: "Status",
      render: (account: AccountSummary) => (
        <Badge skin={statusSkin(account.status)} uppercase={false}>{account.status}</Badge>
      ),
    },
    {
      title: "Business",
      render: (account: AccountSummary) => (
        <Badge skin={account.isBusiness ? "premium" : "neutral"} uppercase={false}>
          {account.isBusiness ? "Business" : "Personal"}
        </Badge>
      ),
    },
    { title: "Token expires", render: (account: AccountSummary) => formatDateTime(account.tokenExpiresAt) },
    {
      title: "",
      render: (account: AccountSummary) => (
        <TableActionCell
          primaryAction={{
            text: busyAccountId === account.id ? "Disconnecting…" : "Disconnect",
            onClick: () => void disconnect(account.id),
            disabled: busyAccountId === account.id,
          }}
          alwaysShowPrimaryActions
        />
      ),
    },
  ];

  return (
    <WixDesignSystemProvider>
      <Page>
        <Page.Header
          title="Accounts"
          subtitle="Connect Pinterest accounts that PinFlow can publish to."
          actionsBar={
            <Button prefixIcon={<Pinterest />} onClick={() => void connect()} disabled={connecting}>
              {connecting ? "Waiting for Pinterest…" : "Connect Pinterest account"}
            </Button>
          }
        />
        <Page.Content>
          <Box direction="vertical" gap="SP4">
            {error ? <Text skin="error">{error}</Text> : null}
            {notice ? <Text skin="success">{notice}</Text> : null}
            {loading ? (
              <Box align="center" padding="SP6"><Loader size="large" text="Loading accounts…" /></Box>
            ) : accounts.length === 0 ? (
              <Card>
                <Card.Content>
                  <EmptyState title="No Pinterest accounts connected" subtitle="Use the Connect button to authorize PinFlow with Pinterest." />
                </Card.Content>
              </Card>
            ) : (
              <Card hideOverflow>
                <Table data={accounts} columns={columns} rowVerticalPadding="medium">
                  <TableToolbar><TableToolbar.Title>Connected accounts</TableToolbar.Title></TableToolbar>
                  <Table.Content />
                </Table>
              </Card>
            )}
          </Box>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
};

export default AccountsPage;
