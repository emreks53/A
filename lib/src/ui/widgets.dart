import 'package:flutter/material.dart';

import '../dictionary/lugat.dart';

/// Arama sonuçlarında ve listelerde bir madde: kelime, kökeni ve manasının
/// ilk iki satırı. Çoğu zaman bu önizleme okumaya dönmek için yeterlidir.
class EntryTile extends StatelessWidget {
  const EntryTile({super.key, required this.entry, required this.onTap, this.trailing});

  final Entry entry;
  final VoidCallback onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 12, 10),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text.rich(
                    TextSpan(children: [
                      TextSpan(
                        text: entry.word,
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      if (entry.origin.isNotEmpty)
                        TextSpan(
                          text: '  ${entry.origin}',
                          style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.primary),
                        ),
                    ]),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    entry.meaning,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
            ?trailing,
          ],
        ),
      ),
    );
  }
}

/// Liste içinde küçük bölüm başlığı.
class SectionHeader extends StatelessWidget {
  const SectionHeader(this.text, {super.key, this.action});

  final String text;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 8, 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              text,
              style: theme.textTheme.labelLarge?.copyWith(color: theme.colorScheme.primary),
            ),
          ),
          ?action,
        ],
      ),
    );
  }
}
