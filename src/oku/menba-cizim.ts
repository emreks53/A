// Menba çizimi: büyük Kur'an-ı Kerim, altında Risale-i Nur Külliyatı dizili; videonun eseri öne çıkar.
// (Geçici sade çizim; son hâli tasarıma göre.)
import { KULLIYAT, tipografik } from './ortak';

const NS = 'http://www.w3.org/2000/svg';

export function menbaCizimi(eser: string): HTMLElement {
  const kap = document.createElement('div');
  kap.className = 'menba__cizim';
  kap.setAttribute('role', 'img');
  kap.setAttribute('aria-label', `Kur’an-ı Kerim ve altında Risale-i Nur eserleri; ${tipografik(eser)} öne çıkmış`);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 340 230');
  svg.setAttribute('aria-hidden', 'true');
  let govde = '<rect x="120" y="10" width="100" height="130" rx="8" fill="#1f4d3a"/><rect x="132" y="22" width="76" height="106" rx="5" fill="none" stroke="#d9b56a" stroke-width="2"/>';
  const w = 340 / KULLIYAT.length;
  KULLIYAT.forEach((k, i) => {
    const on = k === eser;
    const x = i * w + 1;
    govde += `<rect x="${x.toFixed(1)}" y="${on ? 152 : 160}" width="${(w - 2).toFixed(1)}" height="${on ? 70 : 62}" rx="2" fill="${on ? '#7a1f2b' : '#24432f'}"/>`;
  });
  svg.innerHTML = govde;
  kap.append(svg);
  return kap;
}
