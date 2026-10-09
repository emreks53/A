/// Arama anahtarı üretimi.
///
/// Okuyucu kelimeyi telefonun klavyesiyle nasıl yazarsa yazsın (düzeltme
/// işaretli/işaretsiz, kesme işaretli/işaretsiz, büyük/küçük harf, Türkçe
/// klavyeli/klavyesiz) doğru maddeyi bulabilmek için hem kullanıcının yazdığı
/// metin hem de sözlükteki kelimeler aynı şekilde sadeleştirilir.
library;

/// Türkçe kurallara göre küçük harfe çevirmede özel durumlar.
const Map<String, String> _turkishLower = {'I': 'ı', 'İ': 'i'};

/// Düzeltme işaretli (ve okuyucunun başka kaynaklardan kopyalayabileceği
/// transkripsiyon işaretli) ünlüler sade hâllerine indirilir.
const Map<String, String> _plainVowels = {
  'â': 'a', 'î': 'i', 'û': 'u', 'ê': 'e', 'ô': 'o', //
  'á': 'a', 'à': 'a', 'ā': 'a', 'ä': 'a',
  'í': 'i', 'ì': 'i', 'ī': 'i', 'ï': 'i',
  'ú': 'u', 'ù': 'u', 'ū': 'u',
  'é': 'e', 'è': 'e', 'ē': 'e', 'ë': 'e',
  'ó': 'o', 'ò': 'o', 'ō': 'o',
};

/// Türkçeye özgü harflerin Türkçe klavyesi olmayanlar için karşılıkları.
const Map<String, String> _foldMap = {
  'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', //
};

/// Anahtarda hiç yer almayan karakterler: kesme/ayın/hemze işaretleri,
/// tireler, boşluklar ve noktalama.
const Set<int> _dropped = {
  0x27, 0x2019, 0x2018, 0x2BC, 0x2BB, 0x2BF, 0x2BE, 0x60, 0xB4, 0x201B, // kesme, ayın, hemze
  0x2D, 0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0xAD, // tireler
  0x20, 0xA0, 0x09, 0x0A, 0x0D, 0x200B, 0x200C, 0x200D, // boşluklar
  0x2E, 0x2C, 0x3B, 0x3A, 0x21, 0x3F, 0x28, 0x29, 0x5B, 0x5D, //
  0x22, 0xAB, 0xBB, 0x201C, 0x201D, 0x2F, 0x5C, 0x2026, 0x2A, //
};

/// Bileşik (combining) işaretler: ayrık yazılmış "s + ̧" gibi dizileri
/// birleştirir veya yok sayar.
const int _combCedilla = 0x0327;
const int _combBreve = 0x0306;
const int _combDiaeresis = 0x0308;
const int _combDotAbove = 0x0307;
const Set<int> _combIgnored = {0x0300, 0x0301, 0x0302, 0x0303, 0x0304};

/// Metni arama anahtarına çevirir.
///
/// * Türkçe kurallarıyla küçük harfe çevirir (I → ı, İ → i).
/// * â, î, û gibi işaretli ünlüleri sadeleştirir.
/// * Kesme işaretlerini, tireleri, boşlukları ve noktalamayı atar.
/// * [fold] `true` ise ç, ğ, ı, ö, ş, ü harflerini c, g, i, o, s, u yapar.
///
/// Örnek: `searchKey("Mana-yı Harfî")` → `"manayıharfi"`,
/// `searchKey("Mana-yı Harfî", fold: true)` → `"manayiharfi"`.
String searchKey(String input, {bool fold = false}) {
  final out = StringBuffer();
  String? pending;

  void flush() {
    final p = pending;
    if (p != null) {
      out.write(fold ? (_foldMap[p] ?? p) : p);
      pending = null;
    }
  }

  for (final rune in input.runes) {
    if (rune == _combCedilla) {
      if (pending == 'c') pending = 'ç';
      if (pending == 's') pending = 'ş';
      continue;
    }
    if (rune == _combBreve) {
      if (pending == 'g') pending = 'ğ';
      continue;
    }
    if (rune == _combDiaeresis) {
      if (pending == 'o') pending = 'ö';
      if (pending == 'u') pending = 'ü';
      continue;
    }
    if (rune == _combDotAbove) {
      // "I" + üst nokta, ayrık yazılmış "İ" demektir.
      if (pending == 'ı') pending = 'i';
      continue;
    }
    if (_combIgnored.contains(rune)) continue;

    flush();
    if (_dropped.contains(rune)) continue;
    pending = _keyChar[rune] ??= _keyCharOf(rune);
  }
  flush();
  return out.toString();
}

