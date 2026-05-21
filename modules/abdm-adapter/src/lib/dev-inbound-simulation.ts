/**
 * When simulating gateway callbacks with curl (fake consent/transaction ids),
 * skip outbound NHA acks that would fail with ABDM-1080 etc.
 * Set ABDM_DEV_INBOUND_SIMULATION=true in abdm-adapter-svc .env — never in production.
 */
export function skipOutboundGatewayInDev(): boolean {
  return process.env["ABDM_DEV_INBOUND_SIMULATION"] === "true";
}
