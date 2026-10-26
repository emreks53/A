// Okuma ekranı: bölüm metni, kalınan yer, kelime manası, dipnotlar ve okuma ayarları.
import { durumCubugu } from '../yerel';
import { altSayfaAc, acikSayfa, type AltSayfa } from './alt-sayfa';
import { bolumCiz, dipnotIcerik } from './cizim';
import { bolumYukle, type BolumOzet, type KitapOzet } from './icerik';
import { kelimeBul, vurgula, vurguKaldir } from './kelime-bul';
import { ayarlariOku, ayarlariYaz, BOYUTLAR, konumOku, konumYaz, type Ayarlar, type Konum } from './kayit';
import { SVG } from './ikonlar';
import type { Bolum } from './metin';
import { kelimeSayfasi } from './sozluk-sayfa';

export interface Okuyucu {
  kaydet(): void;
  kapat(): void;
}

interface Bulunan {
  kitap: KitapOzet;
  bolum: BolumOzet;
  onceki?: BolumOzet;
  sonraki?: BolumOzet;
}

const TEMA_RENK: Record<Ayarlar['tema'], { renk: string; acik: boolean }> = {
  gunduz: { renk: '#FCFAF5', acik: true },
  sepya: { renk: '#F4ECDA', acik: true },
  gece: { renk: '#121B2D', acik: false },
};

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif?: string, metin?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

export function ayarlariUygula(kok: HTMLElement, a: Ayarlar): void {
  kok.dataset.tema = a.tema;
  kok.dataset.aralik = a.aralik;
  kok.style.setProperty('--okuma-boyut', `${BOYUTLAR[a.boyut]}px`);
}

