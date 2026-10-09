import 'package:flutter/material.dart';

import 'widgets.dart';

/// Gizlilik politikası. Metin, mağazada yayımlanan store/gizlilik-politikasi.md
/// ile aynıdır (iletişim bölümü hariç); biri değişirse öteki de güncellenmeli.
class PrivacyPage extends StatelessWidget {
  const PrivacyPage({super.key});

  static const sections = <(String, String)>[
    (
      '',
      'Lügat-ı Risale-i Nur, Risale-i Nur okurken karşılaşılan Osmanlıca kelimelerin manasını '
          'göstermek için hazırlanmış bir lügat uygulamasıdır.',
    ),
    (
      'Toplanan veriler',
      'Uygulama hiçbir kişisel veri toplamaz, bir sunucuya göndermez ve üçüncü taraflarla '
          'paylaşmaz. Uygulama internet bağlantısı kullanmaz; reklam, analiz ya da hata raporlama '
          'hizmeti içermez.',
    ),
    (
      'Cihazda saklanan bilgiler',
      'Son bakılan kelimeler, kaydedilen kelimeler ve tema, yazı boyutu, odak modu gibi ayarlar '
          'yalnızca kullanıcının kendi cihazında, uygulamanın kendi alanında tutulur; geliştiriciye '
          'ya da üçüncü taraflara gönderilmez. (Telefonun kendi yedeklemesi açıksa bu yedeğe dahil '
          'olabilir.) Bu bilgiler, kullanıcı silene ya da uygulama kaldırılana kadar tutulur.\n\n'
          'Son bakılanlar uygulamanın Ayarlar ekranından, kaydedilen kelimeler Kaydedilenler '
          'ekranından silinebilir. Bütün bu bilgiler uygulama kaldırıldığında (Android’de ayrıca '
          'telefonun Ayarlar > Uygulamalar > Lügat-ı Risale-i Nur > Depolama > Verileri temizle '
          'yoluyla) tamamen silinir.',
    ),
    (
      'İzinler',
      'Rahatsız Etmeyin erişimi (isteğe bağlı, Android): Kullanıcı açarsa uygulama, kendisi '
          'ekrandayken bildirimleri gizleyen bir “Rahatsız Etmeyin” kuralı kullanır ve uygulamadan '
          'çıkınca bu kuralı kapatır. Bildirimlerin içeriği okunmaz, saklanmaz ve hiçbir yere '
          'gönderilmez.\n\n'
          'Ekranı açık tutma: Uygulama açıkken ekranın kendiliğinden kapanmaması içindir.',
    ),
    (
      'Çocuklar',
      'Uygulama çocuklardan bilerek veri toplamaz; zaten hiçbir kullanıcıdan veri toplamaz.',
    ),
    (
      'İletişim',
      'Sorularınız için Google Play’deki uygulama sayfasında yer alan geliştirici e-posta '
          'adresine yazabilirsiniz.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
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
