package com.lugatirisaleinur

import android.app.ActivityManager
import android.app.Application
import android.app.AutomaticZenRule
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.service.notification.ZenPolicy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, sdk = [29, 34, 36])
class FocusModeControllerTest {
    private lateinit var context: Context
    private lateinit var nm: NotificationManager

    @Before
    fun setUp() {
        context = RuntimeEnvironment.getApplication()
        nm = context.getSystemService(NotificationManager::class.java)
    }

    private fun grant(granted: Boolean = true) = shadowOf(nm).setNotificationPolicyAccessGranted(granted)

    private val prefs get() = context.getSharedPreferences("odak_modu", Context.MODE_PRIVATE)

    private fun ruleId(): String? = prefs.getString("rule_id", null)

    private fun ownRules() = nm.automaticZenRules.filterValues { it.conditionId == CONDITION }

    @Test
    fun `varsayilan olarak acik ama izin olmadan hicbir sey yapmaz`() {
        val focus = FocusModeController(context)
        assertTrue(focus.enabled)
        assertTrue(focus.isSupported)
        assertFalse(focus.hasPermission)

        focus.activate()
        focus.deactivate()

        assertFalse(focus.isActive)
        assertNull(ruleId())
    }

    @Test
    fun `izin varsa kendi kuralini olusturur, acar ve kapatir`() {
        grant()
        val focus = FocusModeController(context)

        focus.activate()
        // Robolectric kuralın açılmasını telefonun genel filtresine yansıtmıyor;
        // gerçek sistemin yaptığını burada taklit ediyoruz.
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
        assertTrue("açıldıktan sonra etkin olmalı", focus.isActive)

        val id = ruleId()
        assertNotNull(id)
        val rule = nm.getAutomaticZenRule(id)
        assertNotNull(rule)
        assertEquals("Lügat-ı Risale-i Nur (okuma)", rule.name)
        assertEquals(NotificationManager.INTERRUPTION_FILTER_PRIORITY, rule.interruptionFilter)
        assertTrue(rule.isEnabled)
        val policy = rule.zenPolicy!!
        assertEquals(ZenPolicy.STATE_ALLOW, policy.priorityCategoryAlarms)
        assertEquals(ZenPolicy.STATE_ALLOW, policy.priorityCategoryMedia)
        assertEquals(ZenPolicy.STATE_ALLOW, policy.priorityCategoryRepeatCallers)
        assertEquals(ZenPolicy.STATE_ALLOW, policy.priorityCategoryCalls)
        assertEquals(ZenPolicy.PEOPLE_TYPE_STARRED, policy.priorityCallSenders)
        assertEquals(ZenPolicy.STATE_DISALLOW, policy.priorityCategoryMessages)
        assertEquals(ZenPolicy.STATE_DISALLOW, policy.priorityCategoryEvents)
        assertEquals(ZenPolicy.STATE_DISALLOW, policy.priorityCategoryReminders)
        assertEquals(ZenPolicy.STATE_DISALLOW, policy.visualEffectPeek)
        assertEquals(ZenPolicy.STATE_DISALLOW, policy.visualEffectStatusBar)
        assertEquals(ZenPolicy.STATE_DISALLOW, policy.visualEffectNotificationList)

        // Uygulama tekrar ekrana gelince aynı kural kullanılır.
        focus.deactivate()
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
        assertFalse("kapatıldıktan sonra etkin olmamalı", focus.isActive)
        focus.activate()
        assertEquals(id, ruleId())
        assertEquals(1, ownRules().size)
    }

    @Test
    fun `kullanici Rahatsiz Etmeyin'i hizli ayarlardan kapatirsa etkin gorunmez`() {
        grant()
        val focus = FocusModeController(context)
        focus.activate()
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY) // sistem kuralı uyguladı
        assertTrue(focus.isActive)

