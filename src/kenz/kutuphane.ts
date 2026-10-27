// Kenz: videolar konu konu. Her konu bir bölümdür; karta dokununca video Oku'da (tam ekran akışta) açılır.
import { konular, videolar } from 'virtual:oku-videolar';
import { menbaYazisi, sureYazisi, type Konu, type Video } from '../oku/ortak';

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

function kart(v: Video): HTMLElement {
  const a = el('a', 'kart');
  a.href = `#/oku/${v.id}`;
  a.setAttribute('aria-label', `${v.baslik}, ${sureYazisi(v.sure)}. Menba: ${menbaYazisi(v.menba)}`);
  const resim = el('span', 'kart__resim');
  const img = el('img', 'kart__img');
  img.src = import.meta.env.BASE_URL + v.onizleme;
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.width = 720;
  img.height = 1280;
  const sure = el('span', 'kart__sure', sureYazisi(v.sure));
  sure.setAttribute('aria-hidden', 'true');
  resim.append(img, sure);
  const yazi = el('span', 'kart__yazi');
  yazi.setAttribute('aria-hidden', 'true');
  yazi.append(el('span', 'kart__baslik', v.baslik), el('span', 'kart__menba', menbaYazisi(v.menba)));
  a.append(resim, yazi);
  return a;
}

export function kutuphaneCiz(): HTMLElement {
  const kok = el('div', 'kutuphane');
  kok.setAttribute('aria-labelledby', 'kutuphane-baslik');
  const ust = el('div', 'kutuphane__ust');
  const baslik = el('h2', 'kutuphane__baslik', 'Konular');
  baslik.id = 'kutuphane-baslik';
  const sayi = el('p', 'kutuphane__sayi', `${videolar.length} video`);
  ust.append(baslik, sayi);
  kok.append(ust);

  for (const { konu, videolar: liste } of konuGruplari()) {
    const bolum = el('section', 'konu');
    bolum.id = `konu-${konu.id}`;
    const bolumBaslik = el('h3', 'konu__baslik', konu.baslik);
    bolumBaslik.id = `konu-${konu.id}-baslik`;
    bolum.setAttribute('aria-labelledby', bolumBaslik.id);
    const ustSatir = el('div', 'konu__ust');
    ustSatir.append(bolumBaslik, el('span', 'konu__sayi', `${liste.length} video`));
    bolum.append(ustSatir);
    if (konu.aciklama) bolum.append(el('p', 'konu__aciklama', konu.aciklama));
    const izgara = el('ul', 'konu__kartlar');
    for (const v of liste) {
      const li = el('li', 'konu__oge');
      li.append(kart(v));
      izgara.append(li);
    }
    bolum.append(izgara);
    kok.append(bolum);
  }
  return kok;
}
