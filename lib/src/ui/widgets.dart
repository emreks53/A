import 'package:flutter/material.dart';

import '../dictionary/lugat.dart';
import '../dictionary/meaning.dart';

/// Mana metni; asıl mana (her paragrafın ilk cümlesi) kalın yazılır:
/// "**Açılma.** Meydana çıkma. Yetişme." Paragraflar arasında kısa bir boşluk bırakılır.
TextSpan meaningSpan(String meaning, TextStyle? style, {Color? mainColor}) => TextSpan(
      style: style,
      children: [
        for (final part in splitMeaning(meaning)) ...[
          TextSpan(
            text: part.text,
            style: part.main ? TextStyle(fontWeight: FontWeight.w700, color: mainColor) : null,
          ),
          if (part.text.endsWith('\n')) const TextSpan(text: '\n', style: TextStyle(fontSize: 8, height: 1)),
        ],
      ],
    );

/// Logodaki kitap ve ışınlar; [color] ile boyanır.
class LogoMark extends StatelessWidget {
  const LogoMark({super.key, required this.size, this.color});

  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) => Image.asset(
        'assets/images/logo_isaret.png',
        width: size,
        height: size,
        color: color,
        excludeFromSemantics: true,
        filterQuality: FilterQuality.medium,
      );
}

/// Arama sonuçlarında ve listelerde bir madde: kelime ve manasının ilk iki
/// satırı (asıl mana kalın). Çoğu zaman bu önizleme okumaya dönmek
/// için yeterlidir.
class EntryTile extends StatelessWidget {
  const EntryTile({super.key, required this.entry, required this.onTap, this.trailing});

  final Entry entry;
  final VoidCallback onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return InkWell(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.7))),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 20),
        padding: const EdgeInsets.fromLTRB(0, 12, 0, 12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.word,
                    style: theme.textTheme.titleMedium?.copyWith(fontSize: 18, color: scheme.primary),
                  ),
                  const SizedBox(height: 3),
                  Text.rich(
                    meaningSpan(
                      entry.meaning.replaceAll('\n', ' '),
                      theme.textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant, height: 1.4),
                      mainColor: scheme.onSurface,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
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
      padding: EdgeInsets.fromLTRB(20, 18, 8, action == null ? 6 : 0),
      child: Row(
        children: [
          Expanded(
            child: Text(
              text,
              style: theme.textTheme.labelLarge?.copyWith(
                color: theme.colorScheme.tertiary,
                letterSpacing: 0.6,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ?action,
        ],
      ),
    );
  }
}
