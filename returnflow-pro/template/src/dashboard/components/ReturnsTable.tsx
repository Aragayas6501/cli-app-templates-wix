import React from "react";
import { Badge, Box, Button, Card, Input, Text } from "@wix/design-system";
import type { ReturnRequest } from "../../types";
import { statusLabel } from "backend/status-engine";

interface ReturnsTableProps {
  returns: ReturnRequest[];
  selectedId: string | undefined;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (request: ReturnRequest) => void;
}

function statusTone(status: string): "primary" | "tertiary" | "neutral" {
  if (status === "rejected" || status === "exception") {
    return "tertiary";
  }
  if (status === "approved" || status === "refunded" || status === "closed") {
    return "primary";
  }
  return "neutral";
}

export function ReturnsTable({
  returns,
  selectedId,
  query,
  onQueryChange,
  onSelect,
}: ReturnsTableProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredReturns = returns.filter((request) => {
    if (!normalizedQuery) {
      return true;
    }

    return [request.rmaNumber, request.orderNumber, request.customerName, request.customerEmail]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return (
    <Card className="rf-card">
      <Card.Content>
        <Box direction="vertical" gap="SP3">
          <Box align="space-between" verticalAlign="middle">
            <Box direction="vertical">
              <Text size="medium" weight="bold">
                Returns command center
              </Text>
              <Text size="small" secondary>
                Search, triage, approve, reject, and recover revenue from one operational table.
              </Text>
            </Box>
            <Box width="280px">
              <Input
                value={query}
                onChange={(event) => onQueryChange(event.currentTarget.value)}
                placeholder="Search RMA, order, customer"
              />
            </Box>
          </Box>
          <table className="rf-table" aria-label="Return requests">
            <thead>
              <tr>
                <th>RMA</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Resolution</th>
                <th>Risk</th>
                <th>Value</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.map((request) => (
                <tr key={request.id} data-selected={request.id === selectedId}>
                  <td>
                    <Text weight="bold">{request.rmaNumber}</Text>
                    <Text size="tiny" secondary>
                      Order {request.orderNumber}
                    </Text>
                  </td>
                  <td>
                    <Text>{request.customerName}</Text>
                    <Text size="tiny" secondary>
                      {request.customerEmail}
                    </Text>
                  </td>
                  <td>
                    <span className="rf-status-dot" data-tone={statusTone(request.status)} />
                    {statusLabel(request.status)}
                  </td>
                  <td>
                    <Badge skin="standard">{request.resolutionPreference}</Badge>
                  </td>
                  <td>{request.riskScore}</td>
                  <td>
                    {request.currency} {request.refundEstimateAmount}
                  </td>
                  <td>
                    <Button size="small" priority="secondary" onClick={() => onSelect(request)}>
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredReturns.length === 0 && (
            <Box className="rf-soft-panel" padding="SP4" direction="vertical" gap="SP1">
              <Text weight="bold">{returns.length === 0 ? "No returns yet" : "No matching returns"}</Text>
              <Text secondary>
                {returns.length === 0
                  ? "Verified customer submissions from the return portal will appear here."
                  : "Clear the search or adjust filters to restore the operational queue."}
              </Text>
            </Box>
          )}
        </Box>
      </Card.Content>
    </Card>
  );
}
