import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lugat_risale/src/app_controller.dart';
import 'package:lugat_risale/src/dictionary/lugat.dart';
import 'package:lugat_risale/src/focus/focus_mode.dart';
import 'package:lugat_risale/src/ui/app.dart';
import 'package:lugat_risale/src/ui/entry_page.dart';
import 'package:lugat_risale/src/ui/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'support/sample_lugat.dart';

const _channel = MethodChannel('lugat/odak');

/// Uygulamayı örnek lügatle başlatır.
Future<AppController> startApp(
  WidgetTester tester, {
  bool android = false,
  void Function()? onKeepScreenOn,
}) async {
  final controller = AppController(
    loadLugat: () async => Lugat.parseJsonl(sampleJsonl),
    focusService: FocusModeService(channel: _channel, isAndroid: android),
    keepScreenOn: () async => onKeepScreenOn?.call(),
  );
  controller.init();
  await tester.pumpWidget(LugatApp(controller: controller));
  await tester.pumpAndSettle();
  return controller;
}

/// Listedeki bir kelimenin satırı.
Finder tile(String word) => find.byWidgetPredicate((w) => w is EntryTile && w.entry.word == word);

EditableText searchField(WidgetTester tester) =>
    tester.widget<EditableText>(find.descendant(of: find.byKey(const Key('arama-kutusu')), matching: find.byType(EditableText)));

