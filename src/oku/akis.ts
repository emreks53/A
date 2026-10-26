// Oku sekmesi: kâinat kitabını "okumak" için dikey kısa video akışı (Reels gibi).
// Yukarı/aşağı kaydırınca bir sonraki video tam ekran gelir ve kendiliğinden oynar. Ekranda yalnız iki düğme
// vardır: Neşret (paylaşım bağlantısı) ve Menba (Risale-i Nur'daki kaynak).
import { videolar } from 'virtual:oku-videolar';
import { altSayfaAc, acikSayfa } from './alt-sayfa';
import { menbaIcerik } from './menba';
import { nesret } from './nesret';
import type { Video } from './ortak';

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif?: string, metin?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

const NESRET_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 3.2 10.4 13.7M21.5 3.2l-6.9 18-4.2-7.5-7.6-4.1 18.7-6.4Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const MENBA_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.4C10.2 4.9 7.6 4.2 3.5 4.3v13.6c4.1-.1 6.7.6 8.5 2.1 1.8-1.5 4.4-2.2 8.5-2.1V4.3c-4.1-.1-6.7.6-8.5 2.1Zm0 0V20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const OYNAT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor"/></svg>';
const SES_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" fill="currentColor"/><path d="M15.5 9.5l5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';

interface Oge {
  v: Video;
  kok: HTMLElement;
  video: HTMLVideoElement;
  dolu: HTMLElement;
  cubuk: HTMLElement;
  durum: HTMLElement;
  /** Kullanıcı dokunup durdurdu: sekmeye dönünce kendiliğinden başlamaz */
  elleDurdu: boolean;
  /** Başka videoya geçildi: geri gelince baştan başlar */
  ayrildi: boolean;
}

export interface Akis {
  /** Oku sekmesi açıldı; video verilirse o videoya gidilir */
  goster(videoId?: string): void;
  /** Başka sekmeye geçildi */
  ayril(): void;
  aktifVideo(): string;
}

