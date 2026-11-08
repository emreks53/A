// Kur'an-ı Kerim, rahlesiz ve güneş gibi: inci beyazı mushaf (tek ince yaldız pervaz, aynı tonda kabartma dilimli
// şemse ve ince salbekler, şemsenin ortasında basılı vesika içinde küçük altın "Kur’an"; sırtı sağda, mushaf sağdan
// açılır) ve çevresinden nur: yumuşak altın ışın kamaları, aralarında varak tığları, kitabın çevresinde ak hale.
// Güneş'in sahnesi ve Menba çizimi bunu kullanır. Koordinatlar 240 x 190'lık çizim alanına göredir; ışınlar alanın
// dışına taşar (çağıranın svg'si overflow: visible). Çizimde nokta (daire) yoktur.

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

/** Çizim alanı (viewBox 0 0 240 190) ve nurun merkezi: kitabın (kapak + sırt) ortası.
    Mushaf: kapak x 60..168, y 18.5..171.5 (108 x 153, alanın %80'i); sırt sağda 168..180. */
export const NUR = { W: 240, H: 190, cx: 120, cy: 95 } as const;

export interface KuranSecenek {
  /** Işık gücü: 1 = Güneş; Menba .9 */
  nur?: number;
  /** Işınların sıfıra indiği yarıçap (çizim birimi): varsayılan 168; Menba 128, ki nur çizimin içinde kalsın */
  r?: number;
  /** Kapaktaki küçük altın "Kur’an" (varsayılan açık) */
  yazi?: boolean;
}

/**
 * Rahlesiz Kur'an-ı Kerim ve çevresinden nur. SVG İÇERİĞİ döner; çağıran:
 *   <svg viewBox="0 0 240 190" overflow="visible">…</svg>
 *
 * Katmanlar (boya sırası):
 *  1. güneş ışığı  merkezde ak, dışa doğru sıcak altına dönen yumuşak ışık (rect + radyal degrade; kenarı görünmez)
 *  2. kamalar      40 yumuşak altın ışın kaması (9° arayla; geniş / ince / orta / ince ritim), merkezden dışa
 *                  genişler; dolgu degradesi kendi içinde söner (maske yok), tek bulanıklık süzgeci (σ 1)
 *  3. varak tığları kamaların arasında 40 kıl çizgi (.5 birim), altın; aynı biçimde söner
 *  4. ak hale      kitabın hemen çevresinde beyaz parıltı (ışığın kaynağı kitaptır)
 *  5. Mushaf       sıcak yumuşak gölge, sırt (iki çift yaldız bant), inci beyazı kapak (sedef, parlaklık, gren),
 *                  kenar ışıkları, tek yaldız pervaz, kabartma dilimli şemse ve iki ince salbek, şemsenin
 *                  ortasında basılı vesika ve içinde küçük altın "Kur’an" (EB Garamond 600, 8,6 birim)
 * Süzgeçler: 3 bulanıklık + 1 gren (feTurbulence). Bütün kimlikler p önekiyle başlar.
 *
 * @param p kimlik öneki (Güneş 'gs', Menba 'menbaN-k')
 */
