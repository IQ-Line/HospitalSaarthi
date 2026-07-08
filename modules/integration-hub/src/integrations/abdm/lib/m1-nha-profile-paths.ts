import type { AbdmSession, M1FlowKind } from "../domain/session.js";
import {
  LOGIN_API_VARIANT_KEY,
  type M1NhaLoginApiVariant,
  parseLoginApiVariant,
} from "./m1-nha-login-paths.js";

export type M1NhaProfileResource = "account" | "abha-card" | "phr-card" | "qr-code";

/** NHA profile/card paths — Postman ABHA-address tree vs profile/account (milestone1 + NHA FAQ §21). */
export function nhaProfileResourcePath(
  variant: M1NhaLoginApiVariant,
  resource: M1NhaProfileResource,
): string {
  if (variant === "phr-abha") {
    switch (resource) {
      case "account":
        return "/v3/phr/web/login/profile/abha-profile";
      case "phr-card":
      case "abha-card":
        return "/v3/phr/web/login/profile/abha/phr-card";
      case "qr-code":
        return "/v3/phr/web/profile/qrCode";
    }
  }
  switch (resource) {
    case "account":
      return "/v3/profile/account";
    case "abha-card":
      return "/v3/profile/account/abha-card";
    case "phr-card":
      return "/v3/profile/account/phr-card";
    case "qr-code":
      return "/v3/profile/account/qrCode";
  }
}

export function resolveSessionProfileApiVariant(
  session: AbdmSession<M1FlowKind>,
): M1NhaLoginApiVariant {
  return parseLoginApiVariant(session.context[LOGIN_API_VARIANT_KEY]);
}
