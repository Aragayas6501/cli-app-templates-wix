import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Dropdown,
  type DropdownLayoutValueOption,
  EmptyState,
  FormField,
  Input,
  InputArea,
  Loader,
  Page,
  Table,
  TableActionCell,
  TableToolbar,
  Text,
  WixDesignSystemProvider,
} from "@wix/design-system";
import "@wix/design-system/styles.global.css";
import { Add, Refresh } from "@wix/wix-ui-icons-common";
import type { Board } from "@/types";
import { boardsApi } from "../../lib/api-client";
import { errorMessage, formatNumber } from "../../lib/format";

type SelectOption = { id: string; value: string; label: string };

type BoardForm = {
  name: string;
  description: string;
  privacy: NonNullable<Board["privacy"]>;
};

const privacyOptions: SelectOption[] = [
  { id: "PUBLIC", value: "Public", label: "Public" },
  { id: "PROTECTED", value: "Protected", label: "Protected" },
  { id: "SECRET", value: "Secret", label: "Secret" },
];

const contentTypeOptions: SelectOption[] = [
  { id: "none", value: "None", label: "None" },
  { id: "product", value: "Products", label: "Products" },
  { id: "blog", value: "Blog", label: "Blog" },
];

const BoardsPage: FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [busyBoardId, setBusyBoardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<BoardForm>({ name: "", description: "", privacy: "PUBLIC" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBoards(await boardsApi.list());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const syncBoards = useCallback(async () => {
    setSyncing(true);
    setError(null);
    setNotice(null);
    try {
      setBoards(await boardsApi.sync());
      setNotice("Boards synced from Pinterest.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSyncing(false);
    }
  }, []);

  const createBoard = useCallback(async () => {
    if (!form.name.trim()) {
      setFormError("Board name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    setError(null);
    try {
      await boardsApi.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        privacy: form.privacy,
        assignedContentType: "none",
      });
      setFormOpen(false);
      setForm({ name: "", description: "", privacy: "PUBLIC" });
      setNotice("Board created.");
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  const assignContentType = useCallback(async (board: Board, assignedContentType: Board["assignedContentType"]) => {
    if (!board._id || !assignedContentType) return;
    setBusyBoardId(board._id);
    setError(null);
    setNotice(null);
    try {
      const updated = await boardsApi.assign(board._id, assignedContentType);
      setBoards((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      setNotice("Board assignment updated.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyBoardId(null);
    }
  }, []);

  const removeBoard = useCallback(async (board: Board) => {
    if (!board._id) return;
    setBusyBoardId(board._id);
    setError(null);
    setNotice(null);
    try {
      await boardsApi.remove(board._id);
      setBoards((current) => current.filter((item) => item._id !== board._id));
      setNotice("Board removed from PinFlow.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyBoardId(null);
    }
  }, []);

  const columns = [
    { title: "Name", render: (board: Board) => board.name },
    {
      title: "Privacy",
      render: (board: Board) => <Badge skin="neutral" uppercase={false}>{board.privacy ?? "PUBLIC"}</Badge>,
    },
    { title: "Pins", render: (board: Board) => formatNumber(board.pinCount) },
    {
      title: "Assigned content type",
      render: (board: Board) => (
        <Dropdown
          disabled={!board._id || busyBoardId === board._id}
          options={contentTypeOptions}
          selectedId={board.assignedContentType ?? "none"}
          valueParser={(option: DropdownLayoutValueOption) => option.label ?? String(option.value)}
          onSelect={(option: DropdownLayoutValueOption) => void assignContentType(board, String(option.id) as Board["assignedContentType"])}
        />
      ),
    },
    {
      title: "",
      render: (board: Board) => (
        <TableActionCell
          primaryAction={{
            text: busyBoardId === board._id ? "Removing…" : "Remove",
            onClick: () => void removeBoard(board),
            disabled: !board._id || busyBoardId === board._id,
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
          title="Boards"
          subtitle="Sync, create, and map Pinterest boards to Wix content."
          actionsBar={
            <Box gap="SP2">
              <Button priority="secondary" prefixIcon={<Refresh />} onClick={() => void syncBoards()} disabled={syncing}>
                {syncing ? "Syncing…" : "Sync from Pinterest"}
              </Button>
              <Button prefixIcon={<Add />} onClick={() => setFormOpen(true)} disabled={formOpen}>Create board</Button>
            </Box>
          }
        />
        <Page.Content>
          <Box direction="vertical" gap="SP4">
            {error ? <Text skin="error">{error}</Text> : null}
            {notice ? <Text skin="success">{notice}</Text> : null}
            {formOpen ? (
              <Card>
                <Card.Header title="Create board" subtitle="Create a Pinterest board and mirror it in PinFlow." />
                <Card.Content>
                  <Box direction="vertical" gap="SP3">
                    {formError ? <Text skin="error">{formError}</Text> : null}
                    <FormField label="Board name" required>
                      <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                    </FormField>
                    <FormField label="Description">
                      <InputArea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} />
                    </FormField>
                    <FormField label="Privacy">
                      <Dropdown
                        options={privacyOptions}
                        selectedId={form.privacy}
                        valueParser={(option: DropdownLayoutValueOption) => option.label ?? String(option.value)}
                        onSelect={(option: DropdownLayoutValueOption) => setForm({ ...form, privacy: String(option.id) as BoardForm["privacy"] })}
                      />
                    </FormField>
                    <Box gap="SP2" align="right">
                      <Button priority="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
                      <Button onClick={() => void createBoard()} disabled={saving}>
                        {saving ? "Creating…" : "Create"}
                      </Button>
                    </Box>
                  </Box>
                </Card.Content>
              </Card>
            ) : null}
            {loading ? (
              <Box align="center" padding="SP6"><Loader size="large" text="Loading boards…" /></Box>
            ) : boards.length === 0 ? (
              <Card>
                <Card.Content>
                  <EmptyState title="No boards synced" subtitle="Sync from Pinterest or connect an account first." />
                </Card.Content>
              </Card>
            ) : (
              <Card hideOverflow>
                <Table data={boards} columns={columns} rowVerticalPadding="medium">
                  <TableToolbar><TableToolbar.Title>Pinterest boards</TableToolbar.Title></TableToolbar>
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

export default BoardsPage;