export function akisBaslat(kok: HTMLElement, adresDegisti: (id: string) => void): Akis {
  const akis = el('div', 'akis');
  akis.setAttribute('role', 'feed');
  akis.setAttribute('aria-label', 'Oku: videolar');
  const baslik = el('h1', 'akis__baslik', 'Oku');
  const sesIpucu = el('button', 'akis__ses-ipucu');
  sesIpucu.type = 'button';
  sesIpucu.hidden = true;
  sesIpucu.innerHTML = SES_SVG;
  sesIpucu.append(el('span', undefined, 'Sesi açmak için dokunun'));
  const bildirim = el('div', 'akis__bildirim');
  bildirim.setAttribute('role', 'status');
  bildirim.setAttribute('aria-live', 'polite');
  kok.append(akis, baslik, sesIpucu, bildirim);

  let etkin = false;
  let aktif = 0;
  /** Tarayıcı sesli oynatmaya izin vermediyse true: videolar sessiz oynar, ilk dokunuş sesi açar */
  let zorlaSessiz = false;
  let cerceve = 0;

  const ogeler: Oge[] = videolar.map((v, i) => {
    const art = el('article', 'reel');
    art.dataset.id = v.id;
    art.setAttribute('aria-posinset', String(i + 1));
    art.setAttribute('aria-setsize', String(videolar.length));
    art.setAttribute('aria-label', v.baslik);
    // CSS değişkenindeki göreli adres stil dosyasına göre çözülür; bu yüzden tam adres verilir.
    art.style.setProperty('--kapak', `url("${new URL(import.meta.env.BASE_URL + v.kapak, document.baseURI).href}")`);

    const sahne = el('div', 'reel__sahne');
    const video = el('video', 'reel__video');
    video.playsInline = true;
    video.setAttribute('webkit-playsinline', '');
    video.loop = true;
    video.preload = 'none';
    video.poster = import.meta.env.BASE_URL + v.kapak;
    video.disableRemotePlayback = true;
    video.setAttribute('aria-label', v.baslik);

    const karartma = el('div', 'reel__karartma');
    karartma.setAttribute('aria-hidden', 'true');
    const durum = el('div', 'reel__durum');
    durum.setAttribute('aria-hidden', 'true');

    const alt = el('div', 'reel__alt');
    alt.append(el('h2', 'reel__baslik', v.baslik));
    const cubuk = el('div', 'reel__ilerleme');
    cubuk.setAttribute('role', 'slider');
    cubuk.setAttribute('aria-label', 'Videoda konum');
    cubuk.setAttribute('aria-valuemin', '0');
    cubuk.setAttribute('aria-valuemax', '100');
    cubuk.setAttribute('aria-valuenow', '0');
    cubuk.tabIndex = 0;
    const dolu = el('span', 'reel__ilerleme-dolu');
    cubuk.append(dolu);
    alt.append(cubuk);

    const dugmeler = el('div', 'reel__dugmeler');
    const nesretD = el('button', 'reel__dugme reel__dugme--nesret');
    nesretD.type = 'button';
    nesretD.innerHTML = NESRET_SVG;
    nesretD.append(el('span', 'reel__dugme-ad', 'Neşret'));
    nesretD.setAttribute('aria-label', `Neşret: ${v.baslik} bağlantısını paylaş`);
    const menbaD = el('button', 'reel__dugme reel__dugme--menba');
    menbaD.type = 'button';
    menbaD.innerHTML = MENBA_SVG;
    menbaD.append(el('span', 'reel__dugme-ad', 'Menba'));
    menbaD.setAttribute('aria-label', `Menba: ${v.baslik} videosunun kaynağı`);
    menbaD.setAttribute('aria-haspopup', 'dialog');
    dugmeler.append(nesretD, menbaD);

    sahne.append(video, karartma, durum, alt, dugmeler);
    art.append(sahne);
    akis.append(art);

    const oge: Oge = { v, kok: art, video, dolu, cubuk, durum, elleDurdu: false, ayrildi: false };

    nesretD.addEventListener('click', async () => {
      const sonuc = await nesret(v);
      if (sonuc === 'kopyalandi') bildir('Bağlantı kopyalandı');
      else if (sonuc === 'olmadi') bildir('Bağlantı paylaşılamadı');
    });
    menbaD.addEventListener('click', () => {
      altSayfaAc({ baslik: 'Menba', icerik: menbaIcerik(v), modal: true, sinif: 'alt-sayfa--menba' });
    });

    // Videoya dokunmak: ses kapalı zorlanmışsa sesi açar, değilse durdurur / sürdürür.
    sahne.addEventListener('click', (e) => {
      if ((e.target as Element).closest('button, .reel__ilerleme')) return;
      if (ogeler[aktif] !== oge) return;
      if (art.dataset.durum === 'hata') {
        oge.elleDurdu = false;
        video.load();
        void oynat(oge);
        return;
      }
      if (zorlaSessiz) {
        sesiAc();
        return;
      }
      durdurSurdur(oge);
    });

    video.addEventListener('play', () => durumGoster(oge));
    video.addEventListener('pause', () => durumGoster(oge));
    video.addEventListener('playing', () => durumGoster(oge));
    video.addEventListener('waiting', () => durumGoster(oge, 'bekliyor'));
    video.addEventListener('error', () => durumGoster(oge, 'hata'));
    video.addEventListener('loadedmetadata', () => cubukGuncelle(oge));
    video.addEventListener('timeupdate', () => {
      if (video.paused) cubukGuncelle(oge);
    });

    ilerlemeSurukle(oge);
    return oge;
  });

  function bildir(metin: string): void {
    bildirim.textContent = metin;
    bildirim.classList.add('gorunur');
    window.clearTimeout(Number(bildirim.dataset.zaman));
    bildirim.dataset.zaman = String(window.setTimeout(() => bildirim.classList.remove('gorunur'), 2200));
  }

  function durumGoster(o: Oge, ozel?: 'bekliyor' | 'hata'): void {
    const v = o.video;
    let hal = '';
    if (ozel === 'hata' || v.error) hal = 'hata';
    else if (ozel === 'bekliyor' && !v.paused) hal = 'bekliyor';
    else if (v.paused && o.elleDurdu) hal = 'durdu';
    o.kok.dataset.durum = hal;
    if (hal === 'durdu') o.durum.innerHTML = OYNAT_SVG;
    else if (hal === 'hata') o.durum.textContent = 'Video açılamadı. Yeniden denemek için dokunun.';
    else o.durum.replaceChildren();
  }

  function cubukGuncelle(o: Oge): void {
    const v = o.video;
    const oran = v.duration > 0 ? v.currentTime / v.duration : 0;
    o.dolu.style.transform = `scaleX(${oran})`;
    o.cubuk.setAttribute('aria-valuenow', String(Math.round(oran * 100)));
    o.cubuk.setAttribute('aria-valuetext', `${Math.floor(v.currentTime / 60)}:${String(Math.floor(v.currentTime % 60)).padStart(2, '0')}`);
  }

  function dongu(): void {
    cancelAnimationFrame(cerceve);
    const adim = () => {
      const o = ogeler[aktif];
      if (o) cubukGuncelle(o);
      if (etkin && o && !o.video.paused) cerceve = requestAnimationFrame(adim);
    };
    cerceve = requestAnimationFrame(adim);
  }

  /** Kaynağı yalnız aktif video ve bir sonraki için yükler (açılışta ve öteki sekmelerde ağ kullanılmaz). */
  function hazirla(i: number): void {
    for (const [j, o] of ogeler.entries()) {
      const yakin = j === i || j === i + 1;
      if (yakin && !o.video.getAttribute('src')) o.video.src = import.meta.env.BASE_URL + o.v.video;
      o.video.preload = j === i ? 'auto' : yakin ? 'metadata' : 'none';
    }
  }

  async function oynat(o: Oge): Promise<void> {
    const v = o.video;
    if (!v.getAttribute('src')) hazirla(ogeler.indexOf(o));
    v.muted = zorlaSessiz;
    try {
      await v.play();
    } catch (e) {
      if ((e as DOMException)?.name !== 'NotAllowedError' || v.muted) return;
      // Tarayıcı sesli otomatik oynatmaya izin vermedi: sessiz oynat, dokununca ses açılsın.
      zorlaSessiz = true;
      sesIpucu.hidden = false;
      v.muted = true;
      await v.play().catch(() => undefined);
    }
    if (ogeler[aktif] === o && etkin) dongu();
    else v.pause();
  }

  function durdurSurdur(o: Oge): void {
    if (o.video.paused) {
      o.elleDurdu = false;
      void oynat(o);
    } else {
      o.elleDurdu = true;
      o.video.pause();
    }
    durumGoster(o);
  }

  function sesiAc(): void {
    zorlaSessiz = false;
    sesIpucu.hidden = true;
    for (const o of ogeler) o.video.muted = false;
    const o = ogeler[aktif];
    if (o.video.paused) void oynat(o);
  }
  sesIpucu.addEventListener('click', sesiAc);

  function aktifYap(i: number): void {
    if (i < 0 || i >= ogeler.length) return;
    const onceki = ogeler[aktif];
    if (i !== aktif) {
      onceki.video.pause();
      onceki.ayrildi = true;
      onceki.elleDurdu = false;
      durumGoster(onceki);
      aktif = i;
    }
    const o = ogeler[i];
    for (const x of ogeler) x.kok.toggleAttribute('data-aktif', x === o);
    // Sekme gizliyken (ana ekrandayken) ne video indirilir ne de adres değişir.
    if (!etkin) return;
    hazirla(i);
    adresDegisti(o.v.id);
    if (o.ayrildi) {
      o.ayrildi = false;
      o.video.currentTime = 0;
    }
    if (!o.elleDurdu) void oynat(o);
  }

  // Ekranın en az %60'ını kaplayan video aktif olur.
  const gozcu = new IntersectionObserver(
    (girdiler) => {
      for (const g of girdiler) {
        if (!g.isIntersecting || g.intersectionRatio < 0.6) continue;
        const i = ogeler.findIndex((o) => o.kok === g.target);
        if (i >= 0 && (i !== aktif || !ogeler[i].kok.hasAttribute('data-aktif'))) aktifYap(i);
      }
    },
    { root: akis, threshold: [0.6] },
  );
  for (const o of ogeler) gozcu.observe(o.kok);

  function git(i: number, yumusak = true): void {
    const hedef = Math.max(0, Math.min(ogeler.length - 1, i));
    akis.scrollTo({ top: hedef * akis.clientHeight, behavior: yumusak && !azaltilmisHareket() ? 'smooth' : 'auto' });
  }

  function azaltilmisHareket(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Klavye (masaüstü): ↑/↓ video değiştirir, boşluk durdurur.
  document.addEventListener('keydown', (e) => {
    if (!etkin || acikSayfa() || e.altKey || e.ctrlKey || e.metaKey) return;
    const hedef = e.target as Element;
    if (hedef.closest('input, textarea, [contenteditable]')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      git(aktif + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      git(aktif - 1);
    } else if (e.key === ' ' && !hedef.closest('button, a, [role="slider"]')) {
      e.preventDefault();
      if (zorlaSessiz) sesiAc();
      else durdurSurdur(ogeler[aktif]);
    }
  });

  // Uygulama arka plana geçince durur, geri gelince sürer.
  document.addEventListener('visibilitychange', () => {
    const o = ogeler[aktif];
    if (!etkin || !o) return;
    if (document.visibilityState === 'hidden') o.video.pause();
    else if (!o.elleDurdu) void oynat(o);
  });

  // Ekran döndürülünce ya da boyutu değişince aktif video yerinde kalsın.
  let boyut = akis.clientHeight;
  new ResizeObserver(() => {
    if (akis.clientHeight === boyut || !akis.clientHeight) return;
    boyut = akis.clientHeight;
    akis.scrollTop = aktif * akis.clientHeight;
  }).observe(akis);

  function ilerlemeSurukle(o: Oge): void {
    const c = o.cubuk;
    let surukleniyor = false;
    const konumla = (x: number) => {
      const r = c.getBoundingClientRect();
      const v = o.video;
      if (!(v.duration > 0)) return;
      v.currentTime = Math.max(0, Math.min(1, (x - r.left) / r.width)) * v.duration;
      cubukGuncelle(o);
    };
    c.addEventListener('pointerdown', (e) => {
      surukleniyor = true;
      c.setPointerCapture(e.pointerId);
      c.classList.add('suruklenen');
      konumla(e.clientX);
    });
    c.addEventListener('pointermove', (e) => surukleniyor && konumla(e.clientX));
    const bitir = () => {
      surukleniyor = false;
      c.classList.remove('suruklenen');
    };
    c.addEventListener('pointerup', bitir);
    c.addEventListener('pointercancel', bitir);
    c.addEventListener('keydown', (e) => {
      const v = o.video;
      if (!(v.duration > 0)) return;
      const adim = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0;
      if (!adim) return;
      e.preventDefault();
      v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + adim));
      cubukGuncelle(o);
    });
  }

  return {
    goster(videoId) {
      etkin = true;
      const i = videoId ? ogeler.findIndex((o) => o.v.id === videoId) : -1;
      const hedef = i >= 0 ? i : aktif;
      if (hedef !== aktif || Math.abs(akis.scrollTop - hedef * akis.clientHeight) > 2) {
        akis.scrollTop = hedef * akis.clientHeight;
      }
      aktifYap(hedef);
    },
    ayril() {
      etkin = false;
      cancelAnimationFrame(cerceve);
      for (const o of ogeler) o.video.pause();
    },
    aktifVideo() {
      return ogeler[aktif].v.id;
    },
  };
}
