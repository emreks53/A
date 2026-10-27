// Kenz: videolar konu konu. Her konu bir bölümdür; karta dokununca video Oku'da (tam ekran akışta) açılır.
// Tek videolu konuda geniş kart, birden çok videoda yatay kaydırılan raf.
import { konular, videolar } from 'virtual:oku-videolar';
import { menbaYazisi, sureYazisi, tipografik, type Konu, type Video } from '../oku/ortak';

const KITAP_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.4C10.2 4.9 7.6 4.2 3.5 4.3v13.6c4.1-.1 6.7.6 8.5 2.1 1.8-1.5 4.4-2.2 8.5-2.1V4.3c-4.1-.1-6.7.6-8.5 2.1Zm0 0V20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const OYNAT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor"/></svg>';

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif?: string, metin?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

/** Videosu olan konular, listedeki sırayla */
export function konuGruplari(): { konu: Konu; videolar: Video[] }[] {
  return konular
    .map((konu) => ({ konu, videolar: videolar.filter((v) => v.konu === konu.id) }))
    .filter((g) => g.videolar.length > 0);
}

function kapak(v: Video): HTMLElement {
  const kutu = el('span', 'kart__poster');
  const img = el('img', 'kart__img');
  img.src = import.meta.env.BASE_URL + v.onizleme;
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.width = 720;
  img.height = 1280;
  const sure = el('span', 'kart__sure');
  sure.innerHTML = OYNAT_SVG;
  sure.append(sureYazisi(v.sure));
  kutu.append(img, sure);
  return kutu;
}

function kaynak(m: Video['menba'][number]): HTMLElement {
  const satir = el('span', 'kart__kaynak');
  satir.innerHTML = KITAP_SVG;
  satir.append(tipografik(m.yer ? `${m.eser}, ${m.yer}` : m.eser));
  return satir;
}

function kart(v: Video, genis: boolean): HTMLAnchorElement {
  const a = el('a', `kart ${genis ? 'kart--genis' : 'kart--dar'}`);
  a.href = `#/oku/${v.id}`;
  a.dataset.video = v.id;
  // Kartın tamamı tek bağlantıdır; ekran okuyucu tek cümle duyar.
  a.setAttribute('aria-label', `${tipografik(v.baslik)}, ${sureYazisi(v.sure)}. Menba: ${tipografik(menbaYazisi(v.menba))}`);
  const ad = el('span', 'kart__ad', tipografik(v.baslik));
  if (!genis) {
    a.append(kapak(v), ad, kaynak(v.menba[0]));
  } else {
    const metin = el('span', 'kart__metin');
    const alt = el('span', 'kart__alt');
    const izle = el('span', 'izle');
    izle.innerHTML = OYNAT_SVG;
    alt.append(izle, el('span', 'izle__ad', 'İzle'));
    metin.append(ad, el('span', 'kart__etiket', 'Menba'), ...v.menba.map(kaynak), alt);
    a.append(kapak(v), metin);
  }
  for (const c of a.children) c.setAttribute('aria-hidden', 'true');
  return a;
}

function sus(): HTMLElement {
  const s = el('div', 'sus');
  s.setAttribute('aria-hidden', 'true');
  s.append(el('i', 'dugum'));
  return s;
}

export function kutuphaneCiz(): HTMLElement {
  const kok = el('div', 'kutuphane');
  kok.id = 'kutuphane';
  const baslik = el('h2', 'kutuphane__baslik visually-hidden', 'Konular');
  baslik.id = 'kutuphane-baslik';
  baslik.tabIndex = -1;
  kok.setAttribute('role', 'region');
  kok.setAttribute('aria-labelledby', baslik.id);
  kok.append(sus(), baslik);

  for (const { konu, videolar: liste } of konuGruplari()) {
    const bolum = el('section', 'konu');
    bolum.id = `konu-${konu.id}`;
    const bas = el('div', 'konu__bas');
    const ad = el('h3', 'konu__ad', tipografik(konu.baslik));
    ad.id = `konu-${konu.id}-baslik`;
    bolum.setAttribute('aria-labelledby', ad.id);
    bas.append(ad, el('span', 'konu__sayi', `${liste.length} video`));
    bolum.append(bas);
    if (konu.aciklama) {
      const aciklama = el('p', 'konu__aciklama', tipografik(konu.aciklama));
      aciklama.id = `konu-${konu.id}-aciklama`;
      bolum.setAttribute('aria-describedby', aciklama.id);
      bolum.append(aciklama);
    }
    const raf = el('ul', liste.length > 1 ? 'raf raf--cok' : 'raf');
    for (const v of liste) {
      const li = el('li');
      li.append(kart(v, liste.length === 1));
      raf.append(li);
    }
    bolum.append(raf);
    kok.append(bolum);
  }

  const son = el('div', 'son');
  son.setAttribute('aria-hidden', 'true');
  son.append(sus(), el('p', 'son__ad', 'Nur-u Hakikat'));
  kok.append(son);
  return kok;
}
