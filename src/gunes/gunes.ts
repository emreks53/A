// Güneş: Risale-i Nur Külliyatı'nın kütüphanesi. Şafak vakti: güneş, rahledeki Kur'an-ı Kerim'in ardından doğar
// (Kur'an yalnız süstür, dokunulmaz); altında ceviz rafta 14 cilt (7 + 7), her biri en az 44 px'lik bir bağlantı.
// PDF'i eklenmiş kitap okuyucuda açılır; PDF'i olmayan kitap, listede dış adresi varsa o sitede (RNK Neşriyat'ın
// kitap sayfası; sitede yeni sekmede, telefon uygulamasında tarayıcıda) açılır; ikisi de yoksa cilt soluktur, "yakında"
// kuşağı taşır. En son okunan kitap için rafın altında "Kaldığın yer".
import { Capacitor } from '@capacitor/core';
import { baglanti, kitaplar } from 'virtual:kitaplar';
import { RENKLER } from '../oku/menba-cizim';
import { KULLIYAT, tipografik } from '../oku/ortak';
import { basiliSayfa, bolumBul, kitapKimligi, type Kitap } from './ortak';
import sahneSvg from './sahne.svg?raw';
import { sonOkunan } from './yer';

/** Raftaki sırt: genişlik payı (g), boy oranı (b), yazı boyu (fs), yazı boyu / satır uzunluğu (k), satırlar */
const SIRTLAR: Record<string, { g: number; b: number; fs: number; k: number; satirlar: string[] }> = {
  Sözler: { g: 53, b: 1, fs: 15, k: 0.3912, satirlar: ['Sözler'] },
  Mektubat: { g: 51, b: 0.985, fs: 15, k: 0.2534, satirlar: ['Mektubat'] },
  "Lem'alar": { g: 50, b: 0.99, fs: 15, k: 0.2609, satirlar: ['Lem’alar'] },
  Şuâlar: { g: 53, b: 1, fs: 15, k: 0.3597, satirlar: ['Şuâlar'] },
  "İşârâtü'l-İ'câz": { g: 47, b: 0.97, fs: 12.5, k: 0.2534, satirlar: ['İşârâtü’l-', 'İ’câz'] },
  'Mesnevî-i Nûriye': { g: 47, b: 0.97, fs: 12.5, k: 0.2466, satirlar: ['Mesnevî-i', 'Nûriye'] },
  'Asâ-yı Mûsâ': { g: 45, b: 0.955, fs: 12.5, k: 0.383, satirlar: ['Asâ-yı', 'Mûsâ'] },
  'Barla Lâhikası': { g: 48, b: 0.98, fs: 12.5, k: 0.2768, satirlar: ['Barla', 'Lâhikası'] },
  'Kastamonu Lâhikası': { g: 48, b: 0.98, fs: 12.5, k: 0.2116, satirlar: ['Kastamonu', 'Lâhikası'] },
  'Emirdağ Lâhikası': { g: 51, b: 1, fs: 12.5, k: 0.2768, satirlar: ['Emirdağ', 'Lâhikası'] },
  'Sikke-i Tasdîk-i Gaybî': { g: 46, b: 0.965, fs: 11, k: 0.3033, satirlar: ['Sikke-i', 'Tasdîk-i', 'Gaybî'] },
  'Tarihçe-i Hayat': { g: 50, b: 1, fs: 12.5, k: 0.2673, satirlar: ['Tarihçe-i', 'Hayat'] },
  Muhâkemat: { g: 44, b: 0.95, fs: 13, k: 0.2, satirlar: ['Muhâkemat'] },
  'İman ve Küfür Muvâzeneleri': { g: 45, b: 0.96, fs: 10.5, k: 0.1782, satirlar: ['İman ve', 'Küfür', 'Muvâzeneleri'] },
};

