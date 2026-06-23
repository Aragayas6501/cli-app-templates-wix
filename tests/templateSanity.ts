
import { describe, expect, it } from 'vitest';
import { buildApp, checkTypes, createApp, installDependencies } from './testkit';

type TemplateSanityOptions = {
  /**
   * Default per-step timeout in milliseconds. Defaults to 180s.
   */
  timeout?: number;

  /**
   * Per-step timeout for `yarn install` in milliseconds. Defaults to 300s.
   * Templates with a heavier (but standard) dependency set — e.g. those that
   * ship `@wix/design-system` — can raise this so a cold install on a slower
   * machine does not flake at the timeout boundary.
   */
  installTimeout?: number;
};

export const templateSanity = (template: string, options: TemplateSanityOptions = {}) => {
  const { timeout = 180_000, installTimeout = 300_000 } = options;

  describe(`${template} sanity`, () => {
    let cwd: string;

    it("should successfully create a template", async () => {
      cwd = await createApp(template);
      expect(cwd).toBeDefined();
    }, timeout);

    it("should successfully install all dependencies", async () => {
      await expect(installDependencies(cwd)).resolves.not.toThrow();
    }, installTimeout);

    it("should successfully run typecheck", async () => {
      await expect(checkTypes(cwd)).resolves.not.toThrow();
    }, timeout);

    it("should build the app successfully", async () => {
      await expect(buildApp(cwd)).resolves.not.toThrow();
    }, timeout)
  });
}
