import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CustomModalLayout,
  Divider,
  Text,
  WixDesignSystemProvider,
} from "@wix/design-system";
import { dashboard } from "@wix/dashboard";
import "@wix/design-system/styles.global.css";
import "../../styles.css";

interface ModalState {
  rmaNumber?: string;
  action?: string;
  impact?: string;
}

function ReturnFlowActionModal() {
  const [state, setState] = useState<ModalState>({});

  useEffect(() => {
    dashboard.observeState((nextState) => setState(nextState as ModalState));
  }, []);

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <CustomModalLayout
        title={state.action ?? "Review return action"}
        subtitle={state.rmaNumber ?? "ReturnFlow Pro"}
        primaryButtonText="Confirm action"
        secondaryButtonText="Cancel"
        onCloseButtonClick={() => dashboard.closeModal({ confirmed: false })}
        primaryButtonOnClick={() => dashboard.closeModal({ confirmed: true })}
        secondaryButtonOnClick={() => dashboard.closeModal({ confirmed: false })}
      >
        <Box direction="vertical" gap="SP3">
          <Text>
            {state.impact ??
              "This action will update the return timeline, notify the customer where configured, and append an audit event."}
          </Text>
          <Divider />
          <Box className="rf-soft-panel" padding="SP4" direction="vertical" gap="SP1">
            <Text weight="bold">Safety check</Text>
            <Text secondary>
              High-impact return operations preserve customer evidence, status history, and financial intent records.
            </Text>
          </Box>
          <Button priority="secondary" onClick={() => dashboard.closeModal({ confirmed: false })}>
            Keep reviewing
          </Button>
        </Box>
      </CustomModalLayout>
    </WixDesignSystemProvider>
  );
}

export default ReturnFlowActionModal;
