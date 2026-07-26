package com.darkhour.pact;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;

/**
 * A single fullscreen WebView hosting the game build from assets/.
 *
 * The page is served through shouldInterceptRequest under a synthetic https
 * origin rather than loaded from file:// — WebView gives file:// pages an
 * opaque origin on newer Android, which silently breaks localStorage and
 * would wipe the player's Altar progress on every launch.
 */
public class MainActivity extends Activity {

  /** Synthetic origin. Nothing resolves it; every request is served locally. */
  private static final String HOST = "pact.localhost";
  private static final String ENTRY = "https://" + HOST + "/index.html";

  private static final int IMMERSIVE =
      View.SYSTEM_UI_FLAG_LAYOUT_STABLE
          | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
          | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
          | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
          | View.SYSTEM_UI_FLAG_FULLSCREEN
          | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;

  private WebView web;

  @Override
  protected void onCreate(Bundle saved) {
    super.onCreate(saved);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

    web = new WebView(this);
    web.setBackgroundColor(0xFF05070A);
    web.setHorizontalScrollBarEnabled(false);
    web.setVerticalScrollBarEnabled(false);
    web.setOverScrollMode(View.OVER_SCROLL_NEVER);

    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    // Required: the save lives in localStorage.
    s.setDomStorageEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setSupportZoom(false);
    s.setBuiltInZoomControls(false);
    s.setDisplayZoomControls(false);
    s.setUseWideViewPort(false);
    s.setLoadWithOverviewMode(false);
    s.setTextZoom(100);

    web.setWebViewClient(new AssetClient());
    setContentView(web);
    web.loadUrl(ENTRY);
  }

  /** Serves everything under the synthetic origin straight out of assets/. */
  private final class AssetClient extends WebViewClient {
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
      Uri url = request.getUrl();
      if (url == null || !HOST.equals(url.getHost())) return null;

      String path = url.getPath();
      if (path == null || path.equals("/")) path = "/index.html";

      try {
        InputStream in = getAssets().open(path.substring(1));
        return new WebResourceResponse(mimeOf(path), "utf-8", in);
      } catch (IOException missing) {
        // Anything not shipped in assets simply does not exist here.
        return null;
      }
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
      Uri url = request.getUrl();
      // Let our own origin through — some WebView builds route even the first
      // load through here, and swallowing that leaves a black screen. Anything
      // pointing elsewhere is refused; the game never navigates off-origin.
      return url == null || !HOST.equals(url.getHost());
    }
  }

  private static String mimeOf(String path) {
    if (path.endsWith(".html")) return "text/html";
    if (path.endsWith(".js")) return "text/javascript";
    if (path.endsWith(".css")) return "text/css";
    if (path.endsWith(".png")) return "image/png";
    if (path.endsWith(".webmanifest") || path.endsWith(".json")) return "application/json";
    return "application/octet-stream";
  }

  private void goImmersive() {
    getWindow().getDecorView().setSystemUiVisibility(IMMERSIVE);
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) goImmersive();
  }

  @Override
  protected void onResume() {
    super.onResume();
    if (web != null) web.onResume();
    goImmersive();
  }

  @Override
  protected void onPause() {
    // Stops the render loop and the audio context while backgrounded.
    if (web != null) web.onPause();
    super.onPause();
  }

  @Override
  public void onBackPressed() {
    // Never destroy the activity mid-run — a stray back press would otherwise
    // throw away the hour the player is in the middle of.
    moveTaskToBack(true);
  }

  @Override
  protected void onDestroy() {
    if (web != null) {
      web.destroy();
      web = null;
    }
    super.onDestroy();
  }
}
