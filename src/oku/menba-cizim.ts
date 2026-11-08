// Menba çizimi: rahle üzerinde inci beyazı Kur'an-ı Kerim (kuran-cizim.ts, Güneş'tekiyle aynı); altında mürekkep
// laciverti bir rafta Risale-i Nur Külliyatı'nın 14 cildi, hepsi #D7787B bez ciltte ve gerçek kalınlıklarıyla
// (RNK baskısının sayfa sayısına göre) dizili. Videonun geçtiği eser raftan biraz öne çekilmiştir; öteki ciltlerin
// üstünde hafif bir perde vardır. Altın dolgu, parıltı ya da nokta yoktur.
// Ölçüler 390 x 296'lık çizim alanına göredir.
import { kuranSvg } from './kuran-cizim';
import { CILT, kalinlikMm, KULLIYAT, SATIR_EM, SIRT, tipografik } from './ortak';

const NS = 'http://www.w3.org/2000/svg';

/** Sayıyı iki ondalığa yuvarlar, gereksiz sıfırları atar: 12.50 → "12.5", 12.00 → "12" */
const f = (v: number): string => (+v).toFixed(2).replace(/\.?0+$/, '');

/** SVG metninde & ve < kaçışı */
const kac = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Çizim alanı: genişlik, rafın sol ve sağ boşluğu, ciltler arası */
const W = 390;
const SOL = 22;
const SAG = 22;
const ARA = 0.6;
/** Sırtların boyu, rafın üst yüzü (sırtların tabanı) ve sırtların tepesi */
const H = 80;
const TABAN = 279;
const UST = TABAN - H;

interface Cilt {
  ad: string;
  x: number;
  w: number;
}

