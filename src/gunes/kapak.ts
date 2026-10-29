// Bir Risale-i Nur cildinin ön kapağı (kitap açılırken görünür): cilt renginde deri, altın zencerek, köşebentler,
// şemse ve Tinos italik ad. viewBox 0 0 300 426.
const f = (v: number) => {
  const t = v.toFixed(1);
  return t.endsWith('.0') ? t.slice(0, -2) : t;
};

/** Badem (vesika) biçiminin kenar noktaları ve normalleri */
function vesikaNoktalari(cx: number, cy: number, a: number, b: number, n: number): [number, number, number, number][] {
  const r = (b * b) / a / 2 + a / 2;
  const c = r - a;
  const th = Math.asin(b / r);
  const yari = Math.floor(n / 2);
  const p: [number, number, number, number][] = [];
  for (let i = 0; i <= yari; i++) {
    const t = -th + (2 * th * i) / yari;
    p.push([cx - c + r * Math.cos(t), cy + r * Math.sin(t), Math.cos(t), Math.sin(t)]);
  }
  for (let i = 0; i <= yari; i++) {
    const t = Math.PI - th + (2 * th * i) / yari;
    p.push([cx + c + r * Math.cos(t), cy + r * Math.sin(t), Math.cos(t), Math.sin(t)]);
  }
  return p;
}
/** Kenarı dilimli şemse */
function dilimli(cx: number, cy: number, a: number, b: number, dilim: number, genlik: number, n = 440): string {
  const p = vesikaNoktalari(cx, cy, a, b, n);
  const yari = Math.floor(p.length / 2);
  return (
    'M' +
    p
      .map(([x, y, nx, ny], i) => {
        const k = Math.abs(Math.sin(dilim * Math.PI * ((i % yari) / yari)));
        return `${f(x + nx * genlik * k)} ${f(y + ny * genlik * k)}`;
      })
      .join(' L') +
    'Z'
  );
}
function vesika(cx: number, cy: number, a: number, b: number): string {
  const r = (b * b) / a / 2 + a / 2;
  return `M${f(cx)} ${f(cy - b)}A${f(r)} ${f(r)} 0 0 1 ${f(cx)} ${f(cy + b)}A${f(r)} ${f(r)} 0 0 1 ${f(cx)} ${f(cy - b)}Z`;
}
function koseBent(x: number, y: number, sx: number, sy: number, r: number, dilim: number, genlik: number, n = 60): string {
  const p: [number, number][] = [[x, y]];
  for (let i = 0; i <= n; i++) {
    const t = (Math.PI / 2) * (i / n);
    const rr = r + genlik * Math.abs(Math.sin(dilim * t * 2));
    p.push([x + sx * rr * Math.cos(t), y + sy * rr * Math.sin(t)]);
  }
  return 'M' + p.map(([px, py]) => `${f(px)} ${f(py)}`).join(' L') + 'Z';
}
/** Şemsenin ucundaki salbek (damla) */
function salbek(cx: number, cy: number, w: number, h: number): string {
  const s = h > 0 ? 1 : -1;
  h = Math.abs(h);
  return (
    `M${f(cx)} ${f(cy)}C${f(cx + w * 0.15)} ${f(cy + s * h * 0.25)} ${f(cx + w * 0.55)} ${f(cy + s * h * 0.25)} ${f(cx + w * 0.55)} ${f(cy + s * h * 0.62)}` +
    `C${f(cx + w * 0.55)} ${f(cy + s * h * 0.9)} ${f(cx + w * 0.2)} ${f(cy + s * h)} ${f(cx)} ${f(cy + s * h)}` +
    `C${f(cx - w * 0.2)} ${f(cy + s * h)} ${f(cx - w * 0.55)} ${f(cy + s * h * 0.9)} ${f(cx - w * 0.55)} ${f(cy + s * h * 0.62)}` +
    `C${f(cx - w * 0.55)} ${f(cy + s * h * 0.25)} ${f(cx - w * 0.15)} ${f(cy + s * h * 0.25)} ${f(cx)} ${f(cy)}Z`
  );
}

