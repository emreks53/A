// Menba çizimi: nur içinde, rahle üzerinde büyük bir Kur'an-ı Kerim (sırtı sağda, şemseli, köşebentli cilt);
// altında rafta Risale-i Nur Külliyatı dizili. Videonun geçtiği eser raftan biraz öne çekilmiş ve aydınlanmıştır.
// Ölçüler 390 x 458'lik çizim alanına göredir.
import { KULLIYAT, tipografik } from './ortak';

const NS = 'http://www.w3.org/2000/svg';

/** Sayıyı bir ondalığa yuvarlar, gereksiz sıfırı atar: 12.0 → "12", 12.46 → "12.5" */
const f = (v: number): string => {
  const t = v.toFixed(1);
  return t.endsWith('.0') ? t.slice(0, -2) : t;
};

type Nokta = [number, number, number, number];

/** İki çember yayından sivri oval (yarım genişlik a, yarım yükseklik b); her noktada dış normal */
function vesikaNoktalari(cx: number, cy: number, a: number, b: number, n = 400): Nokta[] {
  const r = (b * b) / a / 2 + a / 2;
  const c = r - a;
  const th = Math.asin(b / r);
  const yari = Math.floor(n / 2);
  const p: Nokta[] = [];
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

/** Kenarı dilimli sivri oval (şemse) */
function dilimli(cx: number, cy: number, a: number, b: number, dilim = 11, genlik = 3, n = 440): string {
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

/** (x, y) köşesinden (sx, sy) yönüne açılan dilimli çeyrek madalyon (köşebent) */
function koseBent(x: number, y: number, sx: number, sy: number, r = 24, dilim = 4, genlik = 2.4, n = 60): string {
  const p: [number, number][] = [[x, y]];
  for (let i = 0; i <= n; i++) {
    const t = (Math.PI / 2) * (i / n);
    const rr = r + genlik * Math.abs(Math.sin(dilim * t * 2));
    p.push([x + sx * rr * Math.cos(t), y + sy * rr * Math.sin(t)]);
  }
  return 'M' + p.map(([px, py]) => `${f(px)} ${f(py)}`).join(' L') + 'Z';
}

/** Şemsenin ucundaki küçük salbek; h'nin işareti yönünü verir */
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

/** Raftaki ciltler, KULLIYAT sırasıyla: sırt yazısı, öne çıkınca yazılan ad, genişlik, yükseklik */
const CILTLER: { sirt: string; ad: string; w: number; h: number }[] = [
  { sirt: 'SÖZLER', ad: 'Sözler', w: 26, h: 94 },
  { sirt: 'MEKTUBAT', ad: 'Mektubat', w: 25, h: 90 },
  { sirt: 'LEM’ALAR', ad: 'Lem’alar', w: 25, h: 92 },
  { sirt: 'ŞUÂLAR', ad: 'Şuâlar', w: 26, h: 95 },
  { sirt: 'İŞÂRÂT', ad: 'İşârât', w: 21, h: 86 },
  { sirt: 'MESNEVÎ', ad: 'Mesnevî', w: 21, h: 88 },
  { sirt: 'ASÂ-YI MÛSÂ', ad: 'Asâ-yı Mûsâ', w: 20, h: 84 },
  { sirt: 'BARLA', ad: 'Barla', w: 21, h: 89 },
  { sirt: 'KASTAMONU', ad: 'Kastamonu', w: 21, h: 87 },
  { sirt: 'EMİRDAĞ', ad: 'Emirdağ', w: 23, h: 91 },
  { sirt: 'SİKKE', ad: 'Sikke', w: 19, h: 85 },
  { sirt: 'TARİHÇE', ad: 'Tarihçe', w: 23, h: 93 },
  { sirt: 'MUHÂKEMAT', ad: 'Muhâkemat', w: 19, h: 83 },
  { sirt: 'MUVÂZENE', ad: 'Muvâzene', w: 18, h: 82 },
];

/** Cilt renkleri (orta, koyu, açık); kitaplar Külliyat sırasıyla bunları döner (Kenz'deki sırtlarla aynı) */
const RENKLER: [string, string, string][] = [
  ['#22336A', '#15204A', '#2E4282'],
  ['#6A2330', '#4A1520', '#83303E'],
  ['#1F4A3B', '#133226', '#2A5E4C'],
  ['#5A3720', '#3E2513', '#71482B'],
  ['#1B4656', '#112F3B', '#25596C'],
  ['#46295A', '#2F1A3E', '#5A3672'],
];

/** Çizimin SVG içeriği. p: bu çizime özgü kimlik öneki (sayfada birden çok çizim olabilir). */
export function menbaSvgIcerigi(eser: string, p: string): string {
  const o: string[] = [];
  const secili = (KULLIYAT as readonly string[]).indexOf(eser);

  o.push('<defs>');
  o.push(`<radialGradient id="${p}-nur" cx="195" cy="165" r="168" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFD991" stop-opacity=".32"/><stop offset=".45" stop-color="#F3C677" stop-opacity=".12"/><stop offset="1" stop-color="#F3C677" stop-opacity="0"/></radialGradient>`);
  o.push(`<linearGradient id="${p}-deri" x1="120" y1="56" x2="270" y2="256" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7E2A2F"/><stop offset=".55" stop-color="#5C1B21"/><stop offset="1" stop-color="#431219"/></linearGradient>`);
  o.push(`<radialGradient id="${p}-isik" cx="150" cy="78" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFE2BE" stop-opacity=".16"/><stop offset="1" stop-color="#FFE2BE" stop-opacity="0"/></radialGradient>`);
  o.push(`<linearGradient id="${p}-altin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DB97"/><stop offset=".45" stop-color="#DDAE55"/><stop offset="1" stop-color="#A9741F"/></linearGradient>`);
  o.push(`<linearGradient id="${p}-altin-y" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6DB97"/><stop offset=".5" stop-color="#D8A64C"/><stop offset="1" stop-color="#A9741F"/></linearGradient>`);
  o.push(`<linearGradient id="${p}-sirt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3B0F15"/><stop offset=".5" stop-color="#5E1D23"/><stop offset="1" stop-color="#320D12"/></linearGradient>`);
  o.push(`<linearGradient id="${p}-ahsap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E5A2E"/><stop offset="1" stop-color="#5B3519"/></linearGradient>`);
  o.push(`<linearGradient id="${p}-raf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A5A30"/><stop offset=".35" stop-color="#6A4122"/><stop offset="1" stop-color="#3F2511"/></linearGradient>`);
  o.push(`<radialGradient id="${p}-parilti" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFD991" stop-opacity=".55"/><stop offset="1" stop-color="#FFD991" stop-opacity="0"/></radialGradient>`);
  o.push(`<linearGradient id="${p}-ceviz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E5A2E"/><stop offset=".5" stop-color="#6A4122"/><stop offset="1" stop-color="#3F2410"/></linearGradient>`);
  o.push(`<linearGradient id="${p}-sedef" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF7EC"/><stop offset=".3" stop-color="#F3DDE6"/><stop offset=".55" stop-color="#DCEBF6"/><stop offset=".8" stop-color="#E2F2E6"/><stop offset="1" stop-color="#FBF1DA"/></linearGradient>`);
  o.push(`<filter id="${p}-gol" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3.5"/></filter>`);
  o.push(`<filter id="${p}-kitapgol" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="6"/><feOffset dy="6"/><feComponentTransfer><feFuncA type="linear" slope=".55"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  RENKLER.forEach(([orta, koyu, acik], i) => {
    o.push(`<linearGradient id="${p}-c${i}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${koyu}"/><stop offset=".42" stop-color="${acik}"/><stop offset=".62" stop-color="${orta}"/><stop offset="1" stop-color="${koyu}"/></linearGradient>`);
  });
  o.push('</defs>');

  // nur ve mihrap kemeri
  o.push(`<circle cx="195" cy="165" r="168" fill="url(#${p}-nur)"/>`);
  o.push('<path d="M96 292V150C96 92 140 52 195 14C250 52 294 92 294 150V292" fill="none" stroke="#E8C27A" stroke-opacity=".20" stroke-width="1"/>');
  o.push('<path d="M106 292V152C106 99 146 62 195 27C244 62 284 99 284 152V292" fill="none" stroke="#E8C27A" stroke-opacity=".10" stroke-width="1"/>');

  // rahlenin oymalı tepeliği (kitabın arkasında)
  const tepe = 'M136 70V50C136 38 152 33 167 28C180 23 190 15 195 6C200 15 210 23 223 28C238 33 254 38 254 50V70Z';
  const delik = 'M158 66V53C158 45 172 40 184 34C189 31 193 26 195 21C197 26 201 31 206 34C218 40 232 45 232 53V66Z';
  o.push(`<path d="${tepe}${delik}" fill-rule="evenodd" fill="url(#${p}-ahsap)"/>`);
  o.push('<path d="M145 66V51C145 42 159 37 172 32C182 28 190 21 195 14C200 21 208 28 218 32C231 37 245 42 245 51V66" fill="none" stroke="#D9A955" stroke-opacity=".7" stroke-width=".8"/>');
  o.push(`<circle cx="195" cy="6" r="2.6" fill="url(#${p}-altin)"/>`);

  // mushaf: ön kapak bize dönük, sırtı sağda
  o.push(`<g filter="url(#${p}-kitapgol)">`);
  o.push(`<path d="M270 58L281 63V254L270 258Z" fill="url(#${p}-sirt)"/>`);
  for (const y of [78, 84, 226, 232]) {
    o.push(`<path d="M270.5 ${y}L280.5 ${f(y + 2.2)}" stroke="#D9A955" stroke-opacity=".8" stroke-width=".9"/>`);
  }
  o.push(`<rect x="120" y="56" width="150" height="202" rx="5" fill="url(#${p}-deri)"/>`);
  o.push('</g>');
  o.push(`<rect x="120" y="56" width="150" height="202" rx="5" fill="url(#${p}-isik)"/>`);
  o.push('<rect x="120.5" y="56.5" width="149" height="201" rx="4.5" fill="none" stroke="#2A080C" stroke-opacity=".6"/>');
  o.push('<path d="M122 250V61.5Q122 58 125.5 58H264" fill="none" stroke="#B4565B" stroke-opacity=".45" stroke-width="1"/>');
  // zencerek (üç kat altın pervaz)
  o.push('<rect x="127" y="63" width="136" height="188" rx="2" fill="none" stroke="#DDAE55" stroke-width="1.1"/>');
  o.push('<rect x="130" y="66" width="130" height="182" rx="1.5" fill="none" stroke="#E7BE6C" stroke-width="1.6" stroke-dasharray="0 3.6" stroke-linecap="round"/>');
  o.push('<rect x="133" y="69" width="124" height="176" rx="1" fill="none" stroke="#DDAE55" stroke-width=".6"/>');
  // köşebentler
  for (const [x, y, sx, sy] of [
    [133, 69, 1, 1],
    [257, 69, -1, 1],
    [133, 245, 1, -1],
    [257, 245, -1, -1],
  ]) {
    o.push(`<path d="${koseBent(x, y, sx, sy, 22, 3, 2.2)}" fill="url(#${p}-altin-y)"/>`);
    o.push(`<path d="${koseBent(x, y, sx, sy, 13, 2, 1.4)}" fill="#5A1A20" fill-opacity=".85"/>`);
    o.push(`<circle cx="${f(x + sx * 5.5)}" cy="${f(y + sy * 5.5)}" r="1.6" fill="#E9C474"/>`);
  }
  // şemse ve salbekler
  const cx = 195;
  const cy = 157;
  o.push(`<path d="M${cx} 92V104M${cx} 210V222" stroke="#DDAE55" stroke-width="1.2"/>`);
  o.push(`<path d="${salbek(cx, 104, 15, -15)}" fill="url(#${p}-altin)"/>`);
  o.push(`<path d="${salbek(cx, 210, 15, 15)}" fill="url(#${p}-altin)"/>`);
  o.push(`<path d="${salbek(cx, 101, 7, -7)}" fill="#5A1A20" fill-opacity=".8"/>`);
  o.push(`<path d="${salbek(cx, 213, 7, 7)}" fill="#5A1A20" fill-opacity=".8"/>`);
  o.push(`<path d="${dilimli(cx, cy, 31, 51, 17, 2.0)}" fill="url(#${p}-altin)" stroke="#8A5A17" stroke-width=".5"/>`);
  o.push(`<path d="${vesika(cx, cy, 25, 42.5)}" fill="#5C1B21"/>`);
  o.push(`<path d="${vesika(cx, cy, 23.5, 39)}" fill="none" stroke="#E2B865" stroke-width=".7"/>`);
  // şemsenin içinde rumî kıvrımlar
  let g = '<g fill="none" stroke="#E7C070" stroke-width="1" stroke-linecap="round">';
  g += `<path d="M${cx} ${cy - 6}C${cx - 9} ${cy - 12} ${cx - 9} ${cy - 22} ${cx} ${cy - 30}C${cx + 9} ${cy - 22} ${cx + 9} ${cy - 12} ${cx} ${cy - 6}Z"/>`;
  g += `<path d="M${cx} ${cy + 6}C${cx - 9} ${cy + 12} ${cx - 9} ${cy + 22} ${cx} ${cy + 30}C${cx + 9} ${cy + 22} ${cx + 9} ${cy + 12} ${cx} ${cy + 6}Z"/>`;
  for (const s of [1, -1]) {
    g += `<path d="M${cx + s * 5} ${cy}C${cx + s * 12} ${cy - 6} ${cx + s * 19} ${cy - 3} ${cx + s * 18} ${cy + 3}C${cx + s * 17} ${cy + 8} ${cx + s * 11} ${cy + 8} ${cx + s * 11} ${cy + 3}"/>`;
    g += `<path d="M${cx + s * 3} ${cy - 17}C${cx + s * 10} ${cy - 20} ${cx + s * 14} ${cy - 26} ${cx + s * 12} ${cy - 31}"/>`;
    g += `<path d="M${cx + s * 3} ${cy + 17}C${cx + s * 10} ${cy + 20} ${cx + s * 14} ${cy + 26} ${cx + s * 12} ${cy + 31}"/>`;
  }
  g += '</g>';
  o.push(g);
  // gül
  let gul = '<g fill="#EBC676">';
  for (let i = 0; i < 8; i++) gul += `<ellipse cx="${cx}" cy="${f(cy - 3.6)}" rx="1.5" ry="3.2" transform="rotate(${i * 45} ${cx} ${cy})"/>`;
  gul += `</g><circle cx="${cx}" cy="${cy}" r="1.9" fill="#5C1B21"/><circle cx="${cx}" cy="${cy}" r="1" fill="#F6DB97"/>`;
  o.push(gul);
  for (const y of [cy - 24, cy + 24]) o.push(`<circle cx="${cx}" cy="${y}" r="1.3" fill="#F2CF84"/>`);

  // X rahle: arka kanat, sedef kakmalı ön kanat
  o.push(`<ellipse cx="195" cy="314" rx="100" ry="4.5" fill="#000" fill-opacity=".5" filter="url(#${p}-gol)"/>`);
  o.push('<g transform="translate(195 246) scale(1.1 1) translate(-179 -196)">');
  o.push('<path d="M108 210L250 210L196 230L248 262H224L179 244L134 262H110L162 230Z" fill="#2A170B"/>');
  o.push(`<path d="M96 196H262C262 203 257 209 250 211L194 229L244 256C246 257.5 245.5 260 243 260H226C224 260 222.5 259.4 221.4 258.4L179 236L136.6 258.4C135.5 259.4 134 260 132 260H115C112.5 260 112 257.5 114 256L164 229L108 211C101 209 96 203 96 196Z" fill="url(#${p}-ceviz)"/>`);
  o.push('<path d="M96 196H262" stroke="#C9935A" stroke-width="1" stroke-opacity=".9"/>');
  o.push('<path d="M104 203.5H254" stroke="#D9A955" stroke-width=".8" stroke-opacity=".7" stroke-dasharray="6 2.5"/>');
  o.push('</g>');
  for (let i = 0; i < 9; i++) {
    const x = 195 + (i - 4) * 16.5;
    o.push(`<path d="M${f(x)} 249.6l1.7 1.7-1.7 1.7-1.7-1.7z" fill="url(#${p}-sedef)" opacity=".9"/>`);
  }
  o.push(`<circle cx="195" cy="270" r="3.4" fill="url(#${p}-altin)"/>`);
  o.push('<circle cx="195" cy="286" r="2.1" fill="#C79B5E"/>');

  // raf
  const SH = 440;
  o.push(`<text x="195" y="338" text-anchor="middle" font-family="Encode Sans, sans-serif" font-weight="600" font-size="8" letter-spacing="1.9" fill="#E8C27A" fill-opacity=".55">RİSALE-İ NUR KÜLLİYATI</text>`);
  o.push(`<rect x="16" y="348" width="358" height="${SH - 348}" rx="6" fill="#030714" fill-opacity=".30"/>`);
  const toplam = CILTLER.reduce((t, c) => t + c.w, 0) + 2 * (CILTLER.length - 1);
  let x = (390 - toplam) / 2;
  let on: { x: number; w: number; h: number; ci: number; ad: string } | null = null;
  for (const [i, c] of CILTLER.entries()) {
    const ci = i % RENKLER.length;
    if (i === secili) {
      on = { x, w: c.w, h: c.h, ci, ad: c.ad };
      x += c.w + 2;
      continue;
    }
    const h = Math.round(c.h * 0.86);
    const y = SH - h;
    o.push(`<g><rect x="${f(x)}" y="${y}" width="${c.w}" height="${h}" rx="1.6" fill="url(#${p}-c${ci})"/>`);
    for (const yy of [y + 7, y + 10, y + h - 10, y + h - 7]) {
      o.push(`<path d="M${f(x + 1.5)} ${yy}H${f(x + c.w - 1.5)}" stroke="#D9A955" stroke-opacity=".7" stroke-width=".7"/>`);
    }
    o.push(`<text transform="translate(${f(x + c.w / 2 + 2.3)} ${f(y + h / 2)}) rotate(-90)" text-anchor="middle" font-family="Encode Sans, sans-serif" font-weight="600" font-size="6.3" letter-spacing=".55" fill="#E3C27F" fill-opacity=".82">${c.sirt}</text></g>`);
    x += c.w + 2;
  }
  // rafın geri kalanı biraz söner
  o.push(`<rect x="16" y="348" width="358" height="${SH - 348}" rx="6" fill="#050B1F" fill-opacity=".26"/>`);
  // öne çekilen kitap: 1,14 kat büyük, tahtanın 5 px önüne taşar
  const olcu = on ? { W2: on.w * 1.14, H2: Math.round(on.h * 0.86) * 1.14, bx: 0, by: 0 } : null;
  if (on && olcu) {
    olcu.bx = on.x + on.w / 2 - olcu.W2 / 2;
    olcu.by = SH + 5 - olcu.H2;
  }
  if (on && olcu) {
    const { W2, H2, bx, by } = olcu;
    o.push(`<ellipse cx="${f(on.x + on.w / 2)}" cy="${f(by + H2 / 2)}" rx="34" ry="58" fill="url(#${p}-parilti)"/>`);
    o.push(`<rect x="${f(bx - 0.5)}" y="${f(by + 3)}" width="${f(W2 + 1)}" height="${f(H2)}" rx="2" fill="#000" fill-opacity=".5" filter="url(#${p}-gol)"/>`);
    o.push(`<rect x="${f(bx)}" y="${f(by)}" width="${f(W2)}" height="${f(H2)}" rx="2" fill="url(#${p}-c${on.ci})"/>`);
    o.push(`<rect x="${f(bx + 0.5)}" y="${f(by + 0.5)}" width="${f(W2 - 1)}" height="${f(H2 - 1)}" rx="1.6" fill="none" stroke="#F3D08A" stroke-opacity=".75" stroke-width=".8"/>`);
    for (const yy of [by + 8, by + 11.5, by + H2 - 11.5, by + H2 - 8]) {
      o.push(`<path d="M${f(bx + 2)} ${f(yy)}H${f(bx + W2 - 2)}" stroke="#F0CD84" stroke-width=".9"/>`);
    }
    o.push(`<path d="M${f(bx + W2 / 2)} ${f(by + 16)}l2.6 2.6l-2.6 2.6l-2.6-2.6Z" fill="#F3D08A"/>`);
    // uzun adlar sırta, üstteki ◆ ile alttaki altın bant arasına sığsın diye yazı küçülür (8-12)
    const boy = Math.max(8, Math.min(12, (H2 - 40) / (on.ad.length * 0.56)));
    o.push(`<text transform="translate(${f(bx + W2 / 2 + 4)} ${f(by + H2 / 2 + 4)}) rotate(-90)" text-anchor="middle" font-family="Tinos, serif" font-style="italic" font-weight="700" font-size="${f(boy)}" fill="#FBE3A8">${on.ad}</text>`);
  }
  // ceviz raf tahtası
  o.push(`<rect x="10" y="${SH}" width="370" height="11" rx="2" fill="url(#${p}-raf)"/>`);
  o.push(`<path d="M12 ${f(SH + 0.6)}H378" stroke="#C48F55" stroke-opacity=".6" stroke-width="1"/>`);
  o.push(`<ellipse cx="195" cy="${SH + 14}" rx="170" ry="3" fill="#000" fill-opacity=".5" filter="url(#${p}-gol)"/>`);
  if (on && olcu) {
    // öne çekilen kitap tahtanın kenarının önündedir
    const { W2, H2, bx, by } = olcu;
    o.push(`<rect x="${f(bx)}" y="${SH - 1}" width="${f(W2)}" height="${f(by + H2 - SH + 1)}" fill="url(#${p}-c${on.ci})"/>`);
    o.push(`<path d="M${f(bx + 2)} ${f(by + H2 - 8)}H${f(bx + W2 - 2)}" stroke="#F0CD84" stroke-width=".9"/>`);
    o.push(`<path d="M${f(bx + 0.5)} ${SH - 1}V${f(by + H2 - 0.5)}H${f(bx + W2 - 0.5)}V${SH - 1}" fill="none" stroke="#F3D08A" stroke-opacity=".75" stroke-width=".8"/>`);
  }
  return o.join('');
}

let sayac = 0;

export function menbaCizimi(eser: string): HTMLElement {
  const kap = document.createElement('div');
  kap.className = 'menba__cizim';
  kap.setAttribute('role', 'img');
  kap.setAttribute('aria-label', `Rahle üzerinde Kur’an-ı Kerim; altında rafta Risale-i Nur Külliyatı, ${tipografik(eser)} öne çıkmış`);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'menba-sahne');
  svg.setAttribute('viewBox', '0 0 390 458');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = menbaSvgIcerigi(eser, `menba${++sayac}`);
  kap.append(svg);
  return kap;
}
