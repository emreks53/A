package com.lugatirisaleinur

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val focusMode by lazy { FocusModeController(this) }
    private var channel: MethodChannel? = null

    /**
     * Rahatsız Etmeyin durumu değişince (kural sistem tarafından devreye alınınca,
     * kullanıcı Hızlı Ayarlar'dan kapatınca...) güncel durumu Dart tarafına iletir.
     * Android 10–13'te kural birkaç an sonra devreye girdiğinden durum ancak bu
     * yayınla doğru öğrenilebilir.
     */
    private val zenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            channel?.invokeMethod("statusChanged", focusMode.status())
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Uygulama beklenmedik şekilde çökerse odak modu açık kalmasın.
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        if (previous !is FocusSafeHandler) {
            Thread.setDefaultUncaughtExceptionHandler(FocusSafeHandler(focusMode, previous))
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        val channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "lugat/odak")
        this.channel = channel
        channel.setMethodCallHandler { call, result ->
            when (call.method) {
                "status" -> result.success(focusMode.status())
                "setEnabled" -> {
                    val enabled = call.argument<Boolean>("enabled") ?: true
                    focusMode.enabled = enabled
                    if (enabled) focusMode.activate() else focusMode.disableAndCleanUp()
                    result.success(focusMode.status())
                }
                "openSettings" -> result.success(focusMode.openPermissionSettings(this))
                "openRuleSettings" -> result.success(focusMode.openRuleSettings(this))
                else -> result.notImplemented()
            }
        }
    }

    // Odak modu yalnızca uygulama ekranda görünürken açıktır.
    override fun onStart() {
        super.onStart()
        val filter = IntentFilter(NotificationManager.ACTION_INTERRUPTION_FILTER_CHANGED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            filter.addAction(NotificationManager.ACTION_AUTOMATIC_ZEN_RULE_STATUS_CHANGED)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(zenReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(zenReceiver, filter)
        }
        focusMode.activate()
    }

    override fun onStop() {
        try {
            unregisterReceiver(zenReceiver)
        } catch (_: IllegalArgumentException) {
        }
        focusMode.deactivate()
        super.onStop()
    }

    private class FocusSafeHandler(
        private val focusMode: FocusModeController,
        private val next: Thread.UncaughtExceptionHandler?,
    ) : Thread.UncaughtExceptionHandler {
        override fun uncaughtException(thread: Thread, error: Throwable) {
            try {
                focusMode.deactivate()
            } catch (_: Throwable) {
            }
            next?.uncaughtException(thread, error)
        }
    }
}