export function kuranSvg(p: string, o: KuranSecenek = {}): string {
  const nur = o.nur ?? 1;
  const R0 = o.r ?? 168;
  const yazi = o.yazi ?? true;
  const { cx, cy } = NUR;
  const op = (v: number) => f(Math.min(1, v * nur));
  // ışın kamaları: 4'lü ritim (geniş uzun, ince, orta, ince); 0. ışın tam yukarı
  const YARI = [2.3, 1.05, 1.65, 1.05];
  const BOY = [1, 0.9, 0.95, 0.9];
  const kat: [string[], string[], string[]] = [[], [], []]; // geniş, orta, ince
  let tig = '';
  const N = 40;
  for (let i = 0; i < N; i++) {
    const aci = (360 * i) / N - 90;
    const t = i % 4;
    const L = R0 * 1.04 * BOY[t];
    const a1 = ((aci - YARI[t]) * Math.PI) / 180;
    const a2 = ((aci + YARI[t]) * Math.PI) / 180;
    const d = `M${cx} ${cy}L${f(cx + L * Math.cos(a1))} ${f(cy + L * Math.sin(a1))}L${f(cx + L * Math.cos(a2))} ${f(cy + L * Math.sin(a2))}Z`;
    kat[t === 0 ? 0 : t === 2 ? 1 : 2].push(d);
    const b = ((aci + 180 / N) * Math.PI) / 180;
    const u = (i % 2 === 0 ? 1 : 0.84) * R0;
    tig += `M${f(cx + 62 * Math.cos(b))} ${f(cy + 62 * Math.sin(b))}L${f(cx + u * Math.cos(b))} ${f(cy + u * Math.sin(b))}`;
  }
  // Mushaf'ın kendi koordinatları (kapak 72..180 x 14..167) → translate(-12 4.5)
  const kx = 126;
  const ky = 90.5;
  const S = dilimli(kx, ky, 22.5, 35, 9, 1.8);
  const V = vesika(kx, ky, 15, 23.5);
  const sU = salbek(kx, ky - 36.4, 5.2, -11.5);
  const sA = salbek(kx, ky + 36.4, 5.2, 11.5);
  const kabartma = (dd: string) =>
    `<path d="${dd}" transform="translate(.75 .95)" fill="#7a684e" fill-opacity=".24"/>` +
    `<path d="${dd}" transform="translate(-.55 -.65)" fill="#fff"/>` +
    `<path d="${dd}" fill="url(#${p}-semse)"/>`;
  const yaziFs = 8.6;
  const yaziAttr = `x="${kx}" y="${f(ky + 0.33 * yaziFs)}" text-anchor="middle" font-family="EB Garamond, Georgia, serif" font-weight="600" font-size="${yaziFs}" letter-spacing="${f(yaziFs * 0.05)}"`;
  // tek <text> (ekran okuyucu ve sınamalar için tek düğüm); basılı kenarlar aynı metnin <use> kopyaları
  const kuranYazisi = yazi
    ? `<use href="#${p}-kuran" transform="translate(-.26 -.32)" fill="#5c4520" fill-opacity=".4"/>` +
      `<use href="#${p}-kuran" transform="translate(.3 .38)" fill="#fff" fill-opacity=".92"/>` +
      `<g fill="url(#${p}-altin-yazi)"><text id="${p}-kuran" class="kuran-yazi" ${yaziAttr}>Kur’an</text></g>`
    : '';
  const M = R0 + 30; // ışık dikdörtgeninin yarı eni
  return `<defs>
<radialGradient id="${p}-gunes" cx="${cx}" cy="${cy}" r="${f(R0 * 0.95)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFEFA" stop-opacity="${op(1)}"/><stop offset=".4" stop-color="#FFF9EC" stop-opacity="${op(0.95)}"/><stop offset=".62" stop-color="#F8E6BC" stop-opacity="${op(0.55)}"/><stop offset=".82" stop-color="#F3DBA6" stop-opacity="${op(0.18)}"/><stop offset="1" stop-color="#F3DBA6" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}-kama" cx="${cx}" cy="${cy}" r="${R0}" gradientUnits="userSpaceOnUse"><stop offset=".36" stop-color="#F5DCA6"/><stop offset=".5" stop-color="#EDCB8B"/><stop offset=".7" stop-color="#E3B76A" stop-opacity=".62"/><stop offset=".86" stop-color="#DDAD60" stop-opacity=".22"/><stop offset="1" stop-color="#D8A85A" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}-tig" cx="${cx}" cy="${cy}" r="${R0}" gradientUnits="userSpaceOnUse"><stop offset=".36" stop-color="#C99A45"/><stop offset=".55" stop-color="#D9B670"/><stop offset=".72" stop-color="#C9A35C" stop-opacity=".6"/><stop offset=".88" stop-color="#B8893A" stop-opacity=".2"/><stop offset="1" stop-color="#B8893A" stop-opacity="0"/></radialGradient>
<filter id="${p}-b-kama" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1"/></filter>
<filter id="${p}-b-ak" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4.5"/></filter>
<filter id="${p}-b-golge" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>
<linearGradient id="${p}-inci" x1="72" y1="14" x2="180" y2="167" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFDF8"/><stop offset=".45" stop-color="#F7F2E8"/><stop offset="1" stop-color="#E8E0D2"/></linearGradient>
<radialGradient id="${p}-parlak" cx="98" cy="38" r="118" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="${p}-sedef" x1="72" y1="167" x2="180" y2="14" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#D3DEEC" stop-opacity=".3"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#F3E3CB" stop-opacity=".34"/></linearGradient>
<linearGradient id="${p}-semse" x1="104" y1="54" x2="148" y2="127" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FAF6EE"/><stop offset="1" stop-color="#EAE3D5"/></linearGradient>
<linearGradient id="${p}-sirt" x1="180" y1="0" x2="192" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#CFC5B3"/><stop offset=".35" stop-color="#F4EFE6"/><stop offset=".7" stop-color="#DED5C6"/><stop offset="1" stop-color="#B9AE99"/></linearGradient>
<linearGradient id="${p}-yaldiz" x1="80" y1="22" x2="172" y2="159" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#E4C98F"/><stop offset=".3" stop-color="#BF9A55"/><stop offset=".52" stop-color="#EEDCAA"/><stop offset=".78" stop-color="#B08C4A"/><stop offset="1" stop-color="#D3B474"/></linearGradient>
<linearGradient id="${p}-altin-yazi" x1="0" y1="${f(ky - 4.4)}" x2="0" y2="${f(ky + 3.2)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#B48A3A"/><stop offset=".4" stop-color="#E2C47C"/><stop offset=".62" stop-color="#B98F3F"/><stop offset="1" stop-color="#8A6424"/></linearGradient>
<clipPath id="${p}-kapak"><rect x="72" y="14" width="108" height="153" rx="2.5"/></clipPath>
<filter id="${p}-gren" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.35" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .40  0 0 0 0 .33  0 0 0 1.5 -.64"/></filter>
</defs>
<rect x="${f(cx - M)}" y="${f(cy - M)}" width="${f(2 * M)}" height="${f(2 * M)}" fill="url(#${p}-gunes)"/>
<g filter="url(#${p}-b-kama)" fill="url(#${p}-kama)"><path d="${kat[0].join('')}" fill-opacity="${op(0.48)}"/><path d="${kat[1].join('')}" fill-opacity="${op(0.38)}"/><path d="${kat[2].join('')}" fill-opacity="${op(0.3)}"/></g>
<path d="${tig}" fill="none" stroke="url(#${p}-tig)" stroke-width=".5" stroke-opacity="${op(0.95)}"/>
<rect x="55" y="13.5" width="130" height="163" rx="8" fill="#fff" opacity=".9" filter="url(#${p}-b-ak)"/>
<g transform="translate(-12 4.5)">
<rect x="73" y="16" width="119" height="152" rx="3" fill="#6b5233" fill-opacity=".3" filter="url(#${p}-b-golge)" transform="translate(1.3 2.4)"/>
<path d="M180 14.6L188.4 17.4C190.9 18.3 192 19.8 192 22.4V159.8C192 162.4 190.9 163.9 188.4 164.8L180 167Z" fill="url(#${p}-sirt)" stroke="#a89878" stroke-opacity=".35" stroke-width=".4"/>
<path d="M180.4 31.5L191.6 33M180.4 34.5L191.6 36M180.4 147.5L191.6 146.6M180.4 150.5L191.6 149.6" stroke="url(#${p}-yaldiz)" stroke-width=".7" fill="none"/>
<rect x="72" y="14" width="108" height="153" rx="2.5" fill="url(#${p}-inci)"/>
<g clip-path="url(#${p}-kapak)">
<rect x="72" y="14" width="108" height="153" fill="url(#${p}-sedef)"/>
<rect x="72" y="14" width="108" height="153" fill="url(#${p}-parlak)"/>
<rect x="72" y="14" width="108" height="153" filter="url(#${p}-gren)" opacity=".3"/>
</g>
<rect x="72.2" y="14.2" width="107.6" height="152.6" rx="2.4" fill="none" stroke="#a89878" stroke-opacity=".3" stroke-width=".4"/>
<path d="M72.6 165.5V16.6C72.6 15.4 73.4 14.6 74.6 14.6H178.6" fill="none" stroke="#fff" stroke-width=".9"/>
<path d="M73.4 166.4H177.4C178.6 166.4 179.4 165.6 179.4 164.4V15.6" fill="none" stroke="#8a785c" stroke-opacity=".38" stroke-width=".8"/>
<rect x="80.5" y="22.5" width="91" height="136" rx=".6" fill="none" stroke="url(#${p}-yaldiz)" stroke-width=".85"/>
${kabartma(sU)}${kabartma(sA)}${kabartma(S)}
<path d="${S}" fill="none" stroke="url(#${p}-yaldiz)" stroke-width=".4" stroke-opacity=".55"/>
<path d="${V}" transform="translate(-.35 -.4)" fill="none" stroke="#7a684e" stroke-opacity=".36" stroke-width=".7"/>
<path d="${V}" transform="translate(.4 .5)" fill="none" stroke="#fff" stroke-width=".7"/>
${kuranYazisi}
</g>`;
}
