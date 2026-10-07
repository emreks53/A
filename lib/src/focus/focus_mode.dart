import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Odak modunun (okurken bildirimleri gizleme) o anki durumu.
@immutable
class FocusStatus {
  const FocusStatus({
    this.supported = false,
    this.enabled = true,
    this.permissionGranted = false,
    this.active = false,
    this.disabledInSystem = false,
    this.sdk = 0,
  });

  /// Bu cihazda uygulama bildirimleri kendisi engelleyebilir mi?
  /// (Android: evet. iPhone: hayır, Apple buna izin vermiyor.)
  final bool supported;

  /// Kullanıcı ayarı. Varsayılan: açık.
  final bool enabled;

  /// Android'de "Rahatsız Etmeyin erişimi" verilmiş mi?
  final bool permissionGranted;

  /// Şu anda bildirimler gerçekten gizleniyor mu? (Android sistemin o anki
  /// durumuna bakılarak belirlenir.)
  final bool active;

  /// Kullanıcı uygulamanın "Rahatsız Etmeyin" kuralını Android ayarlarından
  /// kapatmış.
  final bool disabledInSystem;

  /// Android API sürümü (Android dışında 0).
  final int sdk;

  /// Android 9 ve öncesi: odak modu bu sürümlerde sunulmuyor.
  bool get oldAndroid => sdk > 0 && sdk < 29;

  /// Ayar açık ama izin olmadığı için çalışamıyor.
  bool get needsPermission => supported && enabled && !permissionGranted;

  FocusStatus copyWith({bool? enabled}) => FocusStatus(
        supported: supported,
        enabled: enabled ?? this.enabled,
        permissionGranted: permissionGranted,
        active: active,
        disabledInSystem: disabledInSystem,
        sdk: sdk,
      );

  factory FocusStatus.fromMap(Map<Object?, Object?> map) => FocusStatus(
        supported: map['supported'] == true,
        enabled: map['enabled'] != false,
        permissionGranted: map['granted'] == true,
        active: map['active'] == true,
        disabledInSystem: map['disabledInSystem'] == true,
        sdk: (map['sdk'] as num?)?.toInt() ?? 0,
      );

  @override
  bool operator ==(Object other) =>
      other is FocusStatus &&
      other.supported == supported &&
      other.enabled == enabled &&
      other.permissionGranted == permissionGranted &&
      other.active == active &&
      other.disabledInSystem == disabledInSystem &&
      other.sdk == sdk;

  @override
  int get hashCode => Object.hash(supported, enabled, permissionGranted, active, disabledInSystem, sdk);
}

/// Android tarafındaki `FocusModeController` ile konuşur.
///
/// Bildirimleri gizleme işi Android'de yerel kodda yapılır: uygulama ekrana
/// gelince "Rahatsız Etmeyin" kuralı devreye alınır, ekrandan çıkınca
/// (başka uygulamaya geçince, ekran kapanınca) hemen kaldırılır. Böylece
/// telefon, uygulama kapalıyken sessizde kalmaz.
class FocusModeService {
  FocusModeService({MethodChannel? channel, bool? isAndroid})
      : _channel = channel ?? const MethodChannel('lugat/odak'),
        _isAndroid = isAndroid ?? (!kIsWeb && Platform.isAndroid) {
    if (_isAndroid) _channel.setMethodCallHandler(_handlePlatformCall);
  }

  /// Rahatsız Etmeyin durumu sistemde değişince (kural devreye girince,
  /// kullanıcı Hızlı Ayarlar'dan kapatınca...) Android tarafı haber verir.
  void Function(FocusStatus status)? onStatusChanged;

  Future<Object?> _handlePlatformCall(MethodCall call) async {
    final args = call.arguments;
    if (call.method == 'statusChanged' && args is Map) {
      onStatusChanged?.call(FocusStatus.fromMap(args.cast<Object?, Object?>()));
    }
    return null;
  }

  final MethodChannel _channel;
  final bool _isAndroid;

  bool get isAndroid => _isAndroid;

  /// Güncel durum. Android dışında her zaman "desteklenmiyor" döner;
  /// yerel taraftan cevap alınamazsa `null` döner.
  Future<FocusStatus?> status() => _call('status');

  /// Ayarı kaydeder ve uygulama ekrandaysa hemen uygular.
  Future<FocusStatus?> setEnabled(bool enabled) => _call('setEnabled', {'enabled': enabled});

  /// Android'in "Rahatsız Etmeyin erişimi" ayar ekranını açar.
  Future<bool> openPermissionSettings() => _open('openSettings');

  /// Uygulamanın Rahatsız Etmeyin kuralının (ya da Rahatsız Etmeyin'in)
  /// Android ayar ekranını açar.
  Future<bool> openRuleSettings() => _open('openRuleSettings');

  Future<bool> _open(String method) async {
    if (!_isAndroid) return false;
    try {
      return await _channel.invokeMethod<bool>(method) ?? false;
    } on PlatformException {
      return false;
    } on MissingPluginException {
      return false;
    }
  }

  Future<FocusStatus?> _call(String method, [Map<String, Object?>? args]) async {
    if (!_isAndroid) return const FocusStatus();
    try {
      final map = await _channel.invokeMapMethod<Object?, Object?>(method, args);
      return map == null ? null : FocusStatus.fromMap(map);
    } on PlatformException catch (e) {
      debugPrint('Odak modu ($method) hatası: ${e.code} ${e.message}');
      return null;
    } on MissingPluginException {
      return null;
    }
  }
}