/// Bir karakterin anahtardaki karşılığı (Türkçe küçük harf, sade ünlü).
/// Lügat açılırken on binlerce kelime için çağrıldığından sonuçlar saklanır.
final Map<int, String> _keyChar = {};

String _keyCharOf(int rune) {
  final ch = String.fromCharCode(rune);
  final lower = _turkishLower[ch] ?? ch.toLowerCase();
  return _plainVowels[lower] ?? lower;
}

/// Daha önce [searchKey] ile üretilmiş (katlanmamış) bir anahtarı katlar.
String foldKey(String key) {
  List<int>? out;
  for (var i = 0; i < key.length; i++) {
    final c = key.codeUnitAt(i);
    final folded = switch (c) {
      0xE7 => 0x63, // ç → c
      0x11F => 0x67, // ğ → g
      0x131 => 0x69, // ı → i
      0xF6 => 0x6F, // ö → o
      0x15F => 0x73, // ş → s
      0xFC => 0x75, // ü → u
      _ => c,
    };
    if (folded != c) (out ??= key.codeUnits.toList())[i] = folded;
  }
  return out == null ? key : String.fromCharCodes(out);
}

/// Türk alfabesi sırası. Düzeltme işaretli ünlüler sade hâlleriyle aynı
/// yerde sıralanır (anahtarlarda zaten sadeleştirilmiş olurlar).
const String _alphabet = 'abcçdefgğhıijklmnoöprsştuüvyz';

final Map<int, int> _rank = {
  for (var i = 0; i < _alphabet.length; i++) _alphabet.codeUnitAt(i): i,
};

/// İki (katlanmamış) arama anahtarını Türk alfabesine göre karşılaştırır.
int compareTurkish(String a, String b) {
  final n = a.length < b.length ? a.length : b.length;
  for (var i = 0; i < n; i++) {
    final ca = a.codeUnitAt(i);
    final cb = b.codeUnitAt(i);
    if (ca == cb) continue;
    final ra = _rank[ca] ?? (100 + ca);
    final rb = _rank[cb] ?? (100 + cb);
    if (ra != rb) return ra - rb;
  }
  return a.length - b.length;
}

/// Bileşik bir kelimenin (izafet terkibi vb.) parçaları:
/// "mana-yı harfî" → ["mana", "yı", "harfî"].
List<String> wordParts(String word) {
  final parts = <String>[];
  var start = -1;
  for (var i = 0; i <= word.length; i++) {
    final separator = i == word.length || _isPartSeparator(word.codeUnitAt(i));
    if (separator) {
      if (start >= 0) parts.add(word.substring(start, i));
      start = -1;
    } else if (start < 0) {
      start = i;
    }
  }
  return List.unmodifiable(parts);
}

/// Boşluk (RegExp'teki \s ile aynı karakterler) ya da tire.
bool _isPartSeparator(int c) =>
    c == 0x20 ||
    (c >= 0x09 && c <= 0x0D) ||
    c == 0xA0 ||
    c == 0x1680 ||
    (c >= 0x2000 && c <= 0x200A) ||
    c == 0x2028 ||
    c == 0x2029 ||
    c == 0x202F ||
    c == 0x205F ||
    c == 0x3000 ||
    c == 0xFEFF ||
    c == 0x2D ||
    c == 0x2010 ||
    c == 0x2011 ||
    c == 0x2013 ||
    c == 0x2014;
