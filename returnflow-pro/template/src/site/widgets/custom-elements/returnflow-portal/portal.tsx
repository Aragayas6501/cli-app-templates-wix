import React, { type FC, useState } from "react";
import {
  lookupPortalOrder,
  submitPortalReturnRequest,
} from "backend/returnflow-data.web";
import type { PortalLookupResult, ResolutionPreference, ReturnRequest } from "../../../../types";
import "./style.css";

interface PortalProps {
  headline?: string;
  accentColor?: string;
}

const defaultHeadline = "Start a return or exchange";

export const ReturnFlowPortal: FC<PortalProps> = ({
  headline = defaultHeadline,
  accentColor = "#0052FF",
}) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [lookup, setLookup] = useState<PortalLookupResult | undefined>();
  const [selectedLineItemIds, setSelectedLineItemIds] = useState<string[]>([]);
  const [reasonCode, setReasonCode] = useState("too-small");
  const [resolutionPreference, setResolutionPreference] = useState<ResolutionPreference>("exchange");
  const [comment, setComment] = useState("");
  const [submittedReturn, setSubmittedReturn] = useState<ReturnRequest | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const verifyOrder = async () => {
    const normalizedOrderNumber = orderNumber.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedOrderNumber || !normalizedEmail) {
      setError("Enter your order number and email address.");
      return;
    }

    setLoading(true);
    setError(undefined);
    setSubmittedReturn(undefined);
    try {
      const result = await lookupPortalOrder(normalizedOrderNumber, normalizedEmail);
      setLookup(result);
      setSelectedLineItemIds(
        result.eligibility.items
          .filter((item) => item.eligible)
          .map((item) => item.lineItemId)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify this order.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!lookup) {
      setError("Verify your order before submitting a return.");
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const request = await submitPortalReturnRequest({
        token: lookup.token,
        selectedLineItemIds,
        resolutionPreference,
        reasonCode,
        comment,
      });
      setSubmittedReturn(request);
      setLookup(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit this request.");
    } finally {
      setLoading(false);
    }
  };

  if (submittedReturn) {
    return (
      <section className="rfp-shell" style={{ "--rfp-accent": accentColor } as React.CSSProperties}>
        <div className="rfp-rail">Return submitted</div>
        <h2>{submittedReturn.rmaNumber}</h2>
        <p>
          Your request is now {submittedReturn.status.replace(/_/g, " ")}. We sent the merchant your
          selected items, reason, and preferred resolution.
        </p>
        <ol className="rfp-timeline">
          {submittedReturn.timeline.map((event) => (
            <li key={event.id}>
              <strong>{event.eventType}</strong>
              <span>{event.message}</span>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section className="rfp-shell" style={{ "--rfp-accent": accentColor } as React.CSSProperties}>
      <div className="rfp-rail">Self-service returns</div>
      <h2>{headline}</h2>
      <p>Verify your order, choose eligible items, and request a refund, exchange, or store credit.</p>
      <div className="rfp-grid">
        <label>
          Order number
          <input
            autoComplete="off"
            value={orderNumber}
            onChange={(event) => {
              setOrderNumber(event.target.value);
              setLookup(undefined);
              setSelectedLineItemIds([]);
            }}
          />
        </label>
        <label>
          Email address
          <input
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setLookup(undefined);
              setSelectedLineItemIds([]);
            }}
          />
        </label>
      </div>
      <button type="button" onClick={verifyOrder} disabled={loading}>
        {loading ? "Checking..." : "Verify order"}
      </button>
      {lookup && (
        <div className="rfp-panel">
          <h3>Eligible items</h3>
          {lookup.order.lineItems.map((lineItem) => {
            const eligibility = lookup.eligibility.items.find((item) => item.lineItemId === lineItem.id);
            const eligible = eligibility?.eligible ?? false;
            return (
              <label key={lineItem.id} className="rfp-item">
                <input
                  type="checkbox"
                  checked={selectedLineItemIds.includes(lineItem.id)}
                  disabled={!eligible}
                  onChange={(event) => {
                    setSelectedLineItemIds((current) =>
                      event.target.checked
                        ? [...current, lineItem.id]
                        : current.filter((id) => id !== lineItem.id)
                    );
                  }}
                />
                <span>
                  <strong>{lineItem.productName}</strong>
                  <small>{lineItem.variantDescription} • {eligibility?.reason}</small>
                </span>
              </label>
            );
          })}
          <div className="rfp-grid">
            <label>
              Resolution
              <select
                value={resolutionPreference}
                onChange={(event) => setResolutionPreference(event.target.value as ResolutionPreference)}
              >
                <option value="exchange">Exchange</option>
                <option value="refund">Refund</option>
                <option value="storeCredit">Store credit + bonus</option>
              </select>
            </label>
            <label>
              Reason
              <select value={reasonCode} onChange={(event) => setReasonCode(event.target.value)}>
                {lookup.reasons.map((reason) => (
                  <option key={reason.code} value={reason.code}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Comments
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
          </label>
          <button type="button" onClick={submit} disabled={loading || selectedLineItemIds.length === 0}>
            Submit request
          </button>
        </div>
      )}
      {error && <div className="rfp-error">{error}</div>}
    </section>
  );
};