export function okuyucuAc(kok: HTMLElement, b: Bulunan): Okuyucu {
  let ayarlar = ayarlariOku();
  ayarlariUygula(kok, ayarlar);
  durumCubugu(TEMA_RENK[ayarlar.tema].acik, TEMA_RENK[ayarlar.tema].renk);

  // ---- iskelet ----
  const ust = el('header', 'okuyucu-ust');
  const geri = el('a', 'okuyucu-ust__dugme okuyucu-ust__geri');
  geri.href = `#/oku/${b.kitap.id}`;
  geri.dataset.geri = '';
  geri.setAttribute('aria-label', `${b.kitap.baslik} bölümleri`);
  geri.innerHTML = SVG.geri;
  const baslik = el('div', 'okuyucu-ust__yazi');
  baslik.append(el('span', 'okuyucu-ust__kitap', b.kitap.baslik), el('span', 'okuyucu-ust__bolum', b.bolum.baslik));
  baslik.setAttribute('aria-hidden', 'true');
  const aa = el('button', 'okuyucu-ust__dugme okuyucu-ust__aa');
  aa.type = 'button';
  aa.setAttribute('aria-label', 'Okuma ayarları');
  aa.setAttribute('aria-haspopup', 'dialog');
  aa.innerHTML = '<span aria-hidden="true">A<small>a</small></span>';
  const cubuk = el('div', 'okuyucu-ust__ilerleme');
  cubuk.setAttribute('aria-hidden', 'true');
  const dolu = el('span');
  cubuk.append(dolu);
  ust.append(geri, baslik, aa, cubuk);

  const kaydirma = el('div', 'oku-ekran__kaydirma okuyucu-kaydirma');
  const makale = el('article', 'okuyucu-metin');
  makale.lang = 'tr';
  const yukleniyor = el('p', 'okuyucu-yukleniyor', 'Yükleniyor…');
  makale.append(yukleniyor);
  kaydirma.append(makale);
  kok.append(ust, kaydirma);

  let bolum: Bolum | null = null;
  let paragraflar: HTMLElement[] = [];
  let kapandi = false;

  // ---- kalınan yer ----
  const ustPay = () => ust.getBoundingClientRect().bottom - kaydirma.getBoundingClientRect().top;

  const konumHesapla = (): Konum | null => {
    if (!paragraflar.length) return null;
    const ust0 = kaydirma.scrollTop + Math.max(0, ustPay());
    // İkili arama: üst kenarın altında kalan ilk paragraf
    let lo = 0;
    let hi = paragraflar.length - 1;
    while (lo < hi) {
      const orta = (lo + hi) >> 1;
      const p = paragraflar[orta];
      if (p.offsetTop + p.offsetHeight <= ust0) lo = orta + 1;
      else hi = orta;
    }
    const p = paragraflar[lo];
    const ic = p.offsetHeight ? Math.min(1, Math.max(0, (ust0 - p.offsetTop) / p.offsetHeight)) : 0;
    const azami = kaydirma.scrollHeight - kaydirma.clientHeight;
    const oran = azami <= 0 ? 1 : Math.min(1, Math.max(0, kaydirma.scrollTop / azami));
    return { p: lo, ic, oran, zaman: Date.now() };
  };

  const konumaGit = (k: Pick<Konum, 'p' | 'ic'>) => {
    const p = paragraflar[Math.min(k.p, paragraflar.length - 1)];
    if (!p) return;
    if (k.p === 0 && k.ic === 0) {
      kaydirma.scrollTop = 0;
      return;
    }
    kaydirma.scrollTop = p.offsetTop + k.ic * p.offsetHeight - Math.max(0, ustPay());
  };

  let sonKayit = 0;
  let kayitZamanlayici = 0;
  /** Kalınan yere gidilmeden önce (bölüm yüklenirken) kayıt yapılmaz; yoksa eski konum ezilirdi. */
  let hazir = false;
  const kaydet = () => {
    window.clearTimeout(kayitZamanlayici);
    if (!hazir) return;
    const k = konumHesapla();
    if (!k) return;
    konumYaz(b.kitap.id, b.bolum.id, k);
    sonKayit = Date.now();
  };

  // ---- kaydırma: ilerleme çubuğu, üst çubuğu gizleme, kayıt ----
  let sonUst = 0;
  let cerceve = 0;
  const kaydirinca = () => {
    if (cerceve) return;
    cerceve = requestAnimationFrame(() => {
      cerceve = 0;
      const y = kaydirma.scrollTop;
      const azami = kaydirma.scrollHeight - kaydirma.clientHeight;
      dolu.style.transform = `scaleX(${azami <= 0 ? 1 : Math.min(1, y / azami)})`;
      const asagi = y > sonUst + 4;
      const yukari = y < sonUst - 4;
      if (asagi && y > 80 && !acikSayfa()) kok.classList.add('ust-gizli');
      else if (yukari || y <= 80 || y >= azami - 4) kok.classList.remove('ust-gizli');
      if (asagi || yukari) sonUst = y;
      window.clearTimeout(kayitZamanlayici);
      kayitZamanlayici = window.setTimeout(kaydet, Date.now() - sonKayit > 2000 ? 150 : 600);
    });
  };
  kaydirma.addEventListener('scroll', kaydirinca, { passive: true });
  const gizlenince = () => {
    if (document.visibilityState === 'hidden') kaydet();
  };
  document.addEventListener('visibilitychange', gizlenince);
  window.addEventListener('pagehide', kaydet);

  // ---- kelime ve dipnot ----
  let kelimeSayfa: AltSayfa | null = null;
  const sayfaKapaninca = () => {
    vurguKaldir();
    kelimeSayfa = null;
  };

  const dipnotGoster = (no: number) => {
    if (!bolum) return;
    const icerik = dipnotIcerik(bolum, no);
    if (!icerik) return;
    vurguKaldir();
    const s = acikSayfa();
    if (s && s === kelimeSayfa) s.guncelle(icerik, `Dipnot ${no}`);
    else
      kelimeSayfa = altSayfaAc({
        baslik: `Dipnot ${no}`,
        icerik,
        sinif: 'alt-sayfa--dipnot',
        tema: ayarlar.tema,
        kapaninca: sayfaKapaninca,
      });
  };

  makale.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-dipnot]');
    if (a) {
      e.preventDefault();
      dipnotGoster(Number(a.dataset.dipnot));
      return;
    }
    if ((e.target as Element).closest('a, button')) return;
    const secim = window.getSelection();
    if (secim && !secim.isCollapsed && secim.toString().trim()) return;
    const bulunan = kelimeBul(e.clientX, e.clientY, makale);
    if (!bulunan) {
      // Boşluğa dokunmak açık sayfayı kapatır; sayfa yoksa üst çubuğu gösterir/gizler.
      const s = acikSayfa();
      if (s) s.kapat();
      else if (kaydirma.scrollTop > 80) kok.classList.toggle('ust-gizli');
      return;
    }
    vurgula(bulunan.aralik);
    const icerik = kelimeSayfasi(bulunan.kelime, bulunan.once, bulunan.sonra);
    const s = acikSayfa();
    if (s && s === kelimeSayfa) s.guncelle(icerik, 'Lügat');
    else {
      kelimeSayfa = altSayfaAc({
        baslik: 'Lügat',
        baslikGizli: true,
        icerik,
        sinif: 'alt-sayfa--kelime',
        tema: ayarlar.tema,
        kapaninca: sayfaKapaninca,
      });
    }
    // Kelime sayfanın altında kalıyorsa yukarı kaydır
    requestAnimationFrame(() => {
      const r = bulunan.aralik.getBoundingClientRect();
      // offsetTop, açılış animasyonundaki kaydırmadan (transform) etkilenmez: sayfanın varacağı yer
      const sayfaUst = kelimeSayfa ? kelimeSayfa.eleman.offsetTop : innerHeight;
      if (r.bottom > sayfaUst - 16) kaydirma.scrollBy({ top: r.bottom - sayfaUst + 48, behavior: 'smooth' });
    });
  });

  // ---- ayarlar ----
  const ayarDegistir = (yeni: Ayarlar) => {
    const k = konumHesapla();
    ayarlar = yeni;
    ayarlariYaz(ayarlar);
    ayarlariUygula(kok, ayarlar);
    durumCubugu(TEMA_RENK[ayarlar.tema].acik, TEMA_RENK[ayarlar.tema].renk);
    const s = acikSayfa();
    if (s) s.eleman.dataset.tema = ayarlar.tema;
    if (k) konumaGit(k);
  };

  aa.addEventListener('click', () => {
    vurguKaldir();
    altSayfaAc({
      baslik: 'Okuma ayarları',
      icerik: ayarlarIcerik(() => ayarlar, ayarDegistir),
      modal: true,
      sinif: 'alt-sayfa--ayarlar',
      tema: ayarlar.tema,
    });
  });

  // ---- yükle ----
  bolumYukle(b.bolum.dosya)
    .then(async (yuklenen) => {
      if (kapandi) return;
      bolum = yuklenen;
      const { govde, dipnotlar } = bolumCiz(yuklenen);
      const gecis = gecisCiz(b);
      makale.replaceChildren(govde, ...(dipnotlar ? [dipnotlar] : []), gecis);
      makale.setAttribute('aria-label', b.bolum.baslik);
      paragraflar = Array.from(govde.children) as HTMLElement[];
      await document.fonts?.ready;
      if (kapandi) return;
      const k = konumOku(b.kitap.id, b.bolum.id);
      if (k && k.oran < 0.999) konumaGit(k);
      else if (k) kaydirma.scrollTop = 0;
      // Konuma gidilmesi "aşağı kaydırma" sayılıp üst çubuğu gizlemesin
      sonUst = kaydirma.scrollTop;
      hazir = true;
      kaydirinca();
    })
    .catch(() => {
      if (kapandi) return;
      yukleniyor.textContent = 'Bölüm açılamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.';
    });

  return {
    kaydet,
    kapat() {
      if (kapandi) return;
      kaydet();
      kapandi = true;
      vurguKaldir();
      kaydirma.removeEventListener('scroll', kaydirinca);
      document.removeEventListener('visibilitychange', gizlenince);
      window.removeEventListener('pagehide', kaydet);
      window.clearTimeout(kayitZamanlayici);
      cancelAnimationFrame(cerceve);
      durumCubugu(false);
    },
  };
}

