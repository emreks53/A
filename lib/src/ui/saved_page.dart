import 'package:flutter/material.dart';

import 'app.dart';
import 'entry_page.dart';
import 'widgets.dart';

/// Okuyucunun sonradan tekrar etmek için kaydettiği kelimeler.
class SavedPage extends StatelessWidget {
  const SavedPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = AppScope.of(context);
    final saved = controller.resolve(controller.favorites);
    final theme = Theme.of(context);

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
              children: [
                for (final entry in saved)
                  EntryTile(
                    entry: entry,
                    onTap: () => Navigator.of(context).push<bool>(
                      MaterialPageRoute(builder: (_) => EntryPage(entry: entry)),
                    ).then((newSearch) {
                      // "Yeni kelime" ile dönüldüyse doğrudan arama ekranına git.
                      if (newSearch == true && context.mounted) Navigator.of(context).pop();
                    }),
                    trailing: IconButton(
                      tooltip: 'Kaydedilenlerden çıkar',
                      icon: const Icon(Icons.bookmark_remove_outlined),
                      onPressed: () => controller.toggleFavorite(entry),
                    ),
                  ),
              ],
            ),
    );
  }
}
