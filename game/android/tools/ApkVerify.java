import com.android.apksig.ApkVerifier;

import java.io.File;

/**
 * Stands in for `apksigner verify`. Confirms the finished APK actually verifies
 * across the whole supported API range before it is handed to anyone — an
 * unverifiable APK fails at install with a message that explains nothing.
 */
public final class ApkVerify {

  public static void main(String[] args) throws Exception {
    File apk = new File(args[0]);
    int minSdk = Integer.parseInt(args[1]);
    int maxSdk = Integer.parseInt(args[2]);

    ApkVerifier.Result result =
        new ApkVerifier.Builder(apk)
            .setMinCheckedPlatformVersion(minSdk)
            .setMaxCheckedPlatformVersion(maxSdk)
            .build()
            .verify();

    System.out.println("verified:     " + result.isVerified());
    System.out.println("v1 scheme:    " + result.isVerifiedUsingV1Scheme());
    System.out.println("v2 scheme:    " + result.isVerifiedUsingV2Scheme());
    System.out.println("signers:      " + result.getSignerCertificates().size());
    for (java.security.cert.X509Certificate c : result.getSignerCertificates()) {
      System.out.println("  subject:    " + c.getSubjectX500Principal());
    }

    for (ApkVerifier.IssueWithParams e : result.getErrors()) System.out.println("ERROR   " + e);
    for (ApkVerifier.IssueWithParams w : result.getWarnings()) System.out.println("warning " + w);

    if (!result.isVerified() || !result.getErrors().isEmpty()) System.exit(1);
  }
}
