// Oku sekmesi: kâinat kitabını "okumak" için dikey kısa video akışı (Reels gibi).
// Yukarı/aşağı kaydırınca bir sonraki video tam ekran gelir ve kendiliğinden oynar. Ekranda yalnız iki düğme
// vardır: Neşret (paylaşım bağlantısı) ve Menba (Risale-i Nur'daki kaynak).
import { konular, videolar } from 'virtual:oku-videolar';
import { altSayfaAc, acikSayfa } from './alt-sayfa';
import { menbaIcerik } from './menba';
import { nesret } from './nesret';
import { tipografik, type Video } from './ortak';

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif?: string, metin?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

// Neşret: ortada nur parıltısı, çevresine saçılan ışınlar (neşretmek: yaymak). Güneş sekmesinin diskli güneşinden ayrı.
const NESRET_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.6c.55 2.45 1.95 3.85 4.4 4.4-2.45.55-3.85 1.95-4.4 4.4-.55-2.45-1.95-3.85-4.4-4.4 2.45-.55 3.85-1.95 4.4-4.4Z" fill="#FFE0A0"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/></svg>';
const MENBA_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.4C10.2 4.9 7.6 4.2 3.5 4.3v13.6c4.1-.1 6.7.6 8.5 2.1 1.8-1.5 4.4-2.2 8.5-2.1V4.3c-4.1-.1-6.7.6-8.5 2.1Zm0 0V20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const OYNAT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor"/></svg>';
const SESSIZ_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" fill="currentColor"/><path d="M15.5 9.5l5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';

/** Odak bir videodan ötekine geçerken aynı denetime taşınır */
const DENETIMLER = ['reel__video', 'reel__ilerleme', 'reel__dugme--nesret', 'reel__dugme--menba'];

interface Oge {
  v: Video;
  kok: HTMLElement;
  video: HTMLVideoElement;
  dolu: HTMLElement;
  uc: HTMLElement;
  cubuk: HTMLElement;
  durum: HTMLElement;
  /** Kullanıcı durdurdu (dokunarak, klavyeyle ya da kulaklık/medya tuşuyla): kendiliğinden başlamaz */
  elleDurdu: boolean;
  /** Başka videoya geçildi: geri gelince baştan başlar */
  ayrildi: boolean;
  /** Bir sonraki "pause" olayı uygulamanın kendi durdurmasından geliyor (kullanıcının durdurması sayılmaz) */
  uygulamaDurdurdu: boolean;
}

export interface Akis {
  /** Oku sekmesi açıldı; video verilirse o videoya gidilir */
  goster(videoId?: string): void;
  /** Başka sekmeye geçildi */
  ayril(): void;
  aktifVideo(): string;
}

export interface AkisSecenek {
  /** Akışta video değişti (adres #/oku/<id> olur) */
  adresDegisti(id: string): void;
  /** Oku'dan çık (Escape); sağa kaydırma ve telefonun geri tuşu da aynı yere gider */
  cik(): void;
  /** Çıkış ipucu gösterildi (ekran hafifçe sağa itilip altındaki sekme gösterilir) */
  ipucuGosterildi?(): void;
}

export interface AkisIpucu {
  /** Kullanıcı sağa kaydırmaya başladı: ipucu kalkar */
  ipucuGizle(): void;
}

const IPUCU_ANAHTARI = 'nuruhakikat.oku.kaydirIpucu';

