import React from "react";
import { Badge, Box, Button, Card, Divider, Text, TextButton } from "@wix/design-system";
import type { ReturnRequest, ReturnStatus } from "../../types";

interface ReturnInspectorProps {
  request: ReturnRequest | undefined;
  approving: boolean;
  rejecting: boolean;
  onApprove: (request: ReturnRequest) => void;
  onReject: (request: ReturnRequest) => void;
  onRefund: (request: ReturnRequest) => void;
  onCredit: (request: ReturnRequest) => void;
}

const financialActionStatuses: ReturnStatus[] = ["approved", "inspected"];

export function ReturnInspector({
  request,
  approving,
  rejecting,
  onApprove,
  onReject,
  onRefund,
  onCredit,
}: ReturnInspectorProps) {
  if (!request) {
    return (
      <Card className="rf-card rf-inspector">
        <Card.Content>
          <Box direction="vertical" gap="SP2">
            <Text size="medium" weight="bold">
              Select a return
            </Text>
            <Text secondary>
              Open a row to inspect RMA details, customer evidence, status history, and safe next actions.
            </Text>
          </Box>
        </Card.Content>
      </Card>
    );
  }

  const canReview = request.status === "pending_approval";
  const canCreateFinancialIntent = financialActionStatuses.includes(request.status);

  return (
    <Card className="rf-card rf-inspector">
      <Card.Header
        title={request.rmaNumber}
        subtitle={`${request.customerName} • Order ${request.orderNumber}`}
      />
      <Card.Content>
        <Box direction="vertical" gap="SP3">
          <Box gap="SP2" verticalAlign="middle">
            <Badge skin="standard">
              {request.priority}
            </Badge>
            <Badge skin="standard">
              Risk {request.riskScore}
            </Badge>
          </Box>
          <Box direction="vertical" gap="SP1">
            <Text weight="bold">Requested items</Text>
            {request.items.map((item) => (
              <Box key={item.id} direction="vertical">
                <Text>{item.productName}</Text>
                <Text size="tiny" secondary>
                  {item.sku} • {item.reasonCode} • Qty {item.quantityRequested}
                </Text>
              </Box>
            ))}
          </Box>
          <Divider />
          <Box direction="vertical" gap="SP1">
            <Text weight="bold">Timeline</Text>
            {request.timeline.map((event) => (
              <Box key={event.id} direction="vertical">
                <Text size="small">{event.message}</Text>
                <Text size="tiny" secondary>
                  {new Date(event.occurredAt).toLocaleString()}
                </Text>
              </Box>
            ))}
          </Box>
          <Divider />
          <Box gap="SP2" direction="vertical">
            <Button
              disabled={!canReview || approving}
              onClick={() => onApprove(request)}
            >
              {approving ? "Approving..." : "Approve return"}
            </Button>
            <Button
              priority="secondary"
              disabled={!canReview || rejecting}
              onClick={() => onReject(request)}
            >
              {rejecting ? "Rejecting..." : "Reject request"}
            </Button>
            <Box gap="SP2">
              <TextButton disabled={!canCreateFinancialIntent} onClick={() => onRefund(request)}>
                Create refund intent
              </TextButton>
              <TextButton disabled={!canCreateFinancialIntent} onClick={() => onCredit(request)}>
                Issue store credit
              </TextButton>
            </Box>
          </Box>
        </Box>
      </Card.Content>
    </Card>
  );
}
