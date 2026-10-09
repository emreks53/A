import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../dictionary/lugat.dart';
import 'app.dart';
import 'widgets.dart';

/// Bir kelimenin manası. Büyük ve rahat okunur yazı; altta tek dokunuşla
/// yeni aramaya dönme düğmesi.
///
/// Sayfa kapanırken `true` dönerse arama kutusu boşaltılır.
class EntryPage extends StatefulWidget {
  const EntryPage({super.key, required this.entry});

  final Entry entry;

  @override
  State<EntryPage> createState() => _EntryPageState();
}

class _EntryPageState extends State<EntryPage> {
  Entry get _entry => widget.entry;

  /// Gösterilen kelime yeni bir sayfada açılır; geri tuşu bu kelimeye döner.
  /// O sayfa "Yeni kelime" ile kapanırsa bu sayfa da kapanır.
  Future<void> _show(Entry other) async {
    AppScope.read(context).recordLookup(other);
    final newSearch = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => EntryPage(entry: other)),
    );
    if (newSearch == true && mounted) Navigator.of(context).pop(true);
  }

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: '${_entry.word}: ${_entry.meaning}'));
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(const SnackBar(content: Text('Kopyalandı')));
  }

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final theme = Theme.of(context);
    final entry = _entry;
    final favorite = controller.isFavorite(entry);
    final similar = controller.lugat?.sameSpelling(entry) ?? const <Entry>[];
    final references = controller.lugat?.crossReferences(entry) ?? const <Entry>[];

    return Scaffold(
      appBar: AppBar(
        actions: [
          IconButton(
            tooltip: favorite ? 'Kaydedilenlerden çıkar' : 'Kaydet',
            icon: Icon(favorite ? Icons.bookmark : Icons.bookmark_add_outlined),
            onPressed: () => controller.toggleFavorite(entry),
          ),
          IconButton(tooltip: 'Kopyala', icon: const Icon(Icons.copy_outlined), onPressed: _copy),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('yeni-kelime'),
        onPressed: () => Navigator.of(context).pop(true),
        icon: const Icon(Icons.keyboard_outlined),
        label: const Text('Yeni kelime'),
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(0, 8, 0, MediaQuery.paddingOf(context).bottom + 96),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SelectableText(
                  entry.word,
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.primary,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 14),
                // İnce altın çizgi: kelimeyi manasından ayırır.
                Container(width: 44, height: 2, color: theme.colorScheme.tertiary.withValues(alpha: 0.8)),
                const SizedBox(height: 18),
                SelectableText.rich(
                  meaningSpan(
                    entry.meaning,
                    theme.textTheme.bodyLarge?.copyWith(fontSize: 21, height: 1.6),
                  ),
                ),
              ],
            ),
          ),
          if (references.isNotEmpty) ...[
            const SizedBox(height: 16),
            const SectionHeader('Bakınız'),
            for (final other in references) EntryTile(entry: other, onTap: () => _show(other)),
          ],
          if (similar.isNotEmpty) ...[
            const SizedBox(height: 16),
            const SectionHeader('Benzer yazılan kelimeler'),
            for (final other in similar) EntryTile(entry: other, onTap: () => _show(other)),
          ],
        ],
      ),
    );
  }
}