        // Hızlı Ayarlar'dan kapatma: kuralın koşulu hâlâ "açık" ama telefon artık sessizde değil.
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)

        assertFalse(focus.isActive)
        assertEquals(false, focus.status()["active"])
    }

    @Test
    fun `kullanici kurali silerse yenisi olusturulur`() {
        grant()
        val focus = FocusModeController(context)
        focus.activate()
        val first = ruleId()!!
        focus.deactivate()
        nm.removeAutomaticZenRule(first)

        focus.activate()

        val second = ruleId()
        assertNotNull(second)
        assertNotNull(nm.getAutomaticZenRule(second))
        assertEquals(1, ownRules().size)
    }

    @Test
    fun `uygulama verisi silinse de eski kural benimsenir, kopya olusmaz`() {
        grant()
        FocusModeController(context).activate()
        val original = ruleId()!!

        prefs.edit().clear().commit() // "Depolamayı temizle"
        val focus = FocusModeController(context)
        focus.activate()

        assertEquals(original, ruleId())
        assertEquals(1, ownRules().size)
    }

    @Test
    fun `fazladan kalmis kopya kurallar temizlenir`() {
        grant()
        val component = ComponentName(context, MainActivity::class.java)
        repeat(2) {
            nm.addAutomaticZenRule(
                AutomaticZenRule("eski", null, component, CONDITION, null,
                    NotificationManager.INTERRUPTION_FILTER_PRIORITY, true),
            )
        }
        assertEquals(2, ownRules().size)

        FocusModeController(context).activate()

        assertEquals(1, ownRules().size)
        assertEquals(ownRules().keys.single(), ruleId())
    }

    @Test
    fun `baska kurallara dokunmaz`() {
        grant()
        val other = nm.addAutomaticZenRule(
            AutomaticZenRule("Uyku", null, ComponentName(context, MainActivity::class.java),
                Uri.parse("condition://baska/uyku"), null, NotificationManager.INTERRUPTION_FILTER_PRIORITY, true),
        )
        val focus = FocusModeController(context)
        focus.activate()
        focus.deactivate()
        focus.enabled = false
        focus.disableAndCleanUp()

        assertNotNull(nm.getAutomaticZenRule(other))
        assertTrue(ownRules().isEmpty())
    }

    @Test
    fun `kullanici kurali Android ayarlarindan kapattiysa durum bunu soyler`() {
        grant()
        val focus = FocusModeController(context)
        focus.activate()
        val id = ruleId()!!
        val rule = nm.getAutomaticZenRule(id)
        rule.isEnabled = false
        nm.updateAutomaticZenRule(id, rule)

        focus.activate()

        assertFalse(focus.isActive)
        assertEquals(true, focus.status()["disabledInSystem"])
        assertEquals(false, focus.status()["active"])
    }

    @Test
    fun `ayar kapatilinca kural silinir ve bir daha acilmaz`() {
        grant()
        val focus = FocusModeController(context)
        focus.activate()
        assertEquals(1, ownRules().size)

        focus.enabled = false
        focus.disableAndCleanUp()

        assertFalse(focus.isActive)
        assertTrue(ownRules().isEmpty())
        assertNull(ruleId())

        focus.activate()
        assertTrue(ownRules().isEmpty())
    }

    @Test
    fun `durum haritasi Dart tarafinin bekledigi anahtarlari icerir`() {
        grant()
        val status = FocusModeController(context).status()
        assertEquals(setOf("supported", "sdk", "enabled", "granted", "active", "disabledInSystem"), status.keys)
        assertEquals(true, status["supported"])
        assertEquals(true, status["enabled"])
        assertEquals(true, status["granted"])
        assertEquals(false, status["disabledInSystem"])
    }

    @Test
    fun `dusuk bellekli cihazda desteklenmez`() {
        val am = context.getSystemService(ActivityManager::class.java)
        shadowOf(am).setIsLowRamDevice(true)
        grant()
        val focus = FocusModeController(context)

        assertFalse(focus.isSupported)
        focus.activate()
        assertNull(ruleId())
    }

    @Test
    @Config(sdk = [28])
    fun `Android 9 ve oncesinde desteklenmez ve telefonun ayarlarina dokunmaz`() {
        grant()
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
        val focus = FocusModeController(context)

        assertFalse(focus.isSupported)
        focus.activate()
        assertEquals(NotificationManager.INTERRUPTION_FILTER_ALL, nm.currentInterruptionFilter)
        focus.deactivate()
        assertEquals(NotificationManager.INTERRUPTION_FILTER_ALL, nm.currentInterruptionFilter)
        assertEquals(false, focus.status()["supported"])
        assertEquals(28, focus.status()["sdk"])
    }

    companion object {
        private val CONDITION: Uri = Uri.parse("condition://com.lugatirisaleinur/okuma")
    }
}
