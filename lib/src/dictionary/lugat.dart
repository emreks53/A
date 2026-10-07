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

/// Ekli bir kelimenin içinde bulunan kök: madde ve eşleşen kısmın uzunluğu.
class _Stem {
  const _Stem(this.entry, this.length);

  final int entry;
  final int length;
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
  /// * Yazılan kelime ekli olabilir ("kudreti", "hakikatin", "kalbinden"):
  ///   sözlükte tam karşılığı yoksa (ya da yalnızca "hayatî" gibi -î'li bir
  ///   sıfat varsa) kökü önerilir. Kökün kabul edilmesi için kalan kısmın
  ///   gerçekten bir Türkçe ek dizisi olması gerekir ("kudret" + "i"); böylece
  ///   kelime yazılırken kısa, ilgisiz kelimeler ("tahak" → "Tâhâ") öne geçmez.
  /// * Birleşik ifadelerin içindeki kelimeyle eşleşenler ("harfi" →
  ///   "mana-yı harfî").
  /// * Hiçbir kelime yazılanla başlamıyorsa yazım hatasına karşı benzer
  ///   kelimeler; kalan kısım ek gibi görünmüyorsa ("kâin" + "aat") bir harf
  ///   farkla tutan kelime ("kâinat") kökten önce gelir.
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
    final whole = [for (final id in prefixIds) if (tiers[id]! <= 1) id];
    final onlyAdjectives = whole.isNotEmpty && whole.every((id) => _endsWithLongVowel(entries[id].word));
    final stems = (whole.isEmpty || onlyAdjectives)
        ? _stems(qe, qf).where((s) => !tiers.containsKey(s.entry)).toList()
        : const <_Stem>[];
    // Kalan kısmı bir ek dizisi olan kökler ("hakikat" + "in"); en uzun olanlar
    // ("imanı" için "iman", "îma" değil) öne alınmaya aday.
    final suffixedStems = [for (final s in stems) if (_isSuffixChain(qf.substring(s.length))) s];
    final suffixed = [for (final s in suffixedStems) s.entry];
    final longest = suffixedStems.isEmpty ? 0 : suffixedStems.map((s) => s.length).reduce((a, b) => a > b ? a : b);
    final bestStems = [for (final s in suffixedStems) if (s.length == longest) s.entry];

    final ordered = <SearchHit>[];
    final shown = <int>{};
    void add(Iterable<int> ids, MatchKind kind) {
      for (final id in ids) {
        if (ordered.length >= limit) return;
        if (shown.add(id)) ordered.add(SearchHit(entries[id], kind));
      }
    }

    if (prefixIds.isNotEmpty || partIds.isNotEmpty) {
      if (onlyAdjectives) {
        // "hayatı": önce "hayatî", hemen ardından kök "hayat", sonra diğerleri.
        add(whole, MatchKind.prefix);
        add(bestStems, MatchKind.stem);
        add(prefixIds, MatchKind.prefix);
        add(suffixed, MatchKind.stem);
      } else {
        // Kullanıcı bir kelimenin ortasındaysa ("rahme" → "rahmet") ya da yazılanla
        // başlayan kelimeler kökten daha sık geçiyorsa ("bediü" → "Bediüzzaman")
        // önce o kelimeler; yazdığı kelime bitmiş ve ekli görünüyorsa ("kudreti")
        // önce kök.
        final stemFrequency = bestStems.isEmpty ? 0 : entries[bestStems.first].frequency;
        final midWord = prefixIds.any((id) =>
            !_isCompound(entries[id].word) &&
            _folded[id].length <= qf.length + 4 &&
            entries[id].frequency >= stemFrequency);
        final topPrefix = prefixIds.isEmpty ? 0 : entries[prefixIds.first].frequency;
        final stemsFirst = bestStems.isNotEmpty && !midWord && stemFrequency >= topPrefix;
        if (stemsFirst) add(bestStems, MatchKind.stem);
        // Öne alınmayan kökler de gözden kaybolmasın: ilk iki sonucun hemen ardından.
        add(prefixIds.take(2), MatchKind.prefix);
        add(suffixed, MatchKind.stem);
        add(prefixIds, MatchKind.prefix);
      }
      add(partIds, MatchKind.part);
      return ordered;
    }

