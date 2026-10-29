import './styles.css';
import './oku/oku.css';
import './kenz/kenz.css';
import './gunes/gunes.css';
import { Capacitor } from '@capacitor/core';
import { kitaplar } from 'virtual:kitaplar';
import { kitapAcilisi } from './gunes/acilis';
import { ciltRenkleri, gunesBaslat } from './gunes/gunes';
import { okuyucuBaslat, tahminiSayfaKutusu } from './gunes/okuyucu';
import { kenzBaslat } from './kenz/kenz';
import { acikSayfa } from './oku/alt-sayfa';
import { akisBaslat } from './oku/akis';
import { sagaKaydirCik } from './oku/kaydir-cik';
import { tipografik } from './oku/ortak';
import { paylasimdanVideo, rotaCoz, rotaHash, type Rota, type Sekme } from './rota';

const app = document.getElementById('app')!;
const tabbar = document.querySelector<HTMLElement>('.tabbar')!;
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.tab'));
const views = Array.from(document.querySelectorAll<HTMLElement>('.view'));
const okuGorunumu = document.getElementById('view-oku')!;
const kitapGorunumu = document.getElementById('view-kitap')!;

let aktif: Sekme | null = null;
/** Oku'ya uygulamanın içinden (başka sekmeden) gelindi: çıkınca geçmişte bir adım geri gidilir. */
let okuyaIcerdenGelindi = false;
/** Oku'dan çıkınca dönülecek ekran */
let okuOncesi: Exclude<Sekme, 'oku'> = 'ana';
/** Açık sekmeye (Kenz, Güneş) ana ekrandan gelindi: ana ekrana dönmek geçmişte bir adım geri gitmektir. */
let anadanGelindi = false;
/** Kitaba uygulamanın içinden (Güneş rafından, Menba'dan) gelindi: kapatınca geçmişte bir adım geri gidilir. */
let kitabaIcerdenGelindi = false;
/** Kitap açılırken odaktaki öğe (dokunulan kitap): kapatınca odak ona döner */
let kitapOncesiOdak: HTMLElement | null = null;

/** Geçmiş kaydında saklanan: kaydın sırası ve bu ekrana uygulamanın içinden hangi ekrandan gelindi. Sayfa yeniden
 *  yüklense de (uygulama güncellenince, Android sekmeyi bellekten atınca) kalır; çıkışlar yine doğru ekrana döner. */
interface GecmisDurumu {
  sira?: number;
  onceki?: Sekme;
}
/** Görünen kaydın sırası: bir sonraki kayda (yeni kayıt ya da tarayıcının İleri tuşu) gelindiğini anlamak için */
let aktifSira = 0;
const gecmisDurumu = (): GecmisDurumu => (history.state && typeof history.state === 'object' ? history.state : {});

/** Adresi geçmişe kayıt eklemeden ve geçmiş kaydındaki bilgiyi koruyarak değiştirir (yeni ekran eskisinin yerine
 *  geçer: nereden gelindiği değişmez) */
function yerineGec(hash: string): void {
  history.replaceState(history.state, '', hash);
  show(rotaCoz(location.hash), true, true);
}
/** Tarayıcının üst çubuğu ekranın rengini alsın */
const TEMA: Record<Exclude<Sekme, 'kitap'>, string> = { ana: '#5AA2EC', kenz: '#0C1A40', gunes: '#0B1338', oku: '#000000' };
const temaRengi = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
/** Oku açılırken odaktaki öğe (ör. dokunulan Kenz kartı): çıkınca odak ona döner */
let okuOncesiOdak: HTMLElement | null = null;
const azaltilmisHareket = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Oku tam ekrandır; çıkış sağa kaydırma, telefonun geri tuşu ya da Escape ile olur. */
function okudanCik(): void {
  if (aktif !== 'oku') return;
  if (okuyaIcerdenGelindi) history.back();
  else yerineGec(rotaHash({ sekme: okuOncesi }));
}

/** Okuyucudan çıkış (kapat düğmesi, Escape, geri tuşu) */
function kitaptanCik(): void {
  if (aktif !== 'kitap') return;
  if (kitabaIcerdenGelindi) history.back();
  else yerineGec('#/gunes');
}

/** Kenz ve Güneş'ten ana ekrana (açık sekmeye yeniden dokununca ya da geri tuşuyla) */
function anaEkranaDon(): void {
  if (anadanGelindi) history.back();
  else yerineGec('#/');
}

kenzBaslat(document.getElementById('view-kenz')!);

// Güneş'te açılan kitabın okuyucusu: sayfa değişince adres de değişir (#/gunes/<kitap>/<sayfa>), kayıt eklenmez.
const okuyucu = okuyucuBaslat(kitapGorunumu, {
  kapat: kitaptanCik,
  adresDegisti(k, basili) {
    const hash = rotaHash({ sekme: 'kitap', kitap: k.kimlik, ...(basili ? { sayfa: basili } : {}) });
    if (aktif === 'kitap' && location.hash !== hash) history.replaceState(history.state, '', hash);
  },
  temaDegisti(renk) {
    if (aktif === 'kitap') temaRengi?.setAttribute('content', renk);
  },
});

