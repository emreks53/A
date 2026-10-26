// Çözülmüş bölümü (metin.ts) DOM'a çevirir. Metin her zaman textContent ile yazılır; HTML olarak yorumlanmaz.
import type { Blok, Bolum, Satirici } from './metin';

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  return e;
}

function satirlar(hedef: HTMLElement, icerik: Satirici[]): void {
  for (const s of icerik) {
    switch (s.tur) {
      case 'metin':
        hedef.append(s.metin);
        break;
      case 'arapca': {
        const span = el('span', 'ar');
        span.lang = 'ar';
        span.dir = 'rtl';
        span.textContent = s.metin;
        hedef.append(span);
        break;
      }
      case 'kalin':
      case 'italik': {
        const e = el(s.tur === 'kalin' ? 'strong' : 'em');
        satirlar(e, s.icerik);
        hedef.append(e);
        break;
      }
      case 'kirma':
        hedef.append(el('br'));
        break;
      case 'dipnot': {
        const sup = el('sup', 'dipnot-isaret');
        const a = el('a');
        a.href = `#dipnot-${s.no}`;
        a.dataset.dipnot = String(s.no);
        a.setAttribute('aria-label', `Dipnot ${s.no}`);
        a.textContent = String(s.no);
        sup.append(a);
        hedef.append(sup);
        break;
      }
    }
  }
}

function blok(b: Blok): HTMLElement {
  switch (b.tur) {
    case 'baslik': {
      // Bölüm başlığı sayfanın h1'idir; metindeki "# " başlığı onun yerine geçer.
      const e = el(b.seviye === 1 ? 'h1' : b.seviye === 2 ? 'h2' : 'h3', `metin__baslik metin__baslik--${b.seviye}`);
      satirlar(e, b.icerik);
      return e;
    }
    case 'paragraf': {
      const p = el('p', b.arapca ? 'metin__p metin__p--ar' : 'metin__p');
      if (b.arapca) {
        p.lang = 'ar';
        p.dir = 'rtl';
      }
      satirlar(p, b.icerik);
      return p;
    }
    case 'alinti': {
      const q = el('blockquote', 'metin__alinti');
      const p = el('p');
      satirlar(p, b.icerik);
      q.append(p);
      return q;
    }
    case 'ayrac': {
      const hr = el('hr', 'metin__ayrac');
      return hr;
    }
  }
}

/** Bölümün gövdesi: her blok data-p ile sıralanır (kalınan yer bu sıraya göre saklanır). */
export function bolumCiz(bolum: Bolum): { govde: HTMLElement; dipnotlar: HTMLElement | null } {
  const govde = el('div', 'metin');
  bolum.bloklar.forEach((b, i) => {
    const e = blok(b);
    e.dataset.p = String(i);
    govde.append(e);
  });

  if (!bolum.dipnotlar.length) return { govde, dipnotlar: null };
  const aside = el('aside', 'dipnotlar');
  aside.setAttribute('aria-label', 'Dipnotlar');
  const baslik = el('h2', 'dipnotlar__baslik');
  baslik.textContent = 'Dipnotlar';
  const ol = el('ol', 'dipnotlar__liste');
  for (const d of bolum.dipnotlar) {
    const li = el('li', 'dipnotlar__madde');
    li.id = `dipnot-${d.no}`;
    li.value = d.no;
    satirlar(li, d.icerik);
    ol.append(li);
  }
  aside.append(baslik, ol);
  return { govde, dipnotlar: aside };
}

export function dipnotIcerik(bolum: Bolum, no: number): DocumentFragment | null {
  const d = bolum.dipnotlar.find((x) => x.no === no);
  if (!d) return null;
  const f = document.createDocumentFragment();
  const p = el('p');
  satirlar(p, d.icerik);
  f.append(p);
  return f;
}