const KITAP_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.4C10.2 4.9 7.6 4.2 3.5 4.3v13.6c4.1-.1 6.7.6 8.5 2.1 1.8-1.5 4.4-2.2 8.5-2.1V4.3c-4.1-.1-6.7.6-8.5 2.1Zm0 0V20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';

const DIS_SVG =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5H3.5v9h9V10M9 3h4v4M13 3 7.5 8.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Ana ekranın gökyüzü fotoğrafı (aynı dosyalar: önbellekten gelir)
const FOTO = import.meta.glob<string>('../assets/bg/*.{avif,webp,jpg}', { eager: true, query: '?url', import: 'default' });
const foto = (ad: string) => FOTO[`../assets/bg/${ad}`];

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif?: string, metin?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

/** Kitabın cilt renkleri [orta, koyu, açık] (Menba rafı ve Kenz ile aynı, Külliyat sırasıyla) */
export function ciltRenkleri(ad: string): readonly [string, string, string] {
  const i = (KULLIYAT as readonly string[]).indexOf(ad);
  return RENKLER[Math.max(0, i) % RENKLER.length];
}

export interface GunesSecenek {
  /** Kitaba dokunuldu: açılış geçişini oynatıp adrese kendisi gidecekse true döner */
  acilis?(a: { kitap: Kitap; kaynak: HTMLElement; adres: string }): boolean;
}

export interface Gunes {
  /** Ekran açılırken: "kaldığın yer" yeniden okunur */
  yenile(): void;
}

function zeminKur(): HTMLElement {
  const zemin = el('div', 'gunes__zemin');
  zemin.setAttribute('aria-hidden', 'true');
  const resim = el('picture', 'gunes__foto');
  for (const [tur, uzanti] of [['image/avif', 'avif'], ['image/webp', 'webp'], ['', 'jpg']] as const) {
    const genis = el('source');
    genis.media = '(min-aspect-ratio: 4/5)';
    if (tur) genis.type = tur;
    genis.srcset = `${foto(`bg-wide-1280.${uzanti}`)} 1280w, ${foto(`bg-wide-2560.${uzanti}`)} 2560w`;
    genis.sizes = '100vw';
    resim.append(genis);
  }
  for (const [tur, uzanti] of [['image/avif', 'avif'], ['image/webp', 'webp']] as const) {
    const dik = el('source');
    dik.type = tur;
    dik.srcset = `${foto(`bg-portrait-854.${uzanti}`)} 854w, ${foto(`bg-portrait-1708.${uzanti}`)} 1708w`;
    dik.sizes = '100vw';
    resim.append(dik);
  }
  const img = el('img', 'gunes__foto-img');
  img.src = foto('bg-portrait-854.jpg');
  img.srcset = `${foto('bg-portrait-854.jpg')} 854w, ${foto('bg-portrait-1708.jpg')} 1708w`;
  img.sizes = '100vw';
  img.alt = '';
  img.decoding = 'async';
  img.loading = 'lazy';
  resim.append(img);
  zemin.append(resim, el('div', 'gunes__safak'));
  return zemin;
}

