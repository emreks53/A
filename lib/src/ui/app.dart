import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../app_controller.dart';
import 'search_page.dart';
import 'theme.dart';

/// Alt sayfaların [AppController]'a ulaşması ve değiştiğinde yeniden
/// çizilmesi için.
class AppScope extends InheritedNotifier<AppController> {
  const AppScope({super.key, required AppController controller, required super.child})
      : super(notifier: controller);

  static AppController of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AppScope>()!.notifier!;

  /// Değişiklikleri dinlemeden (ör. bir düğmenin içinde) erişmek için.
  static AppController read(BuildContext context) =>
      context.getInheritedWidgetOfExactType<AppScope>()!.notifier!;
}

class LugatApp extends StatefulWidget {
  const LugatApp({super.key, required this.controller});

  final AppController controller;

  @override
  State<LugatApp> createState() => _LugatAppState();
}

class _LugatAppState extends State<LugatApp> {
  late final AppLifecycleListener _lifecycle;

  @override
  void initState() {
    super.initState();
    _lifecycle = AppLifecycleListener(onResume: widget.controller.onResumed);
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppScope(
      controller: widget.controller,
      child: ListenableBuilder(
        listenable: widget.controller,
        builder: (context, _) => MaterialApp(
          title: 'Lügat-ı Risale-i Nur',
          debugShowCheckedModeBanner: false,
          theme: buildTheme(Brightness.light),
          darkTheme: buildTheme(Brightness.dark),
          themeMode: widget.controller.themeMode,
          locale: const Locale('tr', 'TR'),
          supportedLocales: const [Locale('tr', 'TR')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          builder: (context, child) {
            // Kullanıcının seçtiği yazı boyutu, telefonun kendi yazı boyutu
            // ayarının üzerine eklenir.
            final media = MediaQuery.of(context);
            final scale = widget.controller.textScale;
            return MediaQuery(
              data: media.copyWith(
                textScaler: _MultipliedTextScaler(media.textScaler, scale),
              ),
              child: child!,
            );
          },
          home: const SearchPage(),
        ),
      ),
    );
  }
}

class _MultipliedTextScaler extends TextScaler {
  const _MultipliedTextScaler(this.base, this.factor);

  final TextScaler base;
  final double factor;

  @override
  double scale(double fontSize) => base.scale(fontSize) * factor;

  @override
  // ignore: deprecated_member_use
  double get textScaleFactor => base.textScaleFactor * factor;

  @override
  bool operator ==(Object other) =>
      other is _MultipliedTextScaler && other.base == base && other.factor == factor;

  @override
  int get hashCode => Object.hash(base, factor);
}
