// "Menba": videonun kaynağı. Üstte büyük Kur'an-ı Kerim, altında Risale-i Nur eserleri dizili (videonun geçtiği
// eser öne çıkar); altında eser, bölüm, (varsa) kısım ve sayfa, üç etiket ve (varsa) görüntü ve ses künyesi.
import { kitaplar } from 'virtual:kitaplar';
import { menbaCizimi } from './menba-cizim';
import { tipografik, type Video } from './ortak';

const OK_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const KITAP_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.6C10.2 5.3 7.6 4.8 4 5v13c3.6-.2 6.2.3 8 1.6 1.8-1.3 4.4-1.8 8-1.6V5c-3.6-.2-6.2.3-8 1.6Zm0 0v13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>';

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif?: string, metin?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

export function menbaIcerik(v: Video): HTMLElement {
  const kok = el('div', 'menba');
  kok.append(menbaCizimi(v.kitap));

  const kaynak = el('div', 'menba__kaynak');
  const eser = el('p', 'menba__eser');
  eser.append(el('span', undefined, tipografik(v.kitap)));
  const yer = el('ul', 'menba__yer');
  yer.setAttribute('aria-label', 'Geçtiği yer');
  for (const [parca, sinif] of [
    [v.bolum, undefined],
    [v.kisim, undefined],
    [v.sayfa ? `${v.sayfa}. sayfa` : undefined, 'menba__sayfa'],
  ] as const) {
    if (parca) yer.append(el('li', sinif, tipografik(parca)));
  }
  kaynak.append(eser, yer);

  // Kitabın PDF'i Güneş'te varsa: kaynağı kitabın kendisinde, o sayfada açar
  const kitap = kitaplar.find((k) => k.kitap === v.kitap);
  if (kitap) {
    const oku = el('a', 'menba__oku');
    oku.href = `#/gunes/${kitap.kimlik}${v.sayfa ? `/${v.sayfa}` : ''}`;
    const simge = el('span', 'menba__oku-simge');
    simge.innerHTML = KITAP_SVG;
    oku.append(simge, el('span', 'menba__oku-ad', 'Kitapta oku'), el('span', 'menba__oku-yer', v.sayfa ? `${v.sayfa}. sayfa` : tipografik(v.kitap)));
    oku.setAttribute('aria-label', `Kitapta oku: ${tipografik(v.kitap)}${v.sayfa ? `, ${v.sayfa}. sayfa` : ''}`);
    kaynak.append(oku);
  }

  const etiketler = el('ul', 'menba__etiketler');
  etiketler.setAttribute('aria-label', 'Konular');
  for (const e of v.etiketler) etiketler.append(el('li', 'etiket', tipografik(`#${e}`)));
  kaynak.append(etiketler);
  kok.append(kaynak);

  if (v.kunye?.length) {
    const ayrinti = el('details', 'menba__kunye');
    const ozet = el('summary', 'menba__kunye-ozet');
    const ok = el('span', 'menba__kunye-ok');
    ok.innerHTML = OK_SVG;
    ozet.append(el('span', 'menba__kunye-ad', 'Görüntü ve ses künyesi'), el('span', 'menba__kunye-sayi', `${v.kunye.length} kayıt`), ok);
    ayrinti.append(ozet);
    const ul = el('ul');
    for (const satir of v.kunye) ul.append(el('li', undefined, tipografik(satir)));
    ayrinti.append(ul);
    if (v.kunye.some((s) => s.includes('CC BY 4.0'))) {
      const p = el('p', 'menba__lisans');
      const a = el('a', undefined, 'CC BY 4.0 lisansı');
      a.href = 'https://creativecommons.org/licenses/by/4.0/deed.tr';
      a.target = '_blank';
      a.rel = 'noopener';
      p.append(a);
      ayrinti.append(p);
    }
    kok.append(ayrinti);
  }
  return kok;
}
