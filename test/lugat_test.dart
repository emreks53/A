import 'package:flutter_test/flutter_test.dart';
import 'package:lugat_risale/src/dictionary/lugat.dart';

import 'support/sample_lugat.dart';

List<String> words(List<SearchHit> hits) => [for (final h in hits) h.entry.word];

void main() {
  late Lugat lugat;

  setUp(() => lugat = Lugat.parseJsonl(sampleJsonl));

  test('bozuk satırlar atlanır ve sayılır', () {
    expect(lugat.entries, hasLength(25));
    expect(lugat.skippedLines, 2);
  });

  test('"in" yazınca "in" ile başlayan kelimeler önerilir', () {
    final hits = lugat.search('in');
    expect(words(hits), containsAll(['inkişaf', 'inhisar', 'inderec', 'insaf', "in'am"]));
    expect(hits.every((h) => h.kind == MatchKind.prefix), isTrue);
    // Sık geçenler önce gelir.
    expect(words(hits).take(2), unorderedEquals(['inkişaf', 'inhisar']));
  });

  test('tam eşleşme en üstte', () {
    expect(words(lugat.search('ilm')).first, 'ilm');
    expect(words(lugat.search('inkişaf')), ['inkişaf', 'inkişafat']);
  });

  test('Türkçe harf ve şapka yazmadan da bulunur', () {
    expect(words(lugat.search('inkisaf')).first, 'inkişaf');
    expect(words(lugat.search('INKISAF')).first, 'inkişaf');
    expect(words(lugat.search('ilmi')).first, 'ilmî');
  });

  test('kesme işareti yazılmasa da bulunur', () {
    expect(words(lugat.search('inam')), ["in'am"]);
    expect(words(lugat.search("in'a")), ["in'am"]);
  });

  test('aynı yazılan farklı kelimelerin ikisi de gelir', () {
    expect(words(lugat.search('hakim')), unorderedEquals(['hâkim', 'hakîm']));
    expect(words(lugat.search('hakîm')), unorderedEquals(['hâkim', 'hakîm']));
  });

  test('farklı yazılış (v) ile de bulunur', () {
    expect(words(lugat.search('itikat')), ['itikad']);
  });

  test('bileşik ifadeler hem başından hem içindeki kelimeden bulunur', () {
    expect(words(lugat.search('manayı h')), ['mana-yı harfî']);
    final hits = lugat.search('harfi');
    expect(words(hits), ['mana-yı harfî']);
    expect(hits.single.kind, MatchKind.part);
  });

  test('ekli yazılan kelimenin kökü önerilir', () {
    final hits = lugat.search('inkişafına');
    expect(words(hits), ['inkişaf']);
    expect(hits.single.kind, MatchKind.stem);
    expect(words(lugat.search('tezahüratından')), ['tezahürat', 'tezahür']);
  });

  test('-î ile biten sıfatla aynı yazılan ekli kelimede kök de önerilir', () {
    expect(words(lugat.search('ilmi')), ['ilmî', 'ilm']);
    expect(words(lugat.search('kalbi')), ['kalbî', 'kalb']);
    // Ekli hâlde asıl kök, sıfattan önce gelir.
    expect(words(lugat.search('kalbin')), ['kalb', 'kalbî']);
    expect(words(lugat.search('kalbinden')), ['kalb', 'kalbî']);
  });

  test('izafetli yazılan kelimede kök, birleşik ifadelerden önce gelir', () {
    final hits = lugat.search('kudreti');
    expect(words(hits), ['kudret', 'kudret-i ezeliye']);
    expect(hits.map((h) => h.kind), [MatchKind.stem, MatchKind.prefix]);
  });

  test('kelimenin ortasındayken önce o kelimeyle başlayanlar gelir', () {
    final hits = lugat.search('rahme');
    expect(words(hits), ['rahmet', 'rahm']);
    expect(hits.map((h) => h.kind), [MatchKind.prefix, MatchKind.stem]);
  });

  test('uzun kelimedeki yazım hatası, kısa kelimeyi kök sanmaz', () {
    final hits = lugat.search('kâinaat');
    expect(words(hits), ['kâinat', 'kâin']);
    expect(hits.map((h) => h.kind), [MatchKind.fuzzy, MatchKind.stem]);
    expect(words(lugat.search('hakikad')), ['hakikat', 'hakik']);
    // Ekli kelimede kök, çoğul hâlinden önce gelir.
    expect(words(lugat.search('inkişafı')), ['inkişaf', 'inkişafat']);
  });

  test('küçük yazım hatalarında benzer kelime önerilir', () {
    final hits = lugat.search('muhabet');
    expect(words(hits), ['muhabbet']);
    expect(hits.single.kind, MatchKind.fuzzy);
    expect(words(lugat.search('mhuabbet')), ['muhabbet']); // yer değiştirmiş iki harf
    expect(words(lugat.search('mzzzbbet')), isEmpty); // üç harf farkı: öneri yok
  });

  test('boş ya da yalnız işaretlerden oluşan arama sonuç vermez', () {
    expect(lugat.search(''), isEmpty);
    expect(lugat.search("  '- "), isEmpty);
    expect(lugat.search('xyzq'), isEmpty);
  });

  test('sonuç sayısı sınırlanır', () {
    expect(lugat.search('i', limit: 3), hasLength(3));
  });

  test('sameSpelling aynı harflerle yazılan diğer maddeleri verir', () {
    final hakim = lugat.byWord('hâkim')!;
    expect(lugat.sameSpelling(hakim).map((e) => e.word), ['hakîm']);
    expect(lugat.sameSpelling(lugat.byWord('ilm')!), isEmpty);
  });

  test('"(Bak: …)" göndermeleri maddelere bağlanır', () {
    final l = Lugat.parseJsonl('''
{"w":"idlal","f":0,"m":"(İdlâl) Saptırmak."}
{"w":"ıdlal","f":0,"m":"(Bak: Idlal)"}
{"w":"zan","f":2,"m":"Sanma. (Bak: Zann) (Bak: yok, idlal)"}
{"w":"zann","f":0,"m":"Sanmak."}
''');
    List<String> refs(String w) => [for (final e in l.crossReferences(l.byWord(w)!)) e.word];
    expect(refs('ıdlal'), ['idlal']);
    expect(refs('zan'), ['zann', 'idlal']);
    expect(refs('idlal'), isEmpty);
  });

  test('Entry köken etiketini açar', () {
    expect(lugat.byWord('inkişaf')!.originLabel, 'Arapça');
  });
}
