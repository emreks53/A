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
List<MethodCall> mockAndroidFocus({required bool granted, bool enabled = true}) {
  final calls = <MethodCall>[];
  var isEnabled = enabled;
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(_channel, (call) async {
    calls.add(call);
    switch (call.method) {
      case 'setEnabled':
        isEnabled = (call.arguments as Map)['enabled'] as bool;
      case 'openSettings':
        return true;
    }
    return {'supported': true, 'enabled': isEnabled, 'granted': granted, 'active': granted && isEnabled};
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
    expect(find.text('Arapça'), findsOneWidget);
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
    expect(find.text('Bildirimleri gizleme (iPhone)'), findsOneWidget);
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

  testWidgets('yazı boyutu ve tema ayarları kaydedilir', (tester) async {
    final controller = await startApp(tester);
    controller.setTextScale(1.3);
    controller.setThemeMode(ThemeMode.dark);
    await tester.pump();

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getDouble('yazi_boyutu'), 1.3);
    expect(prefs.getString('tema'), 'dark');
  });
}
