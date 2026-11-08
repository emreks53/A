// Güneş: Risale-i Nur Külliyatı'nın kütüphanesi. Mürekkep laciverti zeminde, yumuşak bir ışık altında rahlede
// inci beyazı Kur'an-ı Kerim (yalnız süstür, dokunulmaz); altında iki rafta 14 cilt (6 + 8). Bütün ciltler aynı
// bezden (#D7787B), her biri gerçek kalınlığında: iki raf tek ölçekte, genişlik = RNK baskısının sayfa sayısından
// bulunan milimetre (oku/ortak.ts kalinlikMm). Sırt adları varak, aşağıdan yukarı okunur.
// PDF'i eklenmiş kitap okuyucuda açılır; PDF'i olmayan kitap, listede dış adresi varsa o sitede (RNK Neşriyat'ın
// okuma sitesi rnk.tr; sitede yeni sekmede, telefon uygulamasında tarayıcıda) açılır; ikisi de yoksa cilt soluktur,
// "yakında" kuşağı taşır. En son okunan kitap için rafın altında "Kaldığın yer".
import { Capacitor } from '@capacitor/core';
import { baglanti, kitaplar } from 'virtual:kitaplar';
import { kuranSvg } from '../oku/kuran-cizim';
import { kalinlikMm, KULLIYAT, SIRT, tipografik } from '../oku/ortak';
import { basiliSayfa, bolumBul, disAdres, kitapKimligi, type Kitap } from './ortak';
import { sonOkunan } from './yer';

const KITAP_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.4C10.2 4.9 7.6 4.2 3.5 4.3v13.6c4.1-.1 6.7.6 8.5 2.1 1.8-1.5 4.4-2.2 8.5-2.1V4.3c-4.1-.1-6.7.6-8.5 2.1Zm0 0V20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>';

const DIS_SVG =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5H3.5v9h9V10M9 3h4v4M13 3 7.5 8.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif?: string, metin?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

export interface GunesSecenek {
  /** Kitaba dokunuldu: açılış geçişini oynatıp adrese kendisi gidecekse true döner */
  acilis?(a: { kitap: Kitap; kaynak: HTMLElement; adres: string }): boolean;
}

export interface Gunes {
  /** Ekran açılırken: "kaldığın yer" yeniden okunur */
  yenile(): void;
}

function ciltKur(ad: (typeof KULLIYAT)[number], kitap: Kitap | undefined, dis: string | undefined): HTMLLIElement {
  const s = SIRT[ad];
  const li = el('li');
  // genişlik gerçek kalınlıkla orantılı (mm); iki rafta aynı ölçek
  li.style.setProperty('--mm', String(+kalinlikMm(ad).toFixed(2)));
  const acilir = kitap || dis;
  const cilt = el(acilir ? 'a' : 'span', `cilt${kitap ? '' : dis ? ' cilt--dis' : ' cilt--yakinda'}`);
  cilt.dataset.kitap = kitapKimligi(ad);
  // yazı boyu: sırtın yüksekliğine, satır uzunluğuna (k) ve satır sayısına (n) göre en büyüğü
  cilt.style.setProperty('--k', String(s.k));
  cilt.style.setProperty('--n', String(s.satirlar.length));
  const deri = el('span', 'cilt__deri');
  deri.setAttribute('aria-hidden', 'true');
  const yazi = el('span');
  s.satirlar.forEach((satir, i) => {
    if (i) yazi.append(el('br'));
    yazi.append(satir);
  });
  const adKutu = el('span', 'cilt__ad');
  adKutu.append(yazi);
  deri.append(adKutu);
  if (kitap) {
    const a = cilt as HTMLAnchorElement;
    a.href = `#/gunes/${kitap.kimlik}`;
    a.setAttribute('aria-label', tipografik(ad));
    cilt.append(deri);
  } else if (dis) {
    // kitap yayınevinin okuma sitesinde: sitede yeni sekmede; telefon uygulamasında (Capacitor) dış adres tarayıcıda açılır
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
  sahne.innerHTML = `<svg class="gunes__sahne-svg" viewBox="0 0 260 232" aria-hidden="true" focusable="false">${kuranSvg('gs')}</svg>`;

  const baslik = el('h1', 'gunes__etiket', 'Risale-i Nur Külliyatı');
  baslik.lang = 'tr';
  baslik.tabIndex = -1;

  const raflar = el('div', 'gunes__raflar');
  const ciltler = new Map<string, HTMLElement>();
  // üst rafta altı, altta sekiz cilt (üst raf 195,2 mm, alt raf 188,05 mm: ikisi de aynı ölçekte)
  for (const [i, adlar] of [KULLIYAT.slice(0, 6), KULLIYAT.slice(6)].entries()) {
    const raf = el('div', 'gunes__raf');
    const ul = el('ul', 'gunes__kitaplar');
    ul.setAttribute('aria-label', i === 0 ? 'Üst raf' : 'Alt raf');
    for (const ad of adlar) {
      const li = ciltKur(ad, kitaplar.find((k) => k.kitap === ad), disAdres(baglanti, ad));
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
  const disaAcilan = KULLIYAT.filter((ad) => !kitaplar.some((k) => k.kitap === ad) && disAdres(baglanti, ad));
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
  gorunum.replaceChildren(kitaplik);

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
    // kart açıkken sahne ve sırtlar biraz kısalır (gunes.css)
    kitaplik.toggleAttribute('data-devam', !devam.hidden);
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