// Güneş rafı: kitaba dokununca cilt raftan çekilip açılır (hareket azaltılmışsa doğrudan okuyucu)
const gunes = gunesBaslat(document.getElementById('view-gunes')!, {
  acilis({ kitap, kaynak, adres }) {
    if (azaltilmisHareket.matches || aktif !== 'gunes') return false;
    kitapAcilisi({
      kaynak,
      ad: tipografik(kitap.kitap),
      renk: ciltRenkleri(kitap.kitap),
      hedef: tahminiSayfaKutusu(),
      zemin: okuyucu.zeminRengi(),
      kagit: okuyucu.kagitRengi(),
      git: () => {
        if (aktif === 'gunes') location.hash = adres;
      },
    });
    return true;
  },
});

// Klavyeyle gezilirken (Tab, oklar …) videonun odak çerçevesi görünür; dokunuş ya da fareyle kalkar.
const KLAVYE_TUSLARI = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Enter']);
document.addEventListener('keydown', (e) => KLAVYE_TUSLARI.has(e.key) && (document.documentElement.dataset.klavye = ''), true);
document.addEventListener('pointerdown', () => delete document.documentElement.dataset.klavye, true);

// Akışta video değişince adres de değişir (#/oku/<id>); geçmişe yeni kayıt eklenmez.
const akis = akisBaslat(okuGorunumu, {
  adresDegisti(id) {
    const hash = `#/oku/${id}`;
    if (location.hash !== hash) history.replaceState(history.state, '', hash);
  },
  cik: okudanCik,
  ipucuGosterildi: () => kaydir.durt(),
});

okuGorunumu.addEventListener('animationend', (e) => {
  if (e.target === okuGorunumu) delete app.dataset.gecis;
});

const kaydir = sagaKaydirCik(okuGorunumu, {
  alttaki: () => views.find((v) => v.dataset.view === okuOncesi) ?? null,
  cik: okudanCik,
  basladi: () => akis.ipucuGizle(),
});

