const crypto = require("crypto");

// simple base64url helper
function base64url(input) {
  return Buffer.from(JSON.stringify(input))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// fake header/payload (for testing ONLY)
const header = {
  alg: "none",
  typ: "JWT"
};

const payload = {
  sub: "user-1",
  iq_tenant_id: "tenant-1",
  session_id: "sess-123",
  roles: ["admin"],
  org_id: "org-1",
  exp: Math.floor(Date.now() / 1000) + 3600
};

const token =
  base64url(header) + "." + base64url(payload) + ".";

console.log("JWT (UNSIGNED TEST TOKEN):\n", token);