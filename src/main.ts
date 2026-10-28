import './styles.css';
import './oku/oku.css';
import './kenz/kenz.css';
import { Capacitor } from '@capacitor/core';
import { kenzBaslat } from './kenz/kenz';
import { acikSayfa } from './oku/alt-sayfa';
import { akisBaslat } from './oku/akis';
import { sagaKaydirCik } from './oku/kaydir-cik';
import { paylasimdanVideo, rotaCoz, rotaHash, type Rota, type Sekme } from './rota';

const app = document.getElementById('app')!;
const tabbar = document.querySelector<HTMLElement>('.tabbar')!;
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.tab'));
const views = Array.from(document.querySelectorAll<HTMLElement>('.view'));
const okuGorunumu = document.getElementById('view-oku')!;

let aktif: Sekme | null = null;
/** Oku'ya uygulamanın içinden (başka sekmeden) gelindi: çıkınca geçmişte bir adım geri gidilir. */
let okuyaIcerdenGelindi = false;
/** Oku'dan çıkınca dönülecek ekran */
let okuOncesi: Exclude<Sekme, 'oku'> = 'ana';
/** Açık sekmeye (Kenz, Güneş) ana ekrandan gelindi: ana ekrana dönmek geçmişte bir adım geri gitmektir. */
let anadanGelindi = false;
/** Tarayıcının üst çubuğu ekranın rengini alsın */
const TEMA: Record<Sekme, string> = { ana: '#5AA2EC', kenz: '#0C1A40', gunes: '#141A46', oku: '#000000' };
const temaRengi = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
/** Oku açılırken odaktaki öğe (ör. dokunulan Kenz kartı): çıkınca odak ona döner */
let okuOncesiOdak: HTMLElement | null = null;
const azaltilmisHareket = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Oku tam ekrandır; çıkış sağa kaydırma, telefonun geri tuşu ya da Escape ile olur. */
function okudanCik(): void {
  if (aktif !== 'oku') return;
  if (okuyaIcerdenGelindi) history.back();
  else location.replace(rotaHash({ sekme: okuOncesi }));
}

/** Kenz ve Güneş'ten ana ekrana (açık sekmeye yeniden dokununca ya da geri tuşuyla) */
function anaEkranaDon(): void {
  if (anadanGelindi) history.back();
  else location.replace('#/');
}

kenzBaslat(document.getElementById('view-kenz')!);

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

function show(r: Rota, icerden = false): void {
  const sekme = r.sekme;
  const okudanDonus = aktif === 'oku' && sekme !== 'oku';
  if (sekme === 'oku' && aktif !== 'oku') {
    okuyaIcerdenGelindi = icerden && aktif !== null;
    if (aktif) okuOncesi = aktif;
    const odak = document.activeElement;
    okuOncesiOdak = odak instanceof HTMLElement && odak !== document.body ? odak : null;
    if (okuyaIcerdenGelindi && !azaltilmisHareket.matches) app.dataset.gecis = 'oku-gir';
  }
  if (okudanDonus) akis.ayril();
  if (sekme === 'ana') anadanGelindi = false;
  else if ((sekme === 'kenz' || sekme === 'gunes') && aktif === 'ana') anadanGelindi = icerden;
  aktif = sekme;
  app.dataset.sekme = sekme;
  // Arka plan, görünen ekrana göre: Oku'dayken (sağa kaydırınca altından görünecek) dönülecek ekranınki.
  app.dataset.zemin = sekme === 'oku' ? okuOncesi : sekme;
  // Ana ekranda hiçbir sekme seçili görünmez.
  if (sekme === 'ana') delete tabbar.dataset.active;
  else tabbar.dataset.active = sekme;
  temaRengi?.setAttribute('content', TEMA[sekme]);
  // Oku tam ekrandır: gizli alt menü ne odak alır ne de ekran okuyucuya görünür.
  tabbar.inert = sekme === 'oku';
  for (const link of links) {
    if (link.dataset.tab === sekme) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  for (const view of views) view.hidden = view.dataset.view !== sekme;
  acikSayfa()?.kapat();
  if (sekme === 'oku') akis.goster(r.video);
  else if (okudanDonus) odagiGeriVer(sekme);
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
      location.replace(link.getAttribute('href')!);
    }
  });
}
show(rotaCoz(location.hash));

/** Paylaşılan bağlantıyla (…/v/<id>/) uygulama açılınca o videoya git */
function baglantiylaAc(adres: string | undefined): void {
  const id = adres ? paylasimdanVideo(adres) : undefined;
  if (!id) return;
  // Oku zaten açıksa geçmişe yeni kayıt eklenmez; yoksa çıkış önceki videoya döner, Oku kapanmazdı.
  if (aktif === 'oku') location.replace(`#/oku/${id}`);
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
