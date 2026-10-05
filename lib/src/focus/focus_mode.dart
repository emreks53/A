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
  });

  /// Bu cihazda uygulama bildirimleri kendisi engelleyebilir mi?
  /// (Android: evet. iPhone: hayır, Apple buna izin vermiyor.)
  final bool supported;

  /// Kullanıcı ayarı. Varsayılan: açık.
  final bool enabled;

  /// Android'de "Rahatsız Etmeyin erişimi" verilmiş mi?
  final bool permissionGranted;

  /// Şu anda bildirimler uygulama tarafından gizleniyor mu?
  final bool active;

  /// Ayar açık ama izin olmadığı için çalışamıyor.
  bool get needsPermission => supported && enabled && !permissionGranted;

  FocusStatus copyWith({bool? enabled}) => FocusStatus(
        supported: supported,
        enabled: enabled ?? this.enabled,
        permissionGranted: permissionGranted,
        active: active,
      );

  factory FocusStatus.fromMap(Map<Object?, Object?> map) => FocusStatus(
        supported: map['supported'] == true,
        enabled: map['enabled'] != false,
        permissionGranted: map['granted'] == true,
        active: map['active'] == true,
      );

  @override
  bool operator ==(Object other) =>
      other is FocusStatus &&
      other.supported == supported &&
      other.enabled == enabled &&
      other.permissionGranted == permissionGranted &&
      other.active == active;

  @override
  int get hashCode => Object.hash(supported, enabled, permissionGranted, active);
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
        _isAndroid = isAndroid ?? (!kIsWeb && Platform.isAndroid);

  final MethodChannel _channel;
  final bool _isAndroid;

  bool get isAndroid => _isAndroid;

  /// Güncel durum. Android dışında her zaman "desteklenmiyor" döner;
  /// yerel taraftan cevap alınamazsa `null` döner.
  Future<FocusStatus?> status() => _call('status');

  /// Ayarı kaydeder ve uygulama ekrandaysa hemen uygular.
  Future<FocusStatus?> setEnabled(bool enabled) => _call('setEnabled', {'enabled': enabled});

  /// Android'in "Rahatsız Etmeyin erişimi" ayar ekranını açar.
  Future<bool> openPermissionSettings() async {
    if (!_isAndroid) return false;
    try {
      return await _channel.invokeMethod<bool>('openSettings') ?? false;
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
