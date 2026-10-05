import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app_controller.dart';
import '../dictionary/lugat.dart';
import '../focus/focus_mode.dart';
import 'app.dart';
import 'entry_page.dart';
import 'saved_page.dart';
import 'settings_page.dart';
import 'widgets.dart';

/// Ana ekran: açılır açılmaz klavye açık gelir, yazdıkça öneriler çıkar.
class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final _text = TextEditingController();
  final _focusNode = FocusNode(debugLabel: 'arama');
  late final AppLifecycleListener _lifecycle;

  String _lastQuery = '';
  Lugat? _lastLugat;
  List<SearchHit> _hits = const [];

  @override
  void initState() {
    super.initState();
    _text.addListener(_onTextChanged);
    _lifecycle = AppLifecycleListener(onResume: _focusSearchIfVisible);
    WidgetsBinding.instance.addPostFrameCallback((_) => _focusSearchIfVisible());
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    _text.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    if (_text.text != _lastQuery) setState(() {});
  }

  /// Uygulama açıldığında veya geri gelindiğinde, ekranda başka sayfa
  /// yoksa arama kutusuna odaklanıp klavyeyi açar.
  void _focusSearchIfVisible() {
    if (!mounted || !(ModalRoute.of(context)?.isCurrent ?? true)) return;
    if (_focusNode.hasFocus) {
      // Kutu odakta ama klavye (ör. Android geri tuşuyla) gizlenmiş olabilir.
      SystemChannels.textInput.invokeMethod<void>('TextInput.show');
    } else {
      _focusNode.requestFocus();
    }
  }

  List<SearchHit> _currentHits(Lugat? lugat) {
    if (_text.text != _lastQuery || !identical(lugat, _lastLugat)) {
      _lastQuery = _text.text;
      _lastLugat = lugat;
      _hits = lugat == null ? const [] : lugat.search(_lastQuery);
    }
    return _hits;
  }

  Future<void> _open(Entry entry) async {
    final controller = AppScope.read(context);
    controller.recordLookup(entry);
    final newSearch = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => EntryPage(entry: entry)),
    );
    if (!mounted) return;
    // Geri dönünce hemen yeni kelime yazılabilsin: "Yeni kelime" ile
    // dönüldüyse kutu boşaltılır, geri tuşuyla dönüldüyse yazı seçili
    // kalır (yazmaya başlayınca yerine geçer).
    if (newSearch == true) {
      _text.clear();
    } else {
      _text.selection = TextSelection(baseOffset: 0, extentOffset: _text.text.length);
    }
    _focusSearchIfVisible();
  }

  void _onSubmitted(String _) {
    final hits = _currentHits(AppScope.read(context).lugat);
    if (hits.isNotEmpty) {
      _open(hits.first.entry);
    } else {
      _focusNode.requestFocus();
    }
  }

  Future<void> _openPage(Widget page) async {
    await Navigator.of(context).push<void>(MaterialPageRoute(builder: (_) => page));
    if (mounted) _focusSearchIfVisible();
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final lugat = controller.lugat;
    final hits = _currentHits(lugat);
    final showBanner = controller.focus.needsPermission && !controller.focusBannerDismissed;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lügat-ı Risale-i Nur'),
        actions: [
          _FocusIndicator(status: controller.focus, onTap: () => _openPage(const SettingsPage())),
          IconButton(
            tooltip: 'Kaydedilenler',
            icon: const Icon(Icons.bookmarks_outlined),
            onPressed: () => _openPage(const SavedPage()),
          ),
          IconButton(
            tooltip: 'Ayarlar',
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => _openPage(const SettingsPage()),
          ),
        ],
      ),
      body: Column(
        children: [
          if (showBanner) _PermissionBanner(controller: controller),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: TextField(
              key: const Key('arama-kutusu'),
              controller: _text,
              focusNode: _focusNode,
              autofocus: true,
              autocorrect: false,
              enableSuggestions: false,
              keyboardType: TextInputType.text,
              textInputAction: TextInputAction.search,
              textCapitalization: TextCapitalization.none,
              onSubmitted: _onSubmitted,
              style: Theme.of(context).textTheme.titleLarge,
              decoration: InputDecoration(
                hintText: 'Kelimeyi yazın… (ör. inkişaf)',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _text.text.isEmpty
                    ? null
                    : IconButton(
                        tooltip: 'Temizle',
                        icon: const Icon(Icons.close),
                        onPressed: () {
                          _text.clear();
                          _focusNode.requestFocus();
                        },
                      ),
                filled: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(28),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          if (lugat == null && controller.loadError == null) const LinearProgressIndicator(minHeight: 2),
          Expanded(child: _buildBody(controller, lugat, hits)),
        ],
      ),
    );
  }

  Widget _buildBody(AppController controller, Lugat? lugat, List<SearchHit> hits) {
    final theme = Theme.of(context);
    if (controller.loadError != null) {
      return _Message(
        icon: Icons.error_outline,
        text: 'Lügat yüklenemedi. Uygulamayı kapatıp yeniden açmayı deneyin.\n(${controller.loadError})',
      );
    }
    if (_text.text.trim().isEmpty) return _buildHome(controller);
    if (lugat == null) return const _Message(icon: Icons.hourglass_empty, text: 'Lügat yükleniyor…');
    if (hits.isEmpty) {
      return _Message(
        icon: Icons.search_off,
        text: '“${_text.text.trim()}” bulunamadı.\n'
            'Kelimenin ilk birkaç harfini yazmayı deneyin.',
      );
    }

    final children = <Widget>[];
    MatchKind? lastKind;
    for (final hit in hits) {
      if (hit.kind != lastKind) {
        final header = switch (hit.kind) {
          MatchKind.prefix => null,
          MatchKind.part => 'Birleşik ifadelerde',
          MatchKind.stem => 'Yazdığınız kelimenin kökü olabilir',
          MatchKind.fuzzy => 'Bunu mu demek istediniz?',
        };
        if (header != null) children.add(SectionHeader(header));
        lastKind = hit.kind;
      }
      children.add(EntryTile(entry: hit.entry, onTap: () => _open(hit.entry)));
    }
    return Scrollbar(
      child: ListView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: EdgeInsets.only(bottom: MediaQuery.paddingOf(context).bottom + 16),
        children: [
          ...children,
          if (hits.length >= 60)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Daha fazla harf yazarak aramayı daraltabilirsiniz.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHome(AppController controller) {
    final theme = Theme.of(context);
    final recent = controller.resolve(controller.history);
    if (recent.isEmpty) {
      final count = controller.lugat?.entries.length;
      return ListView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
        children: [
          Icon(Icons.menu_book_outlined, size: 48, color: theme.colorScheme.primary),
          const SizedBox(height: 16),
          Text(
            'Okurken manasını merak ettiğiniz kelimenin ilk harflerini yazın; '
            'uyan kelimeler hemen aşağıda çıkar.',
            textAlign: TextAlign.center,
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 12),
          Text(
            'ş, ç, ğ, ı harflerini ve â, î, û gibi şapkaları yazmasanız da kelime bulunur. '
            'Ekli bir kelime yazarsanız (ör. “inkişafına”) kökü önerilir.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          if (count != null) ...[
            const SizedBox(height: 24),
            Text(
              'Lügatte $count kelime ve ifade var.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall,
            ),
          ],
        ],
      );
    }
    return ListView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      children: [
        SectionHeader(
          'Son bakılanlar',
          action: TextButton(onPressed: controller.clearHistory, child: const Text('Temizle')),
        ),
        for (final entry in recent.take(30)) EntryTile(entry: entry, onTap: () => _open(entry)),
      ],
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.all(32),
      children: [
        Icon(icon, size: 40, color: theme.colorScheme.outline),
        const SizedBox(height: 12),
        Text(text, textAlign: TextAlign.center, style: theme.textTheme.bodyLarge),
      ],
    );
  }
}

