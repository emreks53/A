package io.github.emreks53.lugat_risale

import android.app.ActivityManager
import android.app.Application
import android.app.NotificationManager
import android.content.Context
import org.robolectric.RuntimeEnvironment
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
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

    private fun ruleId(): String? =
        context.getSharedPreferences("odak_modu", Context.MODE_PRIVATE).getString("rule_id", null)

    @Test
    fun `varsayilan olarak acik ama izin olmadan hicbir sey yapmaz`() {
        val focus = FocusModeController(context)
        assertTrue(focus.enabled)
        assertTrue(focus.isSupported)
        assertFalse(focus.hasPermission)

        focus.activate()

        assertFalse(focus.isActive)
        assertNull(ruleId())
    }

    @Test
    fun `izin varsa kendi kuralini olusturur, acar ve kapatir`() {
        grant()
        val focus = FocusModeController(context)

        focus.activate()

        assertTrue(focus.isActive)
        val id = ruleId()
        assertNotNull(id)
        val rule = nm.getAutomaticZenRule(id)
        assertNotNull(rule)
        assertEquals("Lügat-ı Risale-i Nur (okuma)", rule.name)
        assertEquals(NotificationManager.INTERRUPTION_FILTER_PRIORITY, rule.interruptionFilter)
        assertTrue(rule.isEnabled)
        val policy = rule.zenPolicy!!
        assertEquals(android.service.notification.ZenPolicy.STATE_ALLOW, policy.priorityCategoryAlarms)
        assertEquals(android.service.notification.ZenPolicy.STATE_ALLOW, policy.priorityCategoryMedia)
        assertEquals(android.service.notification.ZenPolicy.STATE_ALLOW, policy.priorityCategoryRepeatCallers)
        assertEquals(android.service.notification.ZenPolicy.STATE_DISALLOW, policy.priorityCategoryMessages)
        assertEquals(android.service.notification.ZenPolicy.STATE_DISALLOW, policy.visualEffectPeek)
        assertEquals(android.service.notification.ZenPolicy.STATE_DISALLOW, policy.visualEffectStatusBar)

        // Uygulama tekrar ekrana gelince aynı kural kullanılır.
        focus.deactivate()
        assertFalse(focus.isActive)
        focus.activate()
        assertEquals(id, ruleId())
        assertEquals(1, nm.automaticZenRules.size)
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
        assertEquals(1, nm.automaticZenRules.size)
    }

    @Test
    fun `ayar kapatilinca kural silinir ve bir daha acilmaz`() {
        grant()
        val focus = FocusModeController(context)
        focus.activate()
        assertEquals(1, nm.automaticZenRules.size)

        focus.enabled = false
        focus.disableAndCleanUp()

        assertFalse(focus.isActive)
        assertTrue(nm.automaticZenRules.isEmpty())
        assertNull(ruleId())

        focus.activate()
        assertFalse(focus.isActive)
        assertTrue(nm.automaticZenRules.isEmpty())
    }

    @Test
    fun `durum haritasi Dart tarafinin bekledigi anahtarlari icerir`() {
        grant()
        val focus = FocusModeController(context)
        focus.activate()
        assertEquals(
            mapOf("supported" to true, "enabled" to true, "granted" to true, "active" to true),
            focus.status(),
        )
    }

    @Test
    fun `dusuk bellekli cihazda desteklenmez`() {
        val am = context.getSystemService(ActivityManager::class.java)
        shadowOf(am).setIsLowRamDevice(true)
        grant()
        val focus = FocusModeController(context)

        assertFalse(focus.isSupported)
        focus.activate()
        assertFalse(focus.isActive)
    }

    @Test
    @Config(sdk = [28])
    fun `Android 9 ve oncesinde yalnizca alarmlar moduna gecer ve geri alir`() {
        grant()
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
        val focus = FocusModeController(context)

        focus.activate()
        assertTrue(focus.isActive)
        assertEquals(NotificationManager.INTERRUPTION_FILTER_ALARMS, nm.currentInterruptionFilter)

        focus.deactivate()
        assertFalse(focus.isActive)
        assertEquals(NotificationManager.INTERRUPTION_FILTER_ALL, nm.currentInterruptionFilter)
    }

    @Test
    @Config(sdk = [28])
    fun `Android 9 ve oncesinde kullanicinin kendi sessiz moduna dokunmaz`() {
        grant()
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
        val focus = FocusModeController(context)

        focus.activate()
        assertFalse(focus.isActive)
        focus.deactivate()
        assertEquals(NotificationManager.INTERRUPTION_FILTER_PRIORITY, nm.currentInterruptionFilter)
    }
}