function ciltKur(ad: string, kitap: Kitap | undefined, dis: string | undefined): HTMLLIElement {
  const s = SIRTLAR[ad];
  const li = el('li');
  li.style.setProperty('--g', String(s.g));
  const acilir = kitap || dis;
  const cilt = el(acilir ? 'a' : 'span', `cilt${kitap ? '' : dis ? ' cilt--dis' : ' cilt--yakinda'}`);
  cilt.dataset.kitap = kitapKimligi(ad);
  cilt.style.setProperty('--cilt', ciltRenkleri(ad)[0]);
  cilt.style.setProperty('--b', String(s.b));
  cilt.style.setProperty('--fs', `${s.fs}px`);
  cilt.style.setProperty('--k', String(s.k));
  const deri = el('span', 'cilt__deri');
  deri.setAttribute('aria-hidden', 'true');
  const yazi = el('span');
  s.satirlar.forEach((satir, i) => {
    if (i) yazi.append(el('br'));
    yazi.append(satir);
  });
  const adKutu = el('span', 'cilt__ad');
  adKutu.append(yazi);
  deri.append(el('span', 'cilt__sus'), adKutu);
  if (kitap) {
    const a = cilt as HTMLAnchorElement;
    a.href = `#/gunes/${kitap.kimlik}`;
    a.setAttribute('aria-label', tipografik(ad));
    cilt.append(deri);
  } else if (dis) {
    // yayınevinin kitap sayfası: sitede yeni sekmede; telefon uygulamasında (Capacitor) dış adres tarayıcıda açılır
    const a = cilt as HTMLAnchorElement;
    a.href = dis;
    if (!Capacitor.isNativePlatform()) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    a.setAttribute('aria-label', `${tipografik(ad)}, ${baglanti?.ad} sitesinde açılır`);
    cilt.append(deri);
  } else {
    // ekran okuyucu tam adı ve durumu duyar; görünen sırt ve kuşak gizli
    const kusak = el('span', 'cilt__kusak', 'yakında');
    kusak.setAttribute('aria-hidden', 'true');
    cilt.append(el('span', 'visually-hidden', `${tipografik(ad)}, yakında`), deri, kusak);
  }
  li.append(cilt);
  return li;
}

