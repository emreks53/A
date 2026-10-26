import './styles.css';
import './oku/oku.css';
import { Capacitor } from '@capacitor/core';
import { acikSayfa } from './oku/alt-sayfa';
import { akisBaslat } from './oku/akis';
import { paylasimdanVideo, rotaCoz, type Rota, type Sekme } from './rota';

const tabbar = document.querySelector<HTMLElement>('.tabbar')!;
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.tab'));
const views = Array.from(document.querySelectorAll<HTMLElement>('.view'));

// Akışta video değişince adres de değişir (#/oku/<id>); geçmişe yeni kayıt eklenmez.
const akis = akisBaslat(document.getElementById('view-oku')!, (id) => {
  const hash = `#/oku/${id}`;
  if (location.hash !== hash) history.replaceState(history.state, '', hash);
});

let aktif: Sekme | null = null;

function show(r: Rota): void {
  const sekme = r.sekme;
  if (aktif === 'oku' && sekme !== 'oku') akis.ayril();
  aktif = sekme;
  tabbar.dataset.active = sekme;
  for (const link of links) {
    if (link.dataset.tab === sekme) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  for (const view of views) view.hidden = view.dataset.view !== sekme;
  acikSayfa()?.kapat();
  if (sekme === 'oku') akis.goster(r.video);
}

window.addEventListener('hashchange', () => show(rotaCoz(location.hash)));
for (const link of links) {
  link.addEventListener('click', (e) => {
    // Açık sekmeye yeniden dokunmak geçmişe kayıt eklemesin
    if (link.dataset.tab === aktif) e.preventDefault();
  });
}
show(rotaCoz(location.hash));

/** Paylaşılan bağlantıyla (…/v/<id>/) uygulama açılınca o videoya git */
function baglantiylaAc(adres: string | undefined): void {
  const id = adres ? paylasimdanVideo(adres) : undefined;
  if (id) location.hash = `#/oku/${id}`;
}

async function setupNative(): Promise<void> {
  const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/app'),
  ]);
  // Android geri tuşu: önce açık sayfayı kapatır, sonra geri gider; en başta uygulamadan çıkar.
  await App.addListener('backButton', ({ canGoBack }) => {
    const sayfa = acikSayfa();
    if (sayfa) sayfa.kapat();
    else if (canGoBack) history.back();
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