/// Üst çubukta odak modunun durumunu gösteren simge.
class _FocusIndicator extends StatelessWidget {
  const _FocusIndicator({required this.status, required this.onTap});

  final FocusStatus status;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (IconData icon, Color? color, String tip) = !status.supported
        ? (Icons.do_not_disturb_on_outlined, null, 'Bildirimleri gizleme')
        : !status.enabled
            ? (Icons.notifications_none, null, 'Bildirimler açık')
            : status.active
                ? (Icons.do_not_disturb_on, scheme.primary, 'Odak modu açık: bildirimler gizleniyor')
                : status.permissionGranted
                    ? (Icons.do_not_disturb_on_outlined, null, 'Odak modu')
                    : (Icons.do_not_disturb_off_outlined, scheme.error,
                        'Bildirimleri gizlemek için izin gerekiyor');
    return IconButton(tooltip: tip, icon: Icon(icon, color: color), onPressed: onTap);
  }
}

/// Android'de "Rahatsız Etmeyin erişimi" verilmemişse arama kutusunun
/// üstünde çıkan, klavyeyi engellemeyen uyarı.
class _PermissionBanner extends StatelessWidget {
  const _PermissionBanner({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      color: theme.colorScheme.secondaryContainer,
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Okurken bildirimler dikkatinizi dağıtmasın diye “Rahatsız Etmeyin” '
              'erişimi gerekiyor. Açılan listede “Lügat-ı Risale-i Nur”u bulup izni açın.',
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSecondaryContainer),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(onPressed: controller.dismissFocusBanner, child: const Text('Şimdi değil')),
                TextButton(
                  onPressed: controller.openFocusPermissionSettings,
                  child: const Text('İzin ver'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
