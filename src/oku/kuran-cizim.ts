// Kur'an-ı Kerim, rahle üzerinde: inci beyazı cilt, tek ince yaldız pervaz, aynı tonda kabartma dilimli şemse ve
// ince salbekler; sırtı sağda (mushaf sağdan açılır). Işık sol üstten. Güneş'in sahnesi ve Menba çizimi bunu kullanır.
// Koordinatlar 260 x 232'lik çizim alanına göredir. Çizimde nokta (daire) yoktur; yaldız yalnız sırttaki iki çift
// bantta ve pervazdadır.

/** Sayıyı iki ondalığa yuvarlar, gereksiz sıfırları atar: 12.50 → "12.5", 12.00 → "12" */
const f = (v: number): string => (+v).toFixed(2).replace(/\.?0+$/, '');

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
function dilimli(cx: number, cy: number, a: number, b: number, dilim = 9, genlik = 1.8, n = 440): string {
  const p = vesikaNoktalari(cx, cy, a, b, n);
  const yari = Math.floor(p.length / 2);
  return (
    'M' +
    p
      .map(([x, y, nx, ny], i) => {
        const k = Math.abs(Math.sin(dilim * Math.PI * ((i % yari) / yari)));
        return `${f(x + nx * genlik * k)} ${f(y + ny * genlik * k)}`;
      })
      .join('L') +
    'Z'
  );
}

/** Sivri oval (iki yay) */
function vesika(cx: number, cy: number, a: number, b: number): string {
  const r = (b * b) / a / 2 + a / 2;
  return `M${f(cx)} ${f(cy - b)}A${f(r)} ${f(r)} 0 0 1 ${f(cx)} ${f(cy + b)}A${f(r)} ${f(r)} 0 0 1 ${f(cx)} ${f(cy - b)}Z`;
}

/** Şemsenin ucundaki ince, sivri salbek; h'nin işareti yönünü verir */
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

/**
 * Rahle üzerindeki Kur'an-ı Kerim'in SVG içeriği (viewBox 0 0 260 232).
 * p: bu çizime özgü kimlik öneki (sayfada birden çok çizim olabilir); spot: arkadaki yumuşak ışık.
 */
