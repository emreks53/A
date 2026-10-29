// Güneş'in dijital okuyucusu: Risale-i Nur kitabının PDF'i basıldığı gibi, sayfa sayfa gösterilir (metne
// dokunulmaz). Sayfalar yana kaydırılarak (ya da kenarlara dokunarak, klavyeyle) çevrilir; iki parmakla ya da çift
// dokunuşla yakınlaşılır. Yatay geniş ekranda iki sayfa yan yana açılır. Kalınan yer hatırlanır; adres
// (#/gunes/<kitap>/<sayfa>) sayfayla birlikte güncellenir, geçmişe kayıt eklenmez.
import { videolar } from 'virtual:oku-videolar';
import { acikSayfa, altSayfaAc } from '../oku/alt-sayfa';
import { sureYazisi, tipografik } from '../oku/ortak';
import { basiliSayfa, bolumBul, pdfSayfasi, sayfaninVideosu, type IcindekilerOgesi, type Kitap } from './ortak';
import { hataNedeni, kitapYukle, pdfIcindekiler, sayfaCiz, type Cizim, type HataNedeni, type KitapYukleme, type PDFDocumentProxy, type PDFPageProxy } from './pdf';
import { kalinanYer, yeriKaydet } from './yer';

export type Tema = 'gunduz' | 'sepya' | 'gece';
const TEMA_ANAHTARI = 'nuruhakikat.gunes.tema';
const TEMALAR: { ad: Tema; etiket: string }[] = [
  { ad: 'gunduz', etiket: 'Gündüz' },
  { ad: 'sepya', etiket: 'Sepya' },
  { ad: 'gece', etiket: 'Gece' },
];

export interface OkuyucuSecenek {
  /** Okuyucudan çıkış (kapat düğmesi, Escape): yönlendirmeyi çağıran yapar */
  kapat(): void;
  /** Görünen sayfa değişti */
  adresDegisti(kitap: Kitap, basili: number | null): void;
  /** Tarayıcının çubuk rengi okuyucunun temasına uysun */
  temaDegisti?(renk: string): void;
}

export interface Okuyucu {
  /** Kitabı açar (zaten açıksa verilen sayfaya gider). basili yoksa kalınan yerden. */
  ac(kitap: Kitap, basili?: number): void;
  /** Okuyucudan çıkılırken: yer kaydedilir, çizimler bırakılır (gorunenKalsin: açık sayfanınki kalır; okuyucudan
   *  Oku'ya geçilince sağa kaydırırken altta sayfa görünsün) */
  ayril(gorunenKalsin?: boolean): void;
  /** Açık bir iç katman (yakınlaştırma) varsa kapatır; kapattıysa true (geri tuşu için) */
  geriAl(): boolean;
  /** Okuyucunun zemin rengi (tarayıcı çubuğu için) */
  zeminRengi(): string;
  /** Kâğıdın bu temadaki rengi (açılış geçişi için) */
  kagitRengi(): string;
}

const HATA_YAZISI: Record<HataNedeni, string> = {
  ag: 'Kitap açılamadı. İnternet bağlantınızı denetleyip yeniden deneyin.',
  yok: 'Bu kitabın dosyası bulunamadı.',
  bozuk: 'Kitap dosyası okunamadı.',
  cihaz: 'Okuyucu bu cihazda açılamadı. Tarayıcınızı ya da cihazınızın yazılımını güncelleyip yeniden deneyin.',
};

const ZEMIN: Record<Tema, string> = { gunduz: '#EBE7E0', sepya: '#E9DEC7', gece: '#0A1534' };
const KAGIT: Record<Tema, string> = { gunduz: '#FFFFFF', sepya: '#F6EEDC', gece: '#0F1A3A' };

/** Okuyucu açılınca ilk sayfanın ekranda duracağı yer (açılış geçişi için; sayfa oranı bilinmiyorsa A5) */
export function tahminiSayfaKutusu(oran = 1.414): { x: number; y: number; w: number; h: number } {
  const olcu = document.createElement('div');
  olcu.className = 'okuyucu__olcu';
  document.body.append(olcu);
  const st = getComputedStyle(olcu);
  const r = olcu.getBoundingClientRect();
  const [pt, pr, pb, pl] = [st.paddingTop, st.paddingRight, st.paddingBottom, st.paddingLeft].map((d) => parseFloat(d) || 0);
  olcu.remove();
  const w = r.width - pl - pr;
  const h = r.height - pt - pb;
  const genislik = Math.min(w, h / oran);
  return { x: r.left + pl + (w - genislik) / 2, y: r.top + pt + (h - genislik * oran) / 2, w: genislik, h: genislik * oran };
}

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif?: string, metin?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

const SVG = {
  kapat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  icindekiler:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6.5h12M8 12h12M8 17.5h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="4.2" cy="6.5" r="1.3" fill="currentColor"/><circle cx="4.2" cy="12" r="1.3" fill="currentColor"/><circle cx="4.2" cy="17.5" r="1.3" fill="currentColor"/></svg>',
  ayar: '<span class="okuyucu__aa" aria-hidden="true">A<i>a</i></span>',
  oynat: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 1.2v7.6L8.8 5z" fill="currentColor"/></svg>',
};

/** Sayfa numarası yazısı: basılı numara ("154") ya da numarasız ön sayfa için "Kapak", "Ön sayfa 2" */
function sayfaYazisi(k: Kitap, pdf: number): string {
  const b = basiliSayfa(k, pdf);
  if (b !== null) return String(b);
  return pdf === 1 ? 'Kapak' : `Ön sayfa ${pdf}`;
}

