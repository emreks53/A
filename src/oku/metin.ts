// Bölüm metinleri için küçük bir Markdown alt kümesi:
//   # Başlık, ## Ara başlık, ### Küçük başlık
//   boş satırla ayrılan paragraflar (satır sonundaki "\" satırı kırar)
//   > alıntı, --- ayraç, **kalın**, *italik*, [^1] dipnot işareti ve "[^1]: ..." dipnot metni
// Arapça harflerin çoğunlukta olduğu paragraf sağdan sola ayrı blok olur; Türkçe paragraf içindeki
// Arapça kısımlar da ayrıca işaretlenir.

export type Satirici =
  | { tur: 'metin'; metin: string }
  | { tur: 'arapca'; metin: string }
  | { tur: 'kalin'; icerik: Satirici[] }
  | { tur: 'italik'; icerik: Satirici[] }
  | { tur: 'kirma' }
  | { tur: 'dipnot'; id: string; no: number };

export type Blok =
  | { tur: 'baslik'; seviye: 1 | 2 | 3; icerik: Satirici[] }
  | { tur: 'paragraf'; icerik: Satirici[]; arapca: boolean }
  | { tur: 'alinti'; icerik: Satirici[] }
  | { tur: 'ayrac' };

export interface Dipnot {
  id: string;
  no: number;
  icerik: Satirici[];
}

export interface Bolum {
  baslik: string;
  bloklar: Blok[];
  dipnotlar: Dipnot[];
}

const ARAP = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const ARAP_HARF = /[ؠ-يٱ-ۓۺ-ۼݐ-ݿࢠ-ࣉﭐ-﷿ﹰ-ﻼ]/gu;
// Arapça bir parça: Arapça harf/işaretle başlayıp biten, arada boşluk ve noktalama da içerebilen dizi.
const ARAP_PARCA =
  /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿](?:[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿\s‌‍.,:;!?()«»-]*[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])?/gu;

/** Harflerin yarıdan fazlası Arapça mı? */
export function arapcaMi(metin: string): boolean {
  const arap = metin.match(ARAP_HARF)?.length ?? 0;
  if (!arap) return false;
  const harf = metin.match(/\p{L}/gu)?.length ?? 0;
  return arap * 2 > harf;
}

function duzMetin(parca: string): Satirici[] {
  if (!ARAP.test(parca)) return parca ? [{ tur: 'metin', metin: parca }] : [];
  const sonuc: Satirici[] = [];
  let son = 0;
  for (const m of parca.matchAll(ARAP_PARCA)) {
    const i = m.index ?? 0;
    if (i > son) sonuc.push({ tur: 'metin', metin: parca.slice(son, i) });
    sonuc.push({ tur: 'arapca', metin: m[0] });
    son = i + m[0].length;
  }
  if (son < parca.length) sonuc.push({ tur: 'metin', metin: parca.slice(son) });
  return sonuc;
}

/**
 * Satır içi işaretleri çözer. Dipnot numaraları, metinde ilk geçtikleri sıraya göre `numara` ile verilir.
 * Kapanmayan ** ya da * düz metin olarak kalır.
 */
export function satirIci(metin: string, numara: (id: string) => number = () => 0): Satirici[] {
  const sonuc: Satirici[] = [];
  let tampon = '';
  const bosalt = () => {
    sonuc.push(...duzMetin(tampon));
    tampon = '';
  };
  let i = 0;
  while (i < metin.length) {
    const c = metin[i];
    if (c === '\\' && metin[i + 1] === '\n') {
      bosalt();
      sonuc.push({ tur: 'kirma' });
      i += 2;
      continue;
    }
    if (c === '\\' && i + 1 < metin.length && '*[]\\#>_'.includes(metin[i + 1])) {
      tampon += metin[i + 1];
      i += 2;
      continue;
    }
    if (c === '[' && metin[i + 1] === '^') {
      const son = metin.indexOf(']', i + 2);
      const id = son > i + 2 ? metin.slice(i + 2, son) : '';
      if (id && !/\s/.test(id)) {
        bosalt();
        sonuc.push({ tur: 'dipnot', id, no: numara(id) });
        i = son + 1;
        continue;
      }
    }
    if (c === '*') {
      const kalin = metin[i + 1] === '*';
      const isaret = kalin ? '**' : '*';
      const bas = i + isaret.length;
      let son = metin.indexOf(isaret, bas);
      // "*italik*" ararken "**" içindeki yıldızlara takılma
      while (!kalin && son !== -1 && metin[son + 1] === '*') son = metin.indexOf('*', son + 2);
      // "***" ile biten "**kalın *eğik***": içteki italiği kapatan yıldızı atla
      while (kalin && son !== -1 && metin[son + 2] === '*') son++;
      if (son > bas && !/\s/.test(metin[bas]) && !/\s/.test(metin[son - 1])) {
        bosalt();
        sonuc.push({ tur: kalin ? 'kalin' : 'italik', icerik: satirIci(metin.slice(bas, son), numara) });
        i = son + isaret.length;
        continue;
      }
    }
    tampon += c;
    i++;
  }
  bosalt();
  return sonuc;
}

