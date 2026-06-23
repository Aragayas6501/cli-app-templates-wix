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
  ToggleSwitch,
  WixDesignSystemProvider,
} from "@wix/design-system";
import "@wix/design-system/styles.global.css";
import { Add, ExternalLink } from "@wix/wix-ui-icons-common";
import type { AutomationRule, AutomationSource, Board, PinStatus, PublishedPin } from "@/types";
import { boardsApi, pinsApi, rulesApi } from "../../lib/api-client";
import { errorMessage, formatDateTime } from "../../lib/format";

type SelectOption = { id: string; value: string; label: string };

type RuleForm = {
  source: AutomationSource;
  boardId: string;
  enabled: boolean;
  onCreate: boolean;
  onUpdate: boolean;
  titleTemplate: string;
  descriptionTemplate: string;
};

type PublishForm = {
  boardId: string;
  title: string;
  link: string;
  imageUrl: string;
  description: string;
};

const sourceOptions: SelectOption[] = [
  { id: "product", value: "Products", label: "Products" },
  { id: "blog", value: "Blog posts", label: "Blog posts" },
];

const pinStatusSkin = (status: PinStatus) => {
  if (status === "published") return "success";
  if (status === "failed") return "danger";
  return "neutral";
};

const initialRuleForm = (boardId = ""): RuleForm => ({
  source: "product",
  boardId,
  enabled: true,
  onCreate: true,
  onUpdate: false,
  titleTemplate: "",
  descriptionTemplate: "",
});

const initialPublishForm = (boardId = ""): PublishForm => ({
  boardId,
  title: "",
  link: "",
  imageUrl: "",
  description: "",
});

