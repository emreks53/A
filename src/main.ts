import './styles.css';
import { Capacitor } from '@capacitor/core';

type Tab = 'oku' | 'kenz' | 'gunes';

const TABS: readonly Tab[] = ['oku', 'kenz', 'gunes'];
const DEFAULT_TAB: Tab = 'kenz';

const tabbar = document.querySelector<HTMLElement>('.tabbar')!;
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.tab'));
const views = Array.from(document.querySelectorAll<HTMLElement>('.view'));

function tabFromHash(hash: string): Tab {
  const name = hash.replace(/^#\/?/, '');
  return (TABS as readonly string[]).includes(name) ? (name as Tab) : DEFAULT_TAB;
}

function show(tab: Tab): void {
  tabbar.dataset.active = tab;
  for (const link of links) {
    if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  for (const view of views) view.hidden = view.dataset.view !== tab;
}

window.addEventListener('hashchange', () => show(tabFromHash(location.hash)));
for (const link of links) link.addEventListener('click', () => show(tabFromHash(link.hash)));
show(tabFromHash(location.hash));

async function setupNative(): Promise<void> {
  const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
  ]);
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