/** Satır içi öğelerin düz metni (arama, erişilebilirlik ve testler için). */
export function duzYazi(icerik: Satirici[]): string {
  return icerik
    .map((s) => {
      switch (s.tur) {
        case 'metin':
        case 'arapca':
          return s.metin;
        case 'kalin':
        case 'italik':
          return duzYazi(s.icerik);
        case 'kirma':
          return '\n';
        case 'dipnot':
          return '';
      }
    })
    .join('');
}

export function bolumCoz(md: string): Bolum {
  const satirlar = md.replace(/\r\n?/g, '\n').replace(/^﻿/, '').split('\n');
  const dipnotHam = new Map<string, string>();
  const govde: string[] = [];

  // Dipnot tanımları ("[^id]: metin", alttaki girintili satırlar devamıdır) gövdeden ayrılır.
  for (let i = 0; i < satirlar.length; i++) {
    const m = satirlar[i].match(/^\[\^([^\]\s]+)\]:\s*(.*)$/);
    if (!m) {
      govde.push(satirlar[i]);
      continue;
    }
    const parcalar = [m[2]];
    while (i + 1 < satirlar.length && /^(?: {2,}|\t)\S/.test(satirlar[i + 1])) parcalar.push(satirlar[++i].trim());
    dipnotHam.set(m[1], parcalar.join(' '));
  }

  const numaralar = new Map<string, number>();
  const numara = (id: string) => {
    let no = numaralar.get(id);
    if (no === undefined) {
      no = numaralar.size + 1;
      numaralar.set(id, no);
    }
    return no;
  };

  const bloklar: Blok[] = [];
  let paragraf: string[] = [];
  let alinti: string[] = [];
  const paragrafBitir = () => {
    if (!paragraf.length) return;
    const ham = paragraf.map((s) => s.trim()).join('\n');
    // "\" ile biten satırda satır kırılır, diğer satır sonları boşluk olur.
    const metin = ham.replace(/\\\n/g, '\u0000').replace(/\n/g, ' ').replace(/\u0000/g, '\\\n');
    bloklar.push({ tur: 'paragraf', icerik: satirIci(metin, numara), arapca: arapcaMi(metin) });
    paragraf = [];
  };
  const alintiBitir = () => {
    if (!alinti.length) return;
    bloklar.push({ tur: 'alinti', icerik: satirIci(alinti.map((s) => s.trim()).join(' '), numara) });
    alinti = [];
  };

  for (const satir of govde) {
    const baslik = satir.match(/^(#{1,3})[ \t]+(.+?)[ \t]*#*[ \t]*$/);
    if (baslik) {
      paragrafBitir();
      alintiBitir();
      bloklar.push({ tur: 'baslik', seviye: baslik[1].length as 1 | 2 | 3, icerik: satirIci(baslik[2], numara) });
    } else if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(satir)) {
      paragrafBitir();
      alintiBitir();
      bloklar.push({ tur: 'ayrac' });
    } else if (/^\s*>/.test(satir)) {
      paragrafBitir();
      alinti.push(satir.replace(/^\s*>\s?/, ''));
    } else if (!satir.trim()) {
      paragrafBitir();
      alintiBitir();
    } else {
      alintiBitir();
      paragraf.push(satir);
    }
  }
  paragrafBitir();
  alintiBitir();

  const ilk = bloklar.find((b): b is Extract<Blok, { tur: 'baslik' }> => b.tur === 'baslik' && b.seviye === 1);
  const dipnotlar: Dipnot[] = [...numaralar].map(([id, no]) => ({
    id,
    no,
    icerik: satirIci(dipnotHam.get(id) ?? '', () => 0).filter((s) => s.tur !== 'dipnot'),
  }));
  return { baslik: ilk ? duzYazi(ilk.icerik) : '', bloklar, dipnotlar };
}
