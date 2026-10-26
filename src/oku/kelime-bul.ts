// Okuma ekranında dokunulan kelimeyi bulur. Metindeki kelimeler tek tek etiketlenmez (uzun bölümlerde
// binlerce öğe olurdu); dokunulan noktadaki imleç konumundan kelimenin sınırları hesaplanır.

export interface DokunulanKelime {
  /** Dokunulan kelime, metinde yazıldığı gibi (ör. "Hakk'ın", "mana-yı") */
  kelime: string;
  /** Aynı paragrafta önceki ve sonraki kelimeler (yakından uzağa değil, metin sırasıyla) */
  once: string[];
  sonra: string[];
  aralik: Range;
}

const HARF = /[\p{L}\p{M}\p{Nd}]/u;
const BAGLAC = /['’ʼ-]/u;

function harfMi(c: string | undefined): boolean {
  return !!c && HARF.test(c);
}

/** Kelimenin parçası mı: harf, ya da iki harf arasındaki kesme işareti / tire */
function kelimeKarakteri(metin: string, i: number): boolean {
  const c = metin[i];
  if (harfMi(c)) return true;
  return !!c && BAGLAC.test(c) && harfMi(metin[i - 1]) && harfMi(metin[i + 1]);
}

interface Parca {
  dugum: Text;
  bas: number;
}

function metinParcalari(blok: Element): { parcalar: Parca[]; metin: string } {
  const parcalar: Parca[] = [];
  let metin = '';
  const gezgin = document.createTreeWalker(blok, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('.dipnot-isaret') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = gezgin.nextNode(); n; n = gezgin.nextNode()) {
    parcalar.push({ dugum: n as Text, bas: metin.length });
    metin += (n as Text).data;
  }
  return { parcalar, metin };
}

function konum(parcalar: Parca[], i: number, sonMu: boolean): [Text, number] {
  for (let k = parcalar.length - 1; k >= 0; k--) {
    const p = parcalar[k];
    // Kelimenin sonu bir düğümün tam başına denk gelirse önceki düğümün sonunu kullan.
    if (sonMu ? i > p.bas : i >= p.bas) return [p.dugum, i - p.bas];
  }
  return [parcalar[0].dugum, 0];
}

function imlec(x: number, y: number): { dugum: Node; ofset: number } | null {
  const d = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y);
    if (p) return { dugum: p.offsetNode, ofset: p.offset };
  }
  if (d.caretRangeFromPoint) {
    const r = d.caretRangeFromPoint(x, y);
    if (r) return { dugum: r.startContainer, ofset: r.startOffset };
  }
  return null;
}

function noktaIcinde(aralik: Range, x: number, y: number, pay = 3): boolean {
  for (const r of Array.from(aralik.getClientRects())) {
    if (x >= r.left - pay && x <= r.right + pay && y >= r.top - pay && y <= r.bottom + pay) return true;
  }
  return false;
}

export function kelimeBul(x: number, y: number, kok: HTMLElement): DokunulanKelime | null {
  const im = imlec(x, y);
  if (!im || im.dugum.nodeType !== Node.TEXT_NODE || !kok.contains(im.dugum)) return null;
  const ebeveyn = im.dugum.parentElement;
  if (!ebeveyn || ebeveyn.closest('.dipnot-isaret, .ar, [lang="ar"]')) return null;
  const blok = ebeveyn.closest('[data-p], .dipnotlar__madde');
  if (!blok) return null;

  const { parcalar, metin } = metinParcalari(blok);
  const parca = parcalar.find((p) => p.dugum === im.dugum);
  if (!parca) return null;
  const i = parca.bas + im.ofset;

  let bas = i;
  let son = i;
  while (bas > 0 && kelimeKarakteri(metin, bas - 1)) bas--;
  while (son < metin.length && kelimeKarakteri(metin, son)) son++;
  if (son <= bas) return null;

  const aralik = document.createRange();
  const [d1, o1] = konum(parcalar, bas, false);
  const [d2, o2] = konum(parcalar, son, true);
  aralik.setStart(d1, o1);
  aralik.setEnd(d2, o2);
  if (!noktaIcinde(aralik, x, y)) return null;

  const kelimeler = Array.from(metin.matchAll(/\S+/g), (m) => ({ bas: m.index ?? 0, metin: m[0] }));
  const sira = kelimeler.findIndex((k) => k.bas <= bas && bas < k.bas + k.metin.length);
  return {
    kelime: metin.slice(bas, son),
    once: sira > 0 ? kelimeler.slice(Math.max(0, sira - 3), sira).map((k) => k.metin) : [],
    sonra: sira >= 0 ? kelimeler.slice(sira + 1, sira + 4).map((k) => k.metin) : [],
    aralik,
  };
}

// ---------- vurgulama ----------

const VURGU = 'kenz-kelime';
let sarilan: HTMLElement | null = null;

type Vurgulayici = { highlights?: Map<string, unknown> };
type VurguSinifi = new (...r: Range[]) => unknown;

export function vurgula(aralik: Range): void {
  vurguKaldir();
  const css = (globalThis.CSS ?? {}) as Vurgulayici;
  const Highlight = (globalThis as { Highlight?: VurguSinifi }).Highlight;
  if (css.highlights && Highlight) {
    css.highlights.set(VURGU, new Highlight(aralik));
    return;
  }
  // Eski tarayıcılar: kelime tek bir metin düğümündeyse geçici <mark> ile sar.
  if (aralik.startContainer === aralik.endContainer) {
    const mark = document.createElement('mark');
    mark.className = 'kelime-vurgu';
    try {
      aralik.surroundContents(mark);
      sarilan = mark;
    } catch {
      // vurgusuz devam
    }
  }
}

export function vurguKaldir(): void {
  const css = (globalThis.CSS ?? {}) as Vurgulayici;
  css.highlights?.delete(VURGU);
  if (sarilan) {
    const ebeveyn = sarilan.parentNode;
    if (ebeveyn) {
      while (sarilan.firstChild) ebeveyn.insertBefore(sarilan.firstChild, sarilan);
      ebeveyn.removeChild(sarilan);
      ebeveyn.normalize();
    }
    sarilan = null;
  }
}
