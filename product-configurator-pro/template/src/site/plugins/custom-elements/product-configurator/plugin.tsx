import { getPublishedConfiguratorForProduct } from "../../../../backend/configurator-data.web";
import { evaluatePrice } from "../../../../core/pricing-engine";
import { evaluateRules } from "../../../../core/rules-engine";
import type {
  ConfigurationSelections,
  ConfiguratorOption,
  OptionSet
} from "../../../../types";

const palette = {
  primary: "#0052FF",
  secondary: "#EBF1FF",
  destructive: "#BF3003",
  neutral: "#0F172A",
  white: "#FFFFFF"
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const defaultSelections = (optionSet: OptionSet): ConfigurationSelections =>
  optionSet.options.reduce<ConfigurationSelections>((selections, option) => {
    if (option.defaultValue !== undefined) {
      selections[option.key] = option.defaultValue;
    }
    return selections;
  }, {});

const inputName = (option: ConfiguratorOption) => `pcp-${option.key}`;

const baseStyles = () => `
  <style>
    .pcp-root {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
      color: ${palette.neutral};
      border: 1px solid rgba(15, 23, 42, 0.14);
      border-radius: 16px;
      background: ${palette.white};
      box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
      padding: 24px;
    }
    .pcp-root h2 { margin: 0 0 8px; font-size: 24px; line-height: 1.24; }
    .pcp-field { display: grid; gap: 8px; margin: 16px 0; }
    .pcp-field span { font-weight: 700; }
    .pcp-field small { color: rgba(15, 23, 42, 0.7); }
    .pcp-check {
      grid-template-columns: auto 1fr;
      align-items: center;
      column-gap: 12px;
    }
    .pcp-check small { grid-column: 2; }
    .pcp-input {
      min-height: 44px;
      border: 1px solid rgba(15, 23, 42, 0.22);
      border-radius: 8px;
      padding: 0 12px;
      font: inherit;
    }
    .pcp-input:focus,
    .pcp-check input:focus {
      outline: 3px solid rgba(0,82,255,0.34);
      outline-offset: 2px;
    }
    .pcp-price {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 64px;
      margin-top: 24px;
      padding: 16px;
      border-radius: 16px;
      background: ${palette.secondary};
    }
    .pcp-price strong { color: ${palette.primary}; font-size: 24px; }
  </style>
`;

export default class ProductConfiguratorPlugin extends HTMLElement {
  private optionSet: OptionSet | null = null;

  private selections: ConfigurationSelections = {};

  private fileNames: Record<string, string> = {};

  private loading = true;

  private loadError = "";

  static get observedAttributes() {
    return ["product-id", "currency"];
  }

  connectedCallback() {
    void this.loadOptionSet();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue) {
      return;
    }

    if (name === "product-id" && this.isConnected) {
      void this.loadOptionSet();
      return;
    }

    this.render();
  }

  private async loadOptionSet() {
    this.loading = true;
    this.loadError = "";
    this.render();

    try {
      this.optionSet = await getPublishedConfiguratorForProduct(
        this.getAttribute("product-id") ?? undefined
      );
      this.selections = this.optionSet ? defaultSelections(this.optionSet) : {};
      this.fileNames = {};
    } catch (error) {
      console.error("Failed to load Product Configurator Pro data.", error);
      this.optionSet = null;
      this.selections = {};
      this.loadError = "Configurator data could not be loaded. Please refresh the page.";
    } finally {
      this.loading = false;
      this.render();
    }
  }

  private renderOption(option: ConfiguratorOption, visible: boolean, required: boolean) {
    if (!visible) {
      return "";
    }

    const requiredText = required ? " required" : "";
    if (option.type === "number") {
      const value = String(this.selections[option.key] ?? "");
      return `
        <label class="pcp-field">
          <span>${escapeHtml(option.label)}${requiredText}</span>
          <input class="pcp-input" type="number" data-option="${escapeHtml(option.key)}" value="${escapeHtml(value)}" />
        </label>
      `;
    }

    if (option.type === "file") {
      const fileName = this.fileNames[option.key];
      return `
        <label class="pcp-field">
          <span>${escapeHtml(option.label)}${requiredText}</span>
          <input class="pcp-input" type="file" data-option="${escapeHtml(option.key)}" />
          ${fileName ? `<small>Selected file: ${escapeHtml(fileName)}</small>` : ""}
          <small>${escapeHtml(option.helpText ?? "Upload a file for this configuration.")}</small>
        </label>
      `;
    }

    if (option.type === "text") {
      const value = String(this.selections[option.key] ?? "");
      return `
        <label class="pcp-field">
          <span>${escapeHtml(option.label)}${requiredText}</span>
          <input class="pcp-input" type="text" data-option="${escapeHtml(option.key)}" value="${escapeHtml(value)}" />
          ${option.helpText ? `<small>${escapeHtml(option.helpText)}</small>` : ""}
        </label>
      `;
    }

    if (option.type === "checkbox") {
      const checked = this.selections[option.key] === true ? "checked" : "";
      return `
        <label class="pcp-field pcp-check">
          <input type="checkbox" data-option="${escapeHtml(option.key)}" ${checked} />
          <span>${escapeHtml(option.label)}${requiredText}</span>
          ${option.helpText ? `<small>${escapeHtml(option.helpText)}</small>` : ""}
        </label>
      `;
    }

    const values = option.values ?? [];
    return `
      <label class="pcp-field">
        <span>${escapeHtml(option.label)}${requiredText}</span>
        <select class="pcp-input" data-option="${escapeHtml(option.key)}">
          ${values
            .map((value) => {
              const selected = this.selections[option.key] === value.key ? "selected" : "";
              return `<option value="${escapeHtml(value.key)}" ${selected}>${escapeHtml(value.label)}</option>`;
            })
            .join("")}
        </select>
        ${option.helpText ? `<small>${escapeHtml(option.helpText)}</small>` : ""}
      </label>
    `;
  }

  private attachListeners() {
    this.querySelectorAll<HTMLElement>("[data-option]").forEach((node) => {
      node.addEventListener("change", (event) => {
        const target = event.target as HTMLInputElement | HTMLSelectElement;
        const key = target.getAttribute("data-option");
        if (!key) {
          return;
        }

        if (target instanceof HTMLInputElement && target.type === "file") {
          const file = target.files?.[0];
          if (file) {
            this.selections[key] = file.name;
            this.fileNames[key] = file.name;
          } else {
            delete this.selections[key];
            delete this.fileNames[key];
          }
          this.dispatchEvent(
            new CustomEvent("product-configurator-file-selected", {
              bubbles: true,
              composed: true,
              detail: {
                optionKey: key,
                fileName: file?.name ?? ""
              }
            })
          );
          this.render();
          return;
        }

        if (target instanceof HTMLInputElement && target.type === "checkbox") {
          this.selections[key] = target.checked;
        } else if (target instanceof HTMLInputElement && target.type === "number") {
          if (target.value === "") {
            delete this.selections[key];
          } else {
            this.selections[key] = Number(target.value);
          }
        } else {
          this.selections[key] = target.value;
        }
        this.render();
      });
    });
  }

  private render() {
    if (this.loading) {
      this.innerHTML = `
        ${baseStyles()}
        <section class="pcp-root" aria-label="Product configurator">
          <p>Loading configurator...</p>
        </section>
      `;
      return;
    }

    if (this.loadError) {
      this.innerHTML = `
        ${baseStyles()}
        <section class="pcp-root" aria-label="Product configurator">
          <p role="alert">${escapeHtml(this.loadError)}</p>
        </section>
      `;
      return;
    }

    if (!this.optionSet) {
      this.innerHTML = `
        ${baseStyles()}
        <section class="pcp-root" aria-label="Product configurator">
          <p>No published configurator is assigned to this product.</p>
        </section>
      `;
      return;
    }

    const optionSet = this.optionSet;
    const currency = this.getAttribute("currency") ?? "USD";
    const evaluation = evaluateRules(optionSet.options, optionSet.rules, this.selections);
    const pricing = evaluatePrice({
      options: optionSet.options,
      pricingRules: optionSet.pricingRules,
      selections: this.selections,
      currency
    });
    const required = new Set(evaluation.requiredOptions);
    const visible = new Set(evaluation.visibleOptions);

    this.innerHTML = `
      ${baseStyles()}
      <section class="pcp-root" aria-label="Product configurator">
        <h2>${escapeHtml(optionSet.name)}</h2>
        <p>Choose options below. Pricing updates instantly and is recalculated at checkout.</p>
        ${optionSet.options
          .map((option) => this.renderOption(option, visible.has(option.key), required.has(option.key)))
          .join("")}
        <div class="pcp-price" aria-live="polite">
          <span>Configuration add-on</span>
          <strong>${escapeHtml(currency)} ${escapeHtml(pricing.totalDelta)}</strong>
        </div>
      </section>
    `;
    this.attachListeners();
    const detail = {
      productConfiguratorPro: {
        optionSetId: optionSet.id,
        selections: { ...this.selections }
      },
      pricing
    };
    this.dataset.configuration = JSON.stringify(detail.productConfiguratorPro);
    this.dispatchEvent(
      new CustomEvent("product-configurator-change", {
        bubbles: true,
        composed: true,
        detail
      })
    );
  }
}
