import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'src/app_controller.dart';
import 'src/ui/app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Lora yazı tipinin lisansı (Ayarlar > Lisanslar).
  LicenseRegistry.addLicense(() async* {
    yield LicenseEntryWithLineBreaks(['Lora'], await rootBundle.loadString('assets/fonts/OFL.txt'));
  });
  final controller = AppController()..init();
  runApp(LugatApp(controller: controller));
}
