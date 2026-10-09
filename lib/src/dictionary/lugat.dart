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
      frequency: (json['f'] is num ? (json['f'] as num).toInt() : 1).clamp(0, 3),
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

  /// Risale-i Nur'da karşılaşılma sıklığı: 3 çok sık, 2 sık, 1 seyrek; 0 Risale-i
  /// Nur'a özgü listede olmayan, lügatın geri kalanından gelen kelime.
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
  factory Lugat.parseJsonl(String text) => Lugat.parseJsonlAll([text]);

  /// Birden çok JSON Lines metnini tek sözlükte birleştirir (ör. Risale-i
  /// Nur'a özgü liste ve lügatın geri kalanı).
  factory Lugat.parseJsonlAll(List<String> texts) {
    final entries = <Entry>[];
    var skipped = 0;
    for (final text in texts) {
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
    }
    return Lugat(entries).._skipped = skipped;
  }

  /// UTF-8 baytlardan okur (uygulama paketindeki dosyalar için).
  factory Lugat.fromBytes(Uint8List bytes, [List<Uint8List> more = const []]) => Lugat.parseJsonlAll([
        for (final b in [bytes, ...more]) utf8.decode(b, allowMalformed: true),
      ]);

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

  /// Mananın gösterdiği maddeler: "(Bak: Idlal)" → "idlal". Bulunamayan
  /// göndermeler atlanır; madde kendini göstermez.
  List<Entry> crossReferences(Entry entry) {
    final self = _byWord[entry.word];
    final result = <Entry>[];
    for (final m in _crossReference.allMatches(entry.meaning)) {
      for (final target in m.group(1)!.split(RegExp('[,;]'))) {
        final exact = searchKey(target);
        final folded = foldKey(exact);
        if (folded.length < 2) continue;
        // Aynı harflerle yazılanlardan önce birebir tutan, sonra sık geçen.
        int? best;
        var bestScore = -1;
        for (var i = _lowerBound(_keys, folded); i < _keys.length && _keys[i].folded == folded; i++) {
          final id = _keys[i].entry;
          if (id == self) continue;
          final score = (_keys[i].exact == exact ? 10 : 0) + entries[id].frequency;
          if (score > bestScore) {
            best = id;
            bestScore = score;
          }
        }
        if (best != null && !result.contains(entries[best])) result.add(entries[best]);
      }
    }
    return result;
  }

  static final RegExp _crossReference = RegExp(r'\(\s*Bak\s*:\s*([^()]+?)\s*\)', caseSensitive: false);

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
  /// * Yazılan kelime ekli olabilir ("kudreti", "hakikatin", "kalbinden",
  ///   "iman ediyor"): sözlükte tam karşılığı yoksa (ya da yalnızca "hayatî"
  ///   gibi -î'li bir sıfat varsa) kökü önerilir. Kökün kabul edilmesi için
  ///   kalan kısmın Türkçe ses kurallarına uyan bir ek dizisi olması gerekir
  ///   ("kudret" + "i", "dua" + "ya"; "din" + "ya" değil); böylece kelime
  ///   yazılırken kısa, ilgisiz kelimeler öne geçmez.
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
    final rareWhole = <int>{};
    final preciseRare = <int>{};
    for (var i = _lowerBound(_keys, qf); i < _keys.length; i++) {
      final k = _keys[i];
      if (!k.folded.startsWith(qf)) break;
      var tier = k.exact == qe
          ? 0
          : k.folded == qf
              ? 1
              : k.exact.startsWith(qe)
                  ? 2
                  : 3;
      // Lügatın Risale-i Nur'a özgü listesinde olmayan (f=0) nadir bir kelime,
      // yazılanla birebir aynı olsa da sık geçen kelimelerin önüne geçmez:
      // "cela" yazılırken "celâ" değil "celâl" önce gelir.
      if (tier <= 1 && entries[k.entry].frequency == 0) {
        // ş, ç, ğ, ı, ö, ü harfleriyle birebir yazılmışsa kullanıcı bu kelimeyi kastediyordur.
        if (tier == 0 && _hasTurkishLetter(qe)) preciseRare.add(k.entry);
        tier += 2;
        rareWhole.add(k.entry);
      }
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
    // Kesme işaretinden önceki kısım çoğu zaman kelimenin kendisidir ("cem'i"
    // → "cem'", "Hakk'ın" → "hak"); boşluk ya da tireden önceki kısım da bir
    // kelimedir ("iman ediyor", "kemal-i ci...").
    final text = query.trim();
    final apostrophe = text.indexOf(RegExp("['’]"));
    final marker = apostrophe > 0 ? searchKey(text.substring(0, apostrophe)).length : -1;
    final separator = text.indexOf(RegExp(r'[\s\-‐‑–—]'));
    final firstWord = separator > 0 ? searchKey(text.substring(0, separator)).length : -1;
    final stemsWanted = whole.isEmpty || onlyAdjectives;
    var stems = (stemsWanted || marker > 0)
        ? _stems(qe, qf).where((s) => !tiers.containsKey(s.entry)).toList()
        : const <_Stem>[];
    final suffixStart = {
      for (final s in stems)
        s: _suffixStart(qf, s.length, ayn: _endsWithAyn(entries[s.entry].word), longVowel: _hasLongVowel(entries[s.entry].word)),
    };
    final marked = _apostropheStems(qf, marker, stems, suffixStart);
    if (!stemsWanted) stems = const [];
    // Kalan kısmı bir ek dizisi olan kökler ("hakikat" + "in"), en uzunu önce.
    final suffixedStems = _rankSuffixed([
      for (final s in stems)
        if (suffixStart[s]! > 0 && (firstWord < 0 || s.length == firstWord || suffixStart[s] == firstWord)) s,
    ], suffixStart);
    final suffixed = [for (final s in suffixedStems) s.entry];
    // Kalanı ek dizisine yalnız benzeyen kökler: ekte yazım hatası ("aklna", "kudretie").
    final looseStems = [
      for (final s in stems)
        if (suffixStart[s]! < 0 && _isLooseChain(qf.substring(s.length), 0)) s,
    ];
    // Son harfi iki kez yazılmış kelime ("takdimm", "emaree", "mevzuu").
    final doubledLast = qf.length > 1 && qf[qf.length - 1] == qf[qf.length - 2]
        ? [for (final s in stems) if (s.length == qf.length - 1) s.entry]
        : const <int>[];

    final ordered = <SearchHit>[];
    final shown = <int>{};
    void add(Iterable<int> ids, MatchKind kind) {
      for (final id in ids) {
        if (ordered.length >= limit) return;
        if (shown.add(id)) ordered.add(SearchHit(entries[id], kind));
      }
    }

    if (prefixIds.isNotEmpty || partIds.isNotEmpty) {
      // Yazılanla başlayan yalnız nadir kelimeler varsa ekli bir kelime ya da
      // yazım hatası olabilir. Sırayla: ekli yazılmış sık bir kelimenin kökü
      // ("ruhun" → "ruh", "rühun" değil), Türkçe harfleriyle birebir yazılmış
      // nadir kelime ("rühun"), bir harf farkla tutan çok sık kelime ("dinya" →
      // "dünya"), birebir yazılan diğer nadir kelimeler, diğer düzeltmeler
      // ("mezure" → "mezkûre").
      if (qf.length >= 4 && !prefixIds.any(_common) && !partIds.any(_common)) {
        final fixes = [
          for (final id in _fuzzy(qf, maxDistance: 1))
            if (_common(id) && !tiers.containsKey(id) && _isOneEditAway(qf, _folded[id])) id,
        ];
        add([for (final s in suffixedStems) if (_common(s.entry)) s.entry], MatchKind.stem);
        add([for (final id in prefixIds) if (preciseRare.contains(id)) id], MatchKind.prefix);
        add(fixes.where((id) => entries[id].frequency >= 2), MatchKind.fuzzy);
        add([for (final id in prefixIds) if (rareWhole.contains(id)) id], MatchKind.prefix);
        add(fixes, MatchKind.fuzzy);
      }
      if (onlyAdjectives) {
        // "hayatı": önce "hayatî", hemen ardından kök "hayat", sonra diğerleri.
        // ("hakiki" için "hak" değil: kök, sıfattan yalnız son harfi eksik olmalı.)
        add(whole, MatchKind.prefix);
        add(marked, MatchKind.stem);
        add([for (final s in suffixedStems) if (suffixStart[s] == qf.length - 1 && _common(s.entry)) s.entry],
            MatchKind.stem);
        add(prefixIds, MatchKind.prefix);
        add(suffixed, MatchKind.stem);
      } else {
        add(whole, MatchKind.prefix);
        add(marked, MatchKind.stem);
        // Öne alınmaya aday kök: "kalbinden" için önce "kalb", sonra "kalbî". Nadir
        // kökler ("mele" yazılırken "mel") yazılanla başlayan kelimelerin önüne geçmez.
        final common = [for (final s in suffixedStems) if (_common(s.entry)) s];
        final roots = [for (final s in common) if (!_endsWithLongVowel(entries[s.entry].word)) s];
        final pool = roots.isNotEmpty ? roots : common;
        // Aynı yazılan kökler birlikte: "hâdisi" için "hadîs" ve "hâdis" (nadir
        // bir eşyazılışlı kelime değil).
        final best = [for (final s in pool) if (s.length == pool.first.length) s.entry];
        final stemFrequency = best.isEmpty ? 0 : entries[best.first].frequency;
        // Kullanıcı bir kelimenin ortasındaysa ("rahme" → "rahmet") ya da
        // yazılanla başlayan kelimeler kökten daha sık geçiyorsa ("bediü" →
        // "Bediüzzaman") önce o kelimeler; yazdığı kelime bitmiş ve ekli
        // görünüyorsa ("kudreti") önce kök.
        final midWord = prefixIds.any((id) =>
            !_isCompound(entries[id].word) &&
            _folded[id].length <= qf.length + 4 &&
            entries[id].frequency >= stemFrequency);
        final topPrefix = prefixIds.isEmpty ? 0 : entries[prefixIds.first].frequency;
        if (best.isNotEmpty && !midWord && stemFrequency >= topPrefix) add(best, MatchKind.stem);
        // Öne alınmayan kök de gözden kaybolmasın: ilk iki sonucun hemen
        // ardından. Ekinde yazım hatası olan ("kudretie") uzun bir kök de öyle.
        // Diğer kökler, yazılanla başlayan kelimelerden sonra.
        add(prefixIds.take(2), MatchKind.prefix);
        add(best, MatchKind.stem);
        if (best.isEmpty) {
          add([for (final s in looseStems) if (s.length >= 4 && qf.length - s.length <= 2) s.entry].take(1), MatchKind.stem);
        }
        add(prefixIds, MatchKind.prefix);
        add(suffixed, MatchKind.stem);
        add(doubledLast, MatchKind.stem);
      }
      add(partIds, MatchKind.part);
      return ordered;
    }

    // Hiçbir kelime yazılanla başlamıyor: kökler ve yazım hatası önerileri.
    final typos = _fuzzy(qf, maxDistance: stems.isEmpty ? null : 1)
        .where((id) => !stems.any((s) => s.entry == id))
        .toList();
    final close = [for (final id in typos) if (_isOneEditAway(qf, _folded[id])) id];
    final closeFrequency = close.fold(0, (m, id) => entries[id].frequency > m ? entries[id].frequency : m);
    // Kök, bir harf farkla tutan kelimenin ("rahmetn" için "rahmeti") önüne
    // ancak yazılanın çoğunu kapsıyorsa ya da ondan daha sık geçiyorsa geçer
    // ("aşkına": "aşk", "âşina"dan önce; "diniyle": "din", "diniye"den önce).
    // Kalan kısım yardımcı fiil ya da "-dır" ise kök her zaman önce gelir
    // ("arz etmek", "hastır").
    bool strong(_Stem s) {
      // Nadir bir kök, sık geçen ve bir harf farkla tutan kelimenin önüne geçmez
      // ("delali" için "delal" değil "delâil").
      if (!_common(s.entry) && (closeFrequency > 0 || suffixedStems.any((o) => _common(o.entry)))) return false;
      final tail = qf.substring(suffixStart[s]!);
      if (_isAuxiliaryPhrase(tail) || _copulas.contains(tail)) return true;
      final coverage = _reach(s, suffixedStems, suffixStart) / qf.length;
      final frequency = entries[s.entry].frequency;
      return coverage >= 0.6 ||
          (coverage >= 0.5 && frequency >= closeFrequency) ||
          (coverage >= 0.4 && frequency > closeFrequency);
    }

    // Ek dizisiyle bitmeyen kökler yalnızca yeterince uzunsa önerilir; başka
    // öneri yoksa hepsi ("ruhen" → "ruh").
    final minOther = (qf.length + 1) ~/ 2 < 4 ? 4 : (qf.length + 1) ~/ 2;
    add(marked, MatchKind.stem);
    add([for (final s in suffixedStems) if (strong(s)) s.entry], MatchKind.stem);
    // Önce sık geçen kelimeler; lügatın geri kalanından gelen nadir olanlar ardından.
    add(doubledLast.where(_common), MatchKind.stem);
    add(close.where(_common), MatchKind.fuzzy);
    add(suffixed.where(_common), MatchKind.stem);
    add(doubledLast, MatchKind.stem);
    add(close, MatchKind.fuzzy);
    add(suffixed, MatchKind.stem);
    add([for (final s in looseStems) s.entry], MatchKind.stem);
    add([for (final s in stems) if (s.length >= minOther) s.entry], MatchKind.stem);
    add(typos, MatchKind.fuzzy);
    if (ordered.isEmpty) add([for (final s in stems) s.entry], MatchKind.stem);
    return ordered;
  }

  /// Kesme işaretinden hemen önce biten ve ekini kesmeyle alan kökler: ayın
  /// ya da hemze ile biten kelimeler ("cem'i", "nev'ine" → "nevi" / "nev'"),
  /// ikizleşen kökler ("Hakk'ın" → "hak") ve özel isimler. Sık geçen önce.
  List<int> _apostropheStems(String qf, int marker, List<_Stem> stems, Map<_Stem, int> suffixStart) {
    if (marker < 3 || marker >= qf.length) return const [];
    final head = qf.substring(0, marker);
    final tail = qf.substring(marker);
    final afterAyn = _isAuxiliaryPhrase(tail) || _isSuffixChain(tail, "'", null, 0);
    final result = <int>[];
    for (final s in stems) {
      final e = entries[s.entry];
      final ayn = afterAyn && [e.word, ...e.variants].any((w) => _endsWithAyn(w) && foldKey(searchKey(w)) == head);
      final doubled = s.length == marker - 1 && suffixStart[s] == marker;
      final name = s.length == marker && suffixStart[s] == marker && e.word.toLowerCase() != e.word;
      if (ayn || doubled || name) result.add(s.entry);
    }
    return result..sort((a, b) => entries[b].frequency - entries[a].frequency);
  }

  /// "mana-yı harfî" gibi birden çok kelimeden oluşan ifadeler.
  static bool _isCompound(String word) => word.contains(' ') || word.contains('-');

  /// "cem'", "bedî'" gibi ayın ya da hemze ile biten kelimeler.
  static bool _endsWithAyn(String word) => word.endsWith("'") || word.endsWith('’');

  /// "kalbî", "ulvî" gibi -î ile biten (çoğunlukla nispet sıfatı) kelimeler.
  /// ("sadâ", "recâ" gibi uzun "â" ile bitenler sıfat değildir.)
  static bool _endsWithLongVowel(String word) => word.endsWith('î');

  static bool _hasTurkishLetter(String key) {
    for (var i = 0; i < key.length; i++) {
      if ('çğıöşü'.contains(key[i])) return true;
    }
    return false;
  }

  /// Kelime Risale-i Nur'a özgü listede mi (sıklığı 1-3)? Lügatın geri
  /// kalanından gelen nadir kelimelerin sıklığı 0'dır.
  bool _common(int id) => entries[id].frequency > 0;

  /// "hâk", "dâir" gibi uzun ünlü taşıyan kelimeler.
  static bool _hasLongVowel(String word) => word.contains('â') || word.contains('î') || word.contains('û');

  /// Ekli kökleri sıralar: yazılanın daha çoğunu karşılayan önce; kök ile
  /// ondan yapılmış -î sıfatı arasında daha sık geçen ("nefs" / "nefsî"), eşitse kök.
  List<_Stem> _rankSuffixed(List<_Stem> stems, Map<_Stem, int> suffixStart) {
    final reach = {for (final s in stems) s: _reach(s, stems, suffixStart)};
    final index = {for (var i = 0; i < stems.length; i++) stems[i]: i};
    int? adjectiveFirst(_Stem root, _Stem adjective) {
      if (_adjective(root, stems, suffixStart) != adjective) return null;
      return entries[adjective.entry].frequency > entries[root.entry].frequency ? -1 : 1;
    }

    return [...stems]..sort((a, b) {
        // Risale-i Nur'a özgü listedeki kökler, lügatın geri kalanındakilerden önce.
        if (_common(a.entry) != _common(b.entry)) return _common(a.entry) ? -1 : 1;
        final r = reach[b]! - reach[a]!;
        if (r != 0) return r;
        final ab = adjectiveFirst(b, a);
        if (ab != null) return ab;
        final ba = adjectiveFirst(a, b);
        if (ba != null) return -ba;
        return index[a]! - index[b]!;
      });
  }

  /// [root]'tan yapılmış ve yazılana aynı yerde tutan -î sıfatı ("nefs" →
  /// "nefsî", ikizleşen "his" → "hissî"), yoksa `null`.
  _Stem? _adjective(_Stem root, List<_Stem> suffixed, Map<_Stem, int> suffixStart) {
    if (_endsWithLongVowel(entries[root.entry].word)) return null;
    final length = suffixStart[root]! + 1;
    for (final a in suffixed) {
      if (a.length == length && _endsWithLongVowel(entries[a.entry].word)) return a;
    }
    return null;
  }

  /// Kökün yazılanın ne kadarını karşıladığı: ikizleşen ünsüz ("hakk-ın")
  /// köke sayılır; "nefsine" için "nefs" kökü, ondan yapılmış ve aynı yazılışta
  /// tutan "nefsî" sıfatı kadar uzun sayılır.
  int _reach(_Stem s, List<_Stem> suffixed, Map<_Stem, int> suffixStart) {
    final adjective = _adjective(s, suffixed, suffixStart);
    return adjective != null ? adjective.length : suffixStart[s]!;
  }

  static const String _vowels = 'aeiou';

  /// Sert ünsüzler (katlanmış: ç → c, ş → s); bunlardan sonra "-de" yerine "-te" gelir.
  static const String _hardConsonants = 'fstkchp';

  /// Türkçe ekler, katlanmış yazılışlarıyla (ı → i, ü → u, ç → c...).
  /// Ünsüzle biten kelimeye gelenler: "kalb-i", "kalb-in", "kalb-e".
  static const Set<String> _afterConsonant = {
    'i', 'u', 'a', 'e', 'in', 'un', 'im', 'um', 'imiz', 'umuz', 'iniz', 'unuz', //
  };

  /// Ünlüyle biten kelimeye gelenler: "dua-ya", "mana-sı", "esma-nın".
  static const Set<String> _afterVowel = {
    'yi', 'yu', 'ya', 'ye', 'si', 'su', 'ni', 'nu', 'na', 'ne', 'nin', 'nun', //
    'm', 'miz', 'muz', 'niz', 'nuz', 'yla', 'yle', 'nda', 'nde', 'ndan', 'nden', //
    'sin', 'sun', 'yken', 'yiz', 'yim', //
  };

  /// Sert ünsüzden sonra gelenler: "hikmet-te", "hikmet-ten", "hikmet-tir".
  static const Set<String> _afterHard = {'ta', 'te', 'tan', 'ten', 'tir', 'tur'};

  /// Her kelimeye gelebilenler: "nur-da", "nur-lar", "nur-ken".
  static const Set<String> _afterAny = {
    'da', 'de', 'dan', 'den', 'la', 'le', 'lar', 'ler', 'ki', 'dir', 'dur', //
    'ca', 'ce', 'li', 'lu', 'siz', 'suz', 'lik', 'luk', 'ken', //
  };

  /// Kendisinden sonra yalnız bir hâl eki ya da "-dır" gelebilen iyelik ekleri:
  /// "kudret-i-ne", "dua-sı-nı" ("dua-sı-ya" değil).
  static const Set<String> _possessives = {'i', 'u', 'si', 'su'};

  /// İyelik ekinden sonra gelebilenler.
  static const Set<String> _afterPossessive = {
    'ni', 'nu', 'na', 'ne', 'nin', 'nun', 'nda', 'nde', 'ndan', 'nden', 'yla', 'yle', 'dir', 'dur', //
  };

  /// Hâl ekleri: ardından başka hâl eki gelmez ("îma-nı-da" değil), yalnız "-dır".
  static const Set<String> _caseEndings = {
    'a', 'e', 'yi', 'yu', 'ya', 'ye', 'ni', 'nu', 'na', 'ne', 'nin', 'nun', //
  };

  /// "-dır" eki: "has-tır", "kâr-dır".
  static const Set<String> _copulas = {'dir', 'dur', 'tir', 'tur'};

  /// Bütün ekler, ses uyumuna bakmadan ([_isLooseChain] için).
  static final Set<String> _anySuffix = {..._afterConsonant, ..._afterVowel, ..._afterHard, ..._afterAny};

  /// "et-" ve "ol-" yardımcı fiilleri: "iman ediyor", "dua eder", "sebep olan".
  /// Kökten sonra gelir; ardından başka ekler alabilir ("iman edenler").
  static const Set<String> _auxiliaryVerbs = {
    'eder', 'ederek', 'eden', 'edip', 'ediyor', 'edilir', 'edilen', 'edilmis', //
    'ederiz', 'ederim', 'etmek', 'etmis', 'etti', 'ettigi', 'etmez', 'etse', 'ettiren', 'eyler', //
    'olan', 'olmak', 'olmus', 'olur', 'olup', 'oldu', 'olarak', 'olunur', 'olunan', 'oluyor', //
    'olsa', 'olsun', 'olmaz', //
  };

  /// [rest] bir yardımcı fiille, ardından gelebilecek eklerle mi oluşuyor?
  /// ("ediyor", "edenler", "etmiştir", "olanların")
  static bool _isAuxiliaryPhrase(String rest) {
    for (final verb in _auxiliaryVerbs) {
      if (!rest.startsWith(verb)) continue;
      if (rest.length == verb.length || _isSuffixChain(rest.substring(verb.length), verb[verb.length - 1], null, 0)) {
        return true;
      }
    }
    return false;
  }

  /// [qf]'nin ilk [length] harfi bir kökse, kalan kısım bu köke gelebilecek
  /// bir ek dizisi mi? Öyleyse ek dizisinin başladığı yer, değilse -1.
  /// ("kudreti" = "kudret" + "i"; "kâinaat" = "kâin" + "aat" değil.)
  ///
  /// * Ayın/hemze ile biten kelime ([ayn]: "cem'", "bedî'") ünsüzle biter gibi
  ///   ek alır: "cem'-i". Sonundaki ayın yazılmamış kelimeler de öyle:
  ///   "vuku-u", "mevki-i", "menba-ı".
  /// * Arapça kökenli üç harfli kelimelerde ünlüyle başlayan ekten önce son
  ///   ünsüz ikizleşir: "hak" → "hakk-ın", "his" → "hiss-in", "zan" →
  ///   "zann-ediyor" (uzun ünlülü [longVowel] kelimelerde değil: "hâk").
  static int _suffixStart(String qf, int length, {bool ayn = false, bool longVowel = false}) {
    final rest = qf.substring(length);
    final last = ayn ? "'" : qf[length - 1];
    if (_isAuxiliaryPhrase(rest) || _isSuffixChain(rest, last, null, 0)) return length;
    if (length >= 4 && _vowels.contains(last) && _vowels.contains(rest[0]) && _isSuffixChain(rest, "'", null, 0)) {
      return length;
    }
    final doubles = length == 3 && !ayn && !longVowel && !_vowels.contains(last) && _vowels.contains(qf[1]);
    if (!doubles || rest.length < 2 || rest[0] != last || !_vowels.contains(rest[1])) return -1;
    final afterDouble = rest.substring(1);
    return _isAuxiliaryPhrase(afterDouble) || _isSuffixChain(afterDouble, last, null, 0) ? length + 1 : -1;
  }

  /// [rest], [before] harfinden sonra en fazla dört ekin art arda
  /// gelmesinden mi oluşuyor? Ünlü/ünsüz uyumuna bakılır ("kalb-in",
  /// "dua-nın"; "din-ya" değil); iyelik ekinden sonra yalnız hâl eki, hâl
  /// ekinden sonra yalnız "-dır" gelir ("kudret-i-ne"; "insan-i-et",
  /// "îma-nı-da" değil).
  static bool _isSuffixChain(String rest, String before, String? previous, int count) {
    if (rest.isEmpty) return count > 0;
    if (count >= 4) return false;
    final afterVowel = _vowels.contains(before);
    for (var len = rest.length < 5 ? rest.length : 5; len >= 1; len--) {
      final m = rest.substring(0, len);
      if (m == previous) continue;
      final fits = afterVowel
          ? _afterVowel.contains(m) || _afterAny.contains(m)
          : _afterConsonant.contains(m) ||
              _afterAny.contains(m) ||
              (_afterHard.contains(m) && _hardConsonants.contains(before));
      if (!fits) continue;
      if (_possessives.contains(previous) && !_afterPossessive.contains(m)) continue;
      if (_caseEndings.contains(previous) && !_copulas.contains(m)) continue;
      if (_isSuffixChain(rest.substring(len), m[len - 1], m, count + 1)) return true;
    }
    return false;
  }

  /// [rest], ses uyumuna bakılmadan en fazla dört ekten oluşuyor mu?
  static bool _isLooseChain(String rest, int count) {
    if (rest.isEmpty) return count > 0;
    if (count >= 4) return false;
    for (var len = rest.length < 5 ? rest.length : 5; len >= 1; len--) {
      if (_anySuffix.contains(rest.substring(0, len)) && _isLooseChain(rest.substring(len), count + 1)) return true;
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
    final rare = <_Stem>[];
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
        final list = !_common(k.entry)
            ? rare
            : _endsWithLongVowel(entries[k.entry].word)
                ? adjectives
                : roots;
        list.add(_Stem(k.entry, len));
      }
    }
    return [...roots, ...adjectives, ...rare.take(4)];
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