function gecisCiz(b: Bulunan): HTMLElement {
  const nav = el('nav', 'okuyucu-gecis');
  nav.setAttribute('aria-label', 'Bölümler arası geçiş');
  const bag = (hedef: BolumOzet, yon: 'onceki' | 'sonraki') => {
    const a = el('a', `okuyucu-gecis__bag okuyucu-gecis__bag--${yon}`);
    a.href = `#/oku/${b.kitap.id}/${hedef.id}`;
    a.dataset.yerine = '';
    const yazi = el('span', 'okuyucu-gecis__yazi');
    yazi.append(el('span', 'okuyucu-gecis__etiket', yon === 'onceki' ? 'Önceki bölüm' : 'Sonraki bölüm'), el('span', 'okuyucu-gecis__baslik', hedef.baslik));
    const ok = el('span', 'okuyucu-gecis__ok');
    ok.innerHTML = yon === 'onceki' ? SVG.geri : SVG.ileri;
    if (yon === 'onceki') a.append(ok, yazi);
    else a.append(yazi, ok);
    return a;
  };
  if (b.onceki) nav.append(bag(b.onceki, 'onceki'));
  if (b.sonraki) nav.append(bag(b.sonraki, 'sonraki'));
  else {
    const son = el('a', 'okuyucu-gecis__bag okuyucu-gecis__bag--bitti');
    son.href = `#/oku/${b.kitap.id}`;
    son.dataset.geri = '';
    const yazi = el('span', 'okuyucu-gecis__yazi');
    yazi.append(el('span', 'okuyucu-gecis__etiket', 'Kitabın sonu'), el('span', 'okuyucu-gecis__baslik', 'Bölüm listesine dön'));
    son.append(yazi);
    nav.append(son);
  }
  return nav;
}

