// Menba çizimi: üstte nurlu Kur'an-ı Kerim (kuran-cizim.ts, Güneş'tekiyle aynı; 0,6 ölçek), altında Risale-i Nur
// Külliyatı'nın 14 cildi iki küçük düz yığında (Güneş'teki sıra ve fotoğraftaki kalınlık oranları), hepsi #D7787B
// deri ciltte, adları ten rengi kabartma. Videonun geçtiği eser yığından dışa doğru çekilmiştir: gölgeli, tam
// adıyla; arkasında yumuşak bir boş yuva kalır. Öteki ciltler kısa adlarıyla. Nokta (daire) yoktur.
// Ölçüler 390 x 312'lik çizim alanına göredir.
import { kuranSvg, NUR } from './kuran-cizim';
import { CILT, KALINLIK, KULLIYAT, SATIR_EM, SIRT, TEN, tipografik, YIGIN_SUTUN, type KulliyatEseri } from './ortak';

const NS = 'http://www.w3.org/2000/svg';

/** Sayıyı iki ondalığa yuvarlar, gereksiz sıfırları atar: 12.50 → "12.5", 12.00 → "12" */
const f = (v: number): string => (+v).toFixed(2).replace(/\.?0+$/, '');

/** SVG metninde & ve < kaçışı */
const kac = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Dantel motifi (80 x 70 birimlik karo): sivri gözyaşı (dolgun ucu dışta, sivri ucu başlığa) + ok başı */
const MOTIF =
  `<path d="M5 35C5 22 18 17.5 32 25.5L54 35L32 44.5C18 52.5 5 48 5 35Z" fill="currentColor"/>` +
  `<path d="M59 21.5L74 35L59 48.5" fill="none" stroke="currentColor" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>`;

export interface DantelRenk {
  koyu: string;
  acik: string;
  yuz: string;
}

/**
 * Sırtın dantel şeridinin kabartma karosu (viewBox 0 0 80 70 içeriği): koyu kopya sağ alta, açık kopya sol üste,
 * üstte soluk yüz. ayna: sağ uçtaki karo (motif başlığa, yani sola bakar; ışık yine sol üstten). Menba ve kapak
 * bunu <pattern> içinde kullanır; Güneş'teki sırt aynı karonun CSS veri adresini (--dantel-sol/-sag) kullanır.
 */
export function danteKaroSvg(ayna: boolean, renk: DantelRenk = { koyu: 'rgb(70,14,22)', acik: 'rgb(255,240,234)', yuz: 'rgb(255,236,230)' }): string {
  const sekil = ayna ? `<g transform="translate(80 0) scale(-1 1)">${MOTIF}</g>` : MOTIF;
  return (
    `<g transform="translate(3.5 4.5)" color="${renk.koyu}" opacity=".7">${sekil}</g>` +
    `<g transform="translate(-3 -3.5)" color="${renk.acik}" opacity=".8">${sekil}</g>` +
    `<g color="${renk.yuz}" opacity=".42">${sekil}</g>`
  );
}

/** Oran 1'in birim karşılığı (iki yığında tek ölçek), bant eni, yığınlar arası, yığınların tabanı,
    çekilen kitabın kayması ve uç bölgesi */
const SM = 168;
const BM = 114;
const ARA = 12;
const TABAN = 304;
const CEK = 44;
const ZM = 13;
/** Kur'an'ın ölçeği ve nurun merkezi (y); ışınlar 128 x .6 = 77 birimde söner, çizimin üstüne değmez */
const KS = 0.6;
const NUR_Y = 84;
const NUR_R = 128;

interface Bant {
  ad: KulliyatEseri;
  x: number;
  y: number;
  h: number;
  /** yığından çekilme yönü: sol yığın -1, sağ yığın +1 */
  yon: -1 | 1;
}

/** Satırın em boyu (EB Garamond 600, .01em) */
const em = (s: string) => SATIR_EM[s] ?? s.length * 0.55;

