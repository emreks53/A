import 'dart:async';
import 'dart:isolate';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import 'dictionary/lugat.dart';
import 'focus/focus_mode.dart';

/// Uygulamanın tüm durumu: sözlük, ayarlar, geçmiş, kaydedilenler ve odak
/// modu.
class AppController extends ChangeNotifier {
  AppController({
    Future<Lugat> Function()? loadLugat,
    Future<Lugat> Function()? loadFullLugat,
    FocusModeService? focusService,
    Future<void> Function()? keepScreenOn,
  })  : _loadLugat = loadLugat ?? loadBundledLugat,
        _loadFullLugat = loadFullLugat ?? (loadLugat == null ? loadBundledFullLugat : null),
        focusService = focusService ?? FocusModeService(),
        _keepScreenOn = keepScreenOn ?? _enableWakelock {
    this.focusService.onStatusChanged = (status) {
      if (status != focus) {
        focus = status;
        _notify();
      }
    };
  }

  /// Risale-i Nur'a özgü kelimeler (hızlı açılır) ve lügatın geri kalanı.
  static const assetPath = 'assets/lugat.jsonl';
  static const extraAssetPath = 'assets/lugat_ek.jsonl';
  static const maxHistory = 100;
  static const minTextScale = 0.85;
  static const maxTextScale = 1.6;

  static const _kTheme = 'tema';
  static const _kTextScale = 'yazi_boyutu';
  static const _kHistory = 'gecmis';
  static const _kFavorites = 'kaydedilenler';
  static const _kFocusBannerDismissed = 'odak_uyarisi_kapatildi';
  static const _kIosTipDismissed = 'iphone_odak_ipucu_kapatildi';

  final Future<Lugat> Function() _loadLugat;
  final Future<Lugat> Function()? _loadFullLugat;
  final Future<void> Function() _keepScreenOn;
  final FocusModeService focusService;

  SharedPreferences? _prefs;

  /// Yüklenince dolar; o zamana kadar `null`.
  Lugat? lugat;

  /// Sözlük yüklenemediyse sebebi.
  Object? loadError;

  ThemeMode themeMode = ThemeMode.system;
  double textScale = 1.0;

  /// Son bakılan kelimeler, en yenisi başta.
  List<String> history = const [];

  /// Kaydedilen kelimeler, en yenisi başta.
  List<String> favorites = const [];

  FocusStatus focus = const FocusStatus();

  /// Android'de izin uyarısı "Şimdi değil" ile kapatıldı mı?
  bool focusBannerDismissed = false;

  /// iPhone'da Kestirmeler kurulumu ipucu kapatıldı mı?
  bool iosFocusTipDismissed = false;

  bool get isAndroid => focusService.isAndroid;

  bool _disposed = false;

  /// Paketlenmiş sözlüğün Risale-i Nur'a özgü kısmını ayrı bir isolate'te
  /// okur; arayüz takılmaz ve arama birkaç yüz milisaniyede hazır olur.
  static Future<Lugat> loadBundledLugat() async {
    final bytes = await _assetBytes(assetPath);
    return Isolate.run(() => Lugat.fromBytes(bytes));
  }

  /// Bütün sözlük (Risale-i Nur'a özgü liste + lügatın geri kalanı); ilk
  /// kısım kullanılırken arka planda hazırlanır.
  static Future<Lugat> loadBundledFullLugat() async {
    final core = await _assetBytes(assetPath);
    final extra = await _assetBytes(extraAssetPath);
    return Isolate.run(() => Lugat.fromBytes(core, [extra]));
  }

