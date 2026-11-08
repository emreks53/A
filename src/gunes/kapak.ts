// Bir Risale-i Nur cildinin ön kapağı (kitap açılırken görünür): raftaki sırtla aynı bez (#D7787B), menteşe oluğu,
// kör baskı çerçeve, varak ad ve altında ince çizgiyle "RİSALE-İ NUR KÜLLİYATI". Altın süs, şemse ya da nokta yok.
// viewBox 0 0 300 426.

/** Sayıyı iki ondalığa yuvarlar, gereksiz sıfırları atar */
const f = (v: number): string => (+v).toFixed(2).replace(/\.?0+$/, '');

const kacis = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Kapağın SVG'si. p: kimlik öneki; ad: kitabın adı (uzun adlar küçülür) */
export function kapakSvg(p: string, ad: string): string {
  const W = 300;
  const H = 426;
  // yazılar menteşenin sağında kalan alanın ortasında
  const cx = (22 + W) / 2;
  const y = H * 0.44;
  const boy = Math.min(34, 330 / Math.max(6, ad.length) + 6);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs>` +
    `<linearGradient id="${p}-isik" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFECE6" stop-opacity=".16"/><stop offset=".5" stop-color="#FFECE6" stop-opacity="0"/><stop offset="1" stop-color="#3C0E16" stop-opacity=".22"/></linearGradient>` +
    `<linearGradient id="${p}-mentese" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3C0E16" stop-opacity=".5"/><stop offset=".6" stop-color="#3C0E16" stop-opacity=".1"/><stop offset="1" stop-color="#3C0E16" stop-opacity="0"/></linearGradient>` +
    `<filter id="${p}-doku" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="7"/><feColorMatrix values="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 1"/></filter>` +
    `</defs>` +
    // bez, dokusu, çapraz ışık
    `<rect width="${W}" height="${H}" rx="6" fill="#D7787B"/>` +
    `<rect width="${W}" height="${H}" rx="6" filter="url(#${p}-doku)" style="mix-blend-mode:soft-light" opacity=".3"/>` +
    `<rect width="${W}" height="${H}" rx="6" fill="url(#${p}-isik)"/>` +
    // menteşe: gölge ve oluk
    `<rect width="22" height="${H}" fill="url(#${p}-mentese)"/>` +
    `<path d="M18 4V${H - 4}" stroke="#3C0E16" stroke-opacity=".28"/><path d="M19.2 4V${H - 4}" stroke="#FFE6E0" stroke-opacity=".22"/>` +
    // kör baskı çerçeve (koyu iz + açık kenar)
    `<rect x="36.5" y="20.5" width="${W - 56}" height="${H - 41}" rx="1" fill="none" stroke="#601A22" stroke-opacity=".38"/>` +
    `<rect x="37.5" y="21.5" width="${W - 56}" height="${H - 41}" rx="1" fill="none" stroke="#FFE6E0" stroke-opacity=".28"/>` +
    // varak ad, çizgi, etiket
    `<text x="${f(cx)}" y="${f(y)}" text-anchor="middle" font-family="EB Garamond, serif" font-weight="600" font-size="${f(boy)}" fill="#F6E6C4">${kacis(ad)}</text>` +
    `<path d="M${f(cx - 26)} ${f(y + 18)}H${f(cx + 26)}" stroke="#F6E6C4" stroke-opacity=".8" stroke-width=".8"/>` +
    `<text x="${f(cx)}" y="${f(y + 40)}" text-anchor="middle" font-family="Encode Sans, sans-serif" font-weight="600" font-size="9" letter-spacing="2.4" fill="#F6E6C4" fill-opacity=".85">RİSALE-İ NUR KÜLLİYATI</text>` +
    `</svg>`
  );
}
