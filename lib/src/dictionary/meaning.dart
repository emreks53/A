/// Mana metninde kalın yazılacak "asıl mana": her paragrafın ilk cümlesi.
///
/// "Açılma. Meydana çıkma. Yetişme." → **Açılma.** Meydana çıkma. Yetişme.
///
/// Baştaki "(Çoğulu: …)", "(Bak: …)" gibi açıklamalar, "Tıb:", "Mc:" gibi
/// alan etiketleri, "t.", "yun.", "İtl." gibi kısaltmalar ve "1." gibi madde
/// numaraları asıl manaya katılmaz. Cümle; parantez dışındaki nokta, ünlem,
/// soru işareti, noktalı virgül ya da "*" ile biter. "Hz." gibi
/// kısaltmalardaki nokta cümleyi bitirmez.
library;

/// Mana metninin bir parçası; [main] ise kalın yazılır.
class MeaningPart {
  const MeaningPart(this.text, {this.main = false});

  final String text;
  final bool main;

  @override
  bool operator ==(Object other) => other is MeaningPart && other.text == text && other.main == main;

  @override
  int get hashCode => Object.hash(text, main);

  @override
  String toString() => main ? '**$text**' : text;
}

/// [meaning]'i sırayla kalın ve normal parçalara ayırır. Parçalar
/// birleştirilince metnin kendisi çıkar (satır sonları dahil).
List<MeaningPart> splitMeaning(String meaning) {
  final parts = <MeaningPart>[];
  void add(String text, {bool main = false}) {
    if (text.isNotEmpty) parts.add(MeaningPart(text, main: main));
  }

  final paragraphs = meaning.split('\n');
  for (var k = 0; k < paragraphs.length; k++) {
    final p = paragraphs[k];
    final (start, end) = mainMeaningRange(p);
    add(p.substring(0, start));
    add(p.substring(start, end), main: true);
    add(p.substring(end) + (k < paragraphs.length - 1 ? '\n' : ''));
  }
  return parts;
}

/// Tek paragraflık [p] içinde asıl mananın başı ve sonu.
(int, int) mainMeaningRange(String p) {
  final n = p.length;
  var start = _skipPrefix(p);
  // Atlanan kısımdan sonra harf kalmıyorsa (ör. "(Risale-i Nur eserleri).") baştan başla.
  if (!_letter.hasMatch(p.substring(start))) start = 0;
  while (start < n && _isSpace(p[start])) {
    start++;
  }
  var depth = 0;
  for (var j = start; j < n; j++) {
    final c = p[j];
    if (c == '(' || c == '[') {
      depth++;
    } else if (c == ')' || c == ']') {
      if (depth > 0) depth--;
    } else if (depth == 0 && c == '*' && j > start) {
      var e = j;
      while (e > start && _isSpace(p[e - 1])) {
        e--;
      }
      return (start, e);
    } else if (depth == 0 && '.!?;'.contains(c) && (j + 1 == n || _isSpace(p[j + 1]))) {
      if (c == '.' && j + 1 < n && _isAbbreviation(p, start, j)) continue;
      return (start, j + 1);
    }
  }
  var e = n;
  while (e > start && _isSpace(p[e - 1])) {
    e--;
  }
  return (start, e);
}

/// Noktadan önceki kelime bir kısaltma mı ("Hz.", "Ar.", "a.", "2.")?
bool _isAbbreviation(String p, int start, int dot) {
  var k = dot;
  while (k > start && _isLetter(p[k - 1])) {
    k--;
  }
  final token = p.substring(k, dot).replaceAll('İ', 'i').replaceAll('I', 'ı').toLowerCase();
  if (token.isEmpty) return dot > start && _digit.hasMatch(p[dot - 1]);
  return token.length == 1 || _abbreviations.contains(token);
}

/// Asıl manadan önce gelen ve ona katılmayan kısımları atlar.
int _skipPrefix(String p) {
  final n = p.length;
  var i = 0;
  for (var round = 0; round < 8; round++) {
    while (i < n && _isSpace(p[i])) {
      i++;
    }
    if (i < n && (p[i] == '(' || p[i] == '[')) {
      var depth = 0;
      var j = i;
      for (; j < n; j++) {
        if (p[j] == '(' || p[j] == '[') {
          depth++;
        } else if (p[j] == ')' || p[j] == ']') {
          depth--;
          if (depth == 0) break;
        }
      }
      if (j >= n) break;
      i = j + 1;
      continue;
    }
    final m = _label.matchAsPrefix(p, i) ?? _languageAbbreviation(p, i) ?? _number.matchAsPrefix(p, i);
    if (m == null) break;
    i = m.end;
  }
  while (i < n && (_isSpace(p[i]) || '.,;:'.contains(p[i]))) {
    i++;
  }
  return i;
}

/// Noktasıyla yazılan ve cümleyi bitirmeyen kısaltmalar (küçük harfle).
const Set<String> _abbreviations = {
  'hz', 'yun', 'ar', 'fa', 'far', 'fars', 'fr', 'lat', 'ing', 'it', 'rum', 'vs', 'vb', 'bk', 'bkz', 'sh', //
  'no', 'dr', 'prof', 'st', 'mc', 'krş', 'ibr', 'sür', 'tr', 'müe', 'sf', 'ss', 'örn', 'alm', 'itl', 'fels', //
};

/// "Tıb: ", "Mc : " gibi alan etiketleri.
final RegExp _label = RegExp(r'[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]{2,6} ?: ');

/// "t. ", "yun. ", "İtl. " gibi dil ve alan kısaltmaları: küçük harfle yazılmış
/// her kısaltma ya da [_prefixAbbreviations] içindekiler ("Su. " değil).
Match? _languageAbbreviation(String p, int i) {
  final m = _abbreviationPrefix.matchAsPrefix(p, i);
  if (m == null) return null;
  final token = m.group(1)!;
  final lower = token.replaceAll('İ', 'i').replaceAll('I', 'ı').toLowerCase();
  return token == lower || _prefixAbbreviations.contains(lower) ? m : null;
}

final RegExp _abbreviationPrefix = RegExp(r'([A-Za-zÇĞİÖŞÜçğıöşü]{1,4})\. ');

/// Manadan önce gelebilen dil ve alan kısaltmaları ("Hz." değil; o ismin parçasıdır).
const Set<String> _prefixAbbreviations = {
  'yun', 'ar', 'fa', 'far', 'fars', 'fr', 'lat', 'ing', 'it', 'itl', 'rum', 'ibr', 'sür', 'tr', 'alm', 'fels', 'mc', //
};

/// "1. ", "1)", "2-" gibi madde numaraları.
final RegExp _number = RegExp(r'\d{1,2}[.)\-] ?');

final RegExp _letter = RegExp(r'\p{L}', unicode: true);
final RegExp _digit = RegExp(r'\d');
final RegExp _space = RegExp(r'\s');

bool _isLetter(String c) => _letter.hasMatch(c);
bool _isSpace(String c) => _space.hasMatch(c);
