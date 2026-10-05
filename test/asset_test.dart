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

  test('arama tek harfte bile hızlı', () {
    final watch = Stopwatch()..start();
    for (final q in ['a', 'm', 't', 'mu', 'te', 'in', 'kâ', 'xq', 'muhabet', 'tezahüratından']) {
      lugat.search(q);
    }
    expect(watch.elapsedMilliseconds, lessThan(1000));
  });
}