  static Future<Uint8List> _assetBytes(String path) async {
    final data = await rootBundle.load(path);
    return data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes);
  }

  static Future<void> _enableWakelock() => WakelockPlus.enable();

  Future<void> init() async {
    unawaited(keepScreenOn());
    final lugatFuture = _loadLugat();
    final fullFuture = _loadFullLugat?.call();
    unawaited(refreshFocus());

    try {
      final prefs = _prefs = await SharedPreferences.getInstance();
      themeMode = ThemeMode.values.firstWhere(
        (m) => m.name == prefs.getString(_kTheme),
        orElse: () => ThemeMode.system,
      );
      textScale = (prefs.getDouble(_kTextScale) ?? 1.0).clamp(minTextScale, maxTextScale);
      history = prefs.getStringList(_kHistory) ?? const [];
      favorites = prefs.getStringList(_kFavorites) ?? const [];
      focusBannerDismissed = prefs.getBool(_kFocusBannerDismissed) ?? false;
      iosFocusTipDismissed = prefs.getBool(_kIosTipDismissed) ?? false;
      _notify();
    } catch (e) {
      debugPrint('Ayarlar okunamadı: $e');
    }

    try {
      lugat = await lugatFuture;
    } catch (e) {
      loadError = e;
      debugPrint('Sözlük yüklenemedi: $e');
    }
    _notify();

    if (fullFuture != null) {
      try {
        final full = await fullFuture;
        lugat = full;
        loadError = null;
      } catch (e) {
        // İlk kısım açıldıysa uygulama onunla çalışmaya devam eder.
        if (lugat == null) loadError ??= e;
        debugPrint('Lügatın geri kalanı yüklenemedi: $e');
      }
      _notify();
    }
  }

  /// Ekranın kendiliğinden kapanmasını engeller. Uygulama her ön plana
  /// geldiğinde yeniden çağrılır (bazı cihazlar bu ayarı sıfırlayabiliyor).
  Future<void> keepScreenOn() async {
    try {
      await _keepScreenOn();
    } catch (e) {
      debugPrint('Ekran açık tutulamadı: $e');
    }
  }

  /// Uygulama yeniden ön plana geldiğinde.
  void onResumed() {
    unawaited(keepScreenOn());
    unawaited(refreshFocus());
  }

  Future<void> refreshFocus() async {
    final status = await focusService.status();
    if (status != null && status != focus) {
      focus = status;
      _notify();
    }
  }

  Future<void> setFocusEnabled(bool enabled) async {
    focus = focus.copyWith(enabled: enabled);
    _notify();
    final status = await focusService.setEnabled(enabled);
    if (status != null) {
      focus = status;
      _notify();
    } else {
      await refreshFocus();
    }
  }

  Future<void> openFocusPermissionSettings() => focusService.openPermissionSettings();

  Future<void> openFocusRuleSettings() => focusService.openRuleSettings();

  void dismissFocusBanner() {
    focusBannerDismissed = true;
    _prefs?.setBool(_kFocusBannerDismissed, true);
    _notify();
  }

  void dismissIosFocusTip() {
    iosFocusTipDismissed = true;
    _prefs?.setBool(_kIosTipDismissed, true);
    _notify();
  }

  void setThemeMode(ThemeMode mode) {
    themeMode = mode;
    _prefs?.setString(_kTheme, mode.name);
    _notify();
  }

  void setTextScale(double scale) {
    textScale = scale.clamp(minTextScale, maxTextScale);
    _prefs?.setDouble(_kTextScale, textScale);
    _notify();
  }

  /// Bakılan kelimeyi geçmişin başına ekler.
  void recordLookup(Entry entry) {
    history = [entry.word, ...history.where((w) => w != entry.word)].take(maxHistory).toList();
    _prefs?.setStringList(_kHistory, history);
    _notify();
  }

  void clearHistory() {
    history = const [];
    _prefs?.remove(_kHistory);
    _notify();
  }

  bool isFavorite(Entry entry) => favorites.contains(entry.word);

  void toggleFavorite(Entry entry) {
    favorites = isFavorite(entry)
        ? favorites.where((w) => w != entry.word).toList()
        : [entry.word, ...favorites];
    _prefs?.setStringList(_kFavorites, favorites);
    _notify();
  }

  /// Kayıtlı kelime listelerini sözlük maddelerine çevirir (sözlük
  /// güncellenip bir kelime kaldırıldıysa o kelime atlanır).
  List<Entry> resolve(List<String> words) {
    final l = lugat;
    if (l == null) return const [];
    return [for (final w in words) ?l.byWord(w)];
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
