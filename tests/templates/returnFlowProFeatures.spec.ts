import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const templateRoot = resolve(repoRoot, "returnflow-pro/template");

function readTemplateFile(relativePath: string): string {
  return readFileSync(resolve(templateRoot, relativePath), "utf8");
}

describe("returnflow-pro feature contracts", () => {
  it("requests the Wix Data and Wix Stores scopes needed at install time", () => {
    const config = JSON.parse(readTemplateFile("app-config.json")) as { permissions: string[] };

    expect(config.permissions).toEqual([
      "SCOPE.DC-DATA.READ",
      "SCOPE.DC-DATA.WRITE",
      "SCOPE.STORES.CATALOG_READ_LIMITED",
      "SCOPE.DC-STORES.READ-PRODUCTS",
      "SCOPE.DC-STORES.READ-ORDERS",
      "SCOPE.STORES.PRODUCT_READ",
      "SCOPE.STORES.PRODUCT_READ_ADMIN",
    ]);
  });

  it("uses saved return settings for eligibility and low-risk approval behavior", () => {
    const database = readTemplateFile("src/backend/database.ts");

    expect(database).toContain("function effectivePolicies()");
    expect(database).toContain("returnWindowDays: settings.defaultReturnWindowDays");
    expect(database).toContain("policies: effectivePolicies()");
    expect(database).toContain("settings.autoApproveLowRisk && riskLevel === \"low\"");
    expect(database).toContain("quantityApproved: autoApproved ? item.quantity : 0");
  });

  it("has real exchange intent handling wired from dashboard button to backend API", () => {
    const database = readTemplateFile("src/backend/database.ts");
    const actionApi = readTemplateFile("src/pages/api/returnflow/action.ts");
    const hook = readTemplateFile("src/dashboard/hooks/use-returnflow-data.ts");
    const inspector = readTemplateFile("src/dashboard/components/ReturnInspector.tsx");
    const operations = readTemplateFile("src/dashboard/components/OperationsPanels.tsx");

    expect(database).toContain("export async function createExchangeIntent");
    expect(database).toContain("Exchange intent can only be created for exchange return requests.");
    expect(actionApi).toContain("\"exchange\"");
    expect(actionApi).toContain("createReturnExchangeIntent");
    expect(hook).toContain("action: \"exchange\"");
    expect(inspector).toContain("Create exchange intent");
    expect(inspector).toContain("request.resolutionPreference === \"exchange\"");
    expect(operations).toContain("Exchange fulfillment queue");
    expect(operations).not.toContain("Enabled carriers");
  });

  it("does not present damaged-item evidence as a fake upload flow", () => {
    const database = readTemplateFile("src/backend/database.ts");
    const portal = readTemplateFile("src/site/widgets/custom-elements/returnflow-portal/portal.tsx");

    expect(database).toContain("Require customer-provided damage details");
    expect(database).toContain("safeComment.length < 10");
    expect(portal).toContain("required for damage or wrong-item details");
    expect(database).not.toContain("Require photo upload");
    expect(portal).not.toContain("type=\"file\"");
  });

  it("maps Wix order line item prices whether Wix returns strings or numbers", () => {
    const wixOrders = readTemplateFile("src/backend/wix-orders.ts");

    expect(wixOrders).toContain("typeof rawAmount === \"number\"");
    expect(wixOrders).toContain("typeof rawAmount === \"string\"");
  });
});
