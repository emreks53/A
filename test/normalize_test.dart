import 'package:flutter_test/flutter_test.dart';
import 'package:lugat_risale/src/dictionary/normalize.dart';

void main() {
  group('searchKey', () {
    test('Türkçe küçük harf kuralları: I → ı, İ → i', () {
      expect(searchKey('IŞIK'), 'ışık');
      expect(searchKey('İnkişaf'), 'inkişaf');
      expect(searchKey('İLİM'), 'ilim');
    });

    test('düzeltme işaretleri (şapka) sadeleşir', () {
      expect(searchKey('kâinat'), 'kainat');
      expect(searchKey('hakîm'), 'hakim');
      expect(searchKey('hâkim'), 'hakim');
      expect(searchKey('nûr'), 'nur');
      expect(searchKey('ÂLEM'), 'alem');
    });

    test('kesme işaretleri, tireler ve boşluklar atılır', () {
      expect(searchKey("san'at"), 'sanat');
      expect(searchKey('san’at'), 'sanat');
      expect(searchKey('Kurʿân'), 'kuran');
      expect(searchKey('mana-yı harfî'), 'manayıharfi');
      expect(searchKey('  ene  '), 'ene');
      expect(searchKey('esma-i hüsna.'), 'esmaihüsna');
    });

    test('Türkçe harfler korunur, katlanınca sadeleşir', () {
      expect(searchKey('inkişaf'), 'inkişaf');
      expect(searchKey('inkişaf', fold: true), 'inkisaf');
      expect(searchKey('çığ öğüt ışık', fold: true), 'cigogutisik');
      expect(foldKey('şükür'), 'sukur');
    });

    test('ayrık yazılmış (birleşik işaretli) harfler birleştirilir', () {
      expect(searchKey('inkişaf'), 'inkişaf');
      expect(searchKey('kâinat'), 'kainat');
      expect(searchKey('ğ'), 'ğ');
      expect(searchKey('ü'), 'ü');
      expect(searchKey('İlim'), 'ilim');
    });
  });

  test('compareTurkish Türk alfabesi sırasını izler', () {
    final words = ['şems', 'sabit', 'çağ', 'cem', 'ırk', 'ilim', 'öz', 'ot', 'üns', 'ulvi', 'zat'];
    final sorted = [...words]..sort((a, b) => compareTurkish(searchKey(a), searchKey(b)));
    expect(sorted, ['cem', 'çağ', 'ırk', 'ilim', 'ot', 'öz', 'sabit', 'şems', 'ulvi', 'üns', 'zat']);
  });

  test('wordParts bileşik ifadeyi parçalar', () {
    expect(wordParts('mana-yı harfî'), ['mana', 'yı', 'harfî']);
    expect(wordParts('ene'), ['ene']);
  });
}
