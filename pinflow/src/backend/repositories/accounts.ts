import { COLLECTIONS } from "@/consts";
import type { PinterestAccount } from "@/types";
import { getItem, insertItem, items, removeItem, runElevated, updateItem } from "backend/data";

const COL = COLLECTIONS.pinterestAccounts;

export async function getAccount(id: string): Promise<PinterestAccount | null> {
  return (await getItem(COL, id)) as unknown as PinterestAccount | null;
}

export async function listConnectedAccounts(): Promise<PinterestAccount[]> {
  const res = await runElevated(() =>
    items.query(COL).eq("status", "connected").descending("_createdDate").find(),
  );
  return res.items as unknown as PinterestAccount[];
}

export async function getPrimaryAccount(): Promise<PinterestAccount | null> {
  const [account] = await listConnectedAccounts();
  return account ?? null;
}

export async function countConnectedAccounts(): Promise<number> {
  const res = await runElevated(() => items.query(COL).eq("status", "connected").find());
  return res.totalCount ?? res.items.length;
}

export async function findByPinterestUserId(
  pinterestUserId: string,
): Promise<PinterestAccount | null> {
  const res = await runElevated(() =>
    items.query(COL).eq("pinterestUserId", pinterestUserId).limit(1).find(),
  );
  return (res.items[0] as unknown as PinterestAccount) ?? null;
}

/** Insert a freshly connected account or update tokens on an existing one. */
export async function upsertConnectedAccount(
  account: PinterestAccount,
): Promise<PinterestAccount> {
  const existing = await findByPinterestUserId(account.pinterestUserId);
  if (existing?._id) {
    return (await updateItem(COL, {
      ...existing,
      ...account,
      _id: existing._id,
      status: "connected",
    })) as unknown as PinterestAccount;
  }
  return (await insertItem(COL, {
    ...account,
    status: "connected",
  })) as unknown as PinterestAccount;
}

/** Persist a token patch (used by the lazy-refresh flow). */
export async function applyTokenPatch(
  id: string,
  patch: Partial<PinterestAccount>,
): Promise<void> {
  const existing = await getAccount(id);
  if (!existing?._id) throw new Error(`Pinterest account ${id} not found`);
  await updateItem(COL, { ...existing, ...patch, _id: existing._id });
}

export async function setAccountStatus(
  id: string,
  status: PinterestAccount["status"],
): Promise<void> {
  const existing = await getAccount(id);
  if (!existing?._id) throw new Error(`Pinterest account ${id} not found`);
  await updateItem(COL, { ...existing, status, _id: existing._id });
}

export async function disconnectAccount(id: string): Promise<void> {
  const existing = await getAccount(id);
  if (!existing?._id) throw new Error(`Pinterest account ${id} not found`);
  await removeItem(COL, id);
}