/** Çizimin SVG içeriği. p: bu çizime özgü kimlik öneki (sayfada birden çok çizim olabilir). */
export function menbaSvgIcerigi(eser: string, p: string): string {
  // bütün raf tek ölçekte: 14 cildin toplam kalınlığı (383,25 mm) rafın genişliğine sığar (~0,88 px/mm)
  const mm = KULLIYAT.map((ad) => +kalinlikMm(ad).toFixed(2));
  const k = (W - SOL - SAG - (KULLIYAT.length - 1) * ARA) / mm.reduce((t, m) => t + m, 0);
  let x = SOL;
  const ciltler: Cilt[] = KULLIYAT.map((ad, i) => {
    const c = { ad, x, w: mm[i] * k };
    x += c.w + ARA;
    return c;
  });
  const secili = ciltler.find((c) => c.ad === eser);
  const raftakiler = ciltler.filter((c) => c !== secili);

  // kör baskı çift çizgi (koyu iz, altında ince ışık)
  const kor = (c: Cilt, yy: number) =>
    `<rect x="${f(c.x + 1.5)}" y="${f(UST + yy)}" width="${f(c.w - 3)}" height=".6" fill="#601A22" fill-opacity=".42"/>` +
    `<rect x="${f(c.x + 1.5)}" y="${f(UST + yy + 0.6)}" width="${f(c.w - 3)}" height=".6" fill="#FFE6E0" fill-opacity=".3"/>`;

  /** Bir cildin sırtı. Raftakilerde kısa ad, öne çekilende Güneş'teki satırlar; yazı aşağıdan yukarı okunur. */
  const sirt = (c: Cilt, cekilen: boolean): string => {
    const s = SIRT[c.ad as (typeof KULLIYAT)[number]];
    const satirlar = cekilen ? s.satirlar : [s.kisa];
    const uz = Math.max(...satirlar.map((t) => SATIR_EM[t] ?? t.length * 0.55));
    const fs = Math.min(cekilen ? 7.6 : 5.4, (c.w - 2.4) / (satirlar.length * 1.1), (H * 0.72) / uz);
    const cx = c.x + c.w / 2;
    const cy = UST + H / 2;
    // rotate(-90) ile yazı aşağıdan yukarı okunur; ilk satır solda kalır
    const yazi = satirlar
      .map((t, i) => `<text x="0" y="${f((i - (satirlar.length - 1) / 2) * fs * 1.08)}" text-anchor="middle" dominant-baseline="central">${kac(t)}</text>`)
      .join('');
    const kutu = `x="${f(c.x)}" y="${UST}" width="${f(c.w)}" height="${H}"`;
    return (
      `<g><rect ${kutu} rx="1.2" fill="${CILT}"/>` +
      `<rect ${kutu} rx="1.2" fill="url(#${p}-yuvarlak)"/>` +
      `<rect ${kutu} rx="1.2" fill="url(#${p}-tepe)"/>` +
      (cekilen ? `<rect ${kutu} filter="url(#${p}-doku)" style="mix-blend-mode:soft-light" opacity=".3"/>` : '') +
      kor(c, H * 0.06) +
      kor(c, H * 0.085) +
      kor(c, H - H * 0.085 - 1.2) +
      kor(c, H - H * 0.06 - 1.2) +
      `<g transform="translate(${f(cx)} ${f(cy)}) rotate(-90)" font-family="EB Garamond, serif" font-weight="600" font-size="${f(fs)}" letter-spacing="${f(fs * 0.02)}" fill="#F6E6C4">${yazi}</g></g>`
    );
  };

  const o: string[] = [];
  o.push(`<defs>
<linearGradient id="${p}-yuvarlak" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#3C0E16" stop-opacity=".5"/><stop offset=".07" stop-color="#3C0E16" stop-opacity=".1"/>
<stop offset=".14" stop-color="#FFECE6" stop-opacity="0"/><stop offset=".3" stop-color="#FFECE6" stop-opacity=".14"/>
<stop offset=".46" stop-color="#FFECE6" stop-opacity=".04"/><stop offset=".6" stop-color="#3C0E16" stop-opacity="0"/>
<stop offset=".85" stop-color="#3C0E16" stop-opacity=".12"/><stop offset="1" stop-color="#3C0E16" stop-opacity=".55"/>
</linearGradient>
<linearGradient id="${p}-tepe" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#FFECE6" stop-opacity=".18"/><stop offset=".08" stop-color="#FFECE6" stop-opacity="0"/>
<stop offset=".7" stop-color="#3C0E16" stop-opacity="0"/><stop offset="1" stop-color="#3C0E16" stop-opacity=".26"/>
</linearGradient>
<linearGradient id="${p}-tahta" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#303C6B"/><stop offset=".36" stop-color="#232E5A"/><stop offset=".36" stop-color="#D9C49A" stop-opacity=".5"/>
<stop offset=".41" stop-color="#D9C49A" stop-opacity=".5"/><stop offset=".41" stop-color="#172148"/><stop offset="1" stop-color="#0B132E"/>
</linearGradient>
<filter id="${p}-doku" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="7"/><feColorMatrix values="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 1"/></filter>
<filter id="${p}-cekilen" x="-60%" y="-20%" width="220%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.4"/><feOffset dy="1.5"/><feComponentTransfer><feFuncA type="linear" slope=".7"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="${p}-tahta-gol" x="-10%" y="-100%" width="120%" height="400%"><feGaussianBlur stdDeviation="4"/></filter>
<clipPath id="${p}-ciltler">${raftakiler.map((c) => `<rect x="${f(c.x)}" y="${UST}" width="${f(c.w)}" height="${H}" rx="1.2"/>`).join('')}</clipPath>
</defs>`);
  // rahle üzerinde Kur'an-ı Kerim, 0,8 ölçekte, ortada
  const s = 0.8;
  o.push(`<g transform="translate(${f(W / 2 - 130 * s)} 2) scale(${s})">${kuranSvg(`${p}-k`)}</g>`);
  // rafın gölgesi, mürekkep tahtası (Güneş'teki gibi: aydınlık üst yüz, şampanya kenar çizgisi) ve temas gölgesi
  o.push(`<rect x="${SOL - 8}" y="${TABAN + 6}" width="${W - SOL - SAG + 16}" height="8" fill="#000" fill-opacity=".7" filter="url(#${p}-tahta-gol)"/>`);
  o.push(`<rect x="${SOL - 8}" y="${TABAN}" width="${W - SOL - SAG + 16}" height="10" rx="1" fill="url(#${p}-tahta)"/>`);
  o.push(`<rect x="${SOL - 8}" y="${TABAN}" width="${W - SOL - SAG + 16}" height="2" fill="#030510" fill-opacity=".5"/>`);
  o.push(`<g>${raftakiler.map((c) => sirt(c, false)).join('')}</g>`);
  // bütün raf için tek bez dokusu (sırtlara kırpılmış; 14 ayrı süzgeç yerine bir tane) ve hafif perde
  o.push(`<rect x="${SOL}" y="${UST}" width="${W - SOL - SAG}" height="${H}" filter="url(#${p}-doku)" clip-path="url(#${p}-ciltler)" style="mix-blend-mode:soft-light" opacity=".3"/>`);
  o.push(`<rect x="${SOL}" y="${UST}" width="${W - SOL - SAG}" height="${H}" fill="#050817" fill-opacity=".14" clip-path="url(#${p}-ciltler)"/>`);
  if (secili) {
    // öne çekilen cilt: 1,07 kat büyük, tahtanın 3 px önüne taşar, altında yumuşak gölge
    const ox = secili.x + secili.w / 2;
    o.push(`<g filter="url(#${p}-cekilen)" transform="translate(${f(ox)} ${TABAN + 3}) scale(1.07) translate(${f(-ox)} ${-TABAN})">${sirt(secili, true)}</g>`);
  }
  return o.join('\n');
}

let sayac = 0;

export function menbaCizimi(eser: string): HTMLElement {
  const kap = document.createElement('div');
  kap.className = 'menba__cizim';
  kap.setAttribute('role', 'img');
  kap.setAttribute('aria-label', `Rahle üzerinde Kur’an-ı Kerim; altında rafta Risale-i Nur Külliyatı, ${tipografik(eser)} öne çıkmış`);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'menba-sahne');
  svg.setAttribute('viewBox', '0 0 390 296');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = menbaSvgIcerigi(eser, `menba${++sayac}`);
  kap.append(svg);
  return kap;
}
