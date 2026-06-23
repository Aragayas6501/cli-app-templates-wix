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
import { Add } from "@wix/wix-ui-icons-common";
import type { Board, ScheduledPin, ScheduledPinStatus } from "@/types";
import { boardsApi, schedulerApi } from "../../lib/api-client";
import { errorMessage, formatDateTime, formatNumber, toDateTimeLocalValue } from "../../lib/format";

type SelectOption = { id: string; value: string; label: string };

type ScheduleForm = {
  boardId: string;
  title: string;
  link: string;
  imageUrl: string;
  description: string;
  scheduledFor: string;
};

const statusSkin = (status: ScheduledPinStatus) => {
  if (status === "published") return "success";
  if (status === "failed" || status === "cancelled") return "danger";
  if (status === "publishing") return "warning";
  return "neutral";
};

const initialForm = (): ScheduleForm => ({
  boardId: "",
  title: "",
  link: "",
  imageUrl: "",
  description: "",
  scheduledFor: toDateTimeLocalValue(Date.now() + 60 * 60 * 1000),
});

const SchedulerPage: FC = () => {
  const [pins, setPins] = useState<ScheduledPin[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [busyPinId, setBusyPinId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleForm>(initialForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [upcomingPins, boardRows] = await Promise.all([
        schedulerApi.listUpcoming(),
        boardsApi.list(),
      ]);
      setPins(upcomingPins);
      setBoards(boardRows);
      if (!form.boardId && boardRows[0]?.pinterestBoardId) {
        setForm((current) => ({ ...current, boardId: boardRows[0].pinterestBoardId }));
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [form.boardId]);

  useEffect(() => {
    void load();
  }, [load]);

  const boardOptions: SelectOption[] = boards.map((board) => ({
    id: board.pinterestBoardId,
    value: board.name,
    label: board.name,
  }));

  const schedulePin = useCallback(async () => {
    const scheduledFor = new Date(form.scheduledFor).getTime();
    if (!form.boardId || !form.title.trim() || !form.link.trim() || !form.imageUrl.trim()) {
      setFormError("Board, title, link and image URL are required.");
      return;
    }
    if (Number.isNaN(scheduledFor)) {
      setFormError("Choose a valid scheduled date and time.");
      return;
    }

    setSaving(true);
    setFormError(null);
    setError(null);
    try {
      const board = boards.find((item) => item.pinterestBoardId === form.boardId);
      if (!board?.accountId) {
        setFormError("Choose a synced board before scheduling.");
        setSaving(false);
        return;
      }
      await schedulerApi.schedule({
        boardId: form.boardId,
        title: form.title.trim(),
        link: form.link.trim(),
        imageUrl: form.imageUrl.trim(),
        description: form.description.trim() || undefined,
        scheduledFor,
        accountId: board.accountId,
      });
      setFormOpen(false);
      setForm(initialForm());
      setNotice("Pin scheduled.");
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [boards, form, load]);

  const cancelPin = useCallback(async (pin: ScheduledPin) => {
    if (!pin._id) return;
    setBusyPinId(pin._id);
    setError(null);
    setNotice(null);
    try {
      await schedulerApi.cancel(pin._id);
      setNotice("Scheduled pin cancelled.");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyPinId(null);
    }
  }, [load]);

  const columns = [
    { title: "Title", render: (pin: ScheduledPin) => pin.title },
    { title: "Scheduled for", render: (pin: ScheduledPin) => formatDateTime(pin.scheduledFor) },
    {
      title: "Status",
      render: (pin: ScheduledPin) => <Badge skin={statusSkin(pin.status)} uppercase={false}>{pin.status}</Badge>,
    },
    { title: "Attempts", render: (pin: ScheduledPin) => formatNumber(pin.attempts ?? 0) },
    {
      title: "Last error",
      render: (pin: ScheduledPin) => (
        pin.lastError ? <Text size="small" skin="error">{pin.lastError}</Text> : <Text size="small" secondary>None</Text>
      ),
    },
    {
      title: "",
      render: (pin: ScheduledPin) => (
        <TableActionCell
          primaryAction={{
            text: busyPinId === pin._id ? "Cancelling…" : "Cancel",
            onClick: () => void cancelPin(pin),
            disabled: !pin._id || busyPinId === pin._id || pin.status === "cancelled" || pin.status === "published",
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
          title="Scheduler"
          subtitle="Queue Pinterest pins to publish later."
          actionsBar={<Button prefixIcon={<Add />} onClick={() => setFormOpen(true)} disabled={formOpen}>Schedule a pin</Button>}
        />
        <Page.Content>
          <Box direction="vertical" gap="SP4">
            {error ? <Text skin="error">{error}</Text> : null}
            {notice ? <Text skin="success">{notice}</Text> : null}
            {formOpen ? (
              <Card>
                <Card.Header title="Schedule a pin" subtitle="Queue a pin for the external scheduler to publish later." />
                <Card.Content>
                  <Box direction="vertical" gap="SP3">
                    {formError ? <Text skin="error">{formError}</Text> : null}
                    <FormField label="Board" required>
                      <Dropdown
                        options={boardOptions}
                        placeholder="Select a board"
                        selectedId={form.boardId}
                        valueParser={(option: DropdownLayoutValueOption) => option.label ?? String(option.value)}
                        onSelect={(option: DropdownLayoutValueOption) => setForm({ ...form, boardId: String(option.id) })}
                      />
                    </FormField>
                    <FormField label="Title" required>
                      <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                    </FormField>
                    <FormField label="Destination link" required>
                      <Input value={form.link} onChange={(event) => setForm({ ...form, link: event.target.value })} />
                    </FormField>
                    <FormField label="Image URL" required>
                      <Input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} />
                    </FormField>
                    <FormField label="Description">
                      <InputArea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} />
                    </FormField>
                    <FormField label="Publish at" required>
                      <Input type="datetime-local" value={form.scheduledFor} onChange={(event) => setForm({ ...form, scheduledFor: event.target.value })} />
                    </FormField>
                    <Box gap="SP2" align="right">
                      <Button priority="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
                      <Button onClick={() => void schedulePin()} disabled={saving}>
                        {saving ? "Scheduling…" : "Schedule"}
                      </Button>
                    </Box>
                  </Box>
                </Card.Content>
              </Card>
            ) : null}
            {loading ? (
              <Box align="center" padding="SP6"><Loader size="large" text="Loading scheduled pins…" /></Box>
            ) : pins.length === 0 ? (
              <Card>
                <Card.Content>
                  <EmptyState title="No upcoming pins" subtitle="Schedule a pin to keep your Pinterest calendar full." />
                </Card.Content>
              </Card>
            ) : (
              <Card hideOverflow>
                <Table data={pins} columns={columns} rowVerticalPadding="medium">
                  <TableToolbar><TableToolbar.Title>Upcoming scheduled pins</TableToolbar.Title></TableToolbar>
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

export default SchedulerPage;
