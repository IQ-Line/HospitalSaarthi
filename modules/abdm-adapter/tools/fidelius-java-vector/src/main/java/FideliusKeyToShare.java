import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Security;
import org.bouncycastle.asn1.x9.X9ECParameters;
import org.bouncycastle.crypto.ec.CustomNamedCurves;
import org.bouncycastle.jce.interfaces.ECPublicKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jce.spec.ECParameterSpec;
import org.bouncycastle.jce.spec.ECPublicKeySpec;
import org.bouncycastle.util.encoders.Base64;

/** sukreet/fidelius HTTP /encrypt returns keyToShare = base64(X509 SPKI), not 65-byte EC point. */
public final class FideliusKeyToShare {
  private static final String CURVE = "curve25519";

  static {
    Security.addProvider(new BouncyCastleProvider());
  }

  public static void main(String[] args) throws Exception {
    String line = new String(System.in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).trim();
    String needle = "\"senderPublicKeyB64\":\"";
    int start = line.indexOf(needle);
    if (start < 0) {
      System.err.println("senderPublicKeyB64 required");
      System.exit(1);
    }
    start += needle.length();
    StringBuilder sb = new StringBuilder();
    for (int i = start; i < line.length(); i++) {
      char c = line.charAt(i);
      if (c == '\\' && i + 1 < line.length()) {
        sb.append(line.charAt(++i));
        continue;
      }
      if (c == '"') break;
      sb.append(c);
    }
    String senderPublicKeyB64 = sb.toString();
    String keyToShare = exportKeyToShare(senderPublicKeyB64);
    System.out.printf("{\"keyToShareB64\":%s}%n", jsonString(keyToShare));
  }

  static String exportKeyToShare(String senderPublicKeyB64) throws Exception {
    byte[] point = Base64.decode(senderPublicKeyB64);
    X9ECParameters ecP = CustomNamedCurves.getByName(CURVE);
    ECParameterSpec params =
        new ECParameterSpec(ecP.getCurve(), ecP.getG(), ecP.getN(), ecP.getH(), ecP.getSeed());
    PublicKey pub =
        KeyFactory.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME)
            .generatePublic(
                new ECPublicKeySpec(params.getCurve().decodePoint(point), params));
    return Base64.toBase64String(((ECPublicKey) pub).getEncoded());
  }

  private static String jsonString(String s) {
    return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
  }
}
