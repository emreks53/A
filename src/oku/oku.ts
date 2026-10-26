// Oku sekmesi: kitaplık → bölümler → okuma ekranı.
import type { Rota } from '../rota';
import { acikSayfa } from './alt-sayfa';
import { bolumBul, kitapBul, kitaplar, okumaSuresi, type KitapOzet } from './icerik';
import { enCokOkunan, sonOkunan, tumKonumlar, type Konum } from './kayit';
import { SVG } from './ikonlar';
import { okuyucuAc, type Okuyucu } from './okuyucu';

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif?: string, metin?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}


/** Bölüm bitti sayılır: sonuna kadar (ya da neredeyse) kaydırılmış */
export const BITTI = 0.97;

function yuzde(oran: number): string {
  return `%${Math.round(oran * 100)}`;
}

function ilerlemeCubugu(oran: number, etiket: string): HTMLElement {
  const c = el('span', 'ilerleme');
  c.setAttribute('role', 'progressbar');
  c.setAttribute('aria-label', etiket);
  c.setAttribute('aria-valuemin', '0');
  c.setAttribute('aria-valuemax', '100');
  c.setAttribute('aria-valuenow', String(Math.round(oran * 100)));
  const ic = el('span', 'ilerleme__dolu');
  ic.style.transform = `scaleX(${Math.max(0, Math.min(1, oran))})`;
  c.append(ic);
  return c;
}

function kitapIlerleme(kitap: KitapOzet, konumlar: Record<string, Konum>): { biten: number; baslanan: number } {
  let biten = 0;
  let baslanan = 0;
  for (const b of kitap.bolumler) {
    const k = konumlar[`${kitap.id}/${b.id}`];
    if (!k) continue;
    baslanan++;
    if (enCokOkunan(k) >= BITTI) biten++;
  }
  return { biten, baslanan };
}

// ---------- kitaplık ----------

function kitaplikCiz(): HTMLElement {
  const ekran = el('div', 'oku-ekran oku-ekran--kitaplik');
  const kaydirma = el('div', 'oku-ekran__kaydirma');
  ekran.append(kaydirma);

  const ust = el('header', 'kitaplik__ust');
  ust.append(el('h1', 'oku-baslik', 'Oku'));
  kaydirma.append(ust);

  const konumlar = tumKonumlar();
  const son = sonOkunan();
  const bulunan = son ? bolumBul(son.kitap, son.bolum) : undefined;
  if (bulunan) {
    // Son okunan bölüm bittiyse sıradaki bölüm önerilir.
    const sonKonum = konumlar[`${bulunan.kitap.id}/${bulunan.bolum.id}`];
    const sirada = (sonKonum?.oran ?? 0) >= BITTI && bulunan.sonraki;
    const bolum = sirada ? bulunan.sonraki! : bulunan.bolum;
    const oran = konumlar[`${bulunan.kitap.id}/${bolum.id}`]?.oran ?? 0;
    const kart = el('a', 'devam-karti');
    kart.href = `#/oku/${bulunan.kitap.id}/${bolum.id}`;
    kart.append(
      el('span', 'devam-karti__etiket', sirada ? 'Sıradaki bölüm' : 'Kaldığın yerden devam et'),
      el('span', 'devam-karti__baslik', bolum.baslik),
      el('span', 'devam-karti__alt', oran > 0 ? `${bulunan.kitap.baslik} · ${yuzde(oran)}` : bulunan.kitap.baslik),
      ilerlemeCubugu(oran, 'Bölümün okunan kısmı'),
    );
    const ok = el('span', 'devam-karti__ok');
    ok.innerHTML = SVG.ileri;
    kart.append(ok);
    kaydirma.append(kart);
  }

  kaydirma.append(el('h2', 'oku-etiket', 'Kitaplar'));
  if (!kitaplar.length) {
    kaydirma.append(el('p', 'oku-bos', 'Henüz kitap eklenmedi.'));
    return ekran;
  }
  const liste = el('ul', 'kitap-listesi');
  for (const kitap of kitaplar) {
    const li = el('li');
    const a = el('a', 'kitap-karti');
    a.href = `#/oku/${kitap.id}`;
    const { biten } = kitapIlerleme(kitap, konumlar);
    const yazi = el('span', 'kitap-karti__yazi');
    yazi.append(el('span', 'kitap-karti__baslik', kitap.baslik));
    if (kitap.altbaslik) yazi.append(el('span', 'kitap-karti__alt', kitap.altbaslik));
    const bilgi = el('span', 'kitap-karti__bilgi');
    bilgi.append(`${kitap.bolumler.length} bölüm`);
    if (biten) bilgi.append(` · ${biten} okundu`);
    if (kitap.ornek) bilgi.append(' ', el('span', 'rozet', 'Örnek'));
    yazi.append(bilgi);
    const ok = el('span', 'kitap-karti__ok');
    ok.innerHTML = SVG.ileri;
    a.append(yazi, ok);
    li.append(a);
    liste.append(li);
  }
  kaydirma.append(liste);
  return ekran;
}

// ---------- bölümler ----------

function ustCubuk(geriHref: string, geriEtiket: string, baslik: string, altBaslik?: string): HTMLElement {
  const ust = el('header', 'oku-ust');
  const geri = el('a', 'oku-ust__geri');
  geri.href = geriHref;
  geri.dataset.geri = '';
  geri.innerHTML = SVG.geri;
  geri.append(el('span', 'oku-ust__geri-yazi', geriEtiket));
  const yazi = el('div', 'oku-ust__yazi');
  yazi.append(el('h1', 'oku-ust__baslik', baslik));
  if (altBaslik) yazi.append(el('p', 'oku-ust__alt', altBaslik));
  ust.append(geri, yazi);
  return ust;
}

