// Bir Risale-i Nur cildinin ön kapağı (kitap açılırken görünür): yığındaki sırtla aynı deri (CILT, #D7787B; gren
// ve çapraz ışık), menteşe oluğu, kör baskı çift çerçeve, iki yanda sırttaki dantel şeridi (başlığa bakan gözyaşı
// + ok), ortada ten rengi kabartma ad (uzun ad iki satır), çift sırt çizgisi, "Said Nursî" ve altta "RİSALE-İ NUR
// KÜLLİYATI". Hepsi EB Garamond, ten rengi, kabartma. Altın süs, şemse ya da nokta yok. viewBox 0 0 300 426.
import { CILT, SATIR_EM, TEN } from '../oku/ortak';

/** Sayıyı iki ondalığa yuvarlar, gereksiz sıfırları atar */
const f = (v: number): string => (+v).toFixed(2).replace(/\.?0+$/, '');

const kacis = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Satırın em boyu (EB Garamond 600): ölçülmüş değer, yoksa kaba tahmin */
const en = (s: string): number => SATIR_EM[s] ?? s.length * 0.48;

/** Dantel motifi (80 x 70 birimlik karo): sivri gözyaşı (dolgun ucu dışta, sivri ucu başlığa) + ok başı */
const MOTIF =
  '<path d="M5 35C5 22 18 17.5 32 25.5L54 35L32 44.5C18 52.5 5 48 5 35Z" fill="currentColor"/>' +
  '<path d="M59 21.5L74 35L59 48.5" fill="none" stroke="currentColor" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>';

/** Kabartma karo: koyu kopya sağ alta, açık kopya sol üste, üstte soluk yüz. ayna: sağdaki şerit (motif sola bakar) */
function danteKaro(ayna: boolean): string {
  const sekil = ayna ? `<g transform="translate(80 0) scale(-1 1)">${MOTIF}</g>` : MOTIF;
  return (
    `<g transform="translate(3.5 4.5)" color="#460E16" opacity=".7">${sekil}</g>` +
    `<g transform="translate(-3 -3.5)" color="#FFF0EA" opacity=".8">${sekil}</g>` +
    `<g color="#FFECE6" opacity=".42">${sekil}</g>`
  );
}

/** Kapak adının satırları: tek satırda 30 birimin altına düşerse en dengeli boşluktan ikiye bölünür */
export function kapakSatirlari(ad: string): string[] {
  if (190 / en(ad) >= 30) return [ad];
  const k = ad.split(' ');
  let enIyi: { m: number; s: string[] } | null = null;
  for (let i = 1; i < k.length; i++) {
    const a = k.slice(0, i).join(' ');
    const b = k.slice(i).join(' ');
    const m = Math.max(en(a), en(b));
    if (!enIyi || m < enIyi.m) enIyi = { m, s: [a, b] };
  }
  return enIyi ? enIyi.s : [ad];
}

