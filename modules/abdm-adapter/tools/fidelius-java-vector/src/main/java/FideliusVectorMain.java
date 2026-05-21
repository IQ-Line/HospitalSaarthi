import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
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
import org.bouncycastle.jce.interfaces.ECPrivateKey;
import org.bouncycastle.jce.interfaces.ECPublicKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jce.spec.ECParameterSpec;
import org.bouncycastle.jce.spec.ECPrivateKeySpec;
import org.bouncycastle.jce.spec.ECPublicKeySpec;
import org.bouncycastle.util.encoders.Base64;

/** Emits JSON test vector matching ABDM-wrapper EncryptionService.java */
public final class FideliusVectorMain {
  private static final String CURVE = "curve25519";

  public static void main(String[] args) throws Exception {
    Security.addProvider(new BouncyCastleProvider());
    byte[] hipPriv = new byte[32];
    Arrays.fill(hipPriv, (byte) 1);
    byte[] hipNonce = new byte[32];
    Arrays.fill(hipNonce, (byte) 0x11);
    byte[] hiuNonce = new byte[32];
    Arrays.fill(hiuNonce, (byte) 0x22);

    String hiuPubB64 =
        "BCpsBW37KgfLyjxJK0zHHG26hDjxzK368DEO4PapzFhQM0cghZziKuvJh5/anTnHitVHKMn0Owr1HvcH1fm0DpA=";
    byte[] hiuPub = Base64.decode(hiuPubB64);

    String plaintext = "{\"resourceType\":\"Bundle\",\"id\":\"bc-vector-1\"}";
    byte[] xor = xorOfRandom(hipNonce, hiuNonce);
    String sharedB64 = doEcdh(hipPriv, hiuPub);
    byte[] aesKey = hkdfAesKey(xor, Base64.decode(sharedB64));
    byte[] iv = Arrays.copyOfRange(xor, xor.length - 12, xor.length);
    String ciphertext = encryptAesGcm(plaintext.getBytes(), aesKey, iv);

    X9ECParameters ecP = CustomNamedCurves.getByName(CURVE);
    ECParameterSpec params =
        new ECParameterSpec(ecP.getCurve(), ecP.getG(), ecP.getN(), ecP.getH(), ecP.getSeed());
    PublicKey hipPubKey =
        KeyFactory.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME)
            .generatePublic(
                new ECPublicKeySpec(
                    params.getG().multiply(new BigInteger(hipPriv)), params));

    System.out.printf(
        """
        {
          "description": "Java BC CustomNamedCurves curve25519 — EncryptionService path",
          "plaintext": %s,
          "hipPrivateKeyB64": "%s",
          "hipNonceB64": "%s",
          "hiuPublicKeyB64": "%s",
          "hiuNonceB64": "%s",
          "hipPublicKeyB64": "%s",
          "ciphertext": "%s"
        }
        """,
        jsonString(plaintext),
        Base64.toBase64String(hipPriv),
        Base64.toBase64String(hipNonce),
        hiuPubB64,
        Base64.toBase64String(hiuNonce),
        Base64.toBase64String(((ECPublicKey) hipPubKey).getQ().getEncoded(false)),
        ciphertext);
  }

  private static byte[] xorOfRandom(byte[] sender, byte[] receiver) {
    byte[] out = new byte[sender.length];
    for (int i = 0; i < sender.length; i++) {
      out[i] = (byte) (sender[i] ^ receiver[i % receiver.length]);
    }
    return out;
  }

  private static String doEcdh(byte[] priv, byte[] pub) throws Exception {
    KeyAgreement ka = KeyAgreement.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME);
    ka.init(loadPrivateKey(priv));
    ka.doPhase(loadPublicKey(pub), true);
    return Base64.toBase64String(ka.generateSecret());
  }

  private static PrivateKey loadPrivateKey(byte[] data) throws Exception {
    X9ECParameters ecP = CustomNamedCurves.getByName(CURVE);
    ECParameterSpec params =
        new ECParameterSpec(ecP.getCurve(), ecP.getG(), ecP.getN(), ecP.getH(), ecP.getSeed());
    return KeyFactory.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME)
        .generatePrivate(new ECPrivateKeySpec(new BigInteger(data), params));
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
}
