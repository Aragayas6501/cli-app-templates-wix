import React, { useState } from "react";
import {
  Box,
  Button,
  CustomModalLayout,
  FormField,
  Input,
  InputArea,
  NumberInput,
  RadioGroup,
  Text,
} from "@wix/design-system";
import { dashboard } from "@wix/dashboard";
import "@wix/design-system/styles.global.css";
import { savePricingRule } from "../../../backend/rules.web";
import type { RuleDraft, RuleScopeType } from "../../../types";

const initialDraft: RuleDraft = {
  name: "10% off 10+ items",
  scopeType: "store",
  ruleType: "quantity",
  productIds: [],
  collectionIds: [],
  minQuantity: 10,
  percentOff: 10,
};

function splitIds(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function RuleBuilderModal() {
  const [draft, setDraft] = useState<RuleDraft>(initialDraft);
  const [scopeIds, setScopeIds] = useState("");
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const buildScopedDraft = (): RuleDraft => ({
    ...draft,
    name: draft.name.trim(),
    productIds: draft.scopeType === "product" ? splitIds(scopeIds) : [],
    collectionIds: [],
  });

  const validate = (nextDraft: RuleDraft): string[] => {
    const errors: string[] = [];
    if (!nextDraft.name) {
      errors.push("Rule name is required.");
    }
    if (nextDraft.name.length > 50) {
      errors.push("Rule name must be 50 characters or fewer.");
    }
    if (nextDraft.minQuantity < 1 || !Number.isFinite(nextDraft.minQuantity)) {
      errors.push("Minimum quantity must be at least 1.");
    }
    if (
      nextDraft.percentOff <= 0 ||
      nextDraft.percentOff > 100 ||
      !Number.isFinite(nextDraft.percentOff)
    ) {
      errors.push("Percent off must be between 1 and 100.");
    }
    if (nextDraft.scopeType === "product" && nextDraft.productIds.length === 0) {
      errors.push("Enter at least one product ID for product-scoped rules.");
    }
    return errors;
  };

  const save = async () => {
    if (saving) {
      return;
    }
    const scopedDraft = buildScopedDraft();
    const errors = validate(scopedDraft);
    setValidationErrors(errors);
    if (errors.length > 0) {
      return;
    }

    setSaving(true);
    try {
      await savePricingRule(scopedDraft);
      dashboard.showToast({ message: "Pricing rule created.", type: "success" });
      dashboard.closeModal({ saved: true });
    } catch (error) {
      dashboard.showToast({
        message: error instanceof Error ? error.message : "Failed to save rule.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomModalLayout
      title="Create quantity pricing rule"
      subtitle="This creates a Wix-native discount trigger backed by PriceFlow eligibility logic."
      primaryButtonText={saving ? "Saving..." : "Create rule"}
      secondaryButtonText="Cancel"
      onCloseButtonClick={() => dashboard.closeModal()}
      primaryButtonOnClick={save}
      secondaryButtonOnClick={() => dashboard.closeModal()}
      content={
        <Box direction="vertical" gap="SP4">
          <FormField label="Rule name">
            <Input
              value={draft.name}
              maxLength={50}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
          </FormField>
          <FormField label="Scope">
            <RadioGroup
              value={draft.scopeType}
              onChange={(scopeType) =>
                setDraft((current) => ({
                  ...current,
                  scopeType: scopeType as RuleScopeType,
                }))
              }
            >
              <RadioGroup.Radio value="store">Entire store</RadioGroup.Radio>
              <RadioGroup.Radio value="product">Specific products</RadioGroup.Radio>
            </RadioGroup>
          </FormField>
          {draft.scopeType !== "store" && (
            <FormField
              label="Product IDs"
              infoContent="Comma-separated Wix product IDs. The synced Wix discount is scoped to these products."
            >
              <InputArea
                value={scopeIds}
                onChange={(event) => setScopeIds(event.target.value)}
                placeholder="id-1, id-2"
              />
            </FormField>
          )}
          {validationErrors.length > 0 && (
            <Box direction="vertical" gap="SP1">
              {validationErrors.map((message) => (
                <Text key={message} size="tiny" skin="error">
                  {message}
                </Text>
              ))}
            </Box>
          )}
          <Box gap="SP4">
            <FormField label="Minimum quantity">
              <NumberInput
                value={draft.minQuantity}
                min={1}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, minQuantity: Number(value) }))
                }
              />
            </FormField>
            <FormField label="Percent off">
              <NumberInput
                value={draft.percentOff}
                min={1}
                max={100}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, percentOff: Number(value) }))
                }
              />
            </FormField>
          </Box>
          <Text secondary>
            PriceFlow creates the matching Wix discount rule and uses the Discount
            Triggers service plugin to evaluate checkout eligibility.
          </Text>
        </Box>
      }
    />
  );
}