export function kuranSvg(p: string, o: { spot?: boolean } = {}): string {
  const spot = o.spot ?? true;
  const cx = 126;
  const cy = 90.5;
  const S = dilimli(cx, cy, 21, 34, 9, 1.8);
  const V = vesika(cx, cy, 11.5, 21.5);
  const sU = salbek(cx, cy - 35.4, 5.2, -12.5);
  const sA = salbek(cx, cy + 35.4, 5.2, 12.5);
  // aynı ton kabartma: sağ alta gölge, sol üste ışık, üstte yüz
  const kabartma = (d: string) =>
    `<path d="${d}" transform="translate(.75 .95)" fill="#7a684e" fill-opacity=".24"/>` +
    `<path d="${d}" transform="translate(-.55 -.65)" fill="#fff"/>` +
    `<path d="${d}" fill="url(#${p}-semse)"/>`;
  return `<defs>
<radialGradient id="${p}-spot" cx="128" cy="86" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F4EDE0" stop-opacity=".16"/><stop offset=".55" stop-color="#F4EDE0" stop-opacity=".05"/><stop offset="1" stop-color="#F4EDE0" stop-opacity="0"/></radialGradient>
<linearGradient id="${p}-inci" x1="72" y1="14" x2="180" y2="167" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFDF8"/><stop offset=".45" stop-color="#F6F1E7"/><stop offset="1" stop-color="#E6DED0"/></linearGradient>
<radialGradient id="${p}-parlak" cx="98" cy="38" r="118" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="${p}-sedef" x1="72" y1="167" x2="180" y2="14" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#D3DEEC" stop-opacity=".32"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#F3E3CB" stop-opacity=".3"/></linearGradient>
<linearGradient id="${p}-semse" x1="105" y1="44" x2="147" y2="137" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F8F4EC"/><stop offset="1" stop-color="#E9E2D4"/></linearGradient>
<linearGradient id="${p}-sirt" x1="180" y1="0" x2="192" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#C9BFAD"/><stop offset=".35" stop-color="#F2EDE3"/><stop offset=".7" stop-color="#DCD3C3"/><stop offset="1" stop-color="#B3A893"/></linearGradient>
<linearGradient id="${p}-yaldiz" x1="80" y1="22" x2="172" y2="159" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#E9D29C"/><stop offset=".3" stop-color="#C8A563"/><stop offset=".52" stop-color="#F2E2B6"/><stop offset=".78" stop-color="#B99653"/><stop offset="1" stop-color="#D9BD7E"/></linearGradient>
<linearGradient id="${p}-ceviz" x1="0" y1="157" x2="0" y2="170" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8A5A37"/><stop offset=".4" stop-color="#5E3A21"/><stop offset="1" stop-color="#352012"/></linearGradient>
<linearGradient id="${p}-ayak-on" x1="0" y1="168" x2="0" y2="225" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#6B452A"/><stop offset="1" stop-color="#3F2715"/></linearGradient>
<linearGradient id="${p}-ayak-arka" x1="0" y1="168" x2="0" y2="225" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3A2415"/><stop offset="1" stop-color="#24160C"/></linearGradient>
<clipPath id="${p}-kapak"><rect x="72" y="14" width="108" height="153" rx="2.5"/></clipPath>
<filter id="${p}-gren" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.35" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .40  0 0 0 0 .33  0 0 0 1.5 -.64"/></filter>
<filter id="${p}-bulanik6" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="${p}-bulanik2" x="-40%" y="-200%" width="180%" height="500%"><feGaussianBlur stdDeviation="2.4"/></filter>
</defs>
${spot ? `<ellipse cx="128" cy="92" rx="150" ry="140" fill="url(#${p}-spot)"/>` : ''}
<ellipse cx="130" cy="225.6" rx="62" ry="3.2" fill="#000" fill-opacity=".55" filter="url(#${p}-bulanik2)"/>
<path d="M162.5 168H172.5L89.5 223H79.5Z" fill="url(#${p}-ayak-arka)"/>
<rect x="77.5" y="221.6" width="14" height="3" rx="1.2" fill="#24160C"/>
<path d="M78 22H196V172H78Z" fill="#000" fill-opacity=".5" filter="url(#${p}-bulanik6)" transform="translate(5 6)"/>
<path d="M180 14.6L188.4 17.4C190.9 18.3 192 19.8 192 22.4V159.8C192 162.4 190.9 163.9 188.4 164.8L180 167Z" fill="url(#${p}-sirt)"/>
<path d="M180.4 31.5L191.6 33M180.4 34.5L191.6 36M180.4 147.5L191.6 146.6M180.4 150.5L191.6 149.6" stroke="url(#${p}-yaldiz)" stroke-width=".7" fill="none"/>
<rect x="72" y="14" width="108" height="153" rx="2.5" fill="url(#${p}-inci)"/>
<g clip-path="url(#${p}-kapak)">
<rect x="72" y="14" width="108" height="153" fill="url(#${p}-sedef)"/>
<rect x="72" y="14" width="108" height="153" fill="url(#${p}-parlak)"/>
<rect x="72" y="14" width="108" height="153" filter="url(#${p}-gren)" opacity=".34"/>
</g>
<path d="M72.6 165.5V16.6C72.6 15.4 73.4 14.6 74.6 14.6H178.6" fill="none" stroke="#fff" stroke-width=".9"/>
<path d="M73.4 166.4H177.4C178.6 166.4 179.4 165.6 179.4 164.4V15.6" fill="none" stroke="#8a785c" stroke-opacity=".35" stroke-width=".8"/>
<rect x="80.5" y="22.5" width="91" height="136" rx=".6" fill="none" stroke="url(#${p}-yaldiz)" stroke-width=".85"/>
${kabartma(sU)}${kabartma(sA)}${kabartma(S)}
<path d="${V}" transform="translate(-.35 -.4)" fill="none" stroke="#7a684e" stroke-opacity=".42" stroke-width=".8"/>
<path d="${V}" transform="translate(.4 .5)" fill="none" stroke="#fff" stroke-width=".8"/>
<path d="M87.5 168H97.5L180.5 223H170.5Z" fill="url(#${p}-ayak-on)"/>
<path d="M88.2 168.3L171.2 222.7" stroke="#EFC797" stroke-opacity=".24" stroke-width=".55"/>
<rect x="168.5" y="221.6" width="14" height="3" rx="1.2" fill="#3F2715"/>
<path d="M54.4 157.2C56.6 161.4 61 163.4 69 163.4H191C199 163.4 203.4 161.4 205.6 157.2L207.8 158.4C206 165.6 200.2 169.6 191 169.6H69C59.8 169.6 54 165.6 52.2 158.4Z" fill="url(#${p}-ceviz)"/>
<path d="M55 158C57.4 162 61.6 163.8 69 163.8H191C198.4 163.8 202.6 162 205 158" fill="none" stroke="#F4D3A8" stroke-opacity=".45" stroke-width=".55"/>`;
}