function show(r: Rota, icerden = false, yerine = false): void {
  // Listede (PDF'i eklenmiş) olmayan kitabın adresi Güneş rafını açar
  const acilacakKitap = r.sekme === 'kitap' ? kitaplar.find((k) => k.kimlik === r.kitap) : undefined;
  if (r.sekme === 'kitap' && !acilacakKitap) {
    if (aktif === null) history.replaceState(history.state, '', '#/gunes');
    else return yerineGec('#/gunes');
    r = { sekme: 'gunes' };
  }
  const sekme = r.sekme;
  const okudanDonus = aktif === 'oku' && sekme !== 'oku';
  const kitaptanDonus = aktif === 'kitap' && sekme !== 'kitap';
  // Bir sonraki kayda gelindiyse (yeni kayıt: dokunuş ya da adres çubuğu; ya da İleri tuşu) bırakılan ekran, nereden
  // gelindiği olarak kayda yazılır. Geri gidilen, birkaç adım atlanan ya da yeniden yüklenen kayıtta önceden yazılmış
  // olan okunur. Her kayıt ilk görüldüğünde sırasını alır.
  const durum = gecmisDurumu();
  const sira = durum.sira ?? (aktif === null ? 0 : aktifSira + 1);
  let { onceki } = durum;
  const sonraki = icerden && !yerine && aktif !== null && sira === aktifSira + 1;
  // (Oku'dan yalnız kitaba gidilir: Menba'daki "Kitapta oku"; öbür ekranlar Oku'yu geldiği yer saymaz)
  if (sonraki) onceki = aktif && aktif !== sekme && sekme !== 'ana' && (aktif !== 'oku' || sekme === 'kitap') ? aktif : undefined;
  if (durum.sira !== sira || durum.onceki !== onceki) history.replaceState({ ...durum, sira, onceki }, '');
  aktifSira = sira;
  if (sekme === 'oku' && aktif !== 'oku') {
    // (okuyucudan, "Bu sayfanın videosu" ile gelindiyse çıkış kitaba döner; sağa kaydırırken altta kitap görünür)
    const nereden = onceki ?? (aktif === 'kitap' ? null : aktif);
    okuyaIcerdenGelindi = onceki !== undefined;
    okuOncesi = nereden && nereden !== 'oku' ? nereden : 'ana';
    const odak = document.activeElement;
    okuOncesiOdak = odak instanceof HTMLElement && odak !== document.body && !kitapGorunumu.contains(odak) ? odak : okuOncesiOdak;
    // (kitaptan Oku'ya geri dönülürken Oku yeniden kayarak girmez)
    if (okuyaIcerdenGelindi && aktif !== null && aktif !== 'kitap' && !azaltilmisHareket.matches) app.dataset.gecis = 'oku-gir';
  }
  if (okudanDonus) akis.ayril();
  if (sekme === 'kitap' && aktif !== 'kitap') {
    kitabaIcerdenGelindi = onceki !== undefined;
    const odak = document.activeElement;
    kitapOncesiOdak = odak instanceof HTMLElement && odak !== document.body ? odak : null;
  }
  if (kitaptanDonus) okuyucu.ayril(sekme === 'oku');
  if (sekme === 'kenz' || sekme === 'gunes') anadanGelindi = onceki === 'ana';
  if (sekme === 'gunes' && aktif !== 'gunes') gunes.yenile();
  aktif = sekme;
  app.dataset.sekme = sekme;
  // Görünen ekran: Oku'dayken (sağa kaydırınca altından görünecek olan) dönülecek ekran. Arka plan ve alt menünün
  // seçili sekmesi ona göredir; ana ekranda hiçbir sekme seçili değildir.
  const alttaki = sekme === 'oku' ? okuOncesi : sekme;
  const gorunen = alttaki === 'kitap' ? 'gunes' : alttaki;
  app.dataset.zemin = gorunen;
  temaRengi?.setAttribute('content', sekme === 'kitap' ? okuyucu.zeminRengi() : TEMA[sekme]);
  // Oku ve okuyucu tam ekrandır: örtülen alt menü ne odak alır ne de ekran okuyucuya görünür.
  tabbar.inert = sekme === 'oku' || sekme === 'kitap';
  for (const link of links) {
    if (link.dataset.tab === gorunen) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  for (const view of views) view.hidden = view.dataset.view !== sekme;
  acikSayfa()?.kapat();
  if (sekme === 'oku') akis.goster(r.video);
  else if (sekme === 'kitap' && acilacakKitap) okuyucu.ac(acilacakKitap, r.sayfa);
  else if (okudanDonus) odagiGeriVer(sekme);
  else if (kitaptanDonus) {
    const hedef = kitapOncesiOdak?.isConnected && !kitapGorunumu.contains(kitapOncesiOdak) ? kitapOncesiOdak : null;
    kitapOncesiOdak = null;
    (hedef ?? views.find((v) => v.dataset.view === sekme)?.querySelector<HTMLElement>('h1'))?.focus({ preventScroll: true });
  }
}

/** Oku'dan dönünce odak kaldığı yere (açılan karta) ya da dönülen ekranın başlığına gelir; gizli Oku'da kalmaz. */
function odagiGeriVer(sekme: Sekme): void {
  const hedef =
    okuOncesiOdak?.isConnected && !okuGorunumu.contains(okuOncesiOdak)
      ? okuOncesiOdak
      : views.find((v) => v.dataset.view === sekme)?.querySelector<HTMLElement>('h1');
  okuOncesiOdak = null;
  if (hedef) hedef.focus({ preventScroll: true });
  else if (okuGorunumu.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
}

window.addEventListener('hashchange', () => show(rotaCoz(location.hash), true));
for (const link of links) {
  link.addEventListener('click', (e) => {
    // Ctrl/Cmd/Shift ile tıklama tarayıcıya kalır (yeni sekmede açar)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const hedef = link.dataset.tab as Sekme;
    // Açık sekmeye yeniden dokunmak ana ekrana döndürür.
    if (hedef === aktif) {
      e.preventDefault();
      anaEkranaDon();
      return;
    }
    // Kenz ile Güneş arasında geçiş geçmişe kayıt eklemez: geri tuşu hep ana ekrana döner.
    if ((aktif === 'kenz' || aktif === 'gunes') && hedef !== 'oku') {
      e.preventDefault();
      yerineGec(link.getAttribute('href')!);
    }
  });
}
show(rotaCoz(location.hash));

/** Paylaşılan bağlantıyla (…/v/<id>/) uygulama açılınca o videoya git */
function baglantiylaAc(adres: string | undefined): void {
  const id = adres ? paylasimdanVideo(adres) : undefined;
  if (!id) return;
  // Oku zaten açıksa geçmişe yeni kayıt eklenmez; yoksa çıkış önceki videoya döner, Oku kapanmazdı.
  if (aktif === 'oku') yerineGec(`#/oku/${id}`);
  else location.hash = `#/oku/${id}`;
}

async function setupNative(): Promise<void> {
  const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/app'),
  ]);
  // Android geri tuşu: önce açık sayfayı kapatır, Oku'dan çıkar, sekmeden ana ekrana döner; ana ekranda uygulamadan çıkar.
  await App.addListener('backButton', () => {
    const sayfa = acikSayfa();
    if (sayfa) sayfa.kapat();
    else if (aktif === 'oku') okudanCik();
    else if (aktif === 'kitap') {
      if (!okuyucu.geriAl()) kitaptanCik();
    }
    else if (aktif !== 'ana') anaEkranaDon();
    else void App.exitApp();
  }).catch(() => undefined);
  await App.addListener('appUrlOpen', ({ url }) => baglantiylaAc(url)).catch(() => undefined);
  baglantiylaAc((await App.getLaunchUrl().catch(() => undefined))?.url);
  await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
  await SplashScreen.hide().catch(() => undefined);
}

async function setupPwa(): Promise<void> {
  const { registerSW } = await import('virtual:pwa-register');
  registerSW({ immediate: true });
}

if (Capacitor.isNativePlatform()) {
  void setupNative();
} else if ('serviceWorker' in navigator && import.meta.env.PROD && window.self === window.top) {
  void setupPwa().catch(() => undefined);
}