/** Kapağın SVG'si. p: kimlik öneki; ad: kitabın adı (tipografik kesme işaretiyle) */
export function kapakSvg(p: string, ad: string): string {
  const s = kapakSatirlari(ad);
  const boy = Math.min(40, 190 / Math.max(...s.map(en)));
  const lh = boy * 1.08;
  const y0 = 182 - ((s.length - 1) * lh) / 2;
  const son = y0 + (s.length - 1) * lh;
  // kabartma: koyu kenar sağ altta, ışık kenarı sol üstte, üstte ten rengi yüz
  const kabartma = (attr: string, metin: string) =>
    `<text ${attr} transform="translate(.9 1.1)" fill="#6E1E26" fill-opacity=".5">${metin}</text>` +
    `<text ${attr} transform="translate(-.7 -.8)" fill="#FFF6F0" fill-opacity=".45">${metin}</text>` +
    `<text ${attr} fill="${TEN}">${metin}</text>`;
  const adYazi = s
    .map((x, i) =>
      kabartma(
        `x="162" y="${f(y0 + i * lh)}" text-anchor="middle" font-family="EB Garamond, Georgia, serif" font-weight="600" font-size="${f(boy)}" letter-spacing="${f(boy * 0.01)}"`,
        kacis(x),
      ),
    )
    .join('');
  const ribY = son + 22;
  const rib = (y: number) =>
    `<path d="M132 ${f(y)}H192" stroke="#FFECE6" stroke-opacity=".55"/><path d="M132 ${f(y + 1)}H192" stroke="#3C0E16" stroke-opacity=".42"/>`;
  const dantel = (id: string, ayna: boolean) =>
    `<pattern id="${p}-${id}" width="10" height="8.75" patternUnits="userSpaceOnUse" viewBox="0 0 80 70">${danteKaro(ayna)}</pattern>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 426" preserveAspectRatio="none" aria-hidden="true"><defs>` +
    `<linearGradient id="${p}-isik" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFECE6" stop-opacity=".18"/><stop offset=".5" stop-color="#FFECE6" stop-opacity="0"/><stop offset="1" stop-color="#3C0E16" stop-opacity=".2"/></linearGradient>` +
    `<linearGradient id="${p}-mentese" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3C0E16" stop-opacity=".5"/><stop offset=".6" stop-color="#3C0E16" stop-opacity=".1"/><stop offset="1" stop-color="#3C0E16" stop-opacity="0"/></linearGradient>` +
    `<filter id="${p}-doku" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="7"/><feColorMatrix values="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 1"/></filter>` +
    dantel('dantel', false) +
    dantel('dantel-ayna', true) +
    `</defs>` +
    // deri, gren, çapraz ışık
    `<rect width="300" height="426" rx="6" fill="${CILT}"/>` +
    `<rect width="300" height="426" rx="6" filter="url(#${p}-doku)" style="mix-blend-mode:soft-light" opacity=".22"/>` +
    `<rect width="300" height="426" rx="6" fill="url(#${p}-isik)"/>` +
    // menteşe: gölge ve oluk
    `<rect width="24" height="426" fill="url(#${p}-mentese)"/>` +
    `<path d="M19 4V422" stroke="#3C0E16" stroke-opacity=".3"/><path d="M20.2 4V422" stroke="#FFE6E0" stroke-opacity=".24"/>` +
    // kör baskı çift çerçeve (koyu iz + açık kenar)
    `<rect x="34.5" y="18.5" width="250" height="389" rx="1" fill="none" stroke="#601A22" stroke-opacity=".4"/>` +
    `<rect x="35.5" y="19.5" width="250" height="389" rx="1" fill="none" stroke="#FFE6E0" stroke-opacity=".3"/>` +
    `<rect x="40.5" y="24.5" width="238" height="377" rx="1" fill="none" stroke="#601A22" stroke-opacity=".34"/>` +
    `<rect x="41.5" y="25.5" width="238" height="377" rx="1" fill="none" stroke="#FFE6E0" stroke-opacity=".26"/>` +
    // iki yanda dantel şeridi
    `<rect x="47" y="31" width="10" height="365" fill="url(#${p}-dantel)"/>` +
    `<rect x="262" y="31" width="10" height="365" fill="url(#${p}-dantel-ayna)"/>` +
    // ad, çift sırt çizgisi, yazar, etiket
    adYazi +
    rib(ribY) +
    rib(ribY + 4) +
    kabartma(`x="162" y="${f(ribY + 30)}" text-anchor="middle" font-family="EB Garamond, Georgia, serif" font-weight="500" font-size="15" letter-spacing=".3"`, 'Said Nursî') +
    kabartma(
      'x="162" y="377" text-anchor="middle" font-family="EB Garamond, Georgia, serif" font-weight="600" font-size="9.6" letter-spacing="2.3"',
      'RİSALE-İ NUR KÜLLİYATI',
    ) +
    `</svg>`
  );
}
