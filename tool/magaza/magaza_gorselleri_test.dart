// Google Play mağaza görsellerini (ekran görüntüleri ve öne çıkan görsel) gerçek lügat
// ve gerçek yazı tipleriyle çizer. Çalıştırma (proje kökünden):
//
//   flutter test --update-goldens tool/magaza/magaza_gorselleri_test.dart
//   python3 tool/magaza/aktar.py      # store/google-play/ altına (saydamlıksız PNG) kopyalar
//
// Roboto ve Material simge yazı tipleri Flutter SDK'sından okunur (FLUTTER_ROOT ya da
// /opt/sdk/flutter); çıktılar tool/magaza/shots/ altına yazılır (git'e girmez).
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lugat_risale/src/app_controller.dart';
import 'package:lugat_risale/src/dictionary/lugat.dart';
import 'package:lugat_risale/src/focus/focus_mode.dart';
import 'package:lugat_risale/src/ui/app.dart';
import 'package:lugat_risale/src/ui/theme.dart';
import 'package:lugat_risale/src/ui/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<void> loadFonts() async {
  Future<void> load(String family, List<String> files) async {
    final loader = FontLoader(family);
    for (final f in files) {
      loader.addFont(Future.value(ByteData.view(File(f).readAsBytesSync().buffer)));
    }
    await loader.load();
  }

  final sdk = '${Platform.environment['FLUTTER_ROOT'] ?? '/opt/sdk/flutter'}/bin/cache/artifacts/material_fonts';
  await load('Roboto', ['$sdk/Roboto-Regular.ttf', '$sdk/Roboto-Medium.ttf', '$sdk/Roboto-Bold.ttf']);
  await load('MaterialIcons', ['$sdk/MaterialIcons-Regular.otf']);
  await load('Lora', [for (final w in ['Regular', 'SemiBold', 'Bold', 'Italic']) 'assets/fonts/Lora-$w.ttf']);
}

final Lugat full = Lugat.fromBytes(
  File('assets/lugat.jsonl').readAsBytesSync(),
  [File('assets/lugat_ek.jsonl').readAsBytesSync()],
);

Future<void> start(WidgetTester tester, ThemeMode mode, {List<String> history = const []}) async {
  tester.view.physicalSize = const Size(1080, 1920);
  tester.view.devicePixelRatio = 2.625;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues({
    'tema': mode.name,
    'iphone_odak_ipucu_kapatildi': true,
    'gecmis': history,
  });
  final controller = AppController(
    loadLugat: () async => full,
    focusService: FocusModeService(channel: const MethodChannel('x'), isAndroid: false),
    keepScreenOn: () async {},
  );
  controller.init();
  await tester.pumpWidget(LugatApp(controller: controller));
  await tester.pumpAndSettle();
  await tester.runAsync(() => precacheImage(const AssetImage('assets/images/logo_isaret.png'), tester.element(find.byType(Scaffold).first)));
  await tester.pumpAndSettle();
}

Future<void> shot(String name) => expectLater(find.byType(MaterialApp), matchesGoldenFile('shots/$name.png'));

Future<void> search(WidgetTester tester, String q) async {
  await tester.enterText(find.byKey(const Key('arama-kutusu')), q);
  await tester.pumpAndSettle();
}

Future<void> open(WidgetTester tester, String q) async {
  await search(tester, q);
  await tester.testTextInput.receiveAction(TextInputAction.search);
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(loadFonts);

  testWidgets('mağaza ekranları', (tester) async {
    debugDisableShadows = false;
    await start(tester, ThemeMode.light, history: ['tecelli', 'inkişaf', 'kâinat', 'hakikat', 'zerre', 'mana-yı harfî']);
    await search(tester, '');
    await shot('01_ana_ekran');
    await search(tester, 'in');
    await shot('02_ilk_harfler');
    await open(tester, 'inkişaf');
    await shot('03_mana');
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    await search(tester, 'hakikatlerinden');
    await shot('04_ekli_kelime');
    await open(tester, 'hakikat');
    await shot('05_uzun_mana');
    debugDisableShadows = true;
  });

  testWidgets('mağaza ekranları koyu', (tester) async {
    debugDisableShadows = false;
    await start(tester, ThemeMode.dark);
    await open(tester, 'tecelli');
    await shot('06_koyu_tema');
    debugDisableShadows = true;
  });

  testWidgets('öne çıkan görsel', (tester) async {
    tester.view.physicalSize = const Size(1024, 500);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildTheme(Brightness.light),
      home: Builder(builder: (context) {
        final theme = Theme.of(context);
        return Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(center: Alignment(-0.45, 0), radius: 1.3, colors: [Palette.logoCenter, Palette.logoEdge]),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 72),
          child: Row(
            children: [
              const LogoMark(size: 250, color: Colors.white),
              const SizedBox(width: 56),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Lügat-ı Risale-i Nur',
                        style: theme.textTheme.displaySmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 52)),
                    const SizedBox(height: 14),
                    Container(width: 64, height: 3, color: Palette.goldLight),
                    const SizedBox(height: 18),
                    Text('Okurken karşılaştığınız kelimenin\nmanası, ilk harflerini yazınca.',
                        style: theme.textTheme.titleLarge?.copyWith(color: Colors.white.withValues(alpha: 0.88), fontWeight: FontWeight.w400, fontSize: 28, height: 1.35)),
                  ],
                ),
              ),
            ],
          ),
        );
      }),
    ));
    await tester.runAsync(() => precacheImage(const AssetImage('assets/images/logo_isaret.png'), tester.element(find.byType(Container).first)));
    await tester.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('shots/one_cikan_gorsel.png'));
  });
}