/// Android tarafını taklit eder.
List<MethodCall> mockAndroidFocus({required bool granted, bool enabled = true, bool disabledInSystem = false}) {
  final calls = <MethodCall>[];
  var isEnabled = enabled;
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(_channel, (call) async {
    calls.add(call);
    switch (call.method) {
      case 'setEnabled':
        isEnabled = (call.arguments as Map)['enabled'] as bool;
      case 'openSettings' || 'openRuleSettings':
        return true;
    }
    return {
      'supported': true,
      'sdk': 36,
      'enabled': isEnabled,
      'granted': granted,
      'active': granted && isEnabled && !disabledInSystem,
      'disabledInSystem': disabledInSystem,
    };
  });
  return calls;
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  tearDown(() => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(_channel, null));

  testWidgets('açılır açılmaz arama kutusu odakta ve klavye açık', (tester) async {
    var keepScreenOnCalls = 0;
    await startApp(tester, onKeepScreenOn: () => keepScreenOnCalls++);

    expect(searchField(tester).focusNode.hasFocus, isTrue);
    expect(tester.testTextInput.isVisible, isTrue);
    expect(keepScreenOnCalls, greaterThan(0), reason: 'ekran açık tutulmalı');
  });

  testWidgets('yazdıkça uyan kelimeler manalarıyla listelenir', (tester) async {
    await startApp(tester);

    await tester.enterText(find.byKey(const Key('arama-kutusu')), 'in');
    await tester.pump();

    expect(tile('inkişaf'), findsOneWidget);
    expect(tile('inhisar'), findsOneWidget);
    expect(tile('inderec'), findsOneWidget);
    expect(find.text('Açılma, gelişme.'), findsOneWidget);
  });

  testWidgets('kelimeye dokununca manası açılır, "Yeni kelime" ile arama kutusuna dönülür', (tester) async {
    final controller = await startApp(tester);

    await tester.enterText(find.byKey(const Key('arama-kutusu')), 'inhi');
    await tester.pump();
    await tester.tap(tile('inhisar'));
    await tester.pumpAndSettle();

    expect(find.byType(EntryPage), findsOneWidget);
    expect(find.text('Bir şeye has olma, tekel.'), findsOneWidget);
    // Ekranda yalnız kelime ve lügattaki manası var; köken gösterilmez.
    expect(find.text('Arapça'), findsNothing);
    expect(controller.history, ['inhisar']);

    await tester.tap(find.byKey(const Key('yeni-kelime')));
    await tester.pumpAndSettle();

    expect(find.byType(EntryPage), findsNothing);
    expect(searchField(tester).controller.text, isEmpty);
    expect(searchField(tester).focusNode.hasFocus, isTrue);
    expect(find.text('Son bakılanlar'), findsOneWidget);
  });

  testWidgets('geri tuşuyla dönünce yazı seçili kalır, yazınca yerine geçer', (tester) async {
    await startApp(tester);

    await tester.enterText(find.byKey(const Key('arama-kutusu')), 'muhab');
    await tester.pump();
    await tester.tap(tile('muhabbet'));
    await tester.pumpAndSettle();
    expect(find.byType(EntryPage), findsOneWidget);
    await tester.tap(find.byType(BackButton)); // pageBack() İngilizce "Back" ipucunu arıyor
    await tester.pumpAndSettle();

    final field = searchField(tester);
    expect(field.focusNode.hasFocus, isTrue);
    expect(field.controller.selection, const TextSelection(baseOffset: 0, extentOffset: 5));
  });

  testWidgets('klavyedeki ara tuşu ilk sonucu açar', (tester) async {
    await startApp(tester);

    await tester.enterText(find.byKey(const Key('arama-kutusu')), 'inkisafina');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();

    expect(find.byType(EntryPage), findsOneWidget);
    expect(find.text('Açılma, gelişme.'), findsOneWidget);
  });

  testWidgets('kelime kaydedilip kaydedilenlerde görülür', (tester) async {
    final controller = await startApp(tester);

    await tester.enterText(find.byKey(const Key('arama-kutusu')), 'insaf');
    await tester.pump();
    await tester.tap(tile('insaf'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Kaydet'));
    await tester.pump();
    expect(controller.favorites, ['insaf']);
    expect(find.byTooltip('Kaydedilenlerden çıkar'), findsOneWidget);
  });

  testWidgets('iPhone\'da ayarlar Kestirmeler rehberini gösterir', (tester) async {
    await startApp(tester);

    await tester.tap(find.byTooltip('Ayarlar'));
    await tester.pumpAndSettle();

    expect(find.text('Ekran kapanmaz'), findsOneWidget);
    expect(find.text('Bildirim gizleme (iPhone)'), findsOneWidget);
    expect(find.byKey(const Key('odak-anahtari')), findsNothing);
  });

  testWidgets('Android\'de izin yoksa klavyeyi kapatmayan uyarı çıkar', (tester) async {
    final calls = mockAndroidFocus(granted: false);
    await startApp(tester, android: true);

    expect(find.textContaining('“Rahatsız Etmeyin”'), findsOneWidget);
    expect(searchField(tester).focusNode.hasFocus, isTrue);

    await tester.tap(find.text('İzin ver'));
    await tester.pump();
    expect(calls.map((c) => c.method), contains('openSettings'));

    await tester.tap(find.text('Şimdi değil'));
    await tester.pump();
    expect(find.textContaining('“Rahatsız Etmeyin”'), findsNothing);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getBool('odak_uyarisi_kapatildi'), isTrue, reason: 'bir daha sorulmamalı');
  });

  testWidgets('izin uyarısı yazmaya başlayınca önerilerin yerini kaplamaz', (tester) async {
    mockAndroidFocus(granted: false);
    await startApp(tester, android: true);

    await tester.enterText(find.byKey(const Key('arama-kutusu')), 'in');
    await tester.pump();

    expect(find.textContaining('“Rahatsız Etmeyin”'), findsNothing);
    expect(tile('inkişaf'), findsOneWidget);
  });

  testWidgets('kural Android ayarlarında kapatılmışsa ayarlarda söylenir', (tester) async {
    final calls = mockAndroidFocus(granted: true, disabledInSystem: true);
    final controller = await startApp(tester, android: true);
    expect(controller.focus.active, isFalse);
    expect(find.byTooltip('Odak modu Android ayarlarında kapatılmış'), findsOneWidget);

    await tester.tap(find.byTooltip('Ayarlar'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Android ayarlarını aç'));
    await tester.pump();
    expect(calls.map((c) => c.method), contains('openRuleSettings'));
  });

  testWidgets('iPhone\'da bir kereye mahsus Kestirmeler ipucu gösterilir', (tester) async {
    await startApp(tester);

    expect(find.textContaining('Kestirmeler kurulumu'), findsOneWidget);
    await tester.tap(find.text('Nasıl?'));
    await tester.pumpAndSettle();
    expect(find.textContaining('“Odağı Ayarla”'), findsOneWidget, reason: 'rehber açık gelmeli');

    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tamam'));
    await tester.pump();
    expect(find.textContaining('Kestirmeler kurulumu'), findsNothing);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getBool('iphone_odak_ipucu_kapatildi'), isTrue);
  });

  testWidgets('kenardan kaydırarak geri dönünce de klavye açılır (iPhone)', (tester) async {
    await startApp(tester);

    await tester.enterText(find.byKey(const Key('arama-kutusu')), 'muhab');
    await tester.pump();
    await tester.tap(tile('muhabbet'));
    await tester.pumpAndSettle();
    expect(find.byType(EntryPage), findsOneWidget);

    await tester.dragFrom(const Offset(5, 300), const Offset(500, 0));
    await tester.pumpAndSettle();

    expect(find.byType(EntryPage), findsNothing);
    expect(searchField(tester).focusNode.hasFocus, isTrue);
    expect(tester.testTextInput.isVisible, isTrue);
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));

  testWidgets('Kaydedilenler\'den açılan kelimede "Yeni kelime" arama kutusunu boşaltır', (tester) async {
    final controller = await startApp(tester);
    controller.toggleFavorite(controller.lugat!.byWord('insaf')!);
    await tester.enterText(find.byKey(const Key('arama-kutusu')), 'eski arama');
    await tester.pump();

    await tester.tap(find.byTooltip('Kaydedilenler'));
    await tester.pumpAndSettle();
    await tester.tap(tile('insaf'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('yeni-kelime')));
    await tester.pumpAndSettle();

    expect(find.byType(EntryPage), findsNothing);
    expect(find.text('Kaydedilenler'), findsNothing);
    expect(searchField(tester).controller.text, isEmpty);
    expect(searchField(tester).focusNode.hasFocus, isTrue);
  });

  testWidgets('Android\'de odak modu varsayılan açık ve ayarlardan kapatılabilir', (tester) async {
    final calls = mockAndroidFocus(granted: true);
    final controller = await startApp(tester, android: true);

    expect(controller.focus.enabled, isTrue);
    expect(controller.focus.active, isTrue);
    expect(find.byTooltip('Odak modu açık: bildirimler gizleniyor'), findsOneWidget);

    await tester.tap(find.byTooltip('Ayarlar'));
    await tester.pumpAndSettle();
    final toggle = find.byKey(const Key('odak-anahtari'));
    expect(tester.widget<SwitchListTile>(toggle).value, isTrue);

    await tester.tap(toggle);
    await tester.pumpAndSettle();

    final call = calls.lastWhere((c) => c.method == 'setEnabled');
    expect(call.arguments, {'enabled': false});
    expect(controller.focus.enabled, isFalse);
    expect(tester.widget<SwitchListTile>(toggle).value, isFalse);
  });

  testWidgets('Rahatsız Etmeyin durumu sistemde değişince gösterge hemen güncellenir', (tester) async {
    mockAndroidFocus(granted: true);
    final controller = await startApp(tester, android: true);
    expect(controller.focus.active, isTrue);

    // Kullanıcı Hızlı Ayarlar'dan Rahatsız Etmeyin'i kapattı; Android haber veriyor.
    await TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.handlePlatformMessage(
      'lugat/odak',
      const StandardMethodCodec().encodeMethodCall(const MethodCall('statusChanged', {
        'supported': true,
        'sdk': 35,
        'enabled': true,
        'granted': true,
        'active': false,
        'disabledInSystem': false,
      })),
      (_) {},
    );
    await tester.pump();

    expect(controller.focus.active, isFalse);
    expect(find.byTooltip('Odak modu ayarları'), findsOneWidget);
  });

  testWidgets('yazı boyutu ve tema ayarları kaydedilir', (tester) async {
    final controller = await startApp(tester);
    controller.setTextScale(1.3);
    controller.setThemeMode(ThemeMode.dark);
    await tester.pump();

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getDouble('yazi_boyutu'), 1.3);
    expect(prefs.getString('tema'), 'dark');
  });

  testWidgets('lügatın geri kalanı yüklenirken tahmin gösterilmez, ara tuşu yüklenmesini bekler', (tester) async {
    final full = Completer<Lugat>();
    const core = '{"w":"âlem","f":3,"m":"Dünya, cihan."}\n{"w":"abd","f":2,"m":"Kul, köle."}';
    final controller = AppController(
      loadLugat: () async => Lugat.parseJsonl(core),
      loadFullLugat: () => full.future,
      focusService: FocusModeService(channel: _channel, isAndroid: false),
      keepScreenOn: () async {},
    );
    controller.init();
    await tester.pumpWidget(LugatApp(controller: controller));
    await tester.pump();
    await tester.pump();
    expect(controller.fullyLoaded, isFalse);
    expect(find.byType(LinearProgressIndicator), findsOneWidget);

    // "abdest" henüz yüklenmedi: kök tahmini ("abd") gösterilmez.
    await tester.enterText(find.byKey(const Key('arama-kutusu')), 'abdest');
    await tester.pump();
    expect(tile('abd'), findsNothing);
    expect(find.text('Lügat yükleniyor…'), findsOneWidget);

    // Ara tuşu, lügatın tamamı gelince doğru kelimeyi açar.
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    expect(find.byType(EntryPage), findsNothing);
    full.complete(Lugat.parseJsonl('$core\n{"w":"abdest","f":2,"m":"Namaz için yıkanma."}'));
    await tester.pumpAndSettle();
    expect(controller.fullyLoaded, isTrue);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(find.byType(EntryPage), findsOneWidget);
    expect(controller.history, ['abdest']);
  });

  testWidgets('"Bakınız" bağlantısı yeni sayfada açılır; geri tuşu önceki kelimeye döner', (tester) async {
    final controller = AppController(
      loadLugat: () async => Lugat.parseJsonl(
        '{"w":"abdal","f":1,"m":"Dervişler. (Bak: Ebdal)"}\n{"w":"ebdal","f":1,"m":"Veliler."}',
      ),
      focusService: FocusModeService(channel: _channel, isAndroid: false),
      keepScreenOn: () async {},
    );
    controller.init();
    await tester.pumpWidget(LugatApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.enterText(find.byKey(const Key('arama-kutusu')), 'abdal');
    await tester.pump();
    await tester.tap(tile('abdal'));
    await tester.pumpAndSettle();
    await tester.tap(tile('ebdal'));
    await tester.pumpAndSettle();
    expect(find.byType(EntryPage), findsNWidgets(1)); // önceki sayfa altta, ekranda değil
    expect(find.text('Veliler.'), findsOneWidget);
    expect(controller.history, ['ebdal', 'abdal']);

    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    expect(find.text('Dervişler. (Bak: Ebdal)'), findsOneWidget);

    // "Yeni kelime" bütün sayfaları kapatıp aramaya döner.
    await tester.tap(tile('ebdal'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('yeni-kelime')));
    await tester.pumpAndSettle();
    expect(find.byType(EntryPage), findsNothing);
    expect(searchField(tester).controller.text, isEmpty);
  });

  testWidgets('kaydedilenden çıkarma ve geçmişi temizleme geri alınabilir', (tester) async {
    final controller = await startApp(tester);
    controller.toggleFavorite(controller.lugat!.byWord('insaf')!);
    controller.recordLookup(controller.lugat!.byWord('muhabbet')!);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Temizle'));
    await tester.pumpAndSettle();
    expect(controller.history, isEmpty);
    await tester.tap(find.text('Geri al'));
    await tester.pumpAndSettle();
    expect(controller.history, ['muhabbet']);

    await tester.tap(find.byTooltip('Kaydedilenler'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Kaydedilenlerden çıkar'));
    await tester.pumpAndSettle();
    expect(controller.favorites, isEmpty);
    await tester.tap(find.text('Geri al'));
    await tester.pumpAndSettle();
    expect(controller.favorites, ['insaf']);
    expect(tile('insaf'), findsOneWidget);
  });

  testWidgets('ayarlarda gizlilik politikası okunabilir', (tester) async {
    await startApp(tester);
    await tester.tap(find.byTooltip('Ayarlar'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Gizlilik politikası'), 200);
    await tester.tap(find.text('Gizlilik politikası'));
    await tester.pumpAndSettle();
    expect(find.text('Toplanan veriler'), findsOneWidget);
  });

  testWidgets('büyük yazıda arama çubuğu düğmeleri sıkışmaz', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final controller = await startApp(tester);
    controller.setTextScale(AppController.maxTextScale);
    await tester.pumpAndSettle();
    // Üst çubuk tam yüksekliğinde kalır; düğme normal boyunda (40) görünür.
    expect(tester.getSize(find.byType(NavigationToolbar).first).height, greaterThanOrEqualTo(56));
    expect(tester.getSize(find.byTooltip('Ayarlar')).height, greaterThanOrEqualTo(40));
  });
}
