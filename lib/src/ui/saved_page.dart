import 'package:flutter/material.dart';

import '../dictionary/lugat.dart';
import 'app.dart';
import 'entry_page.dart';
import 'widgets.dart';

/// Okuyucunun sonradan tekrar etmek için kaydettiği kelimeler.
///
/// Açılan bir kelimeden "Yeni kelime" ile dönülürse bu sayfa da `true` ile
/// kapanır; arama ekranı kutuyu boşaltıp klavyeyi açar.
class SavedPage extends StatelessWidget {
  const SavedPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final saved = controller.resolve(controller.favorites);
    final theme = Theme.of(context);

    Future<void> open(Entry entry) async {
      controller.recordLookup(entry);
      final newSearch = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => EntryPage(entry: entry)),
      );
      if (newSearch == true && context.mounted) Navigator.of(context).pop(true);
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Kaydedilenler')),
      body: saved.isEmpty
          ? Padding(
              padding: const EdgeInsets.all(32),
              child: Text(
                'Henüz kaydettiğiniz kelime yok.\n'
                'Bir kelimenin manasına bakarken sağ üstteki işarete dokunarak '
                'sonradan tekrar etmek için kaydedebilirsiniz.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyLarge,
              ),
            )
          : ListView(
              padding: EdgeInsets.only(bottom: MediaQuery.paddingOf(context).bottom + 16),
              children: [
                for (final entry in saved)
                  EntryTile(
                    entry: entry,
                    onTap: () => open(entry),
                    trailing: IconButton(
                      tooltip: 'Kaydedilenlerden çıkar',
                      icon: const Icon(Icons.bookmark_remove_outlined),
                      onPressed: () {
                        final previous = controller.favorites;
                        controller.toggleFavorite(entry);
                        ScaffoldMessenger.of(context)
                          ..hideCurrentSnackBar()
                          ..showSnackBar(SnackBar(
                            content: Text('“${entry.word}” kaydedilenlerden çıkarıldı'),
                            action: SnackBarAction(
                              label: 'Geri al',
                              onPressed: () => controller.restoreFavorites(previous),
                            ),
                          ));
                      },
                    ),
                  ),
              ],
            ),
    );
  }
}
