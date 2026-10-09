import 'package:flutter/material.dart';

/// Uygulamanın renkleri. Logodaki lacivert radyal geçişten türetildi; sade bir
/// fildişi kâğıt zemin, lacivert mürekkep ve yalnız ince ayrıntılarda
/// kullanılan mat bir altın.
abstract final class Palette {
  /// Logonun zemini: merkez (açık) ve kenar (koyu) renkleri.
  static const logoCenter = Color(0xFF013C77);
  static const logoEdge = Color(0xFF003365);

  static const navy = Color(0xFF0B3D78);
  static const navyDeep = Color(0xFF062A55);
  static const paper = Color(0xFFF8F6F1);
  static const card = Color(0xFFFFFFFF);
  static const ink = Color(0xFF161D2B);
  static const inkMuted = Color(0xFF586274);
  static const line = Color(0xFFE4DFD3);
  static const gold = Color(0xFF85672A);

  static const night = Color(0xFF071629);
  static const nightSurface = Color(0xFF0D213D);
  static const nightHigh = Color(0xFF132C4F);
  static const nightInk = Color(0xFFECE7DB);
  static const nightMuted = Color(0xFFA7B1C2);
  static const nightLine = Color(0xFF1F3657);
  static const sky = Color(0xFF9EC3F5);
  static const goldLight = Color(0xFFD3B26A);

  /// Ana ekranın üst bandı: logodaki gibi koyu kenardan açık merkeze.
  static LinearGradient header(Brightness brightness) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: brightness == Brightness.light
            ? const [logoEdge, logoCenter]
            : const [Color(0xFF051B36), Color(0xFF0A2E5A)],
      );
}

/// Kelime ve mana metinlerinin yazı tipi (assets/fonts, SIL Open Font License).
const String serifFamily = 'Lora';

ThemeData buildTheme(Brightness brightness) {
  final light = brightness == Brightness.light;
  final scheme = light
      ? const ColorScheme(
          brightness: Brightness.light,
          primary: Palette.navy,
          onPrimary: Colors.white,
          primaryContainer: Color(0xFFDCE6F4),
          onPrimaryContainer: Palette.navyDeep,
          secondary: Palette.navyDeep,
          onSecondary: Colors.white,
          secondaryContainer: Color(0xFFE8EDF5),
          onSecondaryContainer: Palette.navyDeep,
          tertiary: Palette.gold,
          onTertiary: Colors.white,
          tertiaryContainer: Color(0xFFF3EAD3),
          onTertiaryContainer: Color(0xFF4A3810),
          error: Color(0xFFB3261E),
          onError: Colors.white,
          surface: Palette.paper,
          onSurface: Palette.ink,
          onSurfaceVariant: Palette.inkMuted,
          surfaceContainerLowest: Palette.card,
          surfaceContainerLow: Color(0xFFF4F1EA),
          surfaceContainer: Color(0xFFF0ECE3),
          surfaceContainerHigh: Color(0xFFECE7DD),
          surfaceContainerHighest: Color(0xFFE7E2D7),
          outline: Color(0xFF7A7466),
          outlineVariant: Palette.line,
        )
      : const ColorScheme(
          brightness: Brightness.dark,
          primary: Palette.sky,
          onPrimary: Palette.navyDeep,
          primaryContainer: Color(0xFF163D6E),
          onPrimaryContainer: Color(0xFFD7E6FB),
          secondary: Color(0xFFBCD2F2),
          onSecondary: Palette.navyDeep,
          secondaryContainer: Color(0xFF142E52),
          onSecondaryContainer: Color(0xFFD7E6FB),
          tertiary: Palette.goldLight,
          onTertiary: Color(0xFF3A2B05),
          tertiaryContainer: Color(0xFF4A3810),
          onTertiaryContainer: Color(0xFFF3E2B8),
          error: Color(0xFFFFB4AB),
          onError: Color(0xFF690005),
          surface: Palette.night,
          onSurface: Palette.nightInk,
          onSurfaceVariant: Palette.nightMuted,
          surfaceContainerLowest: Color(0xFF051122),
          surfaceContainerLow: Palette.nightSurface,
          surfaceContainer: Color(0xFF102644),
          surfaceContainerHigh: Palette.nightHigh,
          surfaceContainerHighest: Color(0xFF183357),
          outline: Color(0xFF5B6F8E),
          outlineVariant: Palette.nightLine,
        );

  // Başlıklar ve metinler Lora ile; düğme ve etiketler telefonun kendi yazı tipiyle.
  final base = (light ? Typography.material2021().black : Typography.material2021().white)
      .apply(bodyColor: scheme.onSurface, displayColor: scheme.onSurface);
  final serif = base.apply(fontFamily: serifFamily);
  final textTheme = serif.copyWith(
    labelLarge: base.labelLarge,
    labelMedium: base.labelMedium,
    labelSmall: base.labelSmall,
    titleLarge: serif.titleLarge?.copyWith(fontWeight: FontWeight.w600),
    titleMedium: serif.titleMedium?.copyWith(fontWeight: FontWeight.w600),
  );

  return ThemeData(
    colorScheme: scheme,
    textTheme: textTheme,
    scaffoldBackgroundColor: scheme.surface,
    visualDensity: VisualDensity.standard,
    appBarTheme: AppBarTheme(
      backgroundColor: scheme.surface,
      foregroundColor: scheme.primary,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
      titleTextStyle: textTheme.titleLarge?.copyWith(color: scheme.primary),
    ),
    dividerTheme: DividerThemeData(color: scheme.outlineVariant, thickness: 1, space: 1),
    listTileTheme: const ListTileThemeData(contentPadding: EdgeInsets.symmetric(horizontal: 20)),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: light ? Palette.navy : Palette.nightHigh,
      foregroundColor: light ? Colors.white : Palette.nightInk,
      extendedTextStyle: base.labelLarge?.copyWith(fontWeight: FontWeight.w600, letterSpacing: 0.3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: light ? BorderSide.none : const BorderSide(color: Palette.nightLine),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: light ? Palette.navyDeep : Palette.nightHigh,
      contentTextStyle: base.bodyMedium?.copyWith(color: light ? Colors.white : Palette.nightInk),
      behavior: SnackBarBehavior.floating,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? scheme.onPrimary : null),
      trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? scheme.primary : null),
    ),
    cardTheme: CardThemeData(
      color: scheme.surfaceContainerLowest,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: scheme.outlineVariant),
      ),
    ),
  );
}
