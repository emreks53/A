# -*- coding: utf-8 -*-
"""
site/ altındaki yayın dosyalarında güvenli, tekrarlanabilir düzenleme yardımcıları.

Site artık derleyici kaynak kodundan değil, yayındaki dosyaların kendisinden yönetiliyor
(kurtarma, 15.10.2026; bkz. README.md). Her değişiklik araclar/degisiklikler/ altında bir betik
olarak tutulur; betikler yalnızca bu yardımcıları kullanır ve beklenen eşleşme sayısını doğrular.
Eşleşme sayısı tutmazsa hiçbir dosya yazılmaz.
"""
import glob, os, re, sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(KOK, 'site')


def dosyalar(desen='**/*.html'):
    """site/ altında desene uyan dosyalar (göreli yol, sıralı)."""
    return sorted(os.path.relpath(p, SITE) for p in glob.glob(os.path.join(SITE, desen), recursive=True) if os.path.isfile(p))


def oku(yol):
    with open(os.path.join(SITE, yol), encoding='utf-8') as f:
        return f.read()


def yaz(yol, metin):
    with open(os.path.join(SITE, yol), 'w', encoding='utf-8', newline='') as f:
        f.write(metin)


def degistir(hedef, eski, yeni, dosya_basina=1, toplam=None):
    """`hedef` (dosya yolu, yol listesi ya da glob deseni) içindeki her dosyada `eski` metnini `yeni` ile değiştirir.

    dosya_basina: her dosyada beklenen eşleşme sayısı (None: denetleme yok, 0'dan çok olmalı).
    toplam: tüm dosyalarda beklenen toplam eşleşme (isteğe bağlı).
    Döndürür: değişen dosya sayısı.
    """
    if isinstance(hedef, str):
        liste = dosyalar(hedef) if any(c in hedef for c in '*?[') else [hedef]
    else:
        liste = list(hedef)
    if not liste:
        sys.exit(f'HATA: hedef bulunamadı: {hedef}')
    yeni_metin, sayac = {}, 0
    for yol in liste:
        s = oku(yol); n = s.count(eski)
        if dosya_basina is not None and n != dosya_basina:
            sys.exit(f'HATA: {yol}: {n} eşleşme (beklenen {dosya_basina}): {eski[:80]!r}')
        if dosya_basina is None and n == 0:
            continue
        sayac += n; yeni_metin[yol] = s.replace(eski, yeni)
    if toplam is not None and sayac != toplam:
        sys.exit(f'HATA: toplam {sayac} eşleşme (beklenen {toplam}): {eski[:80]!r}')
    for yol, s in yeni_metin.items():
        yaz(yol, s)
    return len(yeni_metin)


def degistir_re(hedef, desen, yeni, dosya_basina=1):
    """Düzenli ifadeyle değiştirme; her dosyada tam `dosya_basina` eşleşme beklenir."""
    liste = dosyalar(hedef) if any(c in hedef for c in '*?[') else [hedef]
    yeni_metin = {}
    for yol in liste:
        s = oku(yol); s2, n = re.subn(desen, yeni, s, flags=re.S)
        if dosya_basina is not None and n != dosya_basina:
            sys.exit(f'HATA: {yol}: {n} eşleşme (beklenen {dosya_basina}): {desen[:80]!r}')
        if n:
            yeni_metin[yol] = s2
    for yol, s in yeni_metin.items():
        yaz(yol, s)
    return len(yeni_metin)


def ara(hedef, metin):
    """Metnin geçtiği dosyalar ve sayıları."""
    liste = dosyalar(hedef) if any(c in hedef for c in '*?[') else [hedef]
    return {y: oku(y).count(metin) for y in liste if metin in oku(y)}