const kacis = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Kapağın SVG'si. p: kimlik öneki; renk: [orta, koyu, açık] */
export function kapakSvg(p: string, [orta, koyu, acik]: readonly [string, string, string], ad: string): string {
  const W = 300;
  const H = 426;
  const o: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">`, '<defs>'];
  o.push(`<linearGradient id="${p}-deri" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${acik}"/><stop offset=".55" stop-color="${orta}"/><stop offset="1" stop-color="${koyu}"/></linearGradient>`);
  o.push(`<radialGradient id="${p}-isik" cx=".3" cy=".18" r=".9"><stop offset="0" stop-color="#FFE9C4" stop-opacity=".16"/><stop offset="1" stop-color="#FFE9C4" stop-opacity="0"/></radialGradient>`);
  o.push(`<linearGradient id="${p}-altin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DB97"/><stop offset=".45" stop-color="#DDAE55"/><stop offset="1" stop-color="#A9741F"/></linearGradient>`);
  o.push(`<linearGradient id="${p}-altin-y" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6DB97"/><stop offset=".5" stop-color="#D8A64C"/><stop offset="1" stop-color="#A9741F"/></linearGradient>`);
  o.push(`<linearGradient id="${p}-mentese" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".6" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`);
  o.push('</defs>');
  o.push(`<rect width="${W}" height="${H}" rx="6" fill="url(#${p}-deri)"/>`);
  o.push(`<rect width="${W}" height="${H}" rx="6" fill="url(#${p}-isik)"/>`);
  o.push(`<rect width="22" height="${H}" fill="url(#${p}-mentese)"/>`);
  o.push(`<path d="M18 4V${H - 4}" stroke="#000" stroke-opacity=".22" stroke-width="1"/>`);
  // zencerek
  o.push(`<rect x="32" y="16" width="${W - 48}" height="${H - 32}" rx="2" fill="none" stroke="#DDAE55" stroke-width="1.4"/>`);
  o.push(`<rect x="37" y="21" width="${W - 58}" height="${H - 42}" rx="1.5" fill="none" stroke="#E7BE6C" stroke-width="2" stroke-dasharray="0 4.6" stroke-linecap="round"/>`);
  o.push(`<rect x="42" y="26" width="${W - 68}" height="${H - 52}" rx="1" fill="none" stroke="#DDAE55" stroke-width=".8"/>`);
  for (const [x, y, sx, sy] of [
    [42, 26, 1, 1],
    [W - 26, 26, -1, 1],
    [42, H - 26, 1, -1],
    [W - 26, H - 26, -1, -1],
  ]) {
    o.push(`<path d="${koseBent(x, y, sx, sy, 30, 3, 3)}" fill="url(#${p}-altin-y)"/>`);
    o.push(`<path d="${koseBent(x, y, sx, sy, 18, 2, 2)}" fill="${koyu}" fill-opacity=".9"/>`);
  }
  // şemse
  const cx = (42 + W - 26) / 2;
  const cy = 176;
  o.push(`<path d="${dilimli(cx, cy, 44, 70, 19, 2.6)}" fill="url(#${p}-altin)" stroke="#8A5A17" stroke-width=".6"/>`);
  o.push(`<path d="${vesika(cx, cy, 36, 59)}" fill="${koyu}"/>`);
  o.push(`<path d="${vesika(cx, cy, 33.5, 54)}" fill="none" stroke="#E2B865" stroke-width=".9"/>`);
  o.push(`<path d="${salbek(cx, cy - 76, 20, -20)}" fill="url(#${p}-altin)"/>`);
  o.push(`<path d="${salbek(cx, cy + 76, 20, 20)}" fill="url(#${p}-altin)"/>`);
  let gul = '<g fill="#EBC676">';
  for (let i = 0; i < 8; i++) gul += `<ellipse cx="${f(cx)}" cy="${cy - 6}" rx="2.4" ry="5.2" transform="rotate(${i * 45} ${f(cx)} ${cy})"/>`;
  o.push(`${gul}</g><circle cx="${f(cx)}" cy="${cy}" r="3" fill="${koyu}"/><circle cx="${f(cx)}" cy="${cy}" r="1.6" fill="#F6DB97"/>`);
  o.push(
    `<g fill="none" stroke="#E7C070" stroke-width="1.2" stroke-linecap="round">` +
      `<path d="M${f(cx)} ${cy - 10}C${f(cx - 13)} ${cy - 18} ${f(cx - 13)} ${cy - 32} ${f(cx)} ${cy - 44}C${f(cx + 13)} ${cy - 32} ${f(cx + 13)} ${cy - 18} ${f(cx)} ${cy - 10}Z"/>` +
      `<path d="M${f(cx)} ${cy + 10}C${f(cx - 13)} ${cy + 18} ${f(cx - 13)} ${cy + 32} ${f(cx)} ${cy + 44}C${f(cx + 13)} ${cy + 32} ${f(cx + 13)} ${cy + 18} ${f(cx)} ${cy + 10}Z"/></g>`,
  );
  // ad (uzun adlar küçülür)
  const boy = Math.min(34, 330 / Math.max(6, ad.length) + 6);
  o.push(`<text x="${f(cx)}" y="${cy + 132}" text-anchor="middle" font-family="Tinos, serif" font-style="italic" font-weight="700" font-size="${f(boy)}" fill="#F3D79B">${kacis(ad)}</text>`);
  o.push(`<path d="M${f(cx - 34)} ${cy + 148}H${f(cx + 34)}" stroke="#DDAE55" stroke-width="1"/>`);
  o.push(`<text x="${f(cx)}" y="${cy + 170}" text-anchor="middle" font-family="Encode Sans, sans-serif" font-weight="600" font-size="9.5" letter-spacing="2.4" fill="#E8C27A" fill-opacity=".85">RİSALE-İ NUR KÜLLİYATI</text>`);
  o.push('</svg>');
  return o.join('');
}
