import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.Security;
import java.util.Arrays;
import javax.crypto.KeyAgreement;
import org.bouncycastle.asn1.x9.X9ECParameters;
import org.bouncycastle.crypto.digests.SHA256Digest;
import org.bouncycastle.crypto.ec.CustomNamedCurves;
import org.bouncycastle.crypto.engines.AESEngine;
import org.bouncycastle.crypto.generators.HKDFBytesGenerator;
import org.bouncycastle.crypto.modes.GCMBlockCipher;
import org.bouncycastle.crypto.params.AEADParameters;
import org.bouncycastle.crypto.params.HKDFParameters;
import org.bouncycastle.crypto.params.KeyParameter;
import org.bouncycastle.jce.interfaces.ECPublicKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jce.spec.ECParameterSpec;
import org.bouncycastle.jce.spec.ECPrivateKeySpec;
import org.bouncycastle.jce.spec.ECPublicKeySpec;
import org.bouncycastle.util.encoders.Base64;

/**
 * Live HIP→HIU encrypt (stdin JSON → stdout JSON).
 * Uses CustomNamedCurves Weierstrass curve25519 — same path as FideliusVectorMain / NHA wrapper.
 */
public final class FideliusLiveEncrypt {
  private static final String CURVE = "curve25519";

  static {
    Security.addProvider(new BouncyCastleProvider());
  }

  public static void main(String[] args) throws Exception {
    String line = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))
        .readLine();
    if (line == null || line.isBlank()) {
      System.err.println("stdin JSON required");
      System.exit(1);
    }
    String hiuPub = extractJsonString(line, "hiuPublicKey");
    String hiuNonce = extractJsonString(line, "hiuNonce");
    String[] payloads = extractJsonStringArray(line, "payloadJsons");
    if (hiuPub == null || hiuNonce == null || payloads == null || payloads.length == 0) {
      System.err.println("need hiuPublicKey, hiuNonce, payloadJsons[]");
      System.exit(1);
    }

    byte[] hipPrivRaw = new byte[32];
    new SecureRandom().nextBytes(hipPrivRaw);
    byte[] hipNonce = new byte[32];
    new SecureRandom().nextBytes(hipNonce);
    byte[] hiuPubBytes = Base64.decode(hiuPub);
    byte[] hiuNonceBytes = Base64.decode(hiuNonce);

    X9ECParameters ecP = CustomNamedCurves.getByName(CURVE);
    ECParameterSpec params =
        new ECParameterSpec(ecP.getCurve(), ecP.getG(), ecP.getN(), ecP.getH(), ecP.getSeed());
    BigInteger d = new BigInteger(1, hipPrivRaw);
    PrivateKey hipPrivKey =
        KeyFactory.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME)
            .generatePrivate(new ECPrivateKeySpec(d, params));
    PublicKey hipPubKey =
        KeyFactory.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME)
            .generatePublic(new ECPublicKeySpec(params.getG().multiply(d), params));
    String hipPubB64 = Base64.toBase64String(((ECPublicKey) hipPubKey).getQ().getEncoded(false));
    String hipNonceB64 = Base64.toBase64String(hipNonce);

    byte[] xor = xorOfRandom(hipNonce, hiuNonceBytes);
    byte[] shared = Base64.decode(doEcdh(hipPrivKey, hiuPubBytes));
    byte[] aesKey = hkdfAesKey(xor, shared);
    byte[] iv = Arrays.copyOfRange(xor, xor.length - 12, xor.length);

    StringBuilder payloadsOut = new StringBuilder("[");
    for (int i = 0; i < payloads.length; i++) {
      if (i > 0) payloadsOut.append(',');
      payloadsOut.append(jsonString(encryptAesGcm(payloads[i].getBytes(StandardCharsets.UTF_8), aesKey, iv)));
    }
    payloadsOut.append(']');

    System.out.printf(
        "{\"hipPublicKeyB64\":%s,\"hipNonceB64\":%s,\"encryptedPayloads\":%s}%n",
        jsonString(hipPubB64),
        jsonString(hipNonceB64),
        payloadsOut);
  }

  private static byte[] xorOfRandom(byte[] sender, byte[] receiver) {
    byte[] out = new byte[sender.length];
    for (int i = 0; i < sender.length; i++) {
      out[i] = (byte) (sender[i] ^ receiver[i % receiver.length]);
    }
    return out;
  }

  private static String doEcdh(PrivateKey priv, byte[] pub) throws Exception {
    KeyAgreement ka = KeyAgreement.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME);
    ka.init(priv);
    ka.doPhase(loadPublicKey(pub), true);
    return Base64.toBase64String(ka.generateSecret());
  }

  private static PublicKey loadPublicKey(byte[] data) throws Exception {
    X9ECParameters ecP = CustomNamedCurves.getByName(CURVE);
    ECParameterSpec params =
        new ECParameterSpec(ecP.getCurve(), ecP.getG(), ecP.getN(), ecP.getH(), ecP.getSeed());
    return KeyFactory.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME)
        .generatePublic(
            new ECPublicKeySpec(params.getCurve().decodePoint(data), params));
  }

  private static byte[] hkdfAesKey(byte[] xor, byte[] shared) {
    byte[] salt = Arrays.copyOfRange(xor, 0, 20);
    HKDFBytesGenerator gen = new HKDFBytesGenerator(new SHA256Digest());
    gen.init(new HKDFParameters(shared, salt, null));
    byte[] aesKey = new byte[32];
    gen.generateBytes(aesKey, 0, 32);
    return aesKey;
  }

  private static String encryptAesGcm(byte[] plain, byte[] aesKey, byte[] iv) throws Exception {
    GCMBlockCipher cipher = new GCMBlockCipher(new AESEngine());
    cipher.init(true, new AEADParameters(new KeyParameter(aesKey), 128, iv, null));
    byte[] out = new byte[cipher.getOutputSize(plain.length)];
    int n = cipher.processBytes(plain, 0, plain.length, out, 0);
    cipher.doFinal(out, n);
    return Base64.toBase64String(out);
  }

  private static String jsonString(String s) {
    return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
  }

  private static String extractJsonString(String json, String key) {
    String needle = "\"" + key + "\":\"";
    int start = json.indexOf(needle);
    if (start < 0) return null;
    start += needle.length();
    StringBuilder sb = new StringBuilder();
    for (int i = start; i < json.length(); i++) {
      char c = json.charAt(i);
      if (c == '\\' && i + 1 < json.length()) {
        sb.append(json.charAt(++i));
        continue;
      }
      if (c == '"') break;
      sb.append(c);
    }
    return sb.toString();
  }

  private static String[] extractJsonStringArray(String json, String key) {
    String needle = "\"" + key + "\":[";
    int start = json.indexOf(needle);
    if (start < 0) return null;
    start += needle.length();
    int end = json.indexOf(']', start);
    if (end < 0) return null;
    String inner = json.substring(start, end).trim();
    if (inner.isEmpty()) return new String[0];
    java.util.ArrayList<String> items = new java.util.ArrayList<>();
    int i = 0;
    while (i < inner.length()) {
      int q = inner.indexOf('"', i);
      if (q < 0) break;
      StringBuilder sb = new StringBuilder();
      for (int j = q + 1; j < inner.length(); j++) {
        char c = inner.charAt(j);
        if (c == '\\' && j + 1 < inner.length()) {
          sb.append(inner.charAt(++j));
          continue;
        }
        if (c == '"') {
          items.add(sb.toString());
          i = j + 1;
          break;
        }
        sb.append(c);
      }
    }
    return items.toArray(new String[0]);
  }
}
