// Güneş: Risale-i Nur Külliyatı'nın kütüphanesi. Çok açık ten rengi zeminde, çevresinden güneş gibi nur saçan
// inci beyazı Kur'an-ı Kerim (rahlesiz; yalnız süstür, dokunulmaz); altında iki düz yığında 14 cilt (7 + 7), RNK
// Neşriyat kütüphanesindeki sırayla sütun sütun: Sözler sol üstte, Muhâkemat sağ altta. Bütün ciltler aynı deriden
// (#D7787B), yatık durur, sırtı bize bakar; kalınlıkları kullanıcının fotoğrafındaki gerçek oranlarda (iki yığın
// tek ölçekte; oku/ortak.ts KALINLIK). Sırt adları ten rengi, hafif kabartma.
// PDF'i eklenmiş kitap okuyucuda açılır; PDF'i olmayan kitap, listede dış adresi varsa o sitede (RNK Neşriyat'ın
// okuma sitesi rnk.tr; sitede yeni sekmede, telefon uygulamasında tarayıcıda) açılır; ikisi de yoksa cilt soluktur,
// "yakında" kuşağı taşır. En son okunan kitap için yığınların altında "Kaldığın yer".
import { Capacitor } from '@capacitor/core';
import { baglanti, kitaplar } from 'virtual:kitaplar';
import { kuranSvg } from '../oku/kuran-cizim';
import { kalinlikMm, KULLIYAT, SIRT, tipografik, YIGIN_SUTUN } from '../oku/ortak';
import { basiliSayfa, bolumBul, disAdres, kitapKimligi, type Kitap } from './ortak';
import { sonOkunan } from './yer';

const KITAP_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.4C10.2 4.9 7.6 4.2 3.5 4.3v13.6c4.1-.1 6.7.6 8.5 2.1 1.8-1.5 4.4-2.2 8.5-2.1V4.3c-4.1-.1-6.7.6-8.5 2.1Zm0 0V20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>';

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
  // bant yüksekliği = kalınlık (mm) x tek ölçek (--mm-px, iki yığında aynı); yazı boyu ölçüleri satırdan (gunes.css)
  li.style.setProperty('--mm', String(+kalinlikMm(ad).toFixed(2)));
  li.style.setProperty('--em', String(s.em));
  li.style.setProperty('--hm', String(s.hm));
  if (s.dy) li.style.setProperty('--dy', String(s.dy));
  const acilir = kitap || dis;
  const cilt = el(acilir ? 'a' : 'span', `cilt${kitap ? '' : dis ? ' cilt--dis' : ' cilt--yakinda'}`);
  cilt.dataset.kitap = kitapKimligi(ad);
  const deri = el('span', 'cilt__deri');
  deri.setAttribute('aria-hidden', 'true');
  const yazi = el('span', s.satirlar.length > 1 ? 'iki' : undefined);
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
  sahne.innerHTML = `<svg class="gunes__sahne-svg" viewBox="0 0 240 190" aria-hidden="true" focusable="false">${kuranSvg('gs')}</svg>`;

  // Külliyat: iki düz yığın; etiket kısa olan sağ yığının üstündeki boşlukta (gunes.css, ızgara)
  const kulliyat = el('div', 'gunes__kulliyat');
  const baslik = el('h1', 'gunes__etiket');
  baslik.lang = 'tr';
  baslik.tabIndex = -1;
  baslik.append(el('span', undefined, 'Risale-i Nur'), ' ', el('span', undefined, 'Külliyatı'));
  kulliyat.append(baslik);
  const ciltler = new Map<string, HTMLElement>();
  // sütun sütun: ilk yedi eser sol yığın (üstten alta), kalan yedisi sağ yığın; en sağ altta Muhâkemat
  for (const [i, adlar] of [KULLIYAT.slice(0, YIGIN_SUTUN), KULLIYAT.slice(YIGIN_SUTUN)].entries()) {
    const ul = el('ul', `yigin yigin--${i === 0 ? 'sol' : 'sag'}`);
    ul.setAttribute('aria-label', i === 0 ? 'Sol yığın' : 'Sağ yığın');
    for (const ad of adlar) {
      const li = ciltKur(ad, kitaplar.find((k) => k.kitap === ad), disAdres(baglanti, ad));
      ciltler.set(kitapKimligi(ad), li.firstElementChild as HTMLElement);
      ul.append(li);
    }
    kulliyat.append(ul);
  }
  ic.append(sahne, kulliyat);
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
    // kart açıkken yığınların ölçeği kartın yüksekliği kadar küçülür (gunes.css)
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

    // cilt yığından biraz dışa çekilir, kurdelesi alttaki kitabın üstüne sarkar
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

  // Kitaba dokununca: (hareket azaltılmamışsa) cilt yığından kalkıp açılır, sonra okuyucu
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
