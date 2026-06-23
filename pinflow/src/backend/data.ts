/**
 * Thin, elevated wrappers around the `@wix/data` items API.
 *
 * PinFlow's collections are all `PRIVILEGED`, so every read/write runs in an
 * elevated context via `auth.elevate`. Repositories build on these helpers so
 * the elevation concern lives in exactly one place.
 */
import { items } from "@wix/data";
import { auth } from "@wix/essentials";

export const insertItem = auth.elevate(items.insert);
export const updateItem = auth.elevate(items.update);
export const saveItem = auth.elevate(items.save);
export const removeItem = auth.elevate(items.remove);
export const getItem = auth.elevate(items.get);

/**
 * Run an arbitrary data operation (typically a query builder `.find()`) in an
 * elevated context. Query builders are constructed lazily, so the permissioned
 * call only happens inside `fn`.
 */
export function runElevated<T>(fn: () => Promise<T>): Promise<T> {
  return auth.elevate(fn)();
}

export { items };