export function okuyucuBaslat(gorunum: HTMLElement, s: OkuyucuSecenek): Okuyucu {
  let tema: Tema = (() => {
    try {
      const t = localStorage.getItem(TEMA_ANAHTARI);
      return t === 'sepya' || t === 'gece' || t === 'gunduz' ? t : 'gunduz';
    } catch {
      return 'gunduz';
    }
  })();

  // ---------- iskelet ----------
  const kok = el('div', 'okuyucu');
  kok.dataset.tema = tema;
  const baslik = el('h1', 'visually-hidden');
  baslik.tabIndex = -1;
  const iz = el('div', 'okuyucu__iz');
  iz.tabIndex = 0;
  iz.setAttribute('role', 'region');
  iz.setAttribute('aria-roledescription', 'kitap');
  const yakin = el('div', 'okuyucu__yakin');
  yakin.hidden = true;
  const yakinIc = el('div', 'okuyucu__yakin-ic');
  const yakinTuval = el('canvas', 'okuyucu__tuval');
  yakinIc.append(yakinTuval);
  yakin.append(yakinIc);

  const ust = el('header', 'okuyucu__ust');
  const kapatD = el('button', 'okuyucu__dugme okuyucu__kapat');
  kapatD.type = 'button';
  kapatD.innerHTML = SVG.kapat;
  kapatD.setAttribute('aria-label', 'Kitabı kapat');
  const baslikKutu = el('div', 'okuyucu__baslik');
  const kitapAdi = el('p', 'okuyucu__kitap');
  const bolumAdi = el('p', 'okuyucu__bolum');
  baslikKutu.append(kitapAdi, bolumAdi);
  const icindekilerD = el('button', 'okuyucu__dugme okuyucu__icindekiler-d');
  icindekilerD.type = 'button';
  icindekilerD.innerHTML = SVG.icindekiler;
  icindekilerD.setAttribute('aria-label', 'İçindekiler');
  icindekilerD.setAttribute('aria-haspopup', 'dialog');
  const ayarD = el('button', 'okuyucu__dugme okuyucu__ayar-d');
  ayarD.type = 'button';
  ayarD.innerHTML = SVG.ayar;
  ayarD.setAttribute('aria-label', 'Görünüm: sayfa rengi');
  ayarD.setAttribute('aria-haspopup', 'dialog');
  ust.append(kapatD, baslikKutu, icindekilerD, ayarD);

  // alt çubuk: "154 / 480 · %32", (varsa) bu sayfanın videosu; altında bölüm başları çentikli kaydırıcı
  const alt = el('footer', 'okuyucu__alt');
  const satir = el('div', 'okuyucu__satir');
  const konum = el('div', 'okuyucu__konum');
  const sayfaNo = el('p', 'okuyucu__sayfa-no');
  const yuzde = el('span', 'okuyucu__yuzde');
  yuzde.setAttribute('aria-hidden', 'true');
  konum.append(sayfaNo, yuzde);
  const videoD = el('a', 'okuyucu__video');
  videoD.hidden = true;
  satir.append(konum, videoD);
  const kaydir = el('div', 'okuyucu__kaydir');
  const kaydirIz = el('div', 'okuyucu__kaydir-iz');
  kaydirIz.append(el('span', 'okuyucu__kaydir-dolu'));
  const centikler = el('div', 'okuyucu__centikler');
  for (const e of [kaydirIz, centikler]) e.setAttribute('aria-hidden', 'true');
  const kaydirici = el('input', 'okuyucu__kaydirici');
  kaydirici.type = 'range';
  kaydirici.min = '1';
  kaydirici.step = '1';
  kaydirici.setAttribute('aria-label', 'Sayfaya git');
  kaydir.append(kaydirIz, centikler, kaydirici);
  const onizleme = el('span', 'okuyucu__onizleme');
  onizleme.setAttribute('aria-hidden', 'true');
  alt.append(onizleme, satir, kaydir);

  // "Kaldığın yerden: 154. sayfa · Baştan aç" (kitap kalınan yerden açılınca birkaç saniye)
  const bildirim = el('div', 'okuyucu__bildirim');
  bildirim.setAttribute('role', 'status');
  bildirim.hidden = true;

  const durum = el('div', 'okuyucu__durum');
  durum.setAttribute('role', 'status');
  durum.hidden = true;
  // sayfa değişince ekran okuyucuya söylenir (çubuklar gizliyken de)
  const duyuru = el('p', 'visually-hidden');
  duyuru.setAttribute('aria-live', 'polite');

  kok.append(baslik, iz, yakin, ust, bildirim, alt, durum, duyuru);
  gorunum.append(kok);

  // ---------- durum ----------
  let kitap: Kitap | null = null;
  let belge: PDFDocumentProxy | null = null;
  let yukleme: KitapYukleme | null = null;
  let toplam = 0;
  let cift = false;
  /** Her yuva (ekranda bir "açılış") bir ya da iki PDF sayfası */
  let gruplar: number[][] = [];
  let yuvalar: HTMLElement[] = [];
  let mevcut = 1;
  let gIndeks = 0;
  let icindekiler: IcindekilerOgesi[] = [];
  /** PDF sayfalarının 1 ölçekli boyu (yer tutucular gerçek oranda dursun) */
  const olcu = new Map<number, { w: number; h: number }>();
  let ornekOran = 1.414;
  const cizimler = new Map<number, { tuval: HTMLCanvasElement; olcek: number; cizim: Cizim | null; bitti: boolean }>();
  let oturum = 0;
  /** Okuyucu ekranda mı (çıkılınca sıradaki çizimler yapılmaz) */
  let acik = false;
  /** Okunan PDF sayfası: kalınan yer ve adres buna göre (iki sayfa yan yanayken sağdaki de olabilir; döndürünce
   *  bu sayfada kalınır) */
  let okunan = 1;
  /** Açılırken istenen basılı sayfa (yeniden denerken) */
  let istenenSayfa: number | undefined;

  // Çubuklar gizlenince de erişilebilir kalır: ekran okuyucu ya da Tab ile ulaşılınca yeniden görünür (CSS)
  const arayuzGoster = (goster: boolean) => kok.toggleAttribute('data-arayuz', goster);

  function temaUygula(t: Tema): void {
    tema = t;
    kok.dataset.tema = t;
    try {
      localStorage.setItem(TEMA_ANAHTARI, t);
    } catch {
      // hatırlanmaz
    }
    s.temaDegisti?.(ZEMIN[t]);
  }

  function durumGoster(tur: 'yukleniyor' | 'hata' | null, oran?: number, neden: HataNedeni = 'ag'): void {
    durum.hidden = tur === null;
    kok.dataset.durum = tur ?? '';
    if (tur === 'yukleniyor') {
      const yuzde = oran === undefined ? '' : ` %${Math.round(oran * 100)}`;
      // sayfanın duracağı yerde boş bir kâğıt (açılış geçişi buraya iner)
      const k = tahminiSayfaKutusu(ornekOran);
      const iskelet = el('div', 'okuyucu__iskelet');
      Object.assign(iskelet.style, { left: `${k.x}px`, top: `${k.y}px`, width: `${k.w}px`, height: `${k.h}px` });
      const yazi = el('p', 'okuyucu__durum-yazi');
      yazi.append(el('span', 'okuyucu__yukleniyor', ''), `Kitap açılıyor${yuzde}`);
      durum.replaceChildren(iskelet, yazi);
    } else if (tur === 'hata') {
      const yeniden = el('button', 'okuyucu__yeniden', 'Yeniden dene');
      yeniden.type = 'button';
      yeniden.addEventListener('click', () => {
        if (kitap) {
          const k = kitap;
          kitap = null;
          // hiç açılamadıysa istenen sayfa (adresteki) yeniden istenir
          ac(k, gruplar.length ? (basiliSayfa(k, okunan) ?? undefined) : istenenSayfa);
        }
      });
      durum.replaceChildren(el('p', 'okuyucu__durum-yazi', HATA_YAZISI[neden]), yeniden);
      const odak = document.activeElement;
      if (!odak || odak === document.body || kok.contains(odak)) yeniden.focus({ preventScroll: true });
    }
  }

  // ---------- düzen ----------
  function ciftMi(): boolean {
    const w = iz.clientWidth;
    const h = iz.clientHeight;
    return w >= 700 && w > h * 1.15;
  }

  function gruplariKur(): void {
    gruplar = [];
    if (!cift) for (let i = 1; i <= toplam; i++) gruplar.push([i]);
    else {
      // Kitap gibi: ilk sayfa (kapak) tek, sonra çift-tek sayfalar yan yana
      gruplar.push([1]);
      for (let i = 2; i <= toplam; i += 2) gruplar.push(i + 1 <= toplam ? [i, i + 1] : [i]);
    }
    for (const c of cizimler.values()) c.cizim?.iptal();
    cizimler.clear();
    yuvalar = gruplar.map((g, i) => {
      const yuva = el('div', 'okuyucu__yuva');
      yuva.dataset.i = String(i);
      for (const n of g) {
        const sayfa = el('div', 'okuyucu__sayfa');
        sayfa.dataset.sayfa = String(n);
        sayfa.setAttribute('role', 'group');
        sayfa.setAttribute('aria-label', kitap ? `Sayfa ${sayfaYazisi(kitap, n)}` : `Sayfa ${n}`);
        // iki sayfa yan yana: ortada cilt gölgesi
        if (g.length > 1) sayfa.append(el('span', 'okuyucu__cilt-golge'));
        yuva.append(sayfa);
      }
      return yuva;
    });
    iz.replaceChildren(...yuvalar);
    duzenGenisligi = iz.clientWidth;
    kok.toggleAttribute('data-cift', cift);
    olculeriUygula();
    centikleriKur();
  }

  /** Bir sayfanın ekrandaki kutusu (CSS px): yuvanın iç alanına sığar */
  function sayfaKutusu(): { w: number; h: number } {
    const ornek = yuvalar[0];
    if (!ornek) return { w: 300, h: 420 };
    const st = getComputedStyle(ornek);
    const w = ornek.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
    const h = ornek.clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom);
    const ara = cift ? parseFloat(st.columnGap) || 0 : 0;
    return { w: Math.max(100, (w - ara) / (cift ? 2 : 1)), h: Math.max(100, h) };
  }

  function sigdirOlcu(n: number): { w: number; h: number; olcek: number } {
    const kutu = sayfaKutusu();
    const o = olcu.get(n) ?? { w: 1, h: ornekOran };
    const olcek = Math.min(kutu.w / o.w, kutu.h / o.h);
    return { w: o.w * olcek, h: o.h * olcek, olcek };
  }

  function olculeriUygula(): void {
    for (const yuva of yuvalar) {
      for (const sayfa of yuva.children as HTMLCollectionOf<HTMLElement>) {
        const { w, h } = sigdirOlcu(Number(sayfa.dataset.sayfa));
        sayfa.style.width = `${w}px`;
        sayfa.style.height = `${h}px`;
      }
    }
  }

  const grupBul = (n: number) => Math.max(0, gruplar.findIndex((g) => g.includes(n)));

  // ---------- çizim ----------
  let kuyruk: Promise<void> = Promise.resolve();

  function ciz(n: number): void {
    const b = belge;
    if (!b) return;
    const benim = oturum;
    const gecerli = () => benim === oturum && belge === b && acik;
    // (sıra her kitapta yeniden başlar; bir sayfa alınamazsa sıra tıkanmaz, o sayfa sonra yeniden denenir)
    kuyruk = kuyruk
      .then(async () => {
      if (!gecerli()) return;
      const g = grupBul(n);
      if (Math.abs(g - gIndeks) > 2) return; // bu arada uzaklaşıldı
      let sayfa: PDFPageProxy;
      try {
        sayfa = await b.getPage(n);
      } catch {
        return;
      }
      if (!gecerli()) return;
      const vp = sayfa.getViewport({ scale: 1 });
      if (!olcu.has(n)) {
        olcu.set(n, { w: vp.width, h: vp.height });
        const kutu = yuvalar[g]?.querySelector<HTMLElement>(`[data-sayfa="${n}"]`);
        if (kutu) {
          const { w, h } = sigdirOlcu(n);
          kutu.style.width = `${w}px`;
          kutu.style.height = `${h}px`;
        }
      }
      const { olcek } = sigdirOlcu(n);
      const var_ = cizimler.get(n);
      if (var_ && Math.abs(var_.olcek - olcek) < 0.001 && (var_.bitti || var_.cizim)) return;
      var_?.cizim?.iptal();
      const kutu = yuvalar[g]?.querySelector<HTMLElement>(`[data-sayfa="${n}"]`);
      if (!kutu) return;
      const tuval = var_?.tuval ?? el('canvas', 'okuyucu__tuval');
      tuval.setAttribute('aria-hidden', 'true');
      if (!tuval.isConnected) kutu.append(tuval);
      const kayit = { tuval, olcek, cizim: null as Cizim | null, bitti: false };
      cizimler.set(n, kayit);
      kayit.cizim = sayfaCiz(sayfa, tuval, olcek);
      try {
        await kayit.cizim.bitti;
        kayit.bitti = true;
        kutu.dataset.cizildi = '';
      } catch {
        // iptal edildi
      } finally {
        kayit.cizim = null;
      }
      if (kayit.bitti) void metniEkle(sayfa, kutu, gecerli);
    })
      .catch(() => undefined);
  }

  /** Sayfanın yazısı ekran okuyucular için (görünmez; çizilen sayfa basıldığı gibi kalır). Taranmış (yazısız)
   *  sayfada yalnız "Sayfa N" okunur. */
  async function metniEkle(sayfa: PDFPageProxy, kutu: HTMLElement, gecerli: () => boolean): Promise<void> {
    if (kutu.querySelector('.okuyucu__metin')) return;
    try {
      const icerik = await sayfa.getTextContent();
      if (!gecerli() || kutu.querySelector('.okuyucu__metin')) return;
      const yazi = icerik.items
        .map((o) => ('str' in o ? o.str + (o.hasEOL ? '\n' : '') : ''))
        .join('')
        .trim();
      if (yazi) kutu.append(el('p', 'okuyucu__metin visually-hidden', yazi));
    } catch {
      // yazı alınamadı: yalnız sayfa adı okunur
    }
  }

  function cizimleriGuncelle(): void {
    const g = gIndeks;
    for (const i of [g, g + 1, g - 1, g + 2]) for (const n of gruplar[i] ?? []) ciz(n);
    // uzaktakiler bırakılır (bellek)
    for (const [n, c] of cizimler) {
      if (Math.abs(grupBul(n) - g) > 3) {
        c.cizim?.iptal();
        c.tuval.width = c.tuval.height = 0;
        c.tuval.remove();
        c.tuval.parentElement?.removeAttribute('data-cizildi');
        yuvalar[grupBul(n)]?.querySelector(`[data-sayfa="${n}"]`)?.removeAttribute('data-cizildi');
        cizimler.delete(n);
      }
    }
  }

  // ---------- gezinme ----------
  let kayitZamanlayici = 0;

  /** Ekrandaki açılış değişti. capa: okunan sayfa (verilmezse açılışta zaten varsa o, yoksa ilk sayfası) */
  function gorunenDegisti(yeniG: number, capa?: number): void {
    if (!kitap || !gruplar.length) return;
    gIndeks = Math.max(0, Math.min(gruplar.length - 1, yeniG));
    const grup = gruplar[gIndeks];
    okunan = capa !== undefined && grup.includes(capa) ? capa : grup.includes(okunan) ? okunan : grup[0];
    mevcut = grup[0];
    if (!bildirim.hidden && !grup.includes(bildirimSayfasi)) bildirimGizle();
    arayuzuGuncelle();
    cizimleriGuncelle();
    clearTimeout(kayitZamanlayici);
    // (okuyucu kapalıyken, ör. pencere boyu değişince, kalınan yer yeniden yazılmaz)
    if (!acik) return;
    const k = kitap;
    const n = okunan;
    kayitZamanlayici = window.setTimeout(() => {
      yeriKaydet(k.kimlik, n, k.pdf);
      s.adresDegisti(k, basiliSayfa(k, n));
    }, 250);
  }

  function git(n: number, yumusak = true): void {
    if (!gruplar.length) return;
    // (kullanıcının gezinmesi: düzen oturuyor diye geri alınmaz)
    duzenSonu = 0;
    okunan = Math.max(1, Math.min(toplam, n));
    const g = grupBul(okunan);
    const azalt = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    iz.scrollTo({ left: g * iz.clientWidth, behavior: yumusak && !azalt ? 'smooth' : 'auto' });
    if (!yumusak || azalt) gorunenDegisti(g, okunan);
  }
  const ileri = () => gruplar.length && git((gruplar[gIndeks + 1] ?? gruplar[gIndeks])[0]);
  const geri = () => gruplar.length && git((gruplar[gIndeks - 1] ?? gruplar[gIndeks])[0]);

  let kaydirmaCercevesi = 0;
  /** Bu zamana dek gelen kaydırmalar düzenin oturmasıdır (boyut değişti, tarayıcı yakalama noktasını kendince
   *  seçebilir), kullanıcının değil: okunan açılışa geri dönülür */
  let duzenSonu = 0;
  /** Düzenin kurulduğu genişlik: boyut değişip düzen henüz yeniden kurulmadan gelen kaydırma (tarayıcı eski düzende
   *  yeni bir yakalama noktasına kaydırır) yok sayılır; düzeni boyut gözlemcisi kurar */
  let duzenGenisligi = 0;
  iz.addEventListener(
    'scroll',
    () => {
      if (kaydirmaCercevesi) return;
      kaydirmaCercevesi = requestAnimationFrame(() => {
        kaydirmaCercevesi = 0;
        const w = iz.clientWidth || 1;
        if (w !== duzenGenisligi) return;
        if (performance.now() < duzenSonu) {
          if (Math.abs(iz.scrollLeft - gIndeks * w) > 1) iz.scrollTo({ left: gIndeks * w, behavior: 'auto' });
          return;
        }
        const g = Math.round(iz.scrollLeft / w);
        if (g === gIndeks) return;
        gorunenDegisti(g);
        // dokunarak ya da kaydırarak sayfa çevrilince çubuklar çekilir (okumaya yer kalsın); klavyeyle gezilirken
        // açık kalır (gizli çubuklar odak almaz)
        if (!('klavye' in document.documentElement.dataset)) arayuzGoster(false);
      });
    },
    { passive: true },
  );

  function arayuzuGuncelle(): void {
    if (!kitap) return;
    const k = kitap;
    const sayfalar = gruplar[gIndeks] ?? [mevcut];
    const son = basiliSayfa(k, toplam);
    const yazi = sayfalar.length > 1 && sayfalar.every((n) => basiliSayfa(k, n) !== null)
      ? `${sayfaYazisi(k, sayfalar[0])}–${sayfaYazisi(k, sayfalar[1])}`
      : sayfaYazisi(k, sayfalar[0]);
    sayfaNo.replaceChildren(el('b', undefined, son ? yazi : String(mevcut)), ` / ${son ?? toplam}`);
    const oran = toplam > 1 ? (mevcut - 1) / (toplam - 1) : 0;
    yuzde.textContent = `%${Math.round((mevcut / Math.max(1, toplam)) * 100)}`;
    kaydirici.max = String(toplam);
    kaydirici.value = String(mevcut);
    kaydirici.setAttribute('aria-valuetext', `Sayfa ${yazi}`);
    kaydir.style.setProperty('--o', oran.toFixed(4));
    for (const c of centikler.children as HTMLCollectionOf<HTMLElement>) c.classList.toggle('okuyucu__centik--gecti', Number(c.dataset.sayfa) <= mevcut);
    const bolum = bolumBul({ sayfaFarki: k.sayfaFarki, icindekiler }, mevcut);
    bolumAdi.textContent = bolum ? tipografik(bolum.baslik) : '';
    iz.setAttribute('aria-label', `${tipografik(k.kitap)}, sayfa ${yazi}`);
    duyuru.textContent = `Sayfa ${yazi} / ${son ?? toplam}`;
    // bu sayfada geçen video (Oku'da açılır)
    const v = sayfaninVideosu(videolar, k.kitap, sayfalar.map((n) => basiliSayfa(k, n)));
    videoD.hidden = !v;
    if (v && videoD.dataset.video !== v.id) {
      videoD.dataset.video = v.id;
      videoD.href = `#/oku/${v.id}`;
      const ikon = el('span', 'okuyucu__video-ikon');
      ikon.innerHTML = SVG.oynat;
      videoD.replaceChildren(ikon, 'Bu sayfanın videosu', el('small', undefined, ` · ${sureYazisi(v.sure)}`));
      videoD.setAttribute('aria-label', `Bu sayfanın videosu: ${tipografik(v.baslik)}, ${sureYazisi(v.sure)}`);
    }
  }

  /** Kaydırıcıdaki bölüm başı çentikleri */
  function centikleriKur(): void {
    if (!kitap) return;
    const k = kitap;
    const ana = icindekiler.filter((o) => o.derinlik === 0);
    centikler.replaceChildren(
      ...(ana.length > 1 ? ana : []).map((o) => {
        const n = pdfSayfasi(k, o.sayfa, toplam);
        const c = el('span', 'okuyucu__centik');
        c.dataset.sayfa = String(n);
        c.style.setProperty('--c', (toplam > 1 ? (n - 1) / (toplam - 1) : 0).toFixed(4));
        return c;
      }),
    );
  }

  let bildirimZamanlayici = 0;
  let bildirimSayfasi = 0;
  function bildirimGizle(): void {
    clearTimeout(bildirimZamanlayici);
    // odak bildirimdeyse okuyucuya geçer (gövdeye düşmesin)
    if (bildirim.contains(document.activeElement)) iz.focus({ preventScroll: true });
    bildirim.hidden = true;
  }
  function kaldiginYerBildir(n: number): void {
    if (!kitap) return;
    const yazi = el('p', 'okuyucu__bildirim-yazi');
    yazi.append('Kaldığın yerden: ', el('b', undefined, /^\d+$/.test(sayfaYazisi(kitap, n)) ? `${sayfaYazisi(kitap, n)}. sayfa` : sayfaYazisi(kitap, n)));
    const bastan = el('button', 'okuyucu__bildirim-d', 'Baştan aç');
    bastan.type = 'button';
    bastan.addEventListener('click', () => {
      bildirimGizle();
      git(1, false);
    });
    bildirim.replaceChildren(yazi, bastan);
    bildirim.hidden = false;
    bildirimSayfasi = n;
    clearTimeout(bildirimZamanlayici);
    // odak bildirimdeyken (klavye, ekran okuyucu) kendiliğinden kapanmaz
    const sure = () => {
      bildirimZamanlayici = window.setTimeout(() => (bildirim.contains(document.activeElement) ? sure() : bildirimGizle()), 4500);
    };
    sure();
  }

  // ---------- dokunuş: sayfa çevirme, arayüz, yakınlaşma ----------
  const imler = new Map<number, { x: number; y: number }>();
  let tutam: { mesafe: number; ortaX: number; ortaY: number; sayfa: HTMLElement; olcek: number } | null = null;
  let dokunus: { x: number; y: number; t: number; scroll: number } | null = null;
  let sonDokunus: { x: number; y: number; t: number } | null = null;
  let tekZamanlayici = 0;

  const mesafe = () => {
    const [a, b] = [...imler.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  iz.addEventListener('pointerdown', (e) => {
    imler.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (imler.size === 1) dokunus = { x: e.clientX, y: e.clientY, t: performance.now(), scroll: iz.scrollLeft };
    if (imler.size === 2) {
      dokunus = null;
      const [a, b] = [...imler.values()];
      const sayfa = (document.elementFromPoint((a.x + b.x) / 2, (a.y + b.y) / 2)?.closest('.okuyucu__sayfa') as HTMLElement | null) ??
        (yuvalar[gIndeks]?.querySelector('.okuyucu__sayfa') as HTMLElement | null);
      if (sayfa) tutam = { mesafe: mesafe(), ortaX: (a.x + b.x) / 2, ortaY: (a.y + b.y) / 2, sayfa, olcek: 1 };
    }
  });
  iz.addEventListener('pointermove', (e) => {
    if (!imler.has(e.pointerId)) return;
    imler.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (tutam && imler.size === 2) {
      tutam.olcek = Math.max(1, Math.min(4, mesafe() / tutam.mesafe));
      const r = tutam.sayfa.getBoundingClientRect();
      tutam.sayfa.style.transformOrigin = `${tutam.ortaX - r.left}px ${tutam.ortaY - r.top}px`;
      tutam.sayfa.style.transform = `scale(${tutam.olcek})`;
    }
  });
  const imBitti = (e: PointerEvent) => {
    imler.delete(e.pointerId);
    if (tutam && imler.size < 2) {
      const t = tutam;
      tutam = null;
      t.sayfa.style.transform = '';
      if (t.olcek > 1.1) {
        const r = t.sayfa.getBoundingClientRect();
        yakinAc(Number(t.sayfa.dataset.sayfa), t.olcek * 1, (t.ortaX - r.left) / r.width, (t.ortaY - r.top) / r.height);
      }
      return;
    }
    if (!dokunus || e.type === 'pointercancel') return;
    const d = dokunus;
    dokunus = null;
    const kisa = performance.now() - d.t < 350;
    const kipirti = Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10 && Math.abs(iz.scrollLeft - d.scroll) < 4;
    if (!kisa || !kipirti) return;
    const simdi = performance.now();
    const ikinci = sonDokunus && simdi - sonDokunus.t < 300 && Math.hypot(e.clientX - sonDokunus.x, e.clientY - sonDokunus.y) < 30;
    if (ikinci) {
      clearTimeout(tekZamanlayici);
      sonDokunus = null;
      const sayfa = (e.target as Element).closest?.('.okuyucu__sayfa') as HTMLElement | null;
      if (sayfa) {
        const r = sayfa.getBoundingClientRect();
        yakinAc(Number(sayfa.dataset.sayfa), 2.2, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      }
      return;
    }
    sonDokunus = { x: e.clientX, y: e.clientY, t: simdi };
    const x = e.clientX;
    tekZamanlayici = window.setTimeout(() => {
      sonDokunus = null;
      const w = iz.clientWidth;
      // kenarlara dokunmak sayfa çevirir, ortaya dokunmak arayüzü açar/kapatır
      if (x < w * 0.22) geri();
      else if (x > w * 0.78) ileri();
      else arayuzGoster(!kok.hasAttribute('data-arayuz'));
    }, 260);
  };
  iz.addEventListener('pointerup', imBitti);
  iz.addEventListener('pointercancel', imBitti);

  // ---------- yakınlaşma katmanı ----------
  let yakinSayfa = 0;
  let yakinOran = 1;
  /** Yakınlaşmadan önce çubuklar açık mıydı (kapanınca eski hâline döner) */
  let arayuzOnceden = true;
  let yakinCizim: Cizim | null = null;

  async function yakinAc(n: number, oran: number, fx: number, fy: number): Promise<void> {
    if (!belge) return;
    const b = belge;
    yakinSayfa = n;
    yakinOran = Math.max(1.2, Math.min(5, oran));
    const sayfa = await b.getPage(n);
    const { olcek, w, h } = sigdirOlcu(n);
    const olcek2 = olcek * yakinOran;
    if (yakin.hidden) arayuzOnceden = kok.hasAttribute('data-arayuz');
    yakin.hidden = false;
    kok.toggleAttribute('data-yakin', true);
    iz.inert = true;
    arayuzGoster(false);
    yakinIc.style.width = `${Math.max(w * yakinOran, yakin.clientWidth)}px`;
    yakinIc.style.height = `${Math.max(h * yakinOran, yakin.clientHeight)}px`;
    yakinCizim?.iptal();
    yakinCizim = sayfaCiz(sayfa, yakinTuval, olcek2);
    yakinTuval.style.width = `${w * yakinOran}px`;
    yakinTuval.style.height = `${h * yakinOran}px`;
    yakin.scrollLeft = fx * w * yakinOran - yakin.clientWidth / 2;
    yakin.scrollTop = fy * h * yakinOran - yakin.clientHeight / 2;
    yakin.focus({ preventScroll: true });
    try {
      await yakinCizim.bitti;
    } catch {
      // iptal
    }
  }

  function yakinKapat(): void {
    if (yakin.hidden) return;
    yakinCizim?.iptal();
    yakinCizim = null;
    yakin.hidden = true;
    kok.removeAttribute('data-yakin');
    iz.inert = false;
    yakinTuval.width = yakinTuval.height = 0;
    arayuzGoster(arayuzOnceden);
    iz.focus({ preventScroll: true });
  }
  yakin.tabIndex = -1;
  yakin.setAttribute('role', 'region');
  yakin.setAttribute('aria-label', 'Yakınlaştırılmış sayfa; kapatmak için çift dokunun ya da Escape');
  {
    const yimler = new Map<number, { x: number; y: number }>();
    let ytutam: { mesafe: number; oran: number; ortaX: number; ortaY: number } | null = null;
    let ysonDokunus = 0;
    let ybas: { x: number; y: number; t: number } | null = null;
    const ymesafe = () => {
      const [a, b] = [...yimler.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    yakin.addEventListener('pointerdown', (e) => {
      yimler.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (yimler.size === 1) ybas = { x: e.clientX, y: e.clientY, t: performance.now() };
      if (yimler.size === 2) {
        const [a, b] = [...yimler.values()];
        ytutam = { mesafe: ymesafe(), oran: 1, ortaX: (a.x + b.x) / 2, ortaY: (a.y + b.y) / 2 };
      }
    });
    yakin.addEventListener('pointermove', (e) => {
      if (!yimler.has(e.pointerId)) return;
      yimler.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ytutam && yimler.size === 2) {
        ytutam.oran = ymesafe() / ytutam.mesafe;
        const r = yakinIc.getBoundingClientRect();
        yakinIc.style.transformOrigin = `${ytutam.ortaX - r.left}px ${ytutam.ortaY - r.top}px`;
        yakinIc.style.transform = `scale(${ytutam.oran})`;
      }
    });
    const ybit = (e: PointerEvent) => {
      yimler.delete(e.pointerId);
      if (ytutam && yimler.size < 2) {
        const t = ytutam;
        ytutam = null;
        yakinIc.style.transform = '';
        const yeni = yakinOran * t.oran;
        if (yeni < 1.08) yakinKapat();
        else {
          const r = yakinTuval.getBoundingClientRect();
          void yakinAc(yakinSayfa, yeni, (t.ortaX - r.left) / r.width, (t.ortaY - r.top) / r.height);
        }
        return;
      }
      if (!ybas || e.type === 'pointercancel') return;
      const kisa = performance.now() - ybas.t < 350 && Math.hypot(e.clientX - ybas.x, e.clientY - ybas.y) < 10;
      ybas = null;
      if (!kisa) return;
      const simdi = performance.now();
      if (simdi - ysonDokunus < 300) {
        ysonDokunus = 0;
        yakinKapat();
      } else ysonDokunus = simdi;
    };
    yakin.addEventListener('pointerup', ybit);
    yakin.addEventListener('pointercancel', ybit);
  }

  // ---------- klavye ----------
  gorunum.addEventListener('keydown', (e) => {
    if (!kitap || acikSayfa()) return;
    if ((e.target as HTMLElement).closest('input, button') && e.key !== 'Escape') {
      if ((e.target as HTMLElement) !== iz) return;
    }
    let kullanildi = true;
    if (e.key === 'Escape') {
      if (!yakin.hidden) yakinKapat();
      else s.kapat();
    } else if (!yakin.hidden || !gruplar.length) kullanildi = false;
    else if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) ileri();
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) geri();
    else if (e.key === 'Home') git(1);
    else if (e.key === 'End') git(toplam);
    else kullanildi = false;
    if (kullanildi) e.preventDefault();
  });

  // ---------- arayüz düğmeleri ----------
  kapatD.addEventListener('click', () => s.kapat());

  kaydirici.addEventListener('input', () => {
    if (!kitap) return;
    const n = Number(kaydirici.value);
    const bolum = bolumBul({ sayfaFarki: kitap.sayfaFarki, icindekiler }, n);
    onizleme.textContent = `${sayfaYazisi(kitap, n)}${bolum ? ` · ${tipografik(bolum.baslik)}` : ''}`;
    kok.toggleAttribute('data-sariliyor', true);
  });
  kaydirici.addEventListener('change', () => {
    kok.removeAttribute('data-sariliyor');
    git(Number(kaydirici.value), false);
  });

  icindekilerD.addEventListener('click', () => {
    if (!kitap || !gruplar.length) return;
    const k = kitap;
    const icerik = el('div', 'icindekiler');
    const ustBilgi = el('div', 'icindekiler__ust');
    const anaBolum = icindekiler.filter((o) => o.derinlik === 0).length;
    ustBilgi.append(
      el('p', 'icindekiler__kitap', tipografik(k.kitap)),
      el('p', 'icindekiler__bilgi', [`${basiliSayfa(k, toplam) ?? toplam} sayfa`, anaBolum ? `${anaBolum} bölüm` : ''].filter(Boolean).join(' · ')),
    );
    icerik.append(ustBilgi);
    const git_ = el('form', 'icindekiler__git');
    const etiket = el('label', 'icindekiler__git-etiket', 'Sayfaya git');
    const giris = el('input', 'icindekiler__git-giris');
    giris.type = 'number';
    giris.inputMode = 'numeric';
    giris.min = '1';
    const son = basiliSayfa(k, toplam) ?? toplam;
    giris.max = String(son);
    giris.placeholder = `1–${son}`;
    giris.id = 'icindekiler-git';
    etiket.htmlFor = giris.id;
    const gitD = el('button', 'icindekiler__git-d', 'Git');
    gitD.type = 'submit';
    git_.append(etiket, giris, gitD);
    icerik.append(git_);
    const bolum = bolumBul({ sayfaFarki: k.sayfaFarki, icindekiler }, mevcut);
    if (icindekiler.length) {
      const ul = el('ul', 'icindekiler__liste');
      for (const o of icindekiler) {
        const li = el('li');
        const d = el('button', 'icindekiler__oge');
        d.type = 'button';
        d.dataset.derinlik = String(o.derinlik);
        const ad = el('span', 'icindekiler__ad-kutu');
        ad.append(el('span', 'icindekiler__ad', tipografik(o.baslik)));
        if (o === bolum) {
          d.setAttribute('aria-current', 'true');
          const b = basiliSayfa(k, mevcut);
          ad.append(el('span', 'icindekiler__burada', `Buradasın${b ? ` · ${b}. sayfa` : ''}`));
        }
        const nokta = el('span', 'icindekiler__nokta');
        nokta.setAttribute('aria-hidden', 'true');
        d.append(ad, nokta, el('span', 'icindekiler__sayfa', String(o.sayfa)));
        d.addEventListener('click', () => {
          acikSayfa()?.kapat();
          git(pdfSayfasi(k, o.sayfa, toplam), false);
        });
        li.append(d);
        ul.append(li);
      }
      icerik.append(ul);
    } else icerik.append(el('p', 'icindekiler__bos', 'Bu kitabın içindekiler listesi henüz eklenmedi.'));
    git_.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = Number(giris.value);
      if (!Number.isInteger(n) || n < 1) return;
      acikSayfa()?.kapat();
      git(pdfSayfasi(k, n, toplam), false);
    });
    const sayfa = altSayfaAc({ baslik: 'İçindekiler', icerik, modal: true, sinif: sayfaSinifi() });
    // açılınca bulunulan bölüm görünsün
    requestAnimationFrame(() => sayfa.eleman.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'center' }));
  });

  /** Alt sayfalar okuyucunun temasına uyar (gece: koyu) */
  const sayfaSinifi = () => `alt-sayfa--okuyucu${tema === 'gece' ? ' alt-sayfa--okuyucu-gece' : ''}`;

  ayarD.addEventListener('click', () => {
    const icerik = el('div', 'gorunum-ayar');
    const grup = el('div', 'gorunum-ayar__temalar');
    grup.setAttribute('role', 'radiogroup');
    grup.setAttribute('aria-label', 'Sayfa rengi');
    for (const t of TEMALAR) {
      const d = el('button', 'gorunum-ayar__tema');
      d.type = 'button';
      d.dataset.tema = t.ad;
      d.setAttribute('role', 'radio');
      d.setAttribute('aria-checked', String(t.ad === tema));
      const ornek = el('span', 'gorunum-ayar__ornek');
      ornek.append(el('i'));
      d.append(ornek, el('span', 'gorunum-ayar__ad', t.etiket));
      d.addEventListener('click', () => {
        temaUygula(t.ad);
        for (const x of grup.children) x.setAttribute('aria-checked', String((x as HTMLElement).dataset.tema === t.ad));
        acikSayfa()?.eleman.classList.toggle('alt-sayfa--okuyucu-gece', t.ad === 'gece');
      });
      grup.append(d);
    }
    icerik.append(grup);
    altSayfaAc({ baslik: 'Sayfa görünümü', icerik, modal: true, sinif: sayfaSinifi() });
  });

  // ---------- boyut değişince ----------
  new ResizeObserver(() => {
    if (!kitap || !toplam || !gruplar.length) return;
    // okunan sayfada kalınır (tek ↔ iki sayfa geçişinde de)
    const n = okunan;
    const yeniCift = ciftMi();
    if (yeniCift !== cift) {
      cift = yeniCift;
      gruplariKur();
    } else {
      olculeriUygula();
      for (const c of cizimler.values()) c.olcek = -1; // yeni ölçekte yeniden çizilsin
    }
    const g = grupBul(n);
    duzenGenisligi = iz.clientWidth;
    duzenSonu = performance.now() + 400;
    iz.scrollTo({ left: g * iz.clientWidth, behavior: 'auto' });
    gorunenDegisti(g, n);
    requestAnimationFrame(() => iz.scrollTo({ left: gIndeks * iz.clientWidth, behavior: 'auto' }));
    if (!yakin.hidden) yakinKapat();
  }).observe(iz);

  // ---------- açma / kapama ----------
  function ac(k: Kitap, basili?: number): void {
    acik = true;
    if (kitap?.kimlik === k.kimlik && belge && gruplar.length) {
      if (basili) git(pdfSayfasi(k, basili, toplam), false);
      else {
        // raftan yeniden açıldı: kalınan yerden
        const n = Math.min(kalinanYer(k.kimlik, k.pdf)?.sayfa ?? okunan, toplam);
        git(n, false);
        if (n > 1) kaldiginYerBildir(n);
      }
      iz.focus({ preventScroll: true });
      return;
    }
    oturum++;
    istenenSayfa = basili;
    yukleme?.iptal();
    belge = null;
    kitap = k;
    toplam = 0;
    // önceki kitabın düzeni bırakılır (boşalan izin kaydırma olayı eski düzenle kalınan yeri yazmasın)
    clearTimeout(kayitZamanlayici);
    gruplar = [];
    yuvalar = [];
    gIndeks = 0;
    mevcut = 1;
    okunan = 1;
    kuyruk = Promise.resolve();
    olcu.clear();
    cizimler.clear();
    iz.replaceChildren();
    yakinKapat();
    icindekiler = k.icindekiler;
    baslik.textContent = tipografik(k.kitap);
    kitapAdi.textContent = tipografik(k.kitap);
    bolumAdi.textContent = '';
    sayfaNo.textContent = '';
    yuzde.textContent = '';
    videoD.hidden = true;
    centikler.replaceChildren();
    bildirimGizle();
    arayuzGoster(true);
    durumGoster('yukleniyor');
    // odak okuyucuda: yüklenirken de Escape kapatır, durum ekran okuyucuya söylenir
    baslik.focus({ preventScroll: true });
    s.temaDegisti?.(ZEMIN[tema]);
    const benim = oturum;
    const y = kitapYukle(k.pdf);
    yukleme = y;
    // (ilerleme yalnız kitap açılana dek; sonra sayfaların parçaları inerken de gelir)
    y.ilerleme((oran) => benim === oturum && !belge && durumGoster('yukleniyor', oran));
    y.belge
      .then(async (b) => {
        if (benim !== oturum) return;
        belge = b;
        toplam = b.numPages;
        const ilk = await b.getPage(1);
        const vp = ilk.getViewport({ scale: 1 });
        ornekOran = vp.height / vp.width;
        olcu.set(1, { w: vp.width, h: vp.height });
        if (!icindekiler.length) {
          const pdfden = await pdfIcindekiler(b);
          if (benim !== oturum) return;
          icindekiler = pdfden
            .map((o) => ({ baslik: o.baslik, sayfa: o.pdfSayfasi - k.sayfaFarki, derinlik: o.derinlik }))
            .filter((o) => o.sayfa >= 1);
        }
        cift = ciftMi();
        gruplariKur();
        durumGoster(null);
        const hedef = basili ? pdfSayfasi(k, basili, toplam) : Math.min(kalinanYer(k.kimlik, k.pdf)?.sayfa ?? 1, toplam);
        okunan = hedef;
        gIndeks = grupBul(hedef);
        mevcut = gruplar[gIndeks]?.[0] ?? 1;
        // bu arada okuyucudan çıkıldıysa burada kalır; yeniden açılınca yerine gidilir
        if (!acik) return;
        if (!basili && hedef > 1) kaldiginYerBildir(hedef);
        // düzen oturduktan sonra yerine kaydır
        requestAnimationFrame(() => {
          if (benim !== oturum || !acik) return;
          iz.scrollTo({ left: gIndeks * iz.clientWidth, behavior: 'auto' });
          gorunenDegisti(gIndeks, hedef);
          iz.focus({ preventScroll: true });
        });
      })
      .catch((e) => {
        if (benim !== oturum || (e as DOMException)?.name === 'AbortError') return;
        durumGoster('hata', undefined, hataNedeni(e));
      });
  }

  function ayril(gorunenKalsin = false): void {
    acik = false;
    clearTimeout(kayitZamanlayici);
    clearTimeout(tekZamanlayici);
    bildirimGizle();
    if (!belge) {
      // kitap daha açılmadan çıkıldı: indirme bırakılır (sonradan gelip kalınan yeri bozmasın, gizli okuyucuya
      // çizilmesin); yeniden açılınca baştan yüklenir
      oturum++;
      yukleme?.iptal();
      yukleme = null;
      kitap = null;
      return;
    }
    if (kitap && gruplar.length) yeriKaydet(kitap.kimlik, okunan, kitap.pdf);
    yakinKapat();
    const kalan = gorunenKalsin ? new Set(gruplar[gIndeks] ?? []) : new Set<number>();
    for (const [n, c] of cizimler) {
      if (kalan.has(n) && c.bitti) continue;
      c.cizim?.iptal();
      c.tuval.width = c.tuval.height = 0;
      c.tuval.remove();
      yuvalar[grupBul(n)]?.querySelector(`[data-sayfa="${n}"]`)?.removeAttribute('data-cizildi');
      cizimler.delete(n);
    }
  }

  return {
    ac(k, basili) {
      ac(k, basili);
      // ayrıldıktan sonra aynı kitaba dönülünce bırakılan çizimler yeniden yapılır
      if (belge && kitap?.kimlik === k.kimlik) cizimleriGuncelle();
    },
    ayril,
    geriAl() {
      if (!yakin.hidden) {
        yakinKapat();
        return true;
      }
      return false;
    },
    zeminRengi: () => ZEMIN[tema],
    kagitRengi: () => KAGIT[tema],
  };
}
