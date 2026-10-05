package io.github.emreks53.lugat_risale

import android.app.Activity
import android.app.ActivityManager
import android.app.AutomaticZenRule
import android.app.NotificationManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.service.notification.Condition
import android.service.notification.ZenPolicy
import android.util.Log
import androidx.annotation.RequiresApi

/**
 * Okuma sırasında bildirimleri gizleyen "odak modu".
 *
 * Uygulama ekrana geldiğinde [activate], ekrandan çıktığında (başka uygulamaya
 * geçilince, ekran kapanınca, uygulama kapatılınca) [deactivate] çağrılır.
 * Böylece telefon yalnızca uygulama gerçekten açıkken sessizde olur.
 *
 * Android 10 ve sonrası: uygulamaya ait bir "Rahatsız Etmeyin" kuralı
 * (AutomaticZenRule) kullanılır. Kullanıcının kendi Rahatsız Etmeyin
 * ayarlarına dokunulmaz; kural kapatılınca her şey eski hâline döner.
 * Alarmlar, medya sesi ve tekrar arayanlar engellenmez; bildirimlerin
 * görselleri (açılır pencere, durum çubuğu simgesi vb.) gizlenir.
 *
 * Android 6–9: kullanıcının Rahatsız Etmeyin'i kapalıysa "yalnızca alarmlar"
 * moduna geçilir ve çıkışta yalnızca o zaman geri alınır.
 *
 * Her iki yol da kullanıcının bir kereye mahsus "Rahatsız Etmeyin erişimi"
 * vermesini gerektirir.
 */
class FocusModeController(context: Context) {
    private val appContext = context.applicationContext
    private val notificationManager =
        appContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    private val prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** Kullanıcı ayarı; varsayılan olarak açık. */
    var enabled: Boolean
        get() = prefs.getBoolean(KEY_ENABLED, true)
        set(value) {
            prefs.edit().putBoolean(KEY_ENABLED, value).apply()
        }

    /** Bu cihazda uygulama Rahatsız Etmeyin'i yönetebilir mi? */
    val isSupported: Boolean
        get() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false
            // Düşük bellekli (Android Go) cihazlarda bu izin verilemiyor.
            val am = appContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            return !am.isLowRamDevice
        }

    val hasPermission: Boolean
        get() = isSupported && notificationManager.isNotificationPolicyAccessGranted

    /** Odak modu şu an bu uygulama tarafından açık tutuluyor mu? */
    val isActive: Boolean
        get() = prefs.getBoolean(KEY_ACTIVE, false)

    fun status(): Map<String, Any> = mapOf(
        "supported" to isSupported,
        "enabled" to enabled,
        "granted" to hasPermission,
        "active" to isActive,
    )

    /** Ayar açık ve izin varsa odak modunu açar. */
    fun activate() {
        if (!enabled || !hasPermission) return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) activateRule() else activateLegacy()
        } catch (e: Exception) {
            // Bazı üretici yazılımları beklenmedik hatalar verebiliyor; uygulama çökmesin.
            Log.w(TAG, "Odak modu açılamadı", e)
        }
    }

    /** Odak modunu kapatır; kullanıcının kendi ayarları olduğu gibi kalır. */
    fun deactivate() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Kayıt "kapalı" dese bile kuralı kapatmayı dene: süreç beklenmedik
                // şekilde sonlandıysa kural açık kalmış olabilir. İşlem zararsızdır.
                deactivateRule()
            } else if (isActive) {
                deactivateLegacy()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Odak modu kapatılamadı", e)
        }
        if (isActive) setActive(false)
    }

    /** Ayar kapatılınca: kapat ve oluşturulan kuralı da sil. */
    fun disableAndCleanUp() {
        deactivate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && hasPermission) {
            prefs.getString(KEY_RULE_ID, null)?.let { id ->
                try {
                    notificationManager.removeAutomaticZenRule(id)
                } catch (e: Exception) {
                    Log.w(TAG, "Kural silinemedi", e)
                }
            }
        }
        prefs.edit().remove(KEY_RULE_ID).apply()
    }

    /** Android'in "Rahatsız Etmeyin erişimi" ayar ekranını açar. */
    fun openPermissionSettings(activity: Activity): Boolean {
        val intents = listOf(
            Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS),
            Intent(Settings.ACTION_SETTINGS),
        )
        for (intent in intents) {
            try {
                activity.startActivity(intent)
                return true
            } catch (_: ActivityNotFoundException) {
            } catch (e: SecurityException) {
                Log.w(TAG, "Ayar ekranı açılamadı", e)
            }
        }
        return false
    }

    private fun setActive(active: Boolean) {
        prefs.edit().putBoolean(KEY_ACTIVE, active).apply()
    }

    // ---- Android 10+ : uygulamaya ait otomatik kural ----

    @RequiresApi(Build.VERSION_CODES.Q)
    private fun activateRule() {
        val id = ensureRule()
        notificationManager.setAutomaticZenRuleState(
            id,
            Condition(CONDITION_ID, appContext.getString(R.string.focus_condition_summary), Condition.STATE_TRUE),
        )
        setActive(true)
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private fun deactivateRule() {
        val id = prefs.getString(KEY_RULE_ID, null) ?: return
        if (!hasPermission || notificationManager.getAutomaticZenRule(id) == null) return
        notificationManager.setAutomaticZenRuleState(
            id,
            Condition(CONDITION_ID, appContext.getString(R.string.focus_condition_summary), Condition.STATE_FALSE),
        )
    }

    /** Kural daha önce oluşturulduysa onu, yoksa (ya da kullanıcı sildiyse) yenisini döndürür. */
    @RequiresApi(Build.VERSION_CODES.Q)
    private fun ensureRule(): String {
        prefs.getString(KEY_RULE_ID, null)?.let { id ->
            if (notificationManager.getAutomaticZenRule(id) != null) return id
        }
        val policy = ZenPolicy.Builder()
            .disallowAllSounds()
            .allowAlarms(true)
            .allowMedia(true)
            .allowRepeatCallers(true)
            .hideAllVisualEffects()
            .build()
        val rule = AutomaticZenRule(
            appContext.getString(R.string.focus_rule_name),
            null,
            ComponentName(appContext, MainActivity::class.java),
            CONDITION_ID,
            policy,
            NotificationManager.INTERRUPTION_FILTER_PRIORITY,
            true,
        )
        val id = notificationManager.addAutomaticZenRule(rule)
        prefs.edit().putString(KEY_RULE_ID, id).apply()
        return id
    }

    // ---- Android 6–9 ----

    private fun activateLegacy() {
        if (isActive) return
        // Kullanıcı Rahatsız Etmeyin'i zaten kendisi açtıysa ona dokunma.
        if (notificationManager.currentInterruptionFilter != NotificationManager.INTERRUPTION_FILTER_ALL) return
        notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALARMS)
        setActive(true)
    }

    private fun deactivateLegacy() {
        if (!hasPermission) return
        // Biz açtıktan sonra kullanıcı başka bir moda geçtiyse onun seçimine dokunma.
        if (notificationManager.currentInterruptionFilter == NotificationManager.INTERRUPTION_FILTER_ALARMS) {
            notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
        }
    }

    companion object {
        private const val TAG = "LugatOdak"
        private const val PREFS = "odak_modu"
        private const val KEY_ENABLED = "enabled"
        private const val KEY_ACTIVE = "active"
        private const val KEY_RULE_ID = "rule_id"
        private val CONDITION_ID: Uri = Uri.parse("condition://io.github.emreks53.lugat_risale/okuma")
    }
}
