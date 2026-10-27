// "Menba": videonun Risale-i Nur'daki kaynağı ve (varsa) görüntü ve ses künyesi.
import { tipografik, type Video } from './ortak';

const KITAP_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.4C10.2 4.9 7.6 4.2 3.5 4.3v13.6c4.1-.1 6.7.6 8.5 2.1 1.8-1.5 4.4-2.2 8.5-2.1V4.3c-4.1-.1-6.7.6-8.5 2.1Zm0 0V20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const OK_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif?: string, metin?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

export function menbaIcerik(v: Video): HTMLElement {
  const kok = el('div', 'menba');
  kok.append(el('p', 'menba__video', tipografik(v.baslik)));

  const liste = el('ul', 'menba__liste');
  for (const m of v.menba) {
    const li = el('li', 'menba__kaynak');
    const simge = el('span', 'menba__simge');
    simge.innerHTML = KITAP_SVG;
    const metin = el('span', 'menba__metin');
    metin.append(el('span', 'menba__kulliyat', 'Risale-i Nur Külliyatı'), el('span', 'menba__eser', tipografik(m.eser)));
    if (m.yer) metin.append(el('span', 'menba__yer', m.yer));
    li.append(simge, metin);
    liste.append(li);
  }
  kok.append(liste);

  if (v.kunye?.length) {
    const ayrinti = el('details', 'menba__kunye');
    const ozet = el('summary', 'menba__kunye-ozet');
    const sayi = el('span', 'menba__kunye-sayi', `${v.kunye.length} kayıt`);
    const ok = el('span', 'menba__kunye-ok');
    ok.innerHTML = OK_SVG;
    ozet.append(el('span', 'menba__kunye-ad', 'Görüntü ve ses künyesi'), sayi, ok);
    ayrinti.append(ozet);
    const ul = el('ul');
    for (const satir of v.kunye) ul.append(el('li', undefined, satir));
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
