import 'package:flutter_test/flutter_test.dart';
import 'package:lugat_risale/src/dictionary/meaning.dart';
import 'package:lugat_risale/src/ui/widgets.dart' show formatCount;

/// Kalın yazılacak asıl mana.
String bold(String meaning) => splitMeaning(meaning).where((p) => p.main).map((p) => p.text).join(' | ');

void main() {
  test('asıl mana ilk cümledir', () {
    expect(bold('Açılma. Meydana çıkma. Yetişme. Terakki etme, ilerleme. Gizli sırların bilinmesi.'), 'Açılma.');
    expect(bold('Merhamet, acımak, şefkat etmek, ihsan etmek, esirgemek. Mc: Yağmur.'),
        'Merhamet, acımak, şefkat etmek, ihsan etmek, esirgemek.');
    expect(bold('Anlam'), 'Anlam');
  });

  test('baştaki açıklama, etiket, kısaltma ve madde numarası asıl manaya katılmaz', () {
    expect(bold('(Çoğulu: Hakaik) Bir şeyin aslı ve esâsı. Mahiyeti.'), 'Bir şeyin aslı ve esâsı.');
    expect(bold('(Bak: Hakk) Doğru. Gerçek.'), 'Doğru.');
    expect(bold('(Çoğulu: Hamayil). Kılıç kayışı.'), 'Kılıç kayışı.');
    expect(bold('Tıb: Kalbin durması. Ölüm.'), 'Kalbin durması.');
    expect(bold('t. Uzuv. Canlılarda bir görevi yapan bölüm.'), 'Uzuv.');
    expect(bold('İtl. Açık deniz, engin.'), 'Açık deniz, engin.');
    expect(bold('Su. Mc: Yağmur.'), 'Su.');
    expect(bold('1. Neşeli vakit geçirmek. 2. Oyalanmak.'), 'Neşeli vakit geçirmek.');
    expect(bold('(Ar. Hiss) 1.Dış dünyaya ait etkileri idrak etme. 2.Duygu.'), 'Dış dünyaya ait etkileri idrak etme.');
  });

  test('alan kısaltması atlanır; sıra sayısı ve küçük harfle süren açıklama manaya dahildir', () {
    expect(bold('Gr. Arabçada harfleri (E, A) diye okutan işâret, üstün. Fetih.'),
        'Arabçada harfleri (E, A) diye okutan işâret, üstün.');
    expect(bold('Psk. Hafıza kaybı. Bunama.'), 'Hafıza kaybı.');
    expect(bold('19. asırda yaşamış bir âlim. Eserleri çoktur.'), '19. asırda yaşamış bir âlim.');
    expect(bold('(Gibi) manasına gelerek kullanılır. Başka.'), '(Gibi) manasına gelerek kullanılır.');
    expect(bold('(Ağaç) yapraklanma. Başka.'), '(Ağaç) yapraklanma.');
    // Dil bilgisi notu ve büyük harfe çevrilmemiş "ş" ile başlayan cümle.
    expect(bold('(Tekili: şâki) şikâyet edenler, şikâyetçiler.'), 'şikâyet edenler, şikâyetçiler.');
    expect(bold('(Nebahat) şeref, şan.'), 'şeref, şan.');
  });

  test('parantez içindeki ve kısaltmadaki nokta cümleyi bitirmez', () {
    expect(bold('Hz. Peygamberin amcası. Başka bir kişi.'), 'Hz. Peygamberin amcası.');
    expect(bold('Allah’ın (c.c.) ismi. Başka.'), 'Allah’ın (c.c.) ismi.');
  });

  test('yıldız ve noktalı virgül de ayırır', () {
    expect(bold('Dolunay * Mekke ile Medine arasında bir yer.'), 'Dolunay');
    expect(bold('Su; parlaklık.'), 'Su;');
  });

  test('her paragrafın ilk cümlesi kalın; parçalar birleşince metnin kendisi çıkar', () {
    const meaning = 'Görünme, bilinme.\nGörünme. Bilinme. Kader.';
    expect(bold(meaning), 'Görünme, bilinme. | Görünme.');
    expect(splitMeaning(meaning).map((p) => p.text).join(), meaning);
  });

  test('yalnız açıklamadan oluşan mana bütünüyle kalın', () {
    expect(bold('(Risale-i Nur eserleri).'), '(Risale-i Nur eserleri).');
  });

  test('sayılar Türkçe binlik ayırıcıyla yazılır', () {
    expect(formatCount(10504), '10.504');
    expect(formatCount(942), '942');
    expect(formatCount(1234567), '1.234.567');
  });
}
