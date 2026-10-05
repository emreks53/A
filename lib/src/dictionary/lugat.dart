import 'dart:convert';
import 'dart:typed_data';

import 'normalize.dart';

/// Kökeni gösteren kısaltmaların açık hâlleri.
const Map<String, String> originLabels = {
  'Ar.': 'Arapça',
  'Fa.': 'Farsça',
  'Tr.': 'Türkçe',
  'Ar.-Fa.': 'Arapça-Farsça',
  'Fa.-Ar.': 'Farsça-Arapça',
  'Ar.-Tr.': 'Arapça-Türkçe',
  'Fa.-Tr.': 'Farsça-Türkçe',
  'Tr.-Ar.': 'Türkçe-Arapça',
  'Tr.-Fa.': 'Türkçe-Farsça',
  'Yun.': 'Yunanca',
  'Fr.': 'Fransızca',
  'İt.': 'İtalyanca',
  'Lat.': 'Latince',
  'İbr.': 'İbranice',
  'Sür.': 'Süryanice',
};

/// Sözlükteki tek bir madde.
class Entry {
  const Entry({
    required this.word,
    required this.meaning,
    this.origin = '',
    this.frequency = 1,
    this.variants = const [],
  });

  /// JSONL satırındaki kısa alan adlarından okur:
  /// `{"w": kelime, "m": mana, "o": köken, "f": sıklık (1-3), "v": [yazılışlar]}`.
  factory Entry.fromJson(Map<String, dynamic> json) {
    final variants = json['v'];
    return Entry(
      word: (json['w'] as String).trim(),
      meaning: (json['m'] as String).trim(),
      origin: (json['o'] as String?)?.trim() ?? '',
      frequency: (json['f'] is num ? (json['f'] as num).toInt() : 1).clamp(1, 3),
      variants: variants is List
          ? [for (final v in variants) if (v is String && v.trim().isNotEmpty) v.trim()]
          : const [],
    );
  }

  /// Risale-i Nur'daki yazılışıyla kelime (ör. "inkişaf", "mana-yı harfî").
  final String word;

  /// Günümüz Türkçesiyle manası.
  final String meaning;

  /// Köken kısaltması (ör. "Ar.", "Fa."); bilinmiyorsa boş.
  final String origin;

  /// Risale-i Nur'da karşılaşılma sıklığı: 3 çok sık, 2 sık, 1 seyrek.
  final int frequency;

  /// Başka baskılarda görülebilecek farklı yazılışlar.
  final List<String> variants;

  /// Kökenin okunur hâli (ör. "Arapça").
  String get originLabel => originLabels[origin] ?? origin;

  @override
  String toString() => 'Entry($word)';
}

/// Bir arama sonucunun nasıl eşleştiği.
enum MatchKind {
  /// Kelime, yazılan harflerle başlıyor.
  prefix,

  /// Birleşik bir ifadenin sonraki kelimelerinden biri yazılan harflerle
  /// başlıyor (ör. "harfi" → "mana-yı harfî").
  part,

  /// Yazılan kelime ekli olabilir; kökü olabilecek maddeler
  /// (ör. "inkişafına" → "inkişaf").
  stem,

  /// Yazım hatası olabilir; benzer maddeler (ör. "muhabet" → "muhabbet").
  fuzzy,
}

class SearchHit {
  const SearchHit(this.entry, this.kind);

  final Entry entry;
  final MatchKind kind;
}

/// Sıralı arama dizinindeki bir anahtar.
class _Key {
  const _Key(this.folded, this.exact, this.entry);

  /// Türkçe harfleri de sadeleştirilmiş anahtar (ör. "inkisaf").
  final String folded;

  /// Türkçe harfleri korunmuş anahtar (ör. "inkişaf").
  final String exact;

  /// [Lugat.entries] içindeki sıra numarası.
  final int entry;
}

/// Bellekteki sözlük ve önek (ilk harfler) araması için dizinler.
class Lugat {
  Lugat(List<Entry> entries) : entries = List.unmodifiable(entries) {
    _build();
  }

