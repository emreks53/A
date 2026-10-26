import './styles.css';
import './oku/oku.css';
import { Capacitor } from '@capacitor/core';
import { acikSayfa } from './oku/alt-sayfa';
import { okuBaslat } from './oku/oku';
import { rotaCoz, type Rota, type Sekme } from './rota';

const app = document.getElementById('app')!;
const tabbar = document.querySelector<HTMLElement>('.tabbar')!;
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.tab'));
const views = Array.from(document.querySelectorAll<HTMLElement>('.view'));
const okuLink = links.find((l) => l.dataset.tab === 'oku')!;
const oku = okuBaslat(document.getElementById('view-oku')!);

let aktif: Sekme | null = null;
/** Oku sekmesine dönülünce kalınan ekran (kitaplık, bölümler ya da okuma) */
let sonOkuHash = '#/oku';

// Her geçmiş kaydı bir önceki adresi taşır; "geri" bağlantıları bir önceki kayıt üst ekransa history.back() kullanır,
// böylece telefonun geri tuşu ile uygulamadaki geri düğmesi aynı yolu izler.
interface Kayit {
  onceki: string | null;
}
let sonHash = location.hash;
const ilkDurum = history.state as Kayit | null;
if (!ilkDurum || !('onceki' in ilkDurum)) history.replaceState({ onceki: null } satisfies Kayit, '');

function show(r: Rota): void {
  const sekme = r.sekme;
  if (aktif === 'oku' && sekme !== 'oku') oku.ayril();
  aktif = sekme;
  tabbar.dataset.active = sekme;
  for (const link of links) {
    if (link.dataset.tab === sekme) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  for (const view of views) view.hidden = view.dataset.view !== sekme;
  if (sekme === 'oku') {
    app.dataset.ekran = oku.goster(r);
    sonOkuHash = location.hash || '#/oku';
    okuLink.href = '#/oku';
  } else {
    delete app.dataset.ekran;
    okuLink.href = sonOkuHash;
  }
}

window.addEventListener('hashchange', () => {
  const durum = history.state as Kayit | null;
  if (!durum || !('onceki' in durum)) history.replaceState({ onceki: sonHash } satisfies Kayit, '');
  sonHash = location.hash;
  show(rotaCoz(location.hash));
});

document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!a) return;
  const hedef = a.getAttribute('href')!;
  if (a.hasAttribute('data-geri') && (history.state as Kayit | null)?.onceki === hedef) {
    e.preventDefault();
    history.back();
  } else if (a.hasAttribute('data-yerine')) {
    e.preventDefault();
    const onceki = (history.state as Kayit | null)?.onceki ?? null;
    history.replaceState({ onceki } satisfies Kayit, '', hedef);
    sonHash = location.hash;
    show(rotaCoz(location.hash));
  } else if (a.classList.contains('tab') && hedef === location.hash) {
    e.preventDefault();
  }
});

show(rotaCoz(location.hash));

async function setupNative(): Promise<void> {
  const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/app'),
  ]);
  // Android geri tuşu: önce açık sayfayı kapatır, sonra uygulama içinde geri gider; en başta uygulamadan çıkar.
  await App.addListener('backButton', ({ canGoBack }) => {
    const sayfa = acikSayfa();
    if (sayfa) sayfa.kapat();
    else if (canGoBack && (history.state as Kayit | null)?.onceki != null) history.back();
    else void App.exitApp();
  }).catch(() => undefined);
  await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);
  if (app.dataset.ekran !== 'okuma') await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
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
