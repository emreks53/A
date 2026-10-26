// "Menba": videonun Risale-i Nur'daki kaynağı ve (varsa) görüntü ve ses künyesi.
import type { Video } from './ortak';

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif?: string, metin?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

export function menbaIcerik(v: Video): HTMLElement {
  const kok = el('div', 'menba');
  kok.append(el('p', 'menba__video', v.baslik));

  const liste = el('ul', 'menba__liste');
  for (const m of v.menba) {
    const li = el('li', 'menba__kaynak');
    li.append(el('span', 'menba__eser', m.eser));
    if (m.yer) li.append(el('span', 'menba__yer', m.yer));
    liste.append(li);
  }
  kok.append(liste, el('p', 'menba__kulliyat', 'Risale-i Nur Külliyatı'));

  if (v.kunye?.length) {
    const ayrinti = el('details', 'menba__kunye');
    ayrinti.append(el('summary', undefined, 'Görüntü ve ses künyesi'));
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
