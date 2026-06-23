
import { describe, expect, it } from 'vitest';
import { buildApp, checkTypes, createApp, installDependencies } from './testkit';

type TemplateSanityOptions = {
  /**
   * Per-step timeout for `yarn install` in milliseconds. Defaults to 60s.
   * Templates with a heavier (but standard) dependency set — e.g. those that
   * ship `@wix/design-system` — can raise this so a cold install on a slower
   * machine does not flake at the timeout boundary.
   */
  installTimeout?: number;
};

export const templateSanity = (template: string, options: TemplateSanityOptions = {}) => {
  const { installTimeout = 60_000 } = options;

  describe(`${template} sanity`, () => {
    let cwd: string;

    it("should successfully create a template", async () => {
      cwd = await createApp(template);
      expect(cwd).toBeDefined();
    }, 60_000);

    it("should successfully install all dependencies", async () => {
      await expect(installDependencies(cwd)).resolves.not.toThrow();
    }, installTimeout);

    it("should successfully run typescheck", async () => {
      await expect(checkTypes(cwd)).resolves.not.toThrow();
    }, 60_000);

    it("should build the app successfully", async () => {
      await expect(buildApp(cwd)).resolves.not.toThrow();
    }, 60_000)
  });
}

