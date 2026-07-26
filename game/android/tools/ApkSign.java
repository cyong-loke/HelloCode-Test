import com.android.apksig.ApkSigner;

import java.io.File;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Adds an APK Signature Scheme v2 block to an already jar-signed APK.
 *
 * Android 11 and newer refuse to install an APK targeting API 30+ that carries
 * only a v1 (jar) signature, so jarsigner alone is not enough. This uses
 * Google's own apksig — the same library apksigner wraps.
 *
 * v1 is deliberately left off here: apksig 2.3.0 (the only build on Maven
 * Central) implements v1 against a sun.security.pkcs method that modern JDKs
 * no longer expose, so the JDK's jarsigner does that half instead. v3 is also
 * absent from this release, which costs nothing — v3 exists for key rotation,
 * and the install requirement is "v2 or better".
 */
public final class ApkSign {

  public static void main(String[] args) throws Exception {
    if (args.length < 7) {
      System.err.println(
          "usage: ApkSign <in.apk> <out.apk> <keystore> <storePass> <alias> <keyPass> <minSdk>");
      System.exit(2);
    }

    File input = new File(args[0]);
    File output = new File(args[1]);
    String keystorePath = args[2];
    char[] storePass = args[3].toCharArray();
    String alias = args[4];
    char[] keyPass = args[5].toCharArray();
    int minSdk = Integer.parseInt(args[6]);

    KeyStore keystore = KeyStore.getInstance("PKCS12");
    try (FileInputStream in = new FileInputStream(keystorePath)) {
      keystore.load(in, storePass);
    }

    PrivateKey key = (PrivateKey) keystore.getKey(alias, keyPass);
    if (key == null) throw new IllegalStateException("no private key for alias " + alias);

    Certificate[] chain = keystore.getCertificateChain(alias);
    List<X509Certificate> certs = new ArrayList<>(chain.length);
    for (Certificate c : chain) certs.add((X509Certificate) c);

    ApkSigner.SignerConfig signer =
        new ApkSigner.SignerConfig.Builder("pact", key, certs).build();

    new ApkSigner.Builder(Collections.singletonList(signer))
        .setInputApk(input)
        .setOutputApk(output)
        .setMinSdkVersion(minSdk)
        .setV1SigningEnabled(false)
        .setV2SigningEnabled(true)
        .build()
        .sign();

    System.out.println("signed " + output.getName() + " (" + output.length() + " bytes)");
  }
}
