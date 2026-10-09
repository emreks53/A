import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lugat_risale/src/dictionary/lugat.dart';
import 'package:lugat_risale/src/dictionary/meaning.dart';
import 'package:lugat_risale/src/dictionary/normalize.dart';

/// Uygulamayla birlikte gelen gerçek lügat dosyalarının denetimi: Risale-i
/// Nur'a özgü liste (assets/lugat.jsonl) ve RNK lügatının geri kalanı
/// (assets/lugat_ek.jsonl), uygulamadaki gibi birlikte.
void main() {
  late Lugat core;
  late Lugat lugat;

  setUpAll(() {
    final coreBytes = File('assets/lugat.jsonl').readAsBytesSync();
    core = Lugat.fromBytes(coreBytes);
    lugat = Lugat.fromBytes(coreBytes, [File('assets/lugat_ek.jsonl').readAsBytesSync()]);
  });

  List<String> words(String q) => [for (final h in lugat.search(q)) h.entry.word];

  test('bütün satırlar okunabiliyor', () {
    expect(core.skippedLines, 0);
    expect(lugat.skippedLines, 0);
    expect(core.entries.length, greaterThan(10000));
    expect(lugat.entries.length, greaterThan(70000));
    // Risale-i Nur'da geçen kelimelerin sıklığı 1-3, lügatın geri kalanında 0.
    expect(core.entries.every((e) => e.frequency >= 1), isTrue);
    expect(lugat.entries.skip(core.entries.length).every((e) => e.frequency == 0), isTrue);
  });

  test('her dosyadaki maddeler Türk alfabesine göre sıralı (tool/lugat_kontrol.py ile aynı sıra)', () {
    for (final list in [core.entries, lugat.entries.skip(core.entries.length).toList()]) {
      for (var i = 1; i < list.length; i++) {
        final a = searchKey(list[i - 1].word);
        final b = searchKey(list[i].word);
        expect(compareTurkish(a, b), lessThanOrEqualTo(0), reason: '${list[i - 1].word} > ${list[i].word}');
      }
    }
  });

  test('aynı kelime iki kez yok (iki dosya birlikte)', () {
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

  test('manalar RNK lügatındaki metnin aynısı', () {
    expect(lugat.byWord('inkişaf')!.meaning, 'Açılma. Meydana çıkma. Yetişme. Terakki etme, ilerleme. Gizli sırların bilinmesi.');
    expect(lugat.byWord('kâinat')!.meaning, 'Var edilen şeylerin hepsi. Yaratılanlar. Mevcudat. Âlemler.');
  });

  test('her maddede kalın yazılacak bir asıl mana var', () {
    final letter = RegExp(r'\p{L}', unicode: true);
    for (final e in lugat.entries) {
      final main = splitMeaning(e.meaning).where((p) => p.main).map((p) => p.text).join();
      expect(letter.hasMatch(main), isTrue, reason: e.word);
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
      'isalm': 'İslâm',
      'tabita': 'tabiat',
      'şerita': 'şeriat',
    };
    cases.forEach((query, word) => expect(words(query).first, word, reason: query));
    // Yazılan, lügatta nadir bir kelimenin kendisiyse önce o, hemen ardından düzeltme.
    expect(words('dinya').take(2), ['dinya', 'dünya']);
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
    expect(words('nurken').first, 'nur');
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

  test('lügatın geri kalanındaki kelimeler de bulunur', () {
    expect(words('Yunus Emre').first, 'Yunus Emre');
    expect(words('bünyamin').first, 'Bünyamin');
    expect(lugat.byWord('alem')!.meaning, startsWith('Bayrak.'));
  });

  test('nadir kelimeler Risale-i Nur kelimelerinin önüne geçmez', () {
    // Yazarken: "cela" → önce "celâl", sonra nadir "celâ".
    final cela = words('cela');
    expect(cela.first, 'celâl');
    expect(cela.indexOf('celâ'), greaterThan(0));
    // Birebir yazılan nadir kelime de çıkar, ama ekli sık kelimenin kökü önce.
    expect(words('ruhun').first, 'ruh');
    expect(words('ruhun'), contains('rühun'));
    expect(words('rühun').first, 'rühun');
    expect(words('pad').first, 'padişah');
    // Ekli kelimede kök, aynı harflerle başlayan nadir kelimeden önce.
    expect(words('nazarın').first, 'nazar');
    expect(words('tafsilinde').first, 'tafsil');
    // Yalnız nadir kelimelerin başına denk gelen yazım hatası.
    expect(words('mezure'), contains('mezkûre'));
    expect(words('delali').first, 'delâil');
  });

  test('Risale-i Nur metninde sık geçen kelimeler birebir yazılınca ilk sırada', () {
    for (final w in ['Allah', 'şeytan', 'cennet', 'kitab', 'hayvan', 'kabul', 'vakit', 'isim']) {
      expect(words(w).first, w, reason: w);
    }
    // Sıklıkları Risale-i Nur metninden: lügatın geri kalanındaki nadir kelimelerin önünde.
    expect(lugat.byWord('cennet')!.frequency, greaterThan(0));
    expect(words('sabır').first, 'sabır');
  });

  test('lügatın geri kalanındaki kelime birebir yazılınca düzeltmelerin önünde', () {
    expect(words('sahil').first, 'sahil');
    expect(words('eyvah').first, 'eyvah');
  });

  test('yazılan ekli kelime sözlükte de olsa kökü gösterilir', () {
    expect(words('kazaya'), contains('kaza'));
    expect(words('âlemin').take(3), contains('âlem'));
    expect(words('haşirin').take(3), contains('haşir'));
  });

  test('ünlüsü düşen yazılış ve bugünkü p/t ile biten yazılış', () {
    for (final q in ['haşre', 'haşrin', 'haşri', 'haşre dair']) {
      expect(words(q).first, 'haşir', reason: q);
    }
    // Birebir tutan nadir kelime de ilk birkaç sonuç arasında.
    expect(words('haşri').take(4), contains('haşrî'));
    expect(words('kitap').take(2), contains('kitab'));
    expect(words('cevap').take(2), contains('cevab'));
    expect(words('ümit').take(2), contains('ümid'));
    // Ekli hâlde de: "kitap-lar" → kitab, ünlüsü düşen "sabr-ın" → sabır, "vakt-in" → vakit.
    expect(words('kitaplar').first, 'kitab');
    expect(words('sabrın').first, 'sabır');
    expect(words('vaktin').take(2), contains('vakit'));
  });

  test('birleşik ifadenin içindeki kelime öne çıkar; izafetsiz yazılan terkip bulunur', () {
    expect(words('harfi').take(3), contains('mana-yı harfî'));
    expect(words('ehl iman').take(3), contains('ehl-i iman'));
    expect(words('mana harfi').first, 'mana-yı harfî');
    expect(words('bu kainatın').first, 'kâinat');
  });

  test('şapka bilerek yazılınca şapkası tutan kelime önce', () {
    expect(words('âdet').first, 'âdet');
  });

  test('Türkçe klavyesiz büyük "I" ile yazılan ekli kelimede kök bulunur', () {
    expect(words('Imanin').first, 'iman');
    expect(words('INKISAFINA').first, 'inkişaf');
    expect(words('HAKIKATIN').first, 'hakikat');
  });

  test('özel isim, çok daha sık geçen kökün önüne geçmez', () {
    expect(words('enesi').first, 'ene');
  });

  test('"(asm)", "r.a." gibi kısaltmalar açılır', () {
    expect(words('(asm)').first, 'aleyhissalâtü vesselâm');
    expect(words('a.s.m.').first, 'aleyhissalâtü vesselâm');
    expect(words('(as)').first, 'aleyhisselâm');
    expect(words('r.a.').first, 'radıyallahü anh');
    expect(words('c.c.').first, 'celle celâlühü');
    expect(words('Hz.').first, 'hazret');
  });

  test('"Bakınız" bağlantıları kelimenin kendi yazılışına gitmez', () {
    List<String> refs(String w) => [for (final e in lugat.crossReferences(lugat.byWord(w)!)) e.word];
    expect(refs('asır'), isNot(contains('aşr')));
    expect(refs('şuhur'), isNot(contains('suhur')));
  });

  test('özel isimler büyük harfle; kaynaktaki ayın işareti korunur', () {
    expect(lugat.byWord('Allah'), isNotNull);
    expect(lugat.byWord('Emirdağ'), isNotNull);
    expect(lugat.byWord('İbn-i Sina'), isNotNull);
    expect(lugat.byWord("Sebe'"), isNotNull);
    expect(lugat.byWord('allah'), isNull);
  });

  test('manalarda kaynaktan kalmış "\\n" kaçışı yok', () {
    for (final e in lugat.entries) {
      expect(e.meaning.contains(r'\'), isFalse, reason: e.word);
    }
    expect(lugat.byWord('belki')!.meaning, '1.Olabilir, muhtemelen. 2.Hattâ, bile. 3.Olsa olsa, ancak.');
  });

  test('arama tek harfte bile hızlı', () {
    final watch = Stopwatch()..start();
    for (final q in ['a', 'm', 't', 'mu', 'te', 'in', 'kâ', 'xq', 'muhabet', 'tezahüratından']) {
      lugat.search(q);
    }
    expect(watch.elapsedMilliseconds, lessThan(1000));
  });
}
