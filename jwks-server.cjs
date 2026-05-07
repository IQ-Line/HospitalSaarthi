const http = require("http");
const fs = require("fs");
const crypto = require("crypto");

function base64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// convert PEM → JWKS
function pemToJwk(publicKeyPem) {
  const key = crypto.createPublicKey(publicKeyPem);
  const der = key.export({ format: "der", type: "spki" });

  const asn1 = crypto.createPublicKey(publicKeyPem);
  const jwk = asn1.export({ format: "jwk" });

  return jwk;
}

const publicKeyPem = fs.readFileSync("public.pem", "utf8");
const jwk = pemToJwk(publicKeyPem);

const jwks = {
  keys: [
    {
      ...jwk,
      kid: "test-key-1",
      alg: "RS256",
      use: "sig"
    }
  ]
};

http
  .createServer((req, res) => {
    if (req.url === "/.well-known/jwks.json") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(jwks, null, 2));
    } else {
      res.statusCode = 404;
      res.end("Not found");
    }
  })
  .listen(3001, () => {
    console.log("JWKS running at http://localhost:3001/.well-known/jwks.json");
  });