function bolumlerCiz(kitap: KitapOzet): HTMLElement {
  const ekran = el('div', 'oku-ekran oku-ekran--bolumler');
  const kaydirma = el('div', 'oku-ekran__kaydirma');
  ekran.append(kaydirma);
  kaydirma.append(ustCubuk('#/oku', 'Kitaplık', kitap.baslik, kitap.altbaslik));

  const konumlar = tumKonumlar();
  const liste = el('ol', 'bolum-listesi');
  kitap.bolumler.forEach((b, i) => {
    const k = konumlar[`${kitap.id}/${b.id}`];
    const li = el('li');
    const a = el('a', 'bolum-satiri');
    a.href = `#/oku/${kitap.id}/${b.id}`;
    const no = el('span', 'bolum-satiri__no', String(i + 1));
    no.setAttribute('aria-hidden', 'true');
    const yazi = el('span', 'bolum-satiri__yazi');
    yazi.append(el('span', 'bolum-satiri__baslik', b.baslik));
    const bilgi = el('span', 'bolum-satiri__bilgi', okumaSuresi(b.kelime));
    yazi.append(bilgi);
    const durum = el('span', 'bolum-satiri__durum');
    if (k && enCokOkunan(k) >= BITTI) {
      durum.classList.add('bolum-satiri__durum--bitti');
      durum.innerHTML = SVG.tamam;
      durum.append(el('span', 'visually-hidden', 'Okundu'));
    } else if (k) {
      durum.textContent = yuzde(k.oran);
      durum.setAttribute('aria-label', `${yuzde(k.oran)} okundu`);
    }
    a.append(no, yazi, durum);
    li.append(a);
    liste.append(li);
  });
  kaydirma.append(liste);
  return ekran;
}

function bulunamadi(): HTMLElement {
  const ekran = el('div', 'oku-ekran oku-ekran--bos');
  const kaydirma = el('div', 'oku-ekran__kaydirma');
  kaydirma.append(ustCubuk('#/oku', 'Kitaplık', 'Bulunamadı'), el('p', 'oku-bos', 'Aradığınız kitap ya da bölüm bulunamadı.'));
  ekran.append(kaydirma);
  return ekran;
}

// ---------- yönetim ----------

export type OkuEkrani = 'kitaplik' | 'bolumler' | 'okuma';

export interface Oku {
  goster(r: Rota): OkuEkrani;
  /** Sekmeden ayrılırken (okuma konumunu kaydet, sayfaları kapat) */
  ayril(): void;
}

export function okuBaslat(kok: HTMLElement): Oku {
  const kaydirmalar = new Map<string, number>();
  let anahtar = '';
  let ekran: HTMLElement | null = null;
  let okuyucu: Okuyucu | null = null;

  const degistir = (yeni: HTMLElement, yeniAnahtar: string, derinlik: number) => {
    const eskiDerinlik = Number(ekran?.dataset.derinlik ?? derinlik);
    if (ekran) {
      const k = ekran.querySelector<HTMLElement>('.oku-ekran__kaydirma');
      if (k) kaydirmalar.set(anahtar, k.scrollTop);
    }
    okuyucu?.kapat();
    okuyucu = null;
    acikSayfa()?.kapat();
    yeni.dataset.derinlik = String(derinlik);
    if (ekran && derinlik !== eskiDerinlik) yeni.classList.add(derinlik > eskiDerinlik ? 'giris-ileri' : 'giris-geri');
    ekran?.remove();
    kok.append(yeni);
    ekran = yeni;
    anahtar = yeniAnahtar;
    const k = yeni.querySelector<HTMLElement>('.oku-ekran__kaydirma');
    if (k) k.scrollTop = kaydirmalar.get(yeniAnahtar) ?? 0;
  };

  return {
    goster(r) {
      const yeniAnahtar = [r.kitap, r.bolum].filter(Boolean).join('/');
      if (r.bolum) {
        const bulunan = bolumBul(r.kitap, r.bolum);
        if (!bulunan) {
          degistir(bulunamadi(), yeniAnahtar, 1);
          return 'bolumler';
        }
        if (anahtar === yeniAnahtar && okuyucu) return 'okuma';
        const yeni = el('div', 'oku-ekran oku-ekran--okuma');
        degistir(yeni, yeniAnahtar, 2);
        okuyucu = okuyucuAc(yeni, bulunan);
        return 'okuma';
      }
      if (r.kitap) {
        const kitap = kitapBul(r.kitap);
        if (anahtar !== yeniAnahtar || !ekran) degistir(kitap ? bolumlerCiz(kitap) : bulunamadi(), yeniAnahtar, 1);
        return 'bolumler';
      }
      if (anahtar !== '' || !ekran) degistir(kitaplikCiz(), '', 0);
      return 'kitaplik';
    },
    ayril() {
      okuyucu?.kaydet();
      acikSayfa()?.kapat();
      // Geri dönüldüğünde ilerleme bilgileri tazelensin diye liste ekranları yeniden çizilir.
      if (ekran && !okuyucu) {
        const k = ekran.querySelector<HTMLElement>('.oku-ekran__kaydirma');
        if (k) kaydirmalar.set(anahtar, k.scrollTop);
        ekran.remove();
        ekran = null;
      }
    },
  };
}