    // Hiçbir kelime yazılanla başlamıyor: kökler ve yazım hatası önerileri.
    // Ek dizisiyle bitmeyen kökler yalnızca yeterince uzunsa önerilir.
    final minOther = (qf.length + 1) ~/ 2 < 4 ? 4 : (qf.length + 1) ~/ 2;
    final otherStems = [
      for (final s in stems)
        if (!suffixed.contains(s.entry) && s.length >= minOther) s.entry,
    ];
    final typos = _fuzzy(qf, maxDistance: stems.isEmpty ? null : 1)
        .where((id) => !stems.any((s) => s.entry == id))
        .toList();
    final close = [for (final id in typos) if (_isOneEditAway(qf, _folded[id])) id];
    add(suffixed, MatchKind.stem);
    add(close, MatchKind.fuzzy);
    add(otherStems, MatchKind.stem);
    add(typos, MatchKind.fuzzy);
    return ordered;
  }

  /// "mana-yı harfî" gibi birden çok kelimeden oluşan ifadeler.
  static bool _isCompound(String word) => word.contains(' ') || word.contains('-');

  /// "kalbî", "ulvî" gibi uzun ünlüyle biten (çoğunlukla -î sıfatları) kelimeler.
  static bool _endsWithLongVowel(String word) =>
      word.endsWith('î') || word.endsWith('û') || word.endsWith('â');

  /// Sık görülen Türkçe ekler, katlanmış yazılışlarıyla (ı → i, ü → u, ç → c...).
  static const Set<String> _suffixMorphemes = {
    'i', 'u', 'a', 'e', 'yi', 'yu', 'ya', 'ye', 'si', 'su', 'ni', 'nu', 'na', 'ne', //
    'in', 'un', 'nin', 'nun', 'im', 'um', 'm', 'imiz', 'umuz', 'miz', 'muz', //
    'iniz', 'unuz', 'niz', 'nuz', 'da', 'de', 'ta', 'te', 'dan', 'den', 'tan', 'ten', //
    'nda', 'nde', 'ndan', 'nden', 'la', 'le', 'yla', 'yle', 'lar', 'ler', 'ki', //
    'dir', 'dur', 'tir', 'tur', 'ca', 'ce', 'li', 'lu', 'siz', 'suz', 'lik', 'luk', //
    'et', 'eden', 'etmek', 'etmis', 'etti', 'edil', 'edilen', 'edilmis', //
    'olan', 'olmak', 'olmus', 'olur', 'olup',
  };

  /// [rest], en fazla dört ekin art arda gelmesinden mi oluşuyor?
  /// ("inden" = "in" + "den", "lari" = "lar" + "i"; "aat" değil.)
  static bool _isSuffixChain(String rest, [int depth = 0]) {
    if (rest.isEmpty) return depth > 0;
    if (depth >= 4) return false;
    for (var len = rest.length < 7 ? rest.length : 7; len >= 1; len--) {
      if (_suffixMorphemes.contains(rest.substring(0, len)) && _isSuffixChain(rest.substring(len), depth + 1)) {
        return true;
      }
    }
    return false;
  }

  /// "inkişafına", "kalbinden" gibi ekli yazılmış bir kelimenin içinden, en
  /// uzundan başlayarak sözlükte bulunan kökleri bulur (en fazla 8). Aynı
  /// uzunlukta, kullanıcının yazdığı harfleri birebir tutan, sonra sık geçen
  /// önce gelir; "kalbî" gibi -î'li sıfatlar asıl kökün ("kalb") arkasına
  /// alınır. Kullanıcı ş, ç, ı gibi bir harfi bilerek yazdıysa o harfi
  /// taşımayan kök önerilmez ("şemai" için "sema" değil).
  List<_Stem> _stems(String qe, String qf) {
    if (qf.length < 4) return const [];
    final seen = <int>{};
    final roots = <_Stem>[];
    final adjectives = <_Stem>[];
    for (var len = qf.length - 1; len >= 3 && roots.length + adjectives.length < 8; len--) {
      final prefix = qf.substring(0, len);
      final typed = qe.substring(0, len);
      final group = <_Key>[];
      for (var i = _lowerBound(_keys, prefix); i < _keys.length && _keys[i].folded == prefix; i++) {
        final k = _keys[i];
        if (_respectsTypedLetters(typed, k.exact) && seen.add(k.entry)) group.add(k);
      }
      int rank(_Key k) => (k.exact == typed ? 0 : 10) - entries[k.entry].frequency;
      group.sort((a, b) => rank(a) - rank(b));
      for (final k in group) {
        (_endsWithLongVowel(entries[k.entry].word) ? adjectives : roots).add(_Stem(k.entry, len));
      }
    }
    return [...roots, ...adjectives].take(8).toList();
  }

  /// [typed] içinde kullanıcının bilerek yazdığı ş, ç, ğ, ı, ö, ü harfleri
  /// [exact]'ta da aynı mı? (Türkçe klavyesi olmayanın yazdığı sade harfler
  /// her zaman uyar.)
  static bool _respectsTypedLetters(String typed, String exact) {
    if (typed.length != exact.length) return true;
    for (var i = 0; i < typed.length; i++) {
      final t = typed[i];
      if ('çğıöşü'.contains(t) && exact[i] != t) return false;
    }
    return true;
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

  /// [a] ile [b] bütün olarak en fazla bir harf farklı mı (ekleme, silme,
  /// değiştirme ya da yan yana iki harfin yer değişimi)?
  static bool _isOneEditAway(String a, String b) {
    if ((a.length - b.length).abs() > 1) return false;
    var i = 0;
    while (i < a.length && i < b.length && a.codeUnitAt(i) == b.codeUnitAt(i)) {
      i++;
    }
    final ra = a.substring(i);
    final rb = b.substring(i);
    if (ra.isEmpty || rb.isEmpty) return (ra.length - rb.length).abs() <= 1; // sonda bir harf fazla/eksik
    if (ra.substring(1) == rb.substring(1)) return true; // değiştirme
    if (ra.substring(1) == rb || ra == rb.substring(1)) return true; // ekleme/silme
    return ra.length >= 2 &&
        rb.length >= 2 &&
        ra[0] == rb[1] &&
        ra[1] == rb[0] &&
        ra.substring(2) == rb.substring(2); // yer değişimi
  }

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