export function akisBaslat(kok: HTMLElement, { adresDegisti, cik, ipucuGosterildi }: AkisSecenek): Akis & AkisIpucu {
  const akis = el('div', 'akis');
  akis.setAttribute('role', 'feed');
  akis.setAttribute('aria-label', 'Oku: videolar');
  // Oku tam ekrandır: başlık yalnız ekran okuyucular içindir.
  const baslik = el('h1', 'visually-hidden', 'Oku');
  // Ses kapalıyken sağ üstte küçük bir gösterge; düğme değildir (dokunuş videoya geçer ve sesi açar).
  const sessiz = el('div', 'akis__sessiz');
  sessiz.setAttribute('aria-hidden', 'true');
  sessiz.hidden = true;
  sessiz.innerHTML = SESSIZ_SVG;
  const bildirim = el('div', 'akis__bildirim');
  bildirim.setAttribute('role', 'status');
  bildirim.setAttribute('aria-live', 'polite');
  // Çıkış düğmesi olmadığı için ilk açılışta bir kez: soldan sağa akan bir ışık izi ve kısa yazı.
  const ipucu = el('div', 'akis__ipucu');
  ipucu.setAttribute('role', 'status');
  const ipucuIz = el('span', 'akis__ipucu-iz');
  ipucuIz.setAttribute('aria-hidden', 'true');
  const ipucuYazi = el('span', 'akis__ipucu-yazi');
  ipucu.append(ipucuIz, ipucuYazi);
  kok.append(akis, baslik, sessiz, bildirim, ipucu);

  let etkin = false;
  let aktif = 0;
  /** Tarayıcı sesli oynatmaya izin vermediyse true: videolar sessiz oynar, ilk dokunuş sesi açar */
  let zorlaSessiz = false;
  let cerceve = 0;
  let ipucuZamanlayici = 0;

  const konuAdi = new Map(konular.map((k) => [k.id, tipografik(k.baslik)]));

  const ogeler: Oge[] = videolar.map((v, i) => {
    const art = el('article', 'reel');
    art.dataset.id = v.id;
    art.setAttribute('aria-posinset', String(i + 1));
    art.setAttribute('aria-setsize', String(videolar.length));
    art.setAttribute('aria-label', tipografik(v.baslik));
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
    // Görünür bir düğme eklemeden klavye ve ekran okuyucuyla da durdurulabilsin
    video.tabIndex = 0;
    video.setAttribute('role', 'button');

    const karartma = el('div', 'reel__karartma');
    karartma.setAttribute('aria-hidden', 'true');
    const durum = el('div', 'reel__durum');
    durum.setAttribute('aria-hidden', 'true');

    // Ad ve konu üstte, ekranın boş üst bandında: videoların alt bandında altyazı gömülü.
    const ust = el('div', 'reel__ust');
    const konu = konuAdi.get(v.konu);
    if (konu) {
      const k = el('p', 'reel__konu', konu);
      k.setAttribute('aria-hidden', 'true');
      ust.append(k);
    }
    ust.append(el('h2', 'reel__baslik', tipografik(v.baslik)));

    const alt = el('div', 'reel__alt');
    const cubuk = el('div', 'reel__ilerleme');
    cubuk.setAttribute('role', 'slider');
    cubuk.setAttribute('aria-label', 'Videoda konum');
    cubuk.setAttribute('aria-valuemin', '0');
    cubuk.setAttribute('aria-valuemax', '100');
    cubuk.setAttribute('aria-valuenow', '0');
    cubuk.tabIndex = 0;
    const dolu = el('span', 'reel__ilerleme-dolu');
    // Dolu kısmın ucunda parlayan nokta
    const uc = el('span', 'reel__ilerleme-uc');
    cubuk.append(dolu, uc);
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

    sahne.append(video, karartma, durum, ust, alt, dugmeler);
    art.append(sahne);
    akis.append(art);

    const oge: Oge = { v, kok: art, video, dolu, uc, cubuk, durum, elleDurdu: false, ayrildi: false, uygulamaDurdurdu: false };

    nesretD.addEventListener('click', async () => {
      const sonuc = await nesret(v);
      if (sonuc === 'kopyalandi') bildir('Bağlantı kopyalandı');
      else if (sonuc === 'olmadi') bildir('Bağlantı paylaşılamadı');
    });
    menbaD.addEventListener('click', () => {
      // Sayfa açıkken videonun üstündeki yazılar ve düğmeler çekilir.
      kok.dataset.sayfa = '';
      ipucuGizle();
      altSayfaAc({
        baslik: 'Menba',
        icerik: menbaIcerik(v),
        modal: true,
        sinif: 'alt-sayfa--menba',
        kapaninca: () => delete kok.dataset.sayfa,
      });
    });

    // Videoya dokunmak (ya da odaklıyken Enter): hata varsa yeniden dener, ses kapalı zorlanmışsa sesi açar,
    // değilse durdurur / sürdürür.
    const dokun = () => {
      if (ogeler[aktif] !== oge) return;
      if (art.dataset.durum === 'hata') {
        oge.elleDurdu = false;
        void oynat(oge);
      } else if (zorlaSessiz) sesiAc();
      else durdurSurdur(oge);
    };
    sahne.addEventListener('click', (e) => {
      if ((e.target as Element).closest('button, .reel__ilerleme')) return;
      dokun();
    });
    video.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      dokun();
    });

    video.addEventListener('play', () => {
      oge.elleDurdu = false;
      durumGoster(oge);
    });
    video.addEventListener('pause', () => {
      // Uygulamanın kendi durdurmaları dışındaki her durdurma (kulaklık, medya tuşu, bildirim denetimleri)
      // kullanıcının durdurması sayılır; video kendiliğinden yeniden başlamaz.
      if (!oge.uygulamaDurdurdu && etkin && ogeler[aktif] === oge && document.visibilityState === 'visible') oge.elleDurdu = true;
      oge.uygulamaDurdurdu = false;
      durumGoster(oge);
    });
    video.addEventListener('playing', () => {
      durumGoster(oge);
      // Dışarıdan (medya tuşuyla) başlatılan oynatmada da ilerleme çizgisi yürüsün; görünmeyen video oynamasın.
      if (ogeler[aktif] === oge && etkin) dongu();
      else durdur(oge);
    });
    video.addEventListener('waiting', () => durumGoster(oge, 'bekliyor'));
    video.addEventListener('error', () => {
      durumGoster(oge, 'hata');
      if (ogeler[aktif] === oge && etkin) bildir('Video açılamadı. Yeniden denemek için videoya dokunun.');
    });
    video.addEventListener('loadedmetadata', () => cubukGuncelle(oge));
    video.addEventListener('timeupdate', () => {
      if (video.paused) cubukGuncelle(oge);
    });

    ilerlemeSurukle(oge);
    durumGoster(oge);
    return oge;
  });

  function bildir(metin: string, sure = 2200): void {
    bildirim.textContent = metin;
    bildirim.classList.add('gorunur');
    window.clearTimeout(Number(bildirim.dataset.zaman));
    bildirim.dataset.zaman = String(window.setTimeout(() => bildirim.classList.remove('gorunur'), sure));
  }

  function ipucuGoster(): void {
    ipucuYazi.textContent = 'Çıkmak için sağa kaydırın';
    ipucu.classList.add('gorunur');
    ipucuGosterildi?.();
    window.clearTimeout(ipucuZamanlayici);
    ipucuZamanlayici = window.setTimeout(ipucuGizle, 4200);
  }

  function ipucuGizle(): void {
    window.clearTimeout(ipucuZamanlayici);
    ipucu.classList.remove('gorunur');
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
    const ne = hal === 'hata' ? 'yeniden dene' : zorlaSessiz ? 'sesi aç' : v.paused ? 'oynat' : 'durdur';
    v.setAttribute('aria-label', `${o.v.baslik}: ${ne}`);
  }

  function cubukGuncelle(o: Oge): void {
    const v = o.video;
    const oran = v.duration > 0 ? v.currentTime / v.duration : 0;
    o.dolu.style.transform = `scaleX(${oran})`;
    o.uc.style.transform = `translateX(${(oran * 100).toFixed(3)}%)`;
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

  /** Uygulamanın kendi durdurması (sekme değişimi, kaydırma, arka plan); kullanıcının durdurması sayılmaz. */
  function durdur(o: Oge): void {
    if (o.video.paused) return;
    o.uygulamaDurdurdu = true;
    o.video.pause();
  }

  async function oynat(o: Oge): Promise<void> {
    const v = o.video;
    if (!v.getAttribute('src')) hazirla(ogeler.indexOf(o));
    // Önceden yüklenirken (ör. ağ kısa süre gidince) hata almış video yeniden yüklenir.
    if (v.error) v.load();
    v.muted = zorlaSessiz;
    try {
      await v.play();
    } catch (e) {
      if ((e as DOMException)?.name !== 'NotAllowedError' || v.muted) return;
      // Tarayıcı sesli otomatik oynatmaya izin vermedi: sessiz oynat, dokununca ses açılsın.
      zorlaSessiz = true;
      sessiz.hidden = false;
      bildir('Sesi açmak için videoya dokunun', 3500);
      v.muted = true;
      await v.play().catch(() => undefined);
      durumGoster(o);
    }
    // Oynatma başlarken kullanıcı başka videoya ya da sekmeye geçtiyse durdur.
    if (ogeler[aktif] !== o || !etkin) durdur(o);
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
    sessiz.hidden = true;
    bildirim.classList.remove('gorunur');
    for (const o of ogeler) o.video.muted = false;
    const o = ogeler[aktif];
    if (o.video.paused) void oynat(o);
    durumGoster(o);
  }

  function aktifYap(i: number): void {
    if (i < 0 || i >= ogeler.length) return;
    const onceki = ogeler[aktif];
    let odak: string | undefined;
    if (i !== aktif) {
      const a = document.activeElement;
      if (a instanceof HTMLElement && onceki.kok.contains(a)) odak = DENETIMLER.find((s) => a.classList.contains(s));
      durdur(onceki);
      onceki.ayrildi = true;
      onceki.elleDurdu = false;
      durumGoster(onceki);
      aktif = i;
    }
    const o = ogeler[i];
    for (const x of ogeler) x.kok.toggleAttribute('data-aktif', x === o);
    // Klavyeyle video değişince odak yeni videonun aynı denetimine geçer (eski, görünmeyen videoda kalmaz).
    if (odak) o.kok.querySelector<HTMLElement>(`.${odak}`)?.focus({ preventScroll: true });
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

  // Klavye (masaüstü): ↑/↓ video değiştirir, boşluk durdurur, Escape çıkar.
  document.addEventListener('keydown', (e) => {
    if (!etkin || e.defaultPrevented || acikSayfa() || e.altKey || e.ctrlKey || e.metaKey) return;
    const hedef = e.target as Element;
    if (hedef.closest('input, textarea, [contenteditable]')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      cik();
    } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      git(aktif + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      git(aktif - 1);
    } else if (e.key === ' ' && !hedef.closest('button, summary')) {
      // Boşluk düğmeleri çalıştırır; başka her yerde (bağlantı, ilerleme çizgisi, video) durdurur / sürdürür.
      e.preventDefault();
      if (zorlaSessiz) sesiAc();
      else durdurSurdur(ogeler[aktif]);
    }
  });

  // Uygulama arka plana geçince durur, geri gelince sürer.
  document.addEventListener('visibilitychange', () => {
    const o = ogeler[aktif];
    if (!etkin || !o) return;
    if (document.visibilityState === 'hidden') durdur(o);
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
    // Kaydırıcı tuşları (ARIA): →/↑ 5 sn ileri, ←/↓ 5 sn geri, Home/End baş/son. Akışın ↑/↓ tuşlarına geçmez.
    c.addEventListener('keydown', (e) => {
      const v = o.video;
      const adimlar: Record<string, number> = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5 };
      const adim = adimlar[e.key];
      if (adim === undefined && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      e.stopPropagation();
      if (ogeler[aktif] !== o || acikSayfa() || !(v.duration > 0)) return;
      v.currentTime = e.key === 'Home' ? 0 : e.key === 'End' ? Math.max(0, v.duration - 0.5) : Math.max(0, Math.min(v.duration, v.currentTime + adim));
      cubukGuncelle(o);
    });
  }

  return {
    goster(videoId) {
      etkin = true;
      // Çıkış düğmesi olmadığı için ilk açılışta bir kez nasıl çıkılacağı gösterilir.
      try {
        if (!localStorage.getItem(IPUCU_ANAHTARI)) {
          localStorage.setItem(IPUCU_ANAHTARI, '1');
          window.clearTimeout(ipucuZamanlayici);
          ipucuZamanlayici = window.setTimeout(() => etkin && !acikSayfa() && ipucuGoster(), 1200);
        }
      } catch {
        // depolama kapalıysa ipucu gösterilmez
      }
      const i = videoId ? ogeler.findIndex((o) => o.v.id === videoId) : -1;
      const hedef = i >= 0 ? i : aktif;
      if (hedef !== aktif || Math.abs(akis.scrollTop - hedef * akis.clientHeight) > 2) {
        akis.scrollTop = hedef * akis.clientHeight;
      }
      aktifYap(hedef);
    },
    ayril() {
      etkin = false;
      ipucuGizle();
      cancelAnimationFrame(cerceve);
      for (const o of ogeler) durdur(o);
    },
    aktifVideo() {
      return ogeler[aktif].v.id;
    },
    ipucuGizle,
  };
}
