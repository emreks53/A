// Ekranın altından açılan sayfa (Menba).
// modal: arkası yarı saydam perdeyle kapanır, odak sayfada kalır.
// modal değil: arkadaki ekran dokunulabilir kalır.

export interface AltSayfaSecenek {
  baslik: string;
  /** Başlık ekranda gizli kalsın mı (yalnız ekran okuyucular için) */
  baslikGizli?: boolean;
  icerik: Node;
  modal?: boolean;
  sinif?: string;
  kapaninca?: () => void;
}

export interface AltSayfa {
  kapat(): void;
  guncelle(icerik: Node, baslik?: string): void;
  readonly eleman: HTMLElement;
}

let acik: (AltSayfa & { sinif?: string }) | null = null;
let sayac = 0;

export function acikSayfa(): AltSayfa | null {
  return acik;
}

export function altSayfaAc(s: AltSayfaSecenek): AltSayfa {
  acik?.kapat();
  const kok = document.getElementById('app') ?? document.body;
  const onceki = document.activeElement as HTMLElement | null;
  const azalt = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const perde = s.modal ? document.createElement('div') : null;
  if (perde) perde.className = 'alt-perde';

  const sayfa = document.createElement('div');
  sayfa.className = 'alt-sayfa' + (s.sinif ? ` ${s.sinif}` : '');
  sayfa.setAttribute('role', 'dialog');
  if (s.modal) sayfa.setAttribute('aria-modal', 'true');
  const baslikId = `alt-sayfa-baslik-${++sayac}`;
  sayfa.setAttribute('aria-labelledby', baslikId);
  sayfa.tabIndex = -1;

  const tutamak = document.createElement('div');
  tutamak.className = 'alt-sayfa__tutamak';
  tutamak.setAttribute('aria-hidden', 'true');

  const ust = document.createElement('div');
  ust.className = 'alt-sayfa__ust';
  const baslik = document.createElement('h2');
  baslik.className = 'alt-sayfa__baslik' + (s.baslikGizli ? ' visually-hidden' : '');
  baslik.id = baslikId;
  baslik.textContent = s.baslik;
  const kapatDugme = document.createElement('button');
  kapatDugme.type = 'button';
  kapatDugme.className = 'alt-sayfa__kapat';
  kapatDugme.setAttribute('aria-label', 'Kapat');
  kapatDugme.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  ust.append(baslik, kapatDugme);

  const govde = document.createElement('div');
  govde.className = 'alt-sayfa__govde';
  govde.append(s.icerik);
  sayfa.append(tutamak, ust, govde);

  if (perde) kok.append(perde);
  kok.append(sayfa);
  requestAnimationFrame(() => {
    perde?.classList.add('acik');
    sayfa.classList.add('acik');
  });
  sayfa.focus({ preventScroll: true });

  let kapandi = false;
  const kapat = () => {
    if (kapandi) return;
    kapandi = true;
    document.removeEventListener('keydown', tus, true);
    sayfa.classList.remove('acik');
    sayfa.setAttribute('aria-hidden', 'true');
    sayfa.inert = true;
    perde?.classList.remove('acik');
    const kaldir = () => {
      sayfa.remove();
      perde?.remove();
    };
    if (azalt) kaldir();
    else {
      sayfa.addEventListener('transitionend', kaldir, { once: true });
      setTimeout(kaldir, 400);
    }
    if (acik === nesne) acik = null;
    if (s.modal && onceki?.isConnected) onceki.focus({ preventScroll: true });
    s.kapaninca?.();
  };

  const tus = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      kapat();
    } else if (e.key === 'Tab' && s.modal) {
      // Kapalı <details> içindekiler (kendi <summary>'si dışında) ve görünmeyenler odak alamaz.
      const odaklanabilir = Array.from(
        sayfa.querySelectorAll<HTMLElement>('button, [href], input, summary, [tabindex]:not([tabindex="-1"])'),
      ).filter((x) => {
        const kapali = x.closest('details:not([open])');
        const gizli = kapali && !(x.tagName === 'SUMMARY' && x.parentElement === kapali);
        return !gizli && !x.hasAttribute('disabled') && x.getClientRects().length > 0;
      });
      if (!odaklanabilir.length) return;
      const ilk = odaklanabilir[0];
      const son = odaklanabilir[odaklanabilir.length - 1];
      if (e.shiftKey && (document.activeElement === ilk || document.activeElement === sayfa)) {
        e.preventDefault();
        son.focus();
      } else if (!e.shiftKey && document.activeElement === son) {
        e.preventDefault();
        ilk.focus();
      }
    }
  };
  document.addEventListener('keydown', tus, true);
  kapatDugme.addEventListener('click', kapat);
  perde?.addEventListener('click', kapat);

  // Tutamaktan ya da başlıktan aşağı sürükleyince kapanır.
  let baslangic: number | null = null;
  let fark = 0;
  const surukBasla = (e: PointerEvent) => {
    if ((e.target as Element).closest('button')) return;
    baslangic = e.clientY;
    fark = 0;
    sayfa.style.transition = 'none';
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const suruk = (e: PointerEvent) => {
    if (baslangic === null) return;
    fark = Math.max(0, e.clientY - baslangic);
    sayfa.style.transform = `translateY(${fark}px)`;
  };
  const surukBit = () => {
    if (baslangic === null) return;
    baslangic = null;
    sayfa.style.transition = '';
    sayfa.style.transform = '';
    if (fark > Math.min(120, sayfa.offsetHeight / 3)) kapat();
  };
  for (const tut of [tutamak, ust]) {
    tut.addEventListener('pointerdown', surukBasla);
    tut.addEventListener('pointermove', suruk);
    tut.addEventListener('pointerup', surukBit);
    tut.addEventListener('pointercancel', surukBit);
  }

  const nesne: AltSayfa & { sinif?: string } = {
    eleman: sayfa,
    sinif: s.sinif,
    kapat,
    guncelle(icerik: Node, yeniBaslik?: string) {
      govde.replaceChildren(icerik);
      govde.scrollTop = 0;
      if (yeniBaslik !== undefined) baslik.textContent = yeniBaslik;
    },
  };
  acik = nesne;
  return nesne;
}
