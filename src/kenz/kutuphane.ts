// Kenz: videolar geçtiği Risale-i Nur kitabına, kitapta da bölümüne göre gruplanır.
// Kitaplar Külliyat sırasıyla, bölümler ve videolar listedeki sırayla gelir. Karta dokununca video Oku'da açılır.
import { videolar } from 'virtual:oku-videolar';
import { ciltRengi, etiketYazisi, KULLIYAT, sureYazisi, tipografik, type Video } from '../oku/ortak';

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
      // (yazımı ufak farklı aynı bölüm, ör. düz ya da tipografik kesme işaretiyle, ayrı başlık olmasın)
      let g = bolumler.find((b) => kimlik(b.bolum) === kimlik(v.bolum));
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

const OYNAT_SVG = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1.2v7.6L8.6 5 2 1.2Z" fill="currentColor"/></svg>';
const KITAP_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.4C10.2 4.9 7.6 4.2 3.5 4.3v13.6c4.1-.1 6.7.6 8.5 2.1 1.8-1.5 4.4-2.2 8.5-2.1V4.3c-4.1-.1-6.7.6-8.5 2.1Zm0 0V20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';

/** Kartın erişilebilir adı: "On Yedinci Lem’a’dan, 1:59. Lem’alar, 154. sayfa. #ihlas #muhabbet #kurtuluş" */
export function kartEtiketi(v: Video): string {
  const yer = [v.kitap, v.kisim, v.sayfa ? `${v.sayfa}. sayfa` : undefined].filter(Boolean).join(', ');
  return tipografik(`${v.baslik}, ${sureYazisi(v.sure)}. ${yer}. ${etiketYazisi(v.etiketler)}`);
}

/** Kartın alt satırı: "Altıncı Mesele · 203. sayfa" ya da "154. sayfa" */
export function kartYeri(v: Pick<Video, 'kisim' | 'sayfa'>): string {
  return tipografik([v.kisim, v.sayfa ? `${v.sayfa}. sayfa` : undefined].filter(Boolean).join(' · '));
}

function kart(v: Video): HTMLAnchorElement {
  const a = el('a', 'kart');
  a.href = `#/oku/${v.id}`;
  a.dataset.video = v.id;
  a.setAttribute('aria-label', kartEtiketi(v));
  const afis = el('span', 'kart__afis');
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
  afis.append(img, sure);
  const metin = el('span', 'kart__metin');
  metin.append(el('span', 'kart__ad', tipografik(v.baslik)));
  const yer = kartYeri(v);
  if (yer) {
    const y = el('span', 'kart__yer');
    y.innerHTML = KITAP_SVG;
    y.append(yer);
    metin.append(y);
  }
  const etiketler = el('span', 'kart__etiketler');
  for (const e of v.etiketler) etiketler.append(el('span', 'etiket', tipografik(`#${e}`)));
  metin.append(etiketler);
  a.append(afis, metin);
  for (const c of a.children) c.setAttribute('aria-hidden', 'true');
  return a;
}

/** Üç ve daha çok kitap olunca başta kitap fihristi: dokununca o kitaba kayar */
function fihrist(gruplar: KitapGrubu[], liste: Video[]): HTMLElement {
  const nav = el('nav', 'fihrist');
  nav.setAttribute('aria-label', 'Kitaplar');
  const ul = el('ul', 'fihrist__liste');
  for (const { kitap } of gruplar) {
    const li = el('li');
    const d = el('button', 'fihrist__kitap');
    d.type = 'button';
    d.style.setProperty('--cilt', ciltRengi(kitap));
    const sayi = liste.filter((v) => v.kitap === kitap).length;
    d.setAttribute('aria-label', `${tipografik(kitap)}, ${sayi} video`);
    const sirt = el('i');
    sirt.setAttribute('aria-hidden', 'true');
    const ad = el('span', undefined, tipografik(kitap));
    ad.setAttribute('aria-hidden', 'true');
    const s = el('b', undefined, String(sayi));
    s.setAttribute('aria-hidden', 'true');
    d.append(sirt, ad, s);
    d.addEventListener('click', () => {
      const hedef = document.getElementById(`kitap-${kimlik(kitap)}`);
      if (!hedef) return;
      const azalt = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      hedef.scrollIntoView({ behavior: azalt ? 'auto' : 'smooth', block: 'start' });
      hedef.querySelector<HTMLElement>('.kitap__ad')?.focus({ preventScroll: true });
    });
    li.append(d);
    ul.append(li);
  }
  nav.append(ul);
  return nav;
}

export function kutuphaneCiz(liste: Video[] = videolar): HTMLElement {
  const kok = el('div', 'kutuphane');
  const gruplar = kitapGruplari(liste);
  if (gruplar.length >= 3) kok.append(fihrist(gruplar, liste));
  for (const { kitap, bolumler } of gruplar) {
    const bolum = el('section', 'kitap');
    const id = `kitap-${kimlik(kitap)}`;
    bolum.id = id;
    bolum.style.setProperty('--cilt', ciltRengi(kitap));
    const ad = el('h2', 'kitap__ad');
    ad.append(el('span', undefined, tipografik(kitap)));
    ad.id = `${id}-ad`;
    ad.tabIndex = -1;
    bolum.setAttribute('aria-labelledby', ad.id);
    const sayi = liste.filter((v) => v.kitap === kitap).length;
    const ust = el('div', 'kitap__ust');
    const sirt = el('span', 'kitap__sirt');
    sirt.setAttribute('aria-hidden', 'true');
    ust.append(sirt, ad, el('span', 'kitap__sayi', bolumler.length > 1 ? `${bolumler.length} bölüm · ${sayi} video` : `${sayi} video`));
    bolum.append(ust);
    for (const b of bolumler) {
      const kisim = el('section', 'bolum');
      const bid = `${id}-${kimlik(b.bolum)}`;
      const bad = el('h3', 'bolum__ad');
      bad.lang = 'tr';
      bad.append(el('span', undefined, tipografik(b.bolum)));
      if (b.videolar.length > 1) bad.append(el('small', undefined, `${b.videolar.length} video`));
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
