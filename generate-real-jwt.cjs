const fs = require("fs");
const crypto = require("crypto");

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

const privateKey = fs.readFileSync("private.pem", "utf8");

const header = {
  alg: "RS256",
  typ: "JWT",
  kid: "test-key-1"
};

const payload = {
  sub: "user-1",
  iq_tenant_id: "tenant-2",
  roles: ["admin"],
  org_id: "org-1",
  iss: "hims-auth",
  session_id: "sess-123",
  aud: "user-management",
  exp: Math.floor(Date.now() / 1000) + 3600,
  
};

const data =
  base64url(JSON.stringify(header)) +
  "." +
  base64url(JSON.stringify(payload));

const sign = crypto.createSign("RSA-SHA256");
sign.update(data);
sign.end();

const signature = sign.sign(privateKey, "base64url");

const jwt = data + "." + signature;

console.log("\nJWT:\n", jwt);