  /// JSON Lines biçimindeki sözlüğü okur. Bozuk satırlar atlanır ve
  /// [skippedLines] içinde sayılır.
  factory Lugat.parseJsonl(String text) {
    final entries = <Entry>[];
    var skipped = 0;
    for (final line in const LineSplitter().convert(text)) {
      final trimmed = line.trim();
      if (trimmed.isEmpty) continue;
      try {
        final decoded = jsonDecode(trimmed);
        final entry = Entry.fromJson(decoded as Map<String, dynamic>);
        if (entry.word.isEmpty || entry.meaning.isEmpty) {
          skipped++;
          continue;
        }
        entries.add(entry);
      } catch (_) {
        skipped++;
      }
    }
    return Lugat(entries).._skipped = skipped;
  }

  /// UTF-8 baytlardan okur (uygulama paketindeki dosya için).
  factory Lugat.fromBytes(Uint8List bytes) =>
      Lugat.parseJsonl(utf8.decode(bytes, allowMalformed: true));

  final List<Entry> entries;

  int _skipped = 0;

  /// Okunamadığı için atlanan satır sayısı.
  int get skippedLines => _skipped;

  final List<String> _exact = [];
  final List<String> _folded = [];
  final List<_Key> _keys = [];
  final List<_Key> _parts = [];
  final Map<String, int> _byWord = {};

  void _build() {
    for (var i = 0; i < entries.length; i++) {
      final e = entries[i];
      final exact = searchKey(e.word);
      final folded = foldKey(exact);
      _exact.add(exact);
      _folded.add(folded);
      _byWord.putIfAbsent(e.word, () => i);
      if (folded.isNotEmpty) _keys.add(_Key(folded, exact, i));
      for (final v in e.variants) {
        final ve = searchKey(v);
        final vf = foldKey(ve);
        if (vf.isNotEmpty && vf != folded) _keys.add(_Key(vf, ve, i));
      }
      final parts = wordParts(e.word);
      for (var j = 1; j < parts.length; j++) {
        final pe = searchKey(parts[j]);
        if (pe.length >= 3) _parts.add(_Key(foldKey(pe), pe, i));
      }
    }
    _keys.sort(_compareKeys);
    _parts.sort(_compareKeys);
  }

  static int _compareKeys(_Key a, _Key b) {
    final c = a.folded.compareTo(b.folded);
    return c != 0 ? c : a.entry - b.entry;
  }

  /// [list] içinde katlanmış anahtarı [key]'den küçük olmayan ilk konum.
  static int _lowerBound(List<_Key> list, String key) {
    var lo = 0;
    var hi = list.length;
    while (lo < hi) {
      final mid = (lo + hi) >> 1;
      if (list[mid].folded.compareTo(key) < 0) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }

  /// Kelimesi tam olarak [word] olan madde.
  Entry? byWord(String word) {
    final i = _byWord[word];
    return i == null ? null : entries[i];
  }

  /// Aynı harflerle yazılıp farklı okunan/anlamlanan maddeler
  /// (ör. "hâkim" için "hakîm").
  List<Entry> sameSpelling(Entry entry) {
    final i = _byWord[entry.word];
    if (i == null) return const [];
    final key = _folded[i];
    final result = <Entry>[];
    for (var k = _lowerBound(_keys, key); k < _keys.length && _keys[k].folded == key; k++) {
      final other = _keys[k].entry;
      if (other != i && !result.contains(entries[other])) result.add(entries[other]);
    }
    return result;
  }

  int _rankCompare(int a, int b, Map<int, int> tiers) {
    final t = tiers[a]! - tiers[b]!;
    if (t != 0) return t;
    final f = entries[b].frequency - entries[a].frequency;
    if (f != 0) return f;
    final l = _folded[a].length - _folded[b].length;
    if (l != 0) return l;
    final c = compareTurkish(_exact[a], _exact[b]);
    return c != 0 ? c : entries[a].word.compareTo(entries[b].word);
  }

  /// Kullanıcının yazdığı [query] için öneriler.
  ///
  /// * Yazılan harflerle başlayan kelimeler: tam eşleşme en üstte, sonra
  ///   kullanıcının Türkçe harflerini (ş, ç, ı...) birebir tutanlar, sonra
  ///   Risale-i Nur'da sık geçenler, sonra kısa olanlar.
  /// * Yazılan kelime ekli olabilir ("kudreti", "kalbinden"): sözlükte tam
  ///   karşılığı yoksa (ya da yalnızca "kalbî" gibi -î'li bir sıfat varsa)
  ///   kökü olabilecek kelimeler de önerilir. Kullanıcı kelimenin ortasında
  ///   değil de sonunda görünüyorsa ("kudreti" → "kudret") kökler öne alınır.
  /// * Birleşik ifadelerin içindeki kelimeyle eşleşenler ("harfi" →
  ///   "mana-yı harfî").
  /// * Hiçbir kelime yazılanla başlamıyorsa yazım hatasına karşı benzer
  ///   kelimeler; bir harf farkla tutan bir kelime ("kâinaat" → "kâinat")
  ///   kökten ("kâin") önce gelir.
  List<SearchHit> search(String query, {int limit = 60}) {
    final qe = searchKey(query);
    if (qe.isEmpty || limit <= 0) return const [];
    final qf = foldKey(qe);

    final tiers = <int, int>{};
    for (var i = _lowerBound(_keys, qf); i < _keys.length; i++) {
      final k = _keys[i];
      if (!k.folded.startsWith(qf)) break;
      final tier = k.exact == qe
          ? 0
          : k.folded == qf
              ? 1
              : k.exact.startsWith(qe)
                  ? 2
                  : 3;
      final prev = tiers[k.entry];
      if (prev == null || tier < prev) tiers[k.entry] = tier;
    }
    final prefixIds = tiers.keys.toList()..sort((a, b) => _rankCompare(a, b, tiers));

    final partIds = <int>[];
    if (qf.length >= 3) {
      final partTiers = <int, int>{};
      for (var i = _lowerBound(_parts, qf); i < _parts.length; i++) {
        final k = _parts[i];
        if (!k.folded.startsWith(qf)) break;
        if (tiers.containsKey(k.entry)) continue;
        final tier = k.exact.startsWith(qe) ? 0 : 1;
        final prev = partTiers[k.entry];
        if (prev == null || tier < prev) partTiers[k.entry] = tier;
      }
      partIds.addAll((partTiers.keys.toList()..sort((a, b) => _rankCompare(a, b, partTiers))).take(25));
    }

    // Yazılanın tamamıyla eşleşen kelimeler (şapka ve Türkçe harf farkı hariç).
    final whole = [for (final e in tiers.entries) if (e.value <= 1) e.key];
    final onlyAdjectives = whole.isNotEmpty && whole.every((id) => _endsWithLongVowel(entries[id].word));
    final stemIds = (whole.isEmpty || onlyAdjectives) ? _stems(qf).where((id) => !tiers.containsKey(id)).toList() : <int>[];

    final ordered = <SearchHit>[];
    void add(Iterable<int> ids, MatchKind kind) {
      for (final id in ids) {
        if (ordered.length >= limit) return;
        ordered.add(SearchHit(entries[id], kind));
      }
    }

    if (prefixIds.isNotEmpty || partIds.isNotEmpty) {
      // Kullanıcı bir kelimenin ortasındaysa ("rahme" → "rahmet") önce o kelimeler;
      // yazdığı kelime bitmiş ve ekli görünüyorsa ("kudreti") önce kökler.
      final midWord = prefixIds.any((id) => _folded[id].length <= qf.length + 2);
      final stemsFirst = stemIds.isNotEmpty && whole.isEmpty && !midWord;
      if (stemsFirst) add(stemIds, MatchKind.stem);
      add(prefixIds, MatchKind.prefix);
      if (!stemsFirst) add(stemIds, MatchKind.stem);
      add(partIds, MatchKind.part);
      return ordered;
    }

    // Hiçbir kelime yazılanla başlamıyor: kökler ve yazım hatası önerileri.
    final typos = _fuzzy(qf, maxDistance: stemIds.isEmpty ? null : 1)
        .where((id) => !stemIds.contains(id))
        .toList();
    final close = [for (final id in typos) if (_isOneEditAway(qf, _folded[id])) id];
    if (close.isNotEmpty) {
      add(close, MatchKind.fuzzy);
      add(typos.where((id) => !close.contains(id)), MatchKind.fuzzy);
      add(stemIds, MatchKind.stem);
    } else {
      add(stemIds, MatchKind.stem);
      add(typos, MatchKind.fuzzy);
    }
    return ordered;
  }

  /// "kalbî", "ulvî" gibi uzun ünlüyle biten (çoğunlukla -î sıfatları) kelimeler.
  static bool _endsWithLongVowel(String word) =>
      word.endsWith('î') || word.endsWith('û') || word.endsWith('â');

  /// "inkişafına", "kalbinden" gibi ekli yazılmış bir kelimenin içinden, en
  /// uzundan başlayarak sözlükte bulunan kökleri bulur (en fazla 8). Aynı
  /// uzunlukta sık geçen önce gelir; "kalbî" gibi -î'li sıfatlar asıl kökün
  /// ("kalb") arkasına alınır.
  List<int> _stems(String qf) {
    if (qf.length < 4) return const [];
    final seen = <int>{};
    final roots = <int>[];
    final adjectives = <int>[];
    for (var len = qf.length - 1; len >= 3 && roots.length + adjectives.length < 8; len--) {
      final prefix = qf.substring(0, len);
      final group = <int>[];
      for (var i = _lowerBound(_keys, prefix); i < _keys.length && _keys[i].folded == prefix; i++) {
        if (seen.add(_keys[i].entry)) group.add(_keys[i].entry);
      }
      group.sort((a, b) => entries[b].frequency - entries[a].frequency);
      for (final id in group) {
        (_endsWithLongVowel(entries[id].word) ? adjectives : roots).add(id);
      }
    }
    return [...roots, ...adjectives].take(8).toList();
  }

  /// Yazım hatalarına karşı: aynı harfle başlayan ve yazılana en fazla bir
  /// (uzun kelimelerde iki) harf farkıyla benzeyen kelimeler (en fazla 10).
  List<int> _fuzzy(String qf, {int? maxDistance}) {
    if (qf.length < 4) return const [];
    final max = maxDistance ?? (qf.length <= 5 ? 1 : 2);
    final first = qf.substring(0, 1);
    final distances = <int, int>{};
    for (var i = _lowerBound(_keys, first); i < _keys.length; i++) {
      final k = _keys[i];
      if (!k.folded.startsWith(first)) break;
      final d = _prefixDistance(qf, k.folded, max);
      if (d <= max) {
        final prev = distances[k.entry];
        if (prev == null || d < prev) distances[k.entry] = d;
      }
    }
    final ids = distances.keys.toList()..sort((a, b) => _rankCompare(a, b, distances));
    return ids.take(10).toList();
  }

  /// [a] ile [b] (bütün olarak) en fazla bir harf farklı mı?
  static bool _isOneEditAway(String a, String b) =>
      (a.length - b.length).abs() <= 1 && _prefixDistance(a, b, 1) <= 1 && _prefixDistance(b, a, 1) <= 1;

  /// [q] ile [key]'in herhangi bir öneki arasındaki en küçük düzenleme
  /// uzaklığı (ekleme, silme, değiştirme, yan yana iki harfin yer değişimi).
  /// [max]'ı aştığı anlaşılınca erken döner.
  static int _prefixDistance(String q, String key, int max) {
    final m = q.length;
    final n = key.length < m + max ? key.length : m + max;
    var prev2 = List<int>.filled(n + 1, 0);
    var prev = List<int>.generate(n + 1, (j) => j);
    var cur = List<int>.filled(n + 1, 0);
    for (var i = 1; i <= m; i++) {
      cur[0] = i;
      var rowMin = cur[0];
      for (var j = 1; j <= n; j++) {
        final cost = q.codeUnitAt(i - 1) == key.codeUnitAt(j - 1) ? 0 : 1;
        var v = prev[j] + 1;
        if (cur[j - 1] + 1 < v) v = cur[j - 1] + 1;
        if (prev[j - 1] + cost < v) v = prev[j - 1] + cost;
        if (i > 1 &&
            j > 1 &&
            q.codeUnitAt(i - 1) == key.codeUnitAt(j - 2) &&
            q.codeUnitAt(i - 2) == key.codeUnitAt(j - 1) &&
            prev2[j - 2] + 1 < v) {
          v = prev2[j - 2] + 1;
        }
        cur[j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      final t = prev2;
      prev2 = prev;
      prev = cur;
      cur = t;
    }
    var best = prev[0];
    for (var j = 1; j <= n; j++) {
      if (prev[j] < best) best = prev[j];
    }
    return best;
  }
}
