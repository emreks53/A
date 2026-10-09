package com.lugatirisaleinur

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
 * Okuma sırasında bildirimleri gizleyen "odak modu" (Android 10 ve sonrası).
 *
 * Uygulama ekrana geldiğinde [activate], ekrandan çıktığında (başka uygulamaya
 * geçilince, ekran kapanınca, uygulama kapatılınca) [deactivate] çağrılır.
 * Böylece telefon yalnızca uygulama gerçekten açıkken sessizde olur.
 *
 * Bunun için uygulamaya ait bir "Rahatsız Etmeyin" kuralı (AutomaticZenRule)
 * kullanılır. Kullanıcının kendi Rahatsız Etmeyin ayarlarına ve zamanlamalarına
 * dokunulmaz; kural kapatılınca her şey eski hâline döner. Mesaj ve diğer
 * bildirimler susar ve ekrana gelmez (açılır pencere, durum çubuğu simgesi,
 * bildirim listesi gizlenir). Alarmlar, medya sesi, yıldızlı kişilerin
 * aramaları ve 15 dakika içinde ikinci kez arayanlar engellenmez.
 *
 * Android 9 ve öncesinde yalnızca telefonun genel Rahatsız Etmeyin modu
 * değiştirilebildiği ve bu, kullanıcının kendi zamanlamalarını bozabildiği
 * için odak modu orada sunulmaz.
 *
 * Kullanıcının bir kereye mahsus "Rahatsız Etmeyin erişimi" vermesi gerekir.
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

    /** Bu cihazda uygulama kendi Rahatsız Etmeyin kuralını yönetebilir mi? */
    val isSupported: Boolean
        get() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false
            // Düşük bellekli (Android Go) cihazlarda bu izin verilemiyor.
            val am = appContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            return !am.isLowRamDevice
        }

    val hasPermission: Boolean
        get() = isSupported && notificationManager.isNotificationPolicyAccessGranted

    /**
     * Odak modu şu an gerçekten devrede mi? Kaydedilmiş bir bayrağa değil,
     * sistemin o anki durumuna bakılır: kullanıcı kuralı Android ayarlarından
     * kapattıysa ya da Rahatsız Etmeyin'i hızlı ayarlardan kapattıysa `false`.
     */
    val isActive: Boolean
        get() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || !hasPermission) return false
            return try {
                ownRules().any { (id, rule) -> rule.isEnabled && isRuleOn(id) }
            } catch (e: Exception) {
                Log.w(TAG, "Kural durumu okunamadı", e)
                false
            }
        }

    /** Kullanıcı uygulamanın kuralını Android ayarlarından kapatmış mı? */
    private val isDisabledInSystem: Boolean
        get() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || !hasPermission) return false
            return try {
                val rules = ownRules()
                rules.isNotEmpty() && rules.values.none { it.isEnabled }
            } catch (e: Exception) {
                false
            }
        }

    fun status(): Map<String, Any> = mapOf(
        "supported" to isSupported,
        "sdk" to Build.VERSION.SDK_INT,
        "enabled" to enabled,
        "granted" to hasPermission,
        "active" to isActive,
        "disabledInSystem" to isDisabledInSystem,
    )

    /** Ayar açık ve izin varsa odak modunu açar. */
    fun activate() {
        if (!enabled || !hasPermission || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return
        try {
            val id = ensureRule()
            notificationManager.setAutomaticZenRuleState(id, condition(Condition.STATE_TRUE))
        } catch (e: Exception) {
            // Bazı üretici yazılımları beklenmedik hatalar verebiliyor; uygulama çökmesin.
            Log.w(TAG, "Odak modu açılamadı", e)
        }
    }

    /**
     * Odak modunu kapatır; kullanıcının kendi ayarları olduğu gibi kalır. Kaydedilmiş
     * kimliğe güvenmeden uygulamaya ait bütün kurallar kapatılır: süreç beklenmedik
     * şekilde sonlandıysa ya da uygulama verisi silindiyse açık bir kural kalmış olabilir.
     */
    fun deactivate() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || !hasPermission) return
        try {
            val off = condition(Condition.STATE_FALSE)
            ownRules().keys.forEach { notificationManager.setAutomaticZenRuleState(it, off) }
        } catch (e: Exception) {
            Log.w(TAG, "Odak modu kapatılamadı", e)
        }
    }

    /** Ayar kapatılınca: kapat ve uygulamanın oluşturduğu kuralları da sil. */
    fun disableAndCleanUp() {
        deactivate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && hasPermission) {
            try {
                ownRules().keys.forEach { notificationManager.removeAutomaticZenRule(it) }
            } catch (e: Exception) {
                Log.w(TAG, "Kural silinemedi", e)
            }
        }
        prefs.edit().remove(KEY_RULE_ID).apply()
    }

    /** Android'in "Rahatsız Etmeyin erişimi" ayar ekranını açar. */
    fun openPermissionSettings(activity: Activity): Boolean = startFirst(
        activity,
        Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS),
        Intent(Settings.ACTION_SETTINGS),
    )

    /**
     * Kullanıcı kuralı Android ayarlarından kapattıysa yeniden açabilmesi için
     * kuralın (Android 15+) ya da Rahatsız Etmeyin'in ayar ekranını açar.
     */
    fun openRuleSettings(activity: Activity): Boolean {
        val intents = mutableListOf<Intent>()
        val id = prefs.getString(KEY_RULE_ID, null)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM && id != null) {
            intents += Intent(Settings.ACTION_AUTOMATIC_ZEN_RULE_SETTINGS)
                .putExtra(Settings.EXTRA_AUTOMATIC_ZEN_RULE_ID, id)
        }
        intents += Intent(Settings.ACTION_ZEN_MODE_PRIORITY_SETTINGS)
        intents += Intent(Settings.ACTION_SETTINGS)
        return startFirst(activity, *intents.toTypedArray())
    }

    private fun startFirst(activity: Activity, vararg intents: Intent): Boolean {
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

    private fun condition(state: Int) =
        Condition(CONDITION_ID, appContext.getString(R.string.focus_condition_summary), state)

    /** Bu uygulamaya ait (koşul adresi bizim olan) kurallar. */
    @RequiresApi(Build.VERSION_CODES.Q)
    private fun ownRules(): Map<String, AutomaticZenRule> =
        notificationManager.automaticZenRules.filterValues { it.conditionId == CONDITION_ID }

    @RequiresApi(Build.VERSION_CODES.Q)
    private fun isRuleOn(id: String): Boolean {
        // Kural PRIORITY filtresi kullandığından, gerçekten devredeyken telefonun genel
        // filtresi hiçbir zaman ALL olamaz. Bu kontrol, Android 15'te kullanıcının Hızlı
        // Ayarlar'dan Rahatsız Etmeyin'i kapatmasını (kuralın "ertelenmesi") da yakalar;
        // getAutomaticZenRuleState bunu bazı sürümlerde göstermiyor.
        if (notificationManager.currentInterruptionFilter == NotificationManager.INTERRUPTION_FILTER_ALL) return false
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM ||
            notificationManager.getAutomaticZenRuleState(id) == Condition.STATE_TRUE
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private fun policy(): ZenPolicy = ZenPolicy.Builder()
        .disallowAllSounds()
        .allowAlarms(true)
        .allowMedia(true)
        .allowCalls(ZenPolicy.PEOPLE_TYPE_STARRED)
        .allowRepeatCallers(true)
        .hideAllVisualEffects()
        .build()

    /**
     * Uygulamanın kuralını döndürür: varsa (kaydedilmiş kimlikle ya da koşul adresiyle
     * bulunan) mevcut kural kullanılır ve fazlalar silinir, yoksa yenisi oluşturulur.
     */
    @RequiresApi(Build.VERSION_CODES.Q)
    private fun ensureRule(): String {
        val rules = ownRules()
        val saved = prefs.getString(KEY_RULE_ID, null)
        val keep = rules.keys.firstOrNull { it == saved } ?: rules.keys.firstOrNull()
        if (keep != null) {
            rules.keys.filter { it != keep }.forEach { notificationManager.removeAutomaticZenRule(it) }
            // Kural, kuralları daha eski bir sürümle oluşturulduysa bir kereye mahsus güncellenir.
            if (prefs.getInt(KEY_POLICY_VERSION, 0) != POLICY_VERSION) {
                val rule = rules.getValue(keep)
                rule.zenPolicy = policy()
                notificationManager.updateAutomaticZenRule(keep, rule)
            }
            prefs.edit().putString(KEY_RULE_ID, keep).putInt(KEY_POLICY_VERSION, POLICY_VERSION).apply()
            return keep
        }
        val rule = AutomaticZenRule(
            appContext.getString(R.string.focus_rule_name),
            null,
            ComponentName(appContext, MainActivity::class.java),
            CONDITION_ID,
            policy(),
            NotificationManager.INTERRUPTION_FILTER_PRIORITY,
            true,
        )
        val id = notificationManager.addAutomaticZenRule(rule)
        prefs.edit().putString(KEY_RULE_ID, id).putInt(KEY_POLICY_VERSION, POLICY_VERSION).apply()
        return id
    }

    companion object {
        private const val TAG = "LugatOdak"
        private const val PREFS = "odak_modu"
        private const val KEY_ENABLED = "enabled"
        private const val KEY_RULE_ID = "rule_id"
        private const val KEY_POLICY_VERSION = "policy_version"

        /** [policy] değiştikçe artırılır; mevcut kurallar bir kereye mahsus güncellenir. */
        private const val POLICY_VERSION = 2
        private val CONDITION_ID: Uri = Uri.parse("condition://com.lugatirisaleinur/okuma")
    }
}
