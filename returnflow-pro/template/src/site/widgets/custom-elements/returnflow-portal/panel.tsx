import React, { type FC, useEffect, useState } from "react";
import { inputs, widget } from "@wix/editor";
import {
  Box,
  Button,
  FillPreview,
  FormField,
  Input,
  SidePanel,
  WixDesignSystemProvider,
} from "@wix/design-system";
import "@wix/design-system/styles.global.css";

const defaultHeadline = "Start a return or exchange";
const defaultAccent = "#0052FF";

const Panel: FC = () => {
  const [headline, setHeadline] = useState(defaultHeadline);
  const [accentColor, setAccentColor] = useState(defaultAccent);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    Promise.all([widget.getProp("headline"), widget.getProp("accent-color")])
      .then(([storedHeadline, storedAccentColor]) => {
        setHeadline(storedHeadline ?? defaultHeadline);
        setAccentColor(storedAccentColor ?? defaultAccent);
        setLoaded(true);
      })
      .catch(() => {
        setError("Settings could not be loaded. Reopen the panel and try again.");
        setLoaded(true);
      });
  }, []);

  const updateHeadline = async (value: string) => {
    const safeHeadline = value.trim().slice(0, 80);
    setHeadline(safeHeadline);
    try {
      await widget.setProp("headline", safeHeadline);
    } catch {
      setError("Headline could not be saved.");
    }
  };

  const updateAccentColor = async (value: string) => {
    setAccentColor(value);
    try {
      await widget.setProp("accent-color", value);
    } catch {
      setError("Accent color could not be saved.");
    }
  };

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <SidePanel width="300">
        {loaded && (
          <SidePanel.Content noPadding>
            {error && (
              <SidePanel.Field>
                <Box padding="SP2">
                  {error}
                </Box>
              </SidePanel.Field>
            )}
            <SidePanel.Field>
              <FormField label="Headline">
                <Input value={headline} onChange={(event) => void updateHeadline(event.target.value)} />
              </FormField>
            </SidePanel.Field>
            <SidePanel.Field>
              <FormField label="Accent color">
                <Box gap="SP2" verticalAlign="middle">
                  <FillPreview
                    fill={accentColor}
                    onClick={() =>
                      inputs.selectColor(accentColor, {
                        onChange: (value) => {
                          if (value) {
                            updateAccentColor(value);
                          }
                        },
                      })
                    }
                  />
                  <Button
                    size="small"
                    priority="secondary"
                    onClick={() =>
                      inputs.selectColor(accentColor, {
                        onChange: (value) => {
                          if (value) {
                            updateAccentColor(value);
                          }
                        },
                      })
                    }
                  >
                    Change
                  </Button>
                </Box>
              </FormField>
            </SidePanel.Field>
          </SidePanel.Content>
        )}
      </SidePanel>
    </WixDesignSystemProvider>
  );
};

export default Panel;
