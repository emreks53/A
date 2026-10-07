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
  });

  test('arama tek harfte bile hızlı', () {
    final watch = Stopwatch()..start();
    for (final q in ['a', 'm', 't', 'mu', 'te', 'in', 'kâ', 'xq', 'muhabet', 'tezahüratından']) {
      lugat.search(q);
    }
    expect(watch.elapsedMilliseconds, lessThan(1000));
  });
}
