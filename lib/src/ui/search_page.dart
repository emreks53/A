import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app_controller.dart';
import '../dictionary/lugat.dart';
import '../focus/focus_mode.dart';
import 'app.dart';
import 'entry_page.dart';
import 'saved_page.dart';
import 'settings_page.dart';
import 'theme.dart';
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

  ValueListenable<bool>? _gestureNotifier;
  VoidCallback? _gestureListener;

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
    final listener = _gestureListener;
    if (listener != null) _gestureNotifier?.removeListener(listener);
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
    final navigator = Navigator.of(context);
    if (navigator.userGestureInProgress) {
      // Kaydırarak geri dönülürken (iPhone'da kenardan kaydırma, Android'de
      // tahmini geri hareketi) bu sayfa hareket bitene kadar odak alamaz;
      // hareket bitince tekrar denenir.
      if (_gestureListener != null) return;
      final notifier = navigator.userGestureInProgressNotifier;
      void listener() {
        if (notifier.value) return;
        notifier.removeListener(listener);
        _gestureListener = null;
        _gestureNotifier = null;
        WidgetsBinding.instance.addPostFrameCallback((_) => _focusSearchIfVisible());
      }

      _gestureNotifier = notifier;
      _gestureListener = listener;
      notifier.addListener(listener);
      return;
    }
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

  void _open(Entry entry) {
    AppScope.read(context).recordLookup(entry);
    _openPage(EntryPage(entry: entry));
  }

  /// Bir sayfayı açar; dönünce hemen yeni kelime yazılabilsin diye arama
  /// kutusuna odaklanır. Sayfa "Yeni kelime" ile kapandıysa (`true`) kutu
  /// boşaltılır, geri tuşuyla kapandıysa yazı seçili kalır (yazmaya
  /// başlayınca yerine geçer).
  Future<void> _openPage(Widget page) async {
    final newSearch = await Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => page));
    if (!mounted) return;
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

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final lugat = controller.lugat;
    final hits = _currentHits(lugat);

    final theme = Theme.of(context);
    final onHeader = Colors.white;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Palette.logoEdge,
        foregroundColor: onHeader,
        flexibleSpace: DecoratedBox(
          decoration: BoxDecoration(gradient: Palette.header(theme.brightness)),
        ),
        titleSpacing: 16,
        title: Row(
          children: [
            LogoMark(size: 30, color: onHeader),
            const SizedBox(width: 12),
            // Dar ekranda kesilmesin diye gerekirse küçülür.
            Flexible(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  'Lügat-ı Risale-i Nur',
                  style: theme.textTheme.titleLarge?.copyWith(color: onHeader, letterSpacing: 0.2),
                ),
              ),
            ),
          ],
        ),
        actions: [
          _FocusIndicator(
            status: controller.focus,
            isAndroid: controller.isAndroid,
            onTap: () => _openPage(const SettingsPage()),
          ),
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
          const SizedBox(width: 4),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(72),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
            child: _SearchField(
              controller: _text,
              focusNode: _focusNode,
              onSubmitted: _onSubmitted,
              onClear: () {
                _text.clear();
                _focusNode.requestFocus();
              },
            ),
          ),
        ),
      ),
      body: Column(
        children: [
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
          // İlk bölümse başlığa gerek yok; köklerden sonra geliyorsa ayırt edilsin.
          MatchKind.prefix => children.isEmpty ? null : 'Bu harflerle başlayanlar',
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

  /// Arama kutusu boşken: odak modu uyarısı (gerekirse), son bakılanlar ya da
  /// kısa bir kullanım açıklaması.
  Widget _buildHome(AppController controller) {
    final theme = Theme.of(context);
    final focus = controller.focus;
    final notice = controller.isAndroid
        ? (focus.needsPermission && !controller.focusBannerDismissed
            ? _Notice(
                text: 'Okurken mesaj, bildirim ve aramalar dikkatinizi dağıtmasın diye '
                    '“Rahatsız Etmeyin” erişimi gerekiyor. Açılan listede '
                    '“Lügat-ı Risale-i Nur”u bulup izni açın.',
                dismissLabel: 'Şimdi değil',
                onDismiss: controller.dismissFocusBanner,
                actionLabel: 'İzin ver',
                onAction: controller.openFocusPermissionSettings,
              )
            : null)
        : (!controller.iosFocusTipDismissed
            ? _Notice(
                text: 'iPhone’da okurken bildirimleri susturmak için bir kereye mahsus '
                    'kısa bir Kestirmeler kurulumu gerekiyor.',
                dismissLabel: 'Tamam',
                onDismiss: controller.dismissIosFocusTip,
                actionLabel: 'Nasıl?',
                onAction: () => _openPage(const SettingsPage(showIosFocusHelp: true)),
              )
            : null);

    final recent = controller.resolve(controller.history);
    final count = controller.lugat?.entries.length;
    return ListView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: EdgeInsets.only(bottom: MediaQuery.paddingOf(context).bottom + 16),
      children: [
        ?notice,
        if (recent.isNotEmpty) ...[
          SectionHeader(
            'Son bakılanlar',
            action: TextButton(onPressed: controller.clearHistory, child: const Text('Temizle')),
          ),
          for (final entry in recent.take(30)) EntryTile(entry: entry, onTap: () => _open(entry)),
        ] else
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
            child: Column(
              children: [
                Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: Palette.header(theme.brightness),
                  ),
                  alignment: Alignment.center,
                  child: const LogoMark(size: 50, color: Colors.white),
                ),
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
                    'Lügatte ${formatCount(count)} kelime ve ifade var.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ],
            ),
          ),
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

/// Üst çubukta odak modunun durumunu gösteren simge; dokununca ayarlar açılır.
class _FocusIndicator extends StatelessWidget {
  const _FocusIndicator({required this.status, required this.isAndroid, required this.onTap});

  final FocusStatus status;
  final bool isAndroid;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    // Lacivert başlık bandında: uyarı açık kırmızı, açık mod altın.
    const warning = Color(0xFFFFB4AB);
    const active = Palette.goldLight;
    final (IconData icon, Color? color, String tip) = !status.supported
        ? (
            Icons.do_not_disturb_off_outlined,
            null,
            isAndroid ? 'Bu telefonda bildirimler uygulamadan gizlenemiyor' : 'Odak modu kurulumu',
          )
        : !status.enabled
            ? (Icons.notifications_none, null, 'Odak modu kapalı')
            : !status.permissionGranted
                ? (Icons.do_not_disturb_off_outlined, warning, 'Bildirimleri gizlemek için izin gerekiyor')
                : status.disabledInSystem
                    ? (Icons.do_not_disturb_off_outlined, warning, 'Odak modu Android ayarlarında kapatılmış')
                    : status.active
                        ? (Icons.do_not_disturb_on, active, 'Odak modu açık: bildirimler gizleniyor')
                        : (Icons.do_not_disturb_on_outlined, null, 'Odak modu ayarları');
    return IconButton(tooltip: tip, icon: Icon(icon, color: color), onPressed: onTap);
  }
}

/// Arama kutusu boşken listenin başında çıkan, klavyeyi ve önerileri
/// engellemeyen kısa uyarı.
class _Notice extends StatelessWidget {
  const _Notice({
    required this.text,
    required this.dismissLabel,
    required this.onDismiss,
    required this.actionLabel,
    required this.onAction,
  });

  final String text;
  final String dismissLabel;
  final VoidCallback onDismiss;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      color: theme.colorScheme.secondaryContainer,
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              text,
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSecondaryContainer),
            ),
            OverflowBar(
              alignment: MainAxisAlignment.end,
              children: [
                TextButton(onPressed: onDismiss, child: Text(dismissLabel)),
                TextButton(onPressed: onAction, child: Text(actionLabel)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Başlık bandındaki arama kutusu: beyaz zemin, lacivert yazı.
class _SearchField extends StatelessWidget {
  const _SearchField({
    required this.controller,
    required this.focusNode,
    required this.onSubmitted,
    required this.onClear,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onSubmitted;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final light = theme.brightness == Brightness.light;
    final fill = light ? Palette.card : Palette.nightHigh;
    final ink = light ? Palette.ink : Palette.nightInk;
    final muted = light ? Palette.inkMuted : Palette.nightMuted;
    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: BorderSide(color: light ? Colors.transparent : Palette.nightLine),
    );
    return TextField(
      key: const Key('arama-kutusu'),
      controller: controller,
      focusNode: focusNode,
      autofocus: true,
      autocorrect: false,
      keyboardType: TextInputType.text,
      textInputAction: TextInputAction.search,
      textCapitalization: TextCapitalization.none,
      onSubmitted: onSubmitted,
      cursorColor: light ? Palette.navy : Palette.sky,
      style: theme.textTheme.titleLarge?.copyWith(color: ink, fontWeight: FontWeight.w500),
      decoration: InputDecoration(
        hintText: 'Kelimeyi yazın… (ör. inkişaf)',
        hintStyle: theme.textTheme.titleMedium?.copyWith(color: muted, fontWeight: FontWeight.w400),
        prefixIcon: Icon(Icons.search, color: light ? Palette.navy : Palette.sky),
        suffixIcon: ListenableBuilder(
          listenable: controller,
          builder: (context, _) => controller.text.isEmpty
              ? const SizedBox.shrink()
              : IconButton(
                  tooltip: 'Temizle',
                  icon: Icon(Icons.close, color: muted),
                  onPressed: onClear,
                ),
        ),
        filled: true,
        fillColor: fill,
        border: border,
        enabledBorder: border,
        focusedBorder: border.copyWith(
          borderSide: BorderSide(color: light ? Palette.goldLight : Palette.goldLight.withValues(alpha: 0.7), width: 1.2),
        ),
        contentPadding: const EdgeInsets.symmetric(vertical: 14),
      ),
    );
  }
}