const ContentPage: FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [pins, setPins] = useState<PublishedPin[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRule, setSavingRule] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [publishFormOpen, setPublishFormOpen] = useState(false);
  const [busyRuleId, setBusyRuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ruleFormError, setRuleFormError] = useState<string | null>(null);
  const [publishFormError, setPublishFormError] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleForm>(initialRuleForm);
  const [publishForm, setPublishForm] = useState<PublishForm>(initialPublishForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ruleRows, pinRows, boardRows] = await Promise.all([
        rulesApi.list(),
        pinsApi.listRecent(25),
        boardsApi.list(),
      ]);
      setRules(ruleRows);
      setPins(pinRows);
      setBoards(boardRows);
      const firstBoardId = boardRows[0]?.pinterestBoardId ?? "";
      setRuleForm((current) => (current.boardId ? current : { ...current, boardId: firstBoardId }));
      setPublishForm((current) => (current.boardId ? current : { ...current, boardId: firstBoardId }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const boardOptions: SelectOption[] = boards.map((board) => ({
    id: board.pinterestBoardId,
    value: board.name,
    label: board.name,
  }));

  const boardName = useCallback((boardId: string) => {
    return boards.find((board) => board.pinterestBoardId === boardId)?.name ?? boardId;
  }, [boards]);

  const selectedBoard = useCallback((boardId: string) => {
    return boards.find((board) => board.pinterestBoardId === boardId);
  }, [boards]);

  const saveExistingRule = useCallback(async (rule: AutomationRule) => {
    if (!rule._id) return;
    setBusyRuleId(rule._id);
    setError(null);
    setNotice(null);
    try {
      const saved = await rulesApi.save(rule);
      setRules((current) => current.map((item) => (item._id === saved._id ? saved : item)));
      setNotice("Automation rule updated.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyRuleId(null);
    }
  }, []);

  const addRule = useCallback(async () => {
    const board = selectedBoard(ruleForm.boardId);
    if (!board?.accountId || !ruleForm.boardId) {
      setRuleFormError("Choose a synced board for this rule.");
      return;
    }
    setSavingRule(true);
    setRuleFormError(null);
    setError(null);
    try {
      await rulesApi.save({
        accountId: board.accountId,
        source: ruleForm.source,
        boardId: ruleForm.boardId,
        enabled: ruleForm.enabled,
        onCreate: ruleForm.onCreate,
        onUpdate: ruleForm.onUpdate,
        titleTemplate: ruleForm.titleTemplate.trim() || undefined,
        descriptionTemplate: ruleForm.descriptionTemplate.trim() || undefined,
      });
      setRuleFormOpen(false);
      setRuleForm(initialRuleForm(boardOptions[0]?.id ?? ""));
      setNotice("Automation rule added.");
      await load();
    } catch (err) {
      setRuleFormError(errorMessage(err));
    } finally {
      setSavingRule(false);
    }
  }, [boardOptions, load, ruleForm, selectedBoard]);

  const deleteRule = useCallback(async (rule: AutomationRule) => {
    if (!rule._id) return;
    setBusyRuleId(rule._id);
    setError(null);
    setNotice(null);
    try {
      await rulesApi.remove(rule._id);
      setRules((current) => current.filter((item) => item._id !== rule._id));
      setNotice("Automation rule deleted.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyRuleId(null);
    }
  }, []);

  const publishNow = useCallback(async () => {
    if (!publishForm.boardId || !publishForm.title.trim() || !publishForm.link.trim() || !publishForm.imageUrl.trim()) {
      setPublishFormError("Board, title, link and image URL are required.");
      return;
    }
    const board = selectedBoard(publishForm.boardId);
    setPublishing(true);
    setPublishFormError(null);
    setError(null);
    try {
      await pinsApi.publishNow({
        boardId: publishForm.boardId,
        title: publishForm.title.trim(),
        link: publishForm.link.trim(),
        imageUrl: publishForm.imageUrl.trim(),
        description: publishForm.description.trim() || undefined,
        accountId: board?.accountId,
      });
      setPublishFormOpen(false);
      setPublishForm(initialPublishForm(boardOptions[0]?.id ?? ""));
      setNotice("Pin published.");
      await load();
    } catch (err) {
      setPublishFormError(errorMessage(err));
    } finally {
      setPublishing(false);
    }
  }, [boardOptions, load, publishForm, selectedBoard]);

  const ruleColumns = [
    {
      title: "Source",
      render: (rule: AutomationRule) => <Badge skin="standard" uppercase={false}>{rule.source}</Badge>,
    },
    { title: "Board", render: (rule: AutomationRule) => boardName(rule.boardId) },
    {
      title: "Enabled",
      render: (rule: AutomationRule) => (
        <ToggleSwitch
          checked={rule.enabled}
          disabled={!rule._id || busyRuleId === rule._id}
          onChange={(event) => void saveExistingRule({ ...rule, enabled: event.target.checked })}
        />
      ),
    },
    {
      title: "On create",
      render: (rule: AutomationRule) => (
        <ToggleSwitch
          checked={rule.onCreate}
          disabled={!rule._id || busyRuleId === rule._id}
          onChange={(event) => void saveExistingRule({ ...rule, onCreate: event.target.checked })}
        />
      ),
    },
    {
      title: "On update",
      render: (rule: AutomationRule) => (
        <ToggleSwitch
          checked={rule.onUpdate}
          disabled={!rule._id || busyRuleId === rule._id}
          onChange={(event) => void saveExistingRule({ ...rule, onUpdate: event.target.checked })}
        />
      ),
    },
    {
      title: "",
      render: (rule: AutomationRule) => (
        <TableActionCell
          primaryAction={{
            text: busyRuleId === rule._id ? "Deleting…" : "Delete",
            onClick: () => void deleteRule(rule),
            disabled: !rule._id || busyRuleId === rule._id,
          }}
          alwaysShowPrimaryActions
        />
      ),
    },
  ];

  const pinColumns = [
    { title: "Title", render: (pin: PublishedPin) => pin.title },
    { title: "Source", render: (pin: PublishedPin) => pin.source },
    {
      title: "Status",
      render: (pin: PublishedPin) => <Badge skin={pinStatusSkin(pin.status)} uppercase={false}>{pin.status}</Badge>,
    },
    { title: "Published", render: (pin: PublishedPin) => formatDateTime(pin.publishedAt) },
    {
      title: "Link",
      render: (pin: PublishedPin) => (
        <Button as="a" href={pin.link} target="_blank" priority="secondary" size="small" suffixIcon={<ExternalLink />}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <WixDesignSystemProvider>
      <Page>
        <Page.Header title="Content" subtitle="Automate Wix content and publish manual pins." />
        <Page.Content>
          <Box direction="vertical" gap="SP4">
            {error ? <Text skin="error">{error}</Text> : null}
            {notice ? <Text skin="success">{notice}</Text> : null}
            {loading ? (
              <Box align="center" padding="SP6"><Loader size="large" text="Loading content automation…" /></Box>
            ) : (
              <>
                {ruleFormOpen ? (
                  <Card>
                    <Card.Header title="Add automation rule" subtitle="Map Wix products or blog posts to a Pinterest board." />
                    <Card.Content>
                      <Box direction="vertical" gap="SP3">
                        {ruleFormError ? <Text skin="error">{ruleFormError}</Text> : null}
                        <FormField label="Source" required>
                          <Dropdown options={sourceOptions} selectedId={ruleForm.source} valueParser={(option: DropdownLayoutValueOption) => option.label ?? String(option.value)} onSelect={(option: DropdownLayoutValueOption) => setRuleForm({ ...ruleForm, source: String(option.id) as AutomationSource })} />
                        </FormField>
                        <FormField label="Board" required>
                          <Dropdown options={boardOptions} selectedId={ruleForm.boardId} placeholder="Select a board" valueParser={(option: DropdownLayoutValueOption) => option.label ?? String(option.value)} onSelect={(option: DropdownLayoutValueOption) => setRuleForm({ ...ruleForm, boardId: String(option.id) })} />
                        </FormField>
                        <FormField label="Enabled"><ToggleSwitch checked={ruleForm.enabled} onChange={(event) => setRuleForm({ ...ruleForm, enabled: event.target.checked })} /></FormField>
                        <FormField label="Publish on create"><ToggleSwitch checked={ruleForm.onCreate} onChange={(event) => setRuleForm({ ...ruleForm, onCreate: event.target.checked })} /></FormField>
                        <FormField label="Publish on update"><ToggleSwitch checked={ruleForm.onUpdate} onChange={(event) => setRuleForm({ ...ruleForm, onUpdate: event.target.checked })} /></FormField>
                        <FormField label="Title template"><Input value={ruleForm.titleTemplate} onChange={(event) => setRuleForm({ ...ruleForm, titleTemplate: event.target.value })} placeholder="{{title}}" /></FormField>
                        <FormField label="Description template"><InputArea value={ruleForm.descriptionTemplate} onChange={(event) => setRuleForm({ ...ruleForm, descriptionTemplate: event.target.value })} rows={3} /></FormField>
                        <Box gap="SP2" align="right">
                          <Button priority="secondary" onClick={() => setRuleFormOpen(false)} disabled={savingRule}>Cancel</Button>
                          <Button onClick={() => void addRule()} disabled={savingRule}>
                            {savingRule ? "Saving…" : "Save"}
                          </Button>
                        </Box>
                      </Box>
                    </Card.Content>
                  </Card>
                ) : null}

                {publishFormOpen ? (
                  <Card>
                    <Card.Header title="Publish a pin now" subtitle="Create a manual Pinterest pin from a public image URL." />
                    <Card.Content>
                      <Box direction="vertical" gap="SP3">
                        {publishFormError ? <Text skin="error">{publishFormError}</Text> : null}
                        <FormField label="Board" required>
                          <Dropdown options={boardOptions} selectedId={publishForm.boardId} placeholder="Select a board" valueParser={(option: DropdownLayoutValueOption) => option.label ?? String(option.value)} onSelect={(option: DropdownLayoutValueOption) => setPublishForm({ ...publishForm, boardId: String(option.id) })} />
                        </FormField>
                        <FormField label="Title" required><Input value={publishForm.title} onChange={(event) => setPublishForm({ ...publishForm, title: event.target.value })} /></FormField>
                        <FormField label="Destination link" required><Input value={publishForm.link} onChange={(event) => setPublishForm({ ...publishForm, link: event.target.value })} /></FormField>
                        <FormField label="Image URL" required><Input value={publishForm.imageUrl} onChange={(event) => setPublishForm({ ...publishForm, imageUrl: event.target.value })} /></FormField>
                        <FormField label="Description"><InputArea value={publishForm.description} onChange={(event) => setPublishForm({ ...publishForm, description: event.target.value })} rows={3} /></FormField>
                        <Box gap="SP2" align="right">
                          <Button priority="secondary" onClick={() => setPublishFormOpen(false)} disabled={publishing}>Cancel</Button>
                          <Button onClick={() => void publishNow()} disabled={publishing}>
                            {publishing ? "Publishing…" : "Publish"}
                          </Button>
                        </Box>
                      </Box>
                    </Card.Content>
                  </Card>
                ) : null}

                <Card hideOverflow>
                  <Table data={rules} columns={ruleColumns} rowVerticalPadding="medium">
                    <TableToolbar>
                      <TableToolbar.Title>Automation rules</TableToolbar.Title>
                      <TableToolbar.ItemGroup position="end">
                        <Button prefixIcon={<Add />} size="small" onClick={() => setRuleFormOpen(true)} disabled={ruleFormOpen}>Add rule</Button>
                      </TableToolbar.ItemGroup>
                    </TableToolbar>
                    {rules.length > 0 ? <Table.Content /> : <Card.Content><EmptyState title="No automation rules" subtitle="Add a rule to auto-publish products or blog posts." /></Card.Content>}
                  </Table>
                </Card>

                <Card hideOverflow>
                  <Table data={pins} columns={pinColumns} rowVerticalPadding="medium">
                    <TableToolbar>
                      <TableToolbar.Title>Recent published pins</TableToolbar.Title>
                      <TableToolbar.ItemGroup position="end">
                        <Button prefixIcon={<Add />} size="small" onClick={() => setPublishFormOpen(true)} disabled={publishFormOpen}>Publish a pin now</Button>
                      </TableToolbar.ItemGroup>
                    </TableToolbar>
                    {pins.length > 0 ? <Table.Content /> : <Card.Content><EmptyState title="No published pins" subtitle="Manual and automated pins will appear here." /></Card.Content>}
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

export default ContentPage;
