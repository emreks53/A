package io.github.emreks53.lugat_risale

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val focusMode by lazy { FocusModeController(this) }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "lugat/odak").setMethodCallHandler { call, result ->
            when (call.method) {
                "status" -> result.success(focusMode.status())
                "setEnabled" -> {
                    val enabled = call.argument<Boolean>("enabled") ?: true
                    focusMode.enabled = enabled
                    if (enabled) focusMode.activate() else focusMode.disableAndCleanUp()
                    result.success(focusMode.status())
                }
                "openSettings" -> result.success(focusMode.openPermissionSettings(this))
                else -> result.notImplemented()
            }
        }
    }

    // Odak modu yalnızca uygulama ekranda görünürken açıktır.
    override fun onStart() {
        super.onStart()
        focusMode.activate()
    }

    override fun onStop() {
        focusMode.deactivate()
        super.onStop()
    }
}