function ayarlarIcerik(al: () => Ayarlar, degistir: (a: Ayarlar) => void): HTMLElement {
  const kok = el('div', 'ayarlar');

  // Yazı boyutu
  const boyut = el('div', 'ayar');
  const boyutEtiket = el('span', 'ayar__etiket', 'Yazı boyutu');
  boyutEtiket.id = 'ayar-boyut';
  const boyutSatir = el('div', 'ayar__boyut');
  boyutSatir.setAttribute('role', 'group');
  boyutSatir.setAttribute('aria-labelledby', 'ayar-boyut');
  const kucult = el('button', 'ayar__boyut-dugme ayar__boyut-dugme--kucuk');
  kucult.type = 'button';
  kucult.setAttribute('aria-label', 'Yazıyı küçült');
  kucult.innerHTML = '<span aria-hidden="true">A</span>';
  const buyut = el('button', 'ayar__boyut-dugme ayar__boyut-dugme--buyuk');
  buyut.type = 'button';
  buyut.setAttribute('aria-label', 'Yazıyı büyüt');
  buyut.innerHTML = '<span aria-hidden="true">A</span>';
  const noktalar = el('div', 'ayar__noktalar');
  noktalar.setAttribute('aria-hidden', 'true');
  const durum = el('span', 'visually-hidden');
  durum.setAttribute('aria-live', 'polite');
  for (let i = 0; i < BOYUTLAR.length; i++) noktalar.append(el('span', 'ayar__nokta'));
  boyutSatir.append(kucult, noktalar, buyut, durum);
  boyut.append(boyutEtiket, boyutSatir);

  const secimGrubu = (
    etiket: string,
    id: string,
    secenekler: { deger: string; ad: string }[],
    secili: () => string,
    sec: (d: string) => void,
    sinif: string,
  ) => {
    const kap = el('div', 'ayar');
    const e = el('span', 'ayar__etiket', etiket);
    e.id = id;
    const grup = el('div', `ayar__secim ${sinif}`);
    grup.setAttribute('role', 'radiogroup');
    grup.setAttribute('aria-labelledby', id);
    const dugmeler = secenekler.map((s) => {
      const d = el('button', 'ayar__secenek');
      d.type = 'button';
      d.setAttribute('role', 'radio');
      d.dataset.deger = s.deger;
      d.append(el('span', 'ayar__secenek-ornek'), el('span', 'ayar__secenek-ad', s.ad));
      d.addEventListener('click', () => sec(s.deger));
      d.addEventListener('keydown', (ev) => {
        const i = secenekler.findIndex((x) => x.deger === s.deger);
        const yon = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
        if (!yon) return;
        ev.preventDefault();
        const j = (i + yon + secenekler.length) % secenekler.length;
        sec(secenekler[j].deger);
        dugmeler[j].focus();
      });
      return d;
    });
    const tazele = () => {
      for (const d of dugmeler) {
        const on = d.dataset.deger === secili();
        d.setAttribute('aria-checked', String(on));
        d.tabIndex = on ? 0 : -1;
      }
    };
    grup.append(...dugmeler);
    kap.append(e, grup);
    return { kap, tazele };
  };

  const aralik = secimGrubu(
    'Satır aralığı',
    'ayar-aralik',
    [
      { deger: 'dar', ad: 'Dar' },
      { deger: 'normal', ad: 'Normal' },
      { deger: 'genis', ad: 'Geniş' },
    ],
    () => al().aralik,
    (d) => {
      degistir({ ...al(), aralik: d as Ayarlar['aralik'] });
      tazele();
    },
    'ayar__secim--aralik',
  );
  const tema = secimGrubu(
    'Tema',
    'ayar-tema',
    [
      { deger: 'gunduz', ad: 'Gündüz' },
      { deger: 'sepya', ad: 'Sepya' },
      { deger: 'gece', ad: 'Gece' },
    ],
    () => al().tema,
    (d) => {
      degistir({ ...al(), tema: d as Ayarlar['tema'] });
      tazele();
    },
    'ayar__secim--tema',
  );

  const tazele = () => {
    const a = al();
    kucult.disabled = a.boyut <= 0;
    buyut.disabled = a.boyut >= BOYUTLAR.length - 1;
    Array.from(noktalar.children).forEach((n, i) => n.classList.toggle('dolu', i <= a.boyut));
    durum.textContent = `Yazı boyutu ${a.boyut + 1} / ${BOYUTLAR.length}`;
    aralik.tazele();
    tema.tazele();
  };
  kucult.addEventListener('click', () => {
    degistir({ ...al(), boyut: Math.max(0, al().boyut - 1) });
    tazele();
  });
  buyut.addEventListener('click', () => {
    degistir({ ...al(), boyut: Math.min(BOYUTLAR.length - 1, al().boyut + 1) });
    tazele();
  });
  tazele();
  kok.append(boyut, aralik.kap, tema.kap);
  return kok;
}
