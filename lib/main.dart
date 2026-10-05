import 'package:flutter/material.dart';

import 'src/app_controller.dart';
import 'src/ui/app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final controller = AppController()..init();
  runApp(LugatApp(controller: controller));
}
