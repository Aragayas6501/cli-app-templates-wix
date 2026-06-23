import { COLLECTIONS } from "@/consts";
import type { Board } from "@/types";
import { items, removeItem, runElevated, saveItem } from "backend/data";

const COL = COLLECTIONS.boards;

export async function listBoards(accountId?: string): Promise<Board[]> {
  const res = await runElevated(() => {
    let q = items.query(COL).ascending("name");
    if (accountId) q = q.eq("accountId", accountId);
    return q.find();
  });
  return res.items as unknown as Board[];
}

export async function getBoardByPinterestId(
  accountId: string,
  pinterestBoardId: string,
): Promise<Board | null> {
  const res = await runElevated(() =>
    items
      .query(COL)
      .eq("accountId", accountId)
      .eq("pinterestBoardId", pinterestBoardId)
      .limit(1)
      .find(),
  );
  return (res.items[0] as unknown as Board) ?? null;
}

async function clearOtherAssignments(
  accountId: string,
  assignedContentType: "product" | "blog",
  keepBoardId?: string,
): Promise<void> {
  const res = await runElevated(() =>
    items
      .query(COL)
      .eq("accountId", accountId)
      .eq("assignedContentType", assignedContentType)
      .find(),
  );
  const updates = (res.items as unknown as Board[])
    .filter((board) => board._id && board._id !== keepBoardId)
    .map((board) => saveItem(COL, { ...board, assignedContentType: "none" }));
  await Promise.all(updates);
}

/** Find the board assigned to auto-publish a given content type. */
export async function getAssignedBoard(
  accountId: string,
  contentType: "product" | "blog",
): Promise<Board | null> {
  const res = await runElevated(() =>
    items
      .query(COL)
      .eq("accountId", accountId)
      .eq("assignedContentType", contentType)
      .limit(1)
      .find(),
  );
  return (res.items[0] as unknown as Board) ?? null;
}

/** Upsert a board mirror keyed by (accountId, pinterestBoardId). */
export async function upsertBoard(board: Board): Promise<Board> {
  const existing = board.pinterestBoardId
    ? await getBoardByPinterestId(board.accountId, board.pinterestBoardId)
    : null;
  const merged = existing?._id ? { ...existing, ...board, _id: existing._id } : board;
  const saved = (await saveItem(COL, merged)) as unknown as Board;
  if (saved._id && saved.assignedContentType && saved.assignedContentType !== "none") {
    await clearOtherAssignments(saved.accountId, saved.assignedContentType, saved._id);
  }
  return saved;
}

export async function syncBoards(accountId: string, boards: Board[]): Promise<Board[]> {
  return Promise.all(boards.map((b) => upsertBoard({ ...b, accountId })));
}

export async function setAssignedContentType(
  boardId: string,
  assignedContentType: Board["assignedContentType"],
): Promise<Board> {
  const res = await runElevated(() => items.query(COL).eq("_id", boardId).limit(1).find());
  const existing = res.items[0] as unknown as Board;
  if (!existing?._id) throw new Error(`Board ${boardId} not found`);
  if (assignedContentType && assignedContentType !== "none") {
    await clearOtherAssignments(existing.accountId, assignedContentType, existing._id);
  }
  return (await saveItem(COL, {
    ...existing,
    assignedContentType,
  })) as unknown as Board;
}

export async function removeBoard(boardId: string): Promise<void> {
  const res = await runElevated(() => items.query(COL).eq("_id", boardId).limit(1).find());
  const existing = res.items[0] as unknown as Board;
  if (!existing?._id) throw new Error(`Board ${boardId} not found`);
  await removeItem(COL, boardId);
}