export function gunesBaslat(gorunum: HTMLElement, s: GunesSecenek = {}): Gunes {
  const kitaplik = el('div', 'gunes');
  const ic = el('div', 'gunes__ic');

  const sahne = el('div', 'gunes__sahne');
  sahne.setAttribute('aria-hidden', 'true');
  sahne.innerHTML = sahneSvg;

  const baslik = el('h1', 'gunes__etiket', 'Risale-i Nur Külliyatı');
  baslik.lang = 'tr';
  baslik.tabIndex = -1;

  const raflar = el('div', 'gunes__raflar');
  const ciltler = new Map<string, HTMLElement>();
  for (const [i, adlar] of [KULLIYAT.slice(0, 7), KULLIYAT.slice(7)].entries()) {
    const raf = el('div', 'gunes__raf');
    const ul = el('ul', 'gunes__kitaplar');
    ul.setAttribute('aria-label', i === 0 ? 'Üst raf' : 'Alt raf');
    for (const ad of adlar) {
      const li = ciltKur(ad, kitaplar.find((k) => k.kitap === ad), baglanti?.adresler[ad]);
      ciltler.set(kitapKimligi(ad), li.firstElementChild as HTMLElement);
      ul.append(li);
    }
    const tahta = el('div', 'gunes__tahta');
    tahta.setAttribute('aria-hidden', 'true');
    raf.append(ul, tahta);
    raflar.append(raf);
  }

  const bosluk = el('div', 'gunes__bosluk');
  bosluk.setAttribute('aria-hidden', 'true');
  ic.append(sahne, baslik, raflar);
  // dış sitede açılan kitaplar varsa rafın altında söylenir
  const disaAcilan = KULLIYAT.filter((ad) => !kitaplar.some((k) => k.kitap === ad) && baglanti?.adresler[ad]);
  if (baglanti && disaAcilan.length) {
    const not = el('p', 'gunes__not');
    const yazi = el('span');
    yazi.append(disaAcilan.length === KULLIYAT.length ? 'Kitaplar ' : 'Okuyucuda olmayan kitaplar ', el('b', undefined, baglanti.ad), ' sitesinde açılır');
    const ok = el('span', 'gunes__not-ok');
    ok.innerHTML = DIS_SVG;
    not.append(yazi, ok);
    ic.append(not);
  }
  ic.append(bosluk);
  kitaplik.append(ic);
  gorunum.replaceChildren(zeminKur(), kitaplik);

  // "Kaldığın yer" kartı tek bir öğedir, yerinde güncellenir (kitap kapanınca odak ona döner)
  const devam = el('a', 'gunes__devam');
  devam.hidden = true;
  ic.append(devam);
  let kurdeleli: HTMLElement | null = null;

  function yenile(): void {
    const son = sonOkunan(kitaplar);
    const k = son && kitaplar.find((x) => x.kimlik === son.kimlik);
    const yer = son?.yer;
    devam.hidden = !yer;
    if (kurdeleli) {
      kurdeleli.classList.remove('cilt--kaldigin');
      kurdeleli.querySelector('.cilt__kurdele')?.remove();
      const ad = kitaplar.find((x) => x.kimlik === kurdeleli!.dataset.kitap)?.kitap;
      if (ad) kurdeleli.setAttribute('aria-label', tipografik(ad));
      kurdeleli = null;
    }
    if (!k || !yer) return;
    const basili = basiliSayfa(k, yer.sayfa);
    const bolum = bolumBul(k, yer.sayfa);
    const yerYazisi = [bolum ? tipografik(bolum.baslik) : '', basili ? `${basili}. sayfa` : ''].filter(Boolean);

    // raftaki cilt biraz öne çekilir, kurdelesi raftan sarkar
    const cilt = ciltler.get(k.kimlik);
    if (cilt) {
      cilt.classList.add('cilt--kaldigin');
      const kurdele = el('span', 'cilt__kurdele');
      kurdele.setAttribute('aria-hidden', 'true');
      cilt.append(kurdele);
      cilt.setAttribute('aria-label', `${tipografik(k.kitap)}, kaldığın yer${basili ? ` ${basili}. sayfa` : ''}`);
      kurdeleli = cilt;
    }

    const a = devam;
    a.href = `#/gunes/${k.kimlik}${basili ? `/${basili}` : ''}`;
    a.dataset.kitap = k.kimlik;
    const oran = k.sayfaSayisi ? Math.min(1, yer.sayfa / k.sayfaSayisi) : 0;
    a.setAttribute(
      'aria-label',
      `Kaldığın yerden devam et: ${tipografik(k.kitap)}${yerYazisi.length ? `, ${yerYazisi.join(', ')}` : ''}${oran ? `, yüzde ${Math.round(oran * 100)} okundu` : ''}`,
    );
    const kapak = el('span', 'gunes__devam-kapak');
    kapak.style.setProperty('--cilt', ciltRenkleri(k.kitap)[0]);
    kapak.append(el('i'));
    const metin = el('span', 'gunes__devam-metin');
    const ust = el('span', 'gunes__devam-ust', 'Kaldığın yer');
    ust.lang = 'tr';
    const yerS = el('span', 'gunes__devam-yer');
    if (bolum) yerS.append(tipografik(bolum.baslik));
    if (bolum && basili) yerS.append(' · ');
    if (basili) yerS.append(el('b', undefined, `${basili}. sayfa`));
    metin.append(ust, el('span', 'gunes__devam-ad', tipografik(k.kitap)), yerS);
    const dugme = el('span', 'gunes__devam-dugme');
    dugme.innerHTML = KITAP_SVG;
    for (const c of [kapak, metin, dugme]) c.setAttribute('aria-hidden', 'true');
    a.replaceChildren(kapak, metin, dugme);
    if (oran) {
      const ilerleme = el('span', 'gunes__devam-ilerleme');
      ilerleme.style.setProperty('--o', oran.toFixed(3));
      ilerleme.setAttribute('aria-hidden', 'true');
      a.append(ilerleme);
    }
  }

  // Kitaba dokununca: (hareket azaltılmamışsa) cilt raftan çekilip açılır, sonra okuyucu
  kitaplik.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>('a.cilt, a.gunes__devam');
    const k = a && kitaplar.find((x) => x.kimlik === a.dataset.kitap);
    if (!a || !k || !s.acilis) return;
    const kaynak = a.classList.contains('gunes__devam') ? (ciltler.get(k.kimlik) ?? a) : a;
    if (s.acilis({ kitap: k, kaynak, adres: a.getAttribute('href')! })) e.preventDefault();
  });

  yenile();
  return { yenile };
}
