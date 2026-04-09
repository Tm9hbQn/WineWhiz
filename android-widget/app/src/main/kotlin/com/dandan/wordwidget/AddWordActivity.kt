package com.dandan.wordwidget

import android.app.Activity
import android.annotation.SuppressLint
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout

/**
 * Transparent dialog-style activity that loads quick-add.html in a WebView.
 * This way the UI is always up-to-date without needing APK updates.
 */
class AddWordActivity : Activity() {

    private val QUICK_ADD_URL = "https://tm9hbqn.github.io/Wordbydandan/quick-add.html"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val container = FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(0x80000000.toInt()) // Semi-transparent overlay
            // Tap outside WebView to close
            setOnClickListener { finish() }
        }

        val webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = android.view.Gravity.CENTER
                marginStart = (24 * resources.displayMetrics.density).toInt()
                marginEnd = (24 * resources.displayMetrics.density).toInt()
            }
            setBackgroundColor(0x00000000) // Transparent until page loads

            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val url = request.url.toString()
                    // If navigating to main app, open in browser and close dialog
                    if (url.contains("index.html") || url.endsWith("/Wordbydandan/")) {
                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                        startActivity(intent)
                        finish()
                        return true
                    }
                    return false
                }

                override fun onPageFinished(view: WebView, url: String) {
                    // Inject CSS to make the card match the dialog style
                    view.evaluateJavascript("""
                        (function() {
                            document.body.style.background = 'transparent';
                            var card = document.querySelector('.qa-card');
                            if (card) {
                                card.style.boxShadow = '0 16px 60px rgba(0,0,0,0.3)';
                            }
                        })();
                    """.trimIndent(), null)
                }
            }
            webChromeClient = WebChromeClient()

            // Don't let click pass through to container
            setOnClickListener { /* absorb click */ }
            isClickable = true

            loadUrl(QUICK_ADD_URL)
        }

        container.addView(webView)
        setContentView(container)
    }

    override fun onBackPressed() {
        finish()
    }
}
