import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lugat_risale/src/dictionary/lugat.dart';
import 'package:lugat_risale/src/dictionary/normalize.dart';

/// Uygulamayla birlikte gelen gerçek lügat dosyasının denetimi.
void main() {
  late Lugat lugat;

  setUpAll(() {
    lugat = Lugat.fromBytes(File('assets/lugat.jsonl').readAsBytesSync());
  });

  List<String> words(String q) => [for (final h in lugat.search(q)) h.entry.word];

  test('bütün satırlar okunabiliyor', () {
    expect(lugat.skippedLines, 0);
    expect(lugat.entries.length, greaterThan(5000));
  });

  test('maddeler Türk alfabesine göre sıralı (tool/lugat_kontrol.py ile aynı sıra)', () {
    for (var i = 1; i < lugat.entries.length; i++) {
      final a = searchKey(lugat.entries[i - 1].word);
      final b = searchKey(lugat.entries[i].word);
      expect(compareTurkish(a, b), lessThanOrEqualTo(0), reason: '${lugat.entries[i - 1].word} > ${lugat.entries[i].word}');
    }
  });

  test('aynı kelime iki kez yok', () {
    final seen = <String>{};
    final dupes = [for (final e in lugat.entries) if (!seen.add(e.word)) e.word];
    expect(dupes, isEmpty);
  });

  test('her maddenin manası ve tanınan bir kökeni var', () {
    for (final e in lugat.entries) {
      expect(e.meaning.length, greaterThanOrEqualTo(3), reason: e.word);
      expect(e.origin.isEmpty || originLabels.containsKey(e.origin), isTrue, reason: '${e.word}: ${e.origin}');
      expect(searchKey(e.word), isNotEmpty, reason: e.word);
    }
  });

  test('"in" yazınca inkişaf ve inhisar önerilir', () {
    expect(words('in'), containsAll(['inkişaf', 'inhisar']));
  });

  test('Risale-i Nur\'un temel kavramları bulunuyor', () {
    for (final w in ['mana-yı harfî', 'ene', 'zerre', 'tecelli', 'rububiyet', 'ubudiyet', 'kâinat', 'haşir', 'tevhid', 'nübüvvet']) {
      expect(lugat.byWord(w), isNotNull, reason: w);
    }
  });

  test('ekli yazılan sık kelimelerde kök ilk sırada', () {
    const cases = {
      'hakikatin': 'hakikat',
      'hayata': 'hayat',
      'ruhun': 'ruh',
      'manası': 'mana',
      'dinin': 'din',
      'duaya': 'dua',
      'esması': 'esma',
      'kalbin': 'kalb',
      'kudreti': 'kudret',
      'rahmetinden': 'rahmet',
      'inkişafına': 'inkişaf',
      'âlemi': 'âlem',
    };
    cases.forEach((query, root) => expect(words(query).first, root, reason: query));
  });

  test('-î sıfatıyla aynı yazılan ekli kelimede kök hemen ikinci sırada', () {
    expect(words('hayatı').take(2), ['hayatî', 'hayat']);
    expect(words('insanı').take(2), ['insanî', 'insan']);
  });

  test('kelime yazılırken kısa ve ilgisiz kelimeler öne geçmez', () {
    const cases = {'tahak': 'tahakkuk', 'salt': 'saltanat', 'hürri': 'hürriyet', 'bediü': 'Bediüzzaman', 'ferdan': 'ferdaniyet'};
    cases.forEach((query, word) => expect(words(query).first, word, reason: query));
    expect(words('şemai').first, 'şemail', reason: 'ş bilerek yazıldı; "sema" kök sayılmaz');
  });

  test('uzun kelimedeki yazım hatasında doğru kelime önce gelir', () {
    expect(words('kâinaat').first, 'kâinat');
    expect(words('muhabet').first, 'muhabbet');
    // Kalan kısım gerçek bir ek değil: "rahm" + "te", "din" + "ya" kök sayılmaz.
    const cases = {
      'rahmte': 'rahmet',
      'adlet': 'adalet',
      'besmle': 'besmele',
      'insaniet': 'insaniyet',
      'dinya': 'dünya',
      'isalm': 'İslâm',
      'tabita': 'tabiat',
      'şerita': 'şeriat',
    };
    cases.forEach((query, word) => expect(words(query).first, word, reason: query));
  });

  test('ekli kelimede kök, ondan yapılmış -î sıfatından önce gelir', () {
    expect(words('nefsine').first, 'nefs');
    expect(words('ehline').first, 'ehl');
    expect(words('kalbinden').first, 'kalb');
  });

  test('"et-" ve "ol-" ile kurulan fiillerde kök bulunur', () {
    expect(words('iman ediyor').first, 'iman');
    expect(words('dua eder').first, 'dua');
    expect(words('zannediyor').first, 'zan');
    expect(words('tasdik ederek').first, 'tasdik');
    expect(words('sebep olan').first, 'sebeb');
    // Yardımcı fiil de ek alabilir.
    expect(words('iman edenler').first, 'iman');
    expect(words('helâk etmiştir').first, 'helâk');
    expect(words('kıyam etmiştir').first, 'kıyam');
    expect(words('semavî olanlar').first, 'semavî');
    expect(words('arz etmek').first, 'arz');
  });

  test('ekli kelimede hâl ekleri ve "-dır" doğru ayrılır', () {
    expect(words('imanıda').first, 'iman', reason: '"îma" + "nı" + "da" olamaz');
    expect(words('esmamı').first, 'esma');
    expect(words('duama').first, 'dua');
    expect(words('hastır').first, 'has');
    expect(words('kârdır').first, 'kâr');
    expect(words('hissine').take(2), ['his', 'hissî']);
    expect(words('kudreti ').first, 'kudret', reason: 'sondaki boşluk');
  });

  test('ikizleşen son ünsüz ve kesme işaretli yazılış', () {
    expect(words("Hakk'ın").first, 'hak');
    expect(words('hissin').first, 'his');
    expect(words("cem'i"), contains("cem'"));
    expect(words("nev'ine").first, 'nevi');
    // Kesmeden önceki kısım ayınlı bir kelime değilse öne alınmaz.
    expect(words("san'a").first, "san'at");
    expect(words("mir'a").take(2), containsAll(["mi'rac", "mir'at"]));
    expect(words('mevzuu').first, 'mevzu');
    expect(words('nurken'), ['nur']);
  });

  test('kelime yazılırken kısaltılmış kökler araya girmez', () {
    expect(words('mevcudiye').first, 'mevcudiyet');
    expect(words('kabiliye').first, 'kabiliyet');
    expect(words('hakiki'), isNot(contains('hak')));
    expect(words('medeni'), isNot(contains('medd')));
    expect(words('nevci').first, 'nevcivan');
    expect(words('alakka').first, 'alâka');
    expect(words('kemal-i ci'), ['kemal-i ciddiyet']);
  });

  test('arama tek harfte bile hızlı', () {
    final watch = Stopwatch()..start();
    for (final q in ['a', 'm', 't', 'mu', 'te', 'in', 'kâ', 'xq', 'muhabet', 'tezahüratından']) {
      lugat.search(q);
    }
    expect(watch.elapsedMilliseconds, lessThan(1000));
  });
}
