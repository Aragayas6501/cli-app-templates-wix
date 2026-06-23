import React, { type ChangeEvent, type FC, useEffect, useState } from "react";
import { widget } from "@wix/editor";
import {
  FormField,
  Input,
  SidePanel,
  Text,
  WixDesignSystemProvider
} from "@wix/design-system";
import "@wix/design-system/styles.global.css";

const Panel: FC = () => {
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    widget.getProp("currency").then((value) => setCurrency(value || "USD"));
  }, []);

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <SidePanel.Field>
        <Text size="small">
          Product Configurator Pro renders the published option set assigned to this product.
        </Text>
      </SidePanel.Field>
      <SidePanel.Field>
        <FormField label="Currency label">
          <Input
            aria-label="Currency label"
            value={currency}
            size="small"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setCurrency(event.target.value);
              widget.setProp("currency", event.target.value || "USD");
            }}
          />
        </FormField>
      </SidePanel.Field>
    </WixDesignSystemProvider>
  );
};

export default Panel;
