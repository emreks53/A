// Kitap açılışı: raftaki cilt çekilir, dönerek ön kapağını gösterir ve okuyucudaki sayfanın yerine gelir; kapak
// açılır, altından sayfa görünür, sonra okuyucu. Toplam ≈ 1 s. Kitabın kendisi (sırt, kapak, sayfa) üç boyutlu
// bir kutudur: sırt sol kenara diktir; kutu 90° dönükken sırt, düzken kapak bize bakar.
// Geçiş başlarken zemin okuyucunun rengine bürünür; zemin örtünce adrese gidilir (okuyucu altta açılır).
import { kapakSvg } from './kapak';

export interface AcilisSecenek {
  /** Dokunulan cilt (raftaki sırt) */
  kaynak: HTMLElement;
  /** Kitabın adı (kapakta) ve cilt renkleri [orta, koyu, açık] */
  ad: string;
  renk: readonly [string, string, string];
  /** Okuyucuda sayfanın duracağı yer (ekran px) */
  hedef: { x: number; y: number; w: number; h: number };
  /** Okuyucunun zemini ve kâğıdı */
  zemin: string;
  kagit: string;
  /** Zemin örtünce: okuyucuyu aç */
  git(): void;
}

let sayac = 0;
let surenAcilis: HTMLElement | null = null;

export function kitapAcilisi(o: AcilisSecenek): void {
  surenAcilis?.remove();
  const r = o.kaynak.getBoundingClientRect();
  const { x, y, w: W, h: H } = o.hedef;
  let gidildi = false;
  const git = () => {
    if (gidildi) return;
    gidildi = true;
    o.git();
  };
  if (!r.width || !r.height || !W || !H || typeof Element.prototype.animate !== 'function') return git();

  const s = r.height / H;
  const D = r.width / s;
  const el = (sinif: string) => {
    const e = document.createElement('div');
    e.className = sinif;
    return e;
  };
  const katman = el('acilis');
  katman.setAttribute('aria-hidden', 'true');
  const zemin = el('acilis__zemin');
  zemin.style.background = o.zemin;
  const sahne = el('acilis__sahne');
  sahne.style.perspectiveOrigin = `${x + W / 2}px ${y + H / 2}px`;
  const kitap = el('acilis__kitap');
  Object.assign(kitap.style, { left: `${x}px`, top: `${y}px`, width: `${W}px`, height: `${H}px` });

  const sayfa = el('acilis__sayfa');
  sayfa.style.background = o.kagit;
  const kapak = el('acilis__kapak');
  const on = el('acilis__kapak-on');
  on.innerHTML = kapakSvg(`acilis${++sayac}`, o.renk, o.ad);
  const arka = el('acilis__kapak-arka');
  arka.style.setProperty('--cilt', o.renk[1]);
  kapak.append(on, arka);
  // sırt: raftaki cildin kopyası, tam aynı görünsün diye kendi boyunda çizilip ölçeklenir
  const sirt = el('acilis__sirt');
  Object.assign(sirt.style, { width: `${D}px`, height: `${H}px` });
  const kopya = o.kaynak.cloneNode(true) as HTMLElement;
  kopya.removeAttribute('href');
  kopya.removeAttribute('aria-label');
  kopya.querySelector('.cilt__kurdele')?.remove();
  kopya.classList.remove('cilt--kaldigin');
  Object.assign(kopya.style, { position: 'absolute', left: '0', top: '0', width: `${r.width}px`, height: `${r.height}px`, margin: '0', transform: `scale(${1 / s})`, transformOrigin: '0 0' });
  sirt.append(kopya);
  kitap.append(sayfa, kapak, sirt);
  sahne.append(kitap);
  katman.append(zemin, sahne);
  document.body.append(katman);
  surenAcilis = katman;

  // raftan çekiliş: sırt yerinde, kutu 90° dönük → biraz kalkıp büyür → ortada, kapak bize bakar
  const tx0 = r.right - x;
  const ty0 = r.top + r.height / 2 - (y + H / 2);
  const ucus = kitap.animate(
    [
      { transform: `translate(${tx0}px, ${ty0}px) scale(${s}) rotateY(90deg)` },
      { transform: `translate(${tx0 * 0.8}px, ${ty0 - 56}px) scale(${s * 1.35}) rotateY(76deg)`, offset: 0.3 },
      { transform: 'translate(0px, 0px) scale(1) rotateY(0deg)' },
    ],
    { duration: 560, easing: 'cubic-bezier(.3,.6,.3,1)', fill: 'both' },
  );
  const ortu = zemin.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out', fill: 'both' });
  const acil = kapak.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-168deg)' }], {
    delay: 540,
    duration: 420,
    easing: 'cubic-bezier(.45,0,.2,1)',
    fill: 'both',
  });
  const sirtSoner = sirt.animate([{ opacity: 1 }, { opacity: 0 }], { delay: 560, duration: 220, fill: 'both' });

  const bitir = () => {
    katman.remove();
    if (surenAcilis === katman) surenAcilis = null;
  };
  ortu.finished.then(git, git);
  Promise.all([ucus.finished, acil.finished, sirtSoner.finished])
    .then(() => {
      git();
      return katman.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'both' }).finished;
    })
    .then(bitir, () => {
      git();
      bitir();
    });
}
