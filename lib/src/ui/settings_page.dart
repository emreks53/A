import 'package:flutter/material.dart';

import '../app_controller.dart';
import 'app.dart';
import 'widgets.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key, this.showIosFocusHelp = false});

  /// iPhone'da Kestirmeler rehberi açık gelsin mi?
  final bool showIosFocusHelp;

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Ayarlar')),
      body: ListView(
        padding: EdgeInsets.only(bottom: MediaQuery.paddingOf(context).bottom + 24),
        children: [
          const SectionHeader('Dikkat dağıtmayan okuma'),
          const ListTile(
            leading: Icon(Icons.light_mode_outlined),
            title: Text('Ekran kapanmaz'),
            subtitle: Text('Uygulama açıkken telefon kendiliğinden uyku moduna geçmez.'),
          ),
          if (controller.isAndroid)
            ..._androidFocus(context, controller)
          else
            _IosFocusHelp(initiallyExpanded: showIosFocusHelp),
          const Divider(height: 32),
          const SectionHeader('Görünüm'),
          ListTile(
            leading: const Icon(Icons.format_size),
            title: const Text('Yazı boyutu'),
            subtitle: Slider(
              value: controller.textScale,
              min: AppController.minTextScale,
              max: AppController.maxTextScale,
              divisions: 15,
              label: '%${(controller.textScale * 100).round()}',
              onChanged: controller.setTextScale,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: SegmentedButton<ThemeMode>(
              segments: const [
                ButtonSegment(value: ThemeMode.system, label: Text('Sistem')),
                ButtonSegment(value: ThemeMode.light, label: Text('Açık')),
                ButtonSegment(value: ThemeMode.dark, label: Text('Koyu')),
              ],
              selected: {controller.themeMode},
              onSelectionChanged: (s) => controller.setThemeMode(s.first),
            ),
          ),
          const Divider(height: 32),
          const SectionHeader('Geçmiş'),
          ListTile(
            leading: const Icon(Icons.history),
            title: const Text('Son bakılanları temizle'),
            subtitle: Text('${controller.history.length} kelime'),
            enabled: controller.history.isNotEmpty,
            onTap: controller.clearHistory,
          ),
          const Divider(height: 32),
          const SectionHeader('Hakkında'),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
            child: Text(
              'Lügat-ı Risale-i Nur, Risale-i Nur Külliyatı’nı okurken karşılaşılan '
              'Osmanlıca kelime ve ifadelerin manasını hızlıca öğrenmek için hazırlandı.'
              '${controller.lugat == null ? '' : '\n\nLügatte ${controller.lugat!.entries.length} kelime ve ifade var.'}'
              '\n\nManalar okumaya yardım için kısa tutulmuştur ve hazırlanırken '
              'yapay zekâ desteğinden yararlanılmıştır; dikkatle kontrol edilmiş olsa da '
              'hata bulunabilir. İnce bir meselede muteber bir lügate ve ehline danışınız.',
              style: theme.textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _androidFocus(BuildContext context, AppController controller) {
    final theme = Theme.of(context);
    final focus = controller.focus;
    if (!focus.supported) {
      return [
        ListTile(
          leading: const Icon(Icons.do_not_disturb_off_outlined),
          title: const Text('Bildirimleri gizleme bu telefonda kullanılamıyor'),
          subtitle: Text(
            focus.oldAndroid
                ? 'Android 9 ve önceki sürümlerde uygulama, telefonun kendi “Rahatsız Etmeyin” '
                    'ayarlarını bozmadan bildirimleri gizleyemiyor. Okurken bildirim gelmesin '
                    'isterseniz bildirim panelinden “Rahatsız Etmeyin”i kendiniz açabilirsiniz.'
                : 'Bu telefon, uygulamaların “Rahatsız Etmeyin” modunu açmasına izin vermiyor. '
                    'Okurken bildirim gelmesin isterseniz bildirim panelinden '
                    '“Rahatsız Etmeyin”i kendiniz açabilirsiniz.',
          ),
        ),
      ];
    }
    final String state;
    if (!focus.enabled) {
      state = 'Kapalı.';
    } else if (!focus.permissionGranted) {
      state = 'İzin verilmediği için şu an çalışmıyor.';
    } else if (focus.disabledInSystem) {
      state = 'Android ayarlarında kapatılmış; şu an çalışmıyor.';
    } else if (focus.active) {
      state = 'Şu an bildirimler gizleniyor.';
    } else {
      state = 'Uygulama ekrandayken devreye girer.';
    }

    Widget warning(String text, String button, VoidCallback onPressed) => Padding(
          padding: const EdgeInsets.fromLTRB(72, 0, 20, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(text, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error)),
              const SizedBox(height: 8),
              FilledButton.tonal(onPressed: onPressed, child: Text(button)),
            ],
          ),
        );

    return [
      SwitchListTile(
        key: const Key('odak-anahtari'),
        secondary: const Icon(Icons.do_not_disturb_on_outlined),
        title: const Text('Bildirimleri gizle (odak modu)'),
        subtitle: Text(
          'Uygulama açıkken mesajlar, bildirimler ve telefon aramaları sessize alınır, '
          'ekrana gelmez. Uygulamadan çıkınca ya da ekran kapanınca her şey eski hâline döner. '
          'Alarmlar, medya sesi, yıldızlı kişilerin aramaları ve 15 dakika içinde ikinci kez '
          'arayanlar yine duyulur.\n$state',
        ),
        isThreeLine: true,
        value: focus.enabled,
        onChanged: controller.setFocusEnabled,
      ),
      if (focus.needsPermission)
        warning(
          'Bunun için bir kereye mahsus “Rahatsız Etmeyin erişimi” izni gerekir. '
          'Açılan listede “Lügat-ı Risale-i Nur”u bulup izni açın, sonra geri dönün.',
          'İzin ver',
          controller.openFocusPermissionSettings,
        )
      else if (focus.enabled && focus.disabledInSystem)
        warning(
          'Uygulamanın “Lügat-ı Risale-i Nur (okuma)” kuralı Android’in Rahatsız Etmeyin '
          'ayarlarından kapatılmış. Tekrar açarsanız odak modu çalışır.',
          'Android ayarlarını aç',
          controller.openFocusRuleSettings,
        ),
    ];
  }
}

/// iPhone'da uygulamalar "Rahatsız Etme"yi kendileri açamaz. Bunun yerine
/// Kestirmeler uygulamasıyla, Lügat açılınca odak modunu açan ve kapanınca
/// kapatan bir otomasyon kurulabilir.
class _IosFocusHelp extends StatelessWidget {
  const _IosFocusHelp({this.initiallyExpanded = false});

  final bool initiallyExpanded;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final steps = [
      'Kestirmeler (Shortcuts) uygulamasını açın ve alttaki “Otomasyon” sekmesine geçin.',
      '“Yeni Otomasyon” (veya +) → “Uygulama”yı seçin.',
      'Uygulama olarak “Lügat-ı Risale-i Nur”u seçin; “Açıldığında” işaretli olsun ve '
          '“Hemen Çalıştır”ı seçin (iOS 16 ve öncesinde bu seçenek yoktur; eylemi ekledikten '
          'sonra son ekranda “Çalıştırmadan Önce Sor”u kapatın).',
      '“Odağı Ayarla” (Set Focus) eylemini ekleyin: “Rahatsız Etme” → “Aç”.',
      'Aynı adımlarla ikinci bir otomasyon kurun: bu sefer “Kapatıldığında” seçip '
          '“Rahatsız Etme”yi “Kapat”.',
    ];
    return ExpansionTile(
      initiallyExpanded: initiallyExpanded,
      leading: const Icon(Icons.do_not_disturb_on_outlined),
      title: const Text('Bildirim gizleme (iPhone)'),
      subtitle: const Text('iPhone’da uygulamalar “Rahatsız Etme”yi kendi başlarına açamaz. '
          'Bir kereye mahsus kuracağınız bir otomasyonla aynı sonucu alabilirsiniz.'),
      childrenPadding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      expandedCrossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < steps.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text('${i + 1}. ${steps[i]}', style: theme.textTheme.bodyMedium),
          ),
        Text(
          'Böylece Lügat açılınca bildirimler susar, uygulamadan çıkınca “Rahatsız Etme” kapanır.',
          style: theme.textTheme.bodySmall,
        ),
      ],
    );
  }
}
