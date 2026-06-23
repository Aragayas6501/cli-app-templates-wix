import React, { type FC, useEffect, useState } from "react";
import { widget } from "@wix/editor";
import {
  FormField,
  Input,
  SidePanel,
  ToggleSwitch,
  WixDesignSystemProvider,
} from "@wix/design-system";
import "@wix/design-system/styles.global.css";

const Panel: FC = () => {
  const [headline, setHeadline] = useState("Bulk savings available");
  const [showTable, setShowTable] = useState(true);

  useEffect(() => {
    Promise.all([widget.getProp("headline"), widget.getProp("show-table")])
      .then(([storedHeadline, storedShowTable]) => {
        if (storedHeadline) {
          setHeadline(storedHeadline);
        }
        if (storedShowTable !== undefined) {
          setShowTable(String(storedShowTable) === "true");
        }
      })
      .catch((error) => console.error("Failed loading PriceFlow widget settings", error));
  }, []);

  return (
    <WixDesignSystemProvider>
      <SidePanel width="300">
        <SidePanel.Content noPadding>
          <SidePanel.Field>
            <FormField label="Badge text">
              <Input
                value={headline}
                onChange={(event) => {
                  setHeadline(event.target.value);
                  void widget.setProp("headline", event.target.value);
                }}
              />
            </FormField>
          </SidePanel.Field>
          <SidePanel.Field>
            <FormField label="Show tier helper text">
              <ToggleSwitch
                checked={showTable}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setShowTable(checked);
                  void widget.setProp("show-table", String(checked));
                }}
              />
            </FormField>
          </SidePanel.Field>
        </SidePanel.Content>
      </SidePanel>
    </WixDesignSystemProvider>
  );
};

export default Panel;