/** Çizimin SVG içeriği. p: bu çizime özgü kimlik öneki (sayfada birden çok çizim olabilir). */
export function menbaSvgIcerigi(eser: string, p: string): string {
  const x0 = 195 - ARA / 2 - BM;
  const x1 = 195 + ARA / 2;
  const bantlar: Bant[] = [];
  const yigin = (liste: readonly KulliyatEseri[], x: number, yon: -1 | 1) => {
    let y = TABAN - liste.reduce((t, ad) => t + KALINLIK[ad] * SM, 0);
    for (const ad of liste) {
      const h = KALINLIK[ad] * SM;
      bantlar.push({ ad, x, y, h, yon });
      y += h;
    }
  };
  yigin(KULLIYAT.slice(0, YIGIN_SUTUN), x0, -1);
  yigin(KULLIYAT.slice(YIGIN_SUTUN), x1, 1);

  let sayac = 0;
  /** Bir bant: deri, dışbükey gölge, yuvarlak uçlar, üçer sırt, dantel şeridi ve ten rengi kabartma ad */
  const bant = (b: Bant, sec: boolean): string => {
    const { x, y, h } = b;
    const w = BM;
    const alan = w - 2 * ZM - 6;
    const s = SIRT[b.ad];
    const boy = (satirlar: string[], ust: number) =>
      Math.min(ust, alan / Math.max(...satirlar.map(em)), (h * 0.5) / (satirlar.length > 1 ? 1.9 : 0.9));
    // çekilen kitap tam adıyla (iki satırlı ad tek satırda daha büyük kalıyorsa tek satır); öteki kitaplar kısa adla
    let satirlar = sec ? s.satirlar : [s.kisa];
    let fs = boy(satirlar, sec ? 11.5 : 7.6);
    if (sec && satirlar.length > 1) {
      const tek = [satirlar.join(' ')];
      if (boy(tek, 11.5) > fs) {
        satirlar = tek;
        fs = boy(tek, 11.5);
      }
    }
    const cx = x + w / 2;
    const cy = y + h / 2;
    // her satır tek <text class="sirt"> (yüz); kabartma kenarları aynı metnin <use> kopyaları (fill <use>'dan gelir)
    const yazi = satirlar
      .map((t, i) => {
        const id = `${p}-y${++sayac}`;
        const ty = cy + (i - (satirlar.length - 1) / 2) * fs * 0.95 + fs * 0.3;
        return (
          `<use href="#${id}" transform="translate(-.4 -.45)" fill="#FFF6F0" fill-opacity=".4"/><use href="#${id}" transform="translate(.45 .6)" fill="#782A30" fill-opacity=".55"/>` +
          `<text id="${id}" class="sirt" x="${f(cx)}" y="${f(ty)}">${kac(t)}</text>`
        );
      })
      .join('');
    const ry = f(Math.min(2.4, h * 0.22));
    const kutu = `x="${f(x)}" y="${f(y)}" width="${w}" height="${f(h)}" rx="1.6" ry="${ry}"`;
    const rib = (xx: number) =>
      `<rect x="${f(xx)}" y="${f(y + 0.6)}" width=".7" height="${f(h - 1.2)}" fill="#FFECE6" fill-opacity=".5"/>` +
      `<rect x="${f(xx + 0.7)}" y="${f(y + 0.6)}" width=".6" height="${f(h - 1.2)}" fill="#3C0E16" fill-opacity=".42"/>`;
    const uc = (sol: boolean) => {
      const r = (d: number) => (sol ? x + d : x + w - d - 1.3);
      return (
        rib(r(2.6)) +
        rib(r(4.4)) +
        rib(r(6.0)) +
        `<rect x="${f(sol ? x + 7.6 : x + w - 7.6 - 4.8)}" y="${f(y + 0.8)}" width="4.8" height="${f(h - 1.6)}" fill="url(#${p}-dantel-${sol ? 'sol' : 'sag'})"/>`
      );
    };
    return (
      `<g class="cilt" data-ad="${kac(b.ad)}"${sec ? ` data-secili="" filter="url(#${p}-cekilen)"` : ''}>` +
      `<rect ${kutu} fill="${CILT}"/><rect ${kutu} fill="url(#${p}-disbukey)"/><rect ${kutu} fill="url(#${p}-uclar)"/>` +
      uc(true) +
      uc(false) +
      `<g font-family="EB Garamond, serif" font-weight="600" font-size="${f(fs)}" letter-spacing="${f(fs * 0.01)}" text-anchor="middle" fill="${TEN}">${yazi}</g></g>`
    );
  };

  const secili = bantlar.find((b) => b.ad === eser);
  const digerleri = bantlar.filter((b) => b !== secili);
  const dantel = (ad: string, ayna: boolean) =>
    `<pattern id="${p}-dantel-${ad}" width="4.8" height="4.2" patternUnits="userSpaceOnUse" viewBox="0 0 80 70">${danteKaroSvg(ayna, { koyu: '#460E16', acik: '#FFF0EA', yuz: '#FFECE6' })}</pattern>`;
  const o: string[] = [];
  o.push(`<defs>
<linearGradient id="${p}-disbukey" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3C0E16" stop-opacity=".6"/><stop offset=".07" stop-color="#3C0E16" stop-opacity=".12"/><stop offset=".2" stop-color="#FFECE6" stop-opacity=".18"/><stop offset=".31" stop-color="#FFECE6" stop-opacity=".22"/><stop offset=".46" stop-color="#FFECE6" stop-opacity=".08"/><stop offset=".56" stop-color="#FFECE6" stop-opacity="0"/><stop offset=".72" stop-color="#3C0E16" stop-opacity=".08"/><stop offset=".88" stop-color="#3C0E16" stop-opacity=".24"/><stop offset="1" stop-color="#3C0E16" stop-opacity=".62"/></linearGradient>
<linearGradient id="${p}-uclar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3C0E16" stop-opacity=".55"/><stop offset=".012" stop-color="#FFECE6" stop-opacity=".22"/><stop offset=".03" stop-color="#3C0E16" stop-opacity=".2"/><stop offset=".045" stop-color="#3C0E16" stop-opacity="0"/><stop offset=".955" stop-color="#3C0E16" stop-opacity="0"/><stop offset=".975" stop-color="#3C0E16" stop-opacity=".25"/><stop offset=".988" stop-color="#FFECE6" stop-opacity=".08"/><stop offset="1" stop-color="#3C0E16" stop-opacity=".62"/></linearGradient>
${dantel('sol', false)}${dantel('sag', true)}
<linearGradient id="${p}-yuva" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A161B" stop-opacity=".62"/><stop offset=".5" stop-color="#5E2228" stop-opacity=".46"/><stop offset="1" stop-color="#7A3036" stop-opacity=".34"/></linearGradient>
<radialGradient id="${p}-golge" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#703C30" stop-opacity=".34"/><stop offset=".6" stop-color="#703C30" stop-opacity=".12"/><stop offset="1" stop-color="#703C30" stop-opacity="0"/></radialGradient>
<filter id="${p}-cekilen" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="b"/><feOffset in="b" dx="1.2" dy="2.4" result="o"/><feFlood flood-color="#5A2428" flood-opacity=".42"/><feComposite in2="o" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>`);
  // nurlu Kur'an: nurun merkezi (195, 84); ışınlar 77 birimde söner, çizimin içinde kalır (kaydırma kutusu kesmez)
  o.push(`<g transform="translate(${f(195 - NUR.cx * KS)} ${f(NUR_Y - NUR.cy * KS)}) scale(${KS})">${kuranSvg(`${p}-k`, { nur: 0.9, r: NUR_R })}</g>`);
  // yığınların masaya değdiği yerde yumuşak sıcak gölge
  o.push(`<rect x="${f(x0 - 8)}" y="${TABAN - 4}" width="${BM + 16}" height="10" fill="url(#${p}-golge)"/>`);
  o.push(`<rect x="${f(x1 - 8)}" y="${TABAN - 4}" width="${BM + 16}" height="10" fill="url(#${p}-golge)"/>`);
  o.push(digerleri.map((b) => bant(b, false)).join('\n'));
  if (secili) {
    // çekilen kitabın boş kalan yuvası, altında ince ışık kenarı; kitap dışa doğru çekilmiş, en son çizilir
    o.push(
      `<rect x="${f(secili.x + 0.5)}" y="${f(secili.y)}" width="${BM - 1}" height="${f(secili.h)}" rx="1.2" fill="url(#${p}-yuva)"/>` +
        `<rect x="${f(secili.x + 1)}" y="${f(secili.y + secili.h - 0.8)}" width="${BM - 2}" height=".8" fill="#FFECE6" fill-opacity=".3"/>`,
    );
    o.push(bant({ ...secili, x: secili.x + secili.yon * CEK }, true));
  }
  return o.join('\n');
}

let sayac = 0;

export function menbaCizimi(eser: string): HTMLElement {
  const kap = document.createElement('div');
  kap.className = 'menba__cizim';
  kap.setAttribute('role', 'img');
  const kulliyatta = (KULLIYAT as readonly string[]).includes(eser);
  kap.setAttribute('aria-label', `Nurlu Kur’an-ı Kerim; altında Risale-i Nur Külliyatı${kulliyatta ? `, ${tipografik(eser)} yığından çekilmiş` : ''}`);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'menba-sahne');
  svg.setAttribute('viewBox', '0 0 390 312');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = menbaSvgIcerigi(eser, `menba${++sayac}`);
  kap.append(svg);
  return kap;
}
