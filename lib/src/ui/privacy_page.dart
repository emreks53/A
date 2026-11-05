import 'package:flutter/material.dart';

import 'app.dart';
import 'widgets.dart';

/// Gizlilik politikası. Android'deki metin, mağazada yayımlanan
/// store/gizlilik-politikasi.md ile aynıdır; biri değişirse öteki de
/// güncellenmeli. iPhone/iPad'de yalnızca Android'e özgü cümleler çıkarılır
/// (App Store başka bir platformun adının geçmesini istemiyor).
class PrivacyPage extends StatelessWidget {
  const PrivacyPage({super.key});

  /// Geliştirici ve ona ulaşmak için e-posta adresi.
  static const developerName = 'Lügat-ı Risale-i Nur';
  static const contactEmail = 'lugatirisaleinur@gmail.com';

  /// Platforma göre bölümler: (başlık, metin).
  static List<(String, String)> sectionsFor({required bool isAndroid}) => isAndroid ? _android : _apple;

  static const _android = <(String, String)>[
    _tanitim,
    _toplananVeriler,
    (
      'Cihazda saklanan bilgiler',
      'Son bakılan kelimeler, kaydedilen kelimeler ve tema, yazı boyutu, odak modu gibi ayarlar '
          'yalnızca kullanıcının kendi cihazında, uygulamanın kendi alanında tutulur; geliştiriciye '
          'ya da üçüncü taraflara gönderilmez. (Telefonun kendi yedeklemesi açıksa bu yedeğe dahil '
          'olabilir.) Bu bilgiler, kullanıcı silene ya da uygulama kaldırılana kadar tutulur.\n\n'
          'Son bakılanlar uygulamanın Ayarlar ekranından, kaydedilen kelimeler Kaydedilenler '
          'ekranından silinebilir. Bütün bu bilgiler uygulama kaldırıldığında (Android’de ayrıca '
          'telefonun Ayarlar > Uygulamalar > Lügat-ı Risale-i Nur > Depolama > Verileri temizle '
          'yoluyla) cihazdan silinir. Telefonun yedeklemesi açıksa yedekteki kopya, telefonun ya da '
          'Google/iCloud hesabının yedekleme ayarlarından silinene kadar kalabilir ve uygulama '
          'yeniden yüklendiğinde geri gelebilir.',
    ),
    (
      'İzinler',
      'Rahatsız Etmeyin erişimi (isteğe bağlı, Android): Kullanıcı açarsa uygulama, kendisi '
          'ekrandayken bildirimleri gizleyen bir “Rahatsız Etmeyin” kuralı kullanır ve uygulamadan '
          'çıkınca bu kuralı kapatır. Bildirimlerin içeriği okunmaz, saklanmaz ve hiçbir yere '
          'gönderilmez.\n\n'
          'Ekranı açık tutma: Uygulama açıkken ekranın kendiliğinden kapanmaması içindir.',
    ),
    _cocuklar,
    _degisiklikler,
    _iletisim,
  ];

  static const _apple = <(String, String)>[
    _tanitim,
    _toplananVeriler,
    (
      'Cihazda saklanan bilgiler',
      'Son bakılan kelimeler, kaydedilen kelimeler ve tema, yazı boyutu gibi ayarlar yalnızca '
          'kullanıcının kendi cihazında, uygulamanın kendi alanında tutulur; geliştiriciye ya da '
          'üçüncü taraflara gönderilmez. (Cihazın iCloud yedeklemesi açıksa bu yedeğe dahil '
          'olabilir.) Bu bilgiler, kullanıcı silene ya da uygulama kaldırılana kadar tutulur.\n\n'
          'Son bakılanlar uygulamanın Ayarlar ekranından, kaydedilen kelimeler Kaydedilenler '
          'ekranından silinebilir. Bütün bu bilgiler uygulama kaldırıldığında cihazdan silinir. '
          'iCloud yedeklemesi açıksa yedekteki kopya, iCloud yedekleme ayarlarından silinene kadar '
          'kalabilir ve uygulama yeniden yüklendiğinde geri gelebilir.',
    ),
    (
      'İzinler',
      'Uygulama hiçbir özel izin istemez.\n\n'
          'Ekranı açık tutma: Uygulama açıkken ekranın kendiliğinden kapanmaması içindir.',
    ),
    _cocuklar,
    _degisiklikler,
    _iletisim,
  ];

  static const _tanitim = (
    '',
    'Lügat-ı Risale-i Nur, Risale-i Nur okurken karşılaşılan Osmanlıca kelimelerin manasını '
        'göstermek için hazırlanmış bir lügat uygulamasıdır.\n\n'
        'Geliştirici: $developerName',
  );
  static const _toplananVeriler = (
    'Toplanan veriler',
    'Uygulama hiçbir kişisel veri toplamaz, bir sunucuya göndermez ve üçüncü taraflarla '
        'paylaşmaz. Uygulama internet bağlantısı kullanmaz; reklam, analiz ya da hata raporlama '
        'hizmeti içermez.',
  );
  static const _cocuklar = (
    'Çocuklar',
    'Uygulama çocuklardan bilerek veri toplamaz; zaten hiçbir kullanıcıdan veri toplamaz.',
  );
  static const _degisiklikler = (
    'Değişiklikler',
    'Bu politika değişirse güncel metin aynı adreste ve uygulamanın yeni sürümünde yayımlanır.',
  );
  static const _iletisim = ('İletişim', 'Sorularınız için: $contactEmail');

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sections = sectionsFor(isAndroid: AppScope.of(context).isAndroid);
    return Scaffold(
      appBar: AppBar(title: const Text('Gizlilik politikası')),
      body: SelectionArea(
        child: ListView(
          padding: EdgeInsets.only(bottom: MediaQuery.paddingOf(context).bottom + 24),
          children: [
            for (final (title, text) in sections) ...[
              if (title.isNotEmpty) SectionHeader(title),
              Padding(
                padding: EdgeInsets.fromLTRB(20, title.isEmpty ? 16 : 0, 20, 8),
                child: Text(text, style: theme.textTheme.bodyLarge?.copyWith(height: 1.5)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
