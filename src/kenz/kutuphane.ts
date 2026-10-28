// Kenz: videolar geçtiği Risale-i Nur kitabına, kitapta da bölümüne göre gruplanır.
// Kitaplar Külliyat sırasıyla, bölümler ve videolar listedeki sırayla gelir. Karta dokununca video Oku'da açılır.
import { videolar } from 'virtual:oku-videolar';
import { etiketYazisi, KULLIYAT, sureYazisi, tipografik, type Video } from '../oku/ortak';

export interface BolumGrubu {
  bolum: string;
  kisimlar: string[];
  videolar: Video[];
}

export interface KitapGrubu {
  kitap: string;
  bolumler: BolumGrubu[];
}

/** Videosu olan kitaplar (Külliyat sırasıyla) ve her kitapta bölümler */
export function kitapGruplari(liste: Video[] = videolar): KitapGrubu[] {
  const sira = (k: string) => (KULLIYAT as readonly string[]).indexOf(k);
  const kitaplar = [...new Set(liste.map((v) => v.kitap))].sort((a, b) => sira(a) - sira(b));
  return kitaplar.map((kitap) => {
    const bolumler: BolumGrubu[] = [];
    for (const v of liste.filter((x) => x.kitap === kitap)) {
      let g = bolumler.find((b) => b.bolum === v.bolum);
      if (!g) bolumler.push((g = { bolum: v.bolum, kisimlar: [], videolar: [] }));
      g.videolar.push(v);
      if (v.kisim && !g.kisimlar.includes(v.kisim)) g.kisimlar.push(v.kisim);
    }
    return { kitap, bolumler };
  });
}

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif?: string, metin?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

const kimlik = (s: string) =>
  s
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const OYNAT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor"/></svg>';

/** Kartın erişilebilir adı: "On Yedinci Lem’a’dan, 1:59. Lem’alar, 154. sayfa. #ihlas #muhabbet #kurtuluş" */
export function kartEtiketi(v: Video): string {
  const yer = [v.kitap, v.kisim, v.sayfa ? `${v.sayfa}. sayfa` : undefined].filter(Boolean).join(', ');
  return tipografik(`${v.baslik}, ${sureYazisi(v.sure)}. ${yer}. ${etiketYazisi(v.etiketler)}`);
}

function kart(v: Video): HTMLAnchorElement {
  const a = el('a', 'kart');
  a.href = `#/oku/${v.id}`;
  a.dataset.video = v.id;
  a.setAttribute('aria-label', kartEtiketi(v));
  const kapak = el('span', 'kart__kapak');
  const img = el('img', 'kart__img');
  img.src = import.meta.env.BASE_URL + v.onizleme;
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.width = 720;
  img.height = 1280;
  const sure = el('span', 'kart__sure');
  sure.innerHTML = OYNAT_SVG;
  sure.append(sureYazisi(v.sure));
  kapak.append(img, sure);
  const metin = el('span', 'kart__metin');
  metin.append(el('span', 'kart__ad', tipografik(v.baslik)));
  const yer = [v.kisim, v.sayfa ? `${v.sayfa}. sayfa` : undefined].filter(Boolean).join(' · ');
  if (yer) metin.append(el('span', 'kart__yer', tipografik(yer)));
  const etiketler = el('span', 'kart__etiketler');
  for (const e of v.etiketler) etiketler.append(el('span', 'etiket', `#${e}`));
  metin.append(etiketler);
  a.append(kapak, metin);
  for (const c of a.children) c.setAttribute('aria-hidden', 'true');
  return a;
}

export function kutuphaneCiz(liste: Video[] = videolar): HTMLElement {
  const kok = el('div', 'kutuphane');
  for (const { kitap, bolumler } of kitapGruplari(liste)) {
    const bolum = el('section', 'kitap');
    const id = `kitap-${kimlik(kitap)}`;
    bolum.id = id;
    const ad = el('h2', 'kitap__ad', tipografik(kitap));
    ad.id = `${id}-ad`;
    bolum.setAttribute('aria-labelledby', ad.id);
    const sayi = liste.filter((v) => v.kitap === kitap).length;
    const ust = el('div', 'kitap__ust');
    ust.append(ad, el('span', 'kitap__sayi', `${sayi} video`));
    bolum.append(ust);
    for (const b of bolumler) {
      const kisim = el('section', 'bolum');
      const bid = `${id}-${kimlik(b.bolum)}`;
      const bad = el('h3', 'bolum__ad', tipografik(b.bolum));
      bad.id = bid;
      kisim.setAttribute('aria-labelledby', bid);
      kisim.append(bad);
      const ul = el('ul', b.videolar.length > 1 ? 'bolum__videolar bolum__videolar--raf' : 'bolum__videolar');
      for (const v of b.videolar) {
        const li = el('li');
        li.append(kart(v));
        ul.append(li);
      }
      kisim.append(ul);
      bolum.append(kisim);
    }
    kok.append(bolum);
  }
  return kok;
}
