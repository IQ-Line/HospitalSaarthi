/**
 * Verifies inbound gateway JWS. Sandbox: permissive (always true).
 * TODO(staging): fetch JWKS from gateway OpenID config and verify Authorization.
 */
export async function verifyAbdmSignature(
  _headers: Record<string, unknown>,
  _body: unknown,
): Promise<boolean> {
  return true;
}
