// Oku'dan çıkış: ekranda geri düğmesi yok (yalnız Neşret ve Menba var). Parmakla sağa sürükleyince video ekranı
// parmağı izler, altından dönülecek ekran görünür; yeterince çekilince (ya da hızlı fırlatınca) Oku kapanır.
// Dikey kaydırma (video değiştirme) olduğu gibi tarayıcıya kalır (.akis { touch-action: pan-y }).
import { acikSayfa } from './alt-sayfa';

export interface KaydirCikSecenek {
  /** Sürüklerken altında görünecek ekran (dönülecek sekme) */
  alttaki(): HTMLElement | null;
  cik(): void;
  /** Sağa sürükleme başladı */
  basladi?(): void;
}

export interface KaydirCik {
  /** İpucu: ekranı bir an 12 px sağa itip altındaki sekmeyi gösterir, sonra yerine döner */
  durt(): void;
}

const ESIK = 12;

export function sagaKaydirCik(kok: HTMLElement, s: KaydirCikSecenek): KaydirCik {
  let bas: { x: number; y: number; t: number; id: number } | null = null;
  let yatay = false;
  let dx = 0;
  let alt: HTMLElement | null = null;
  let tiklamayiYut = false;
  let durtme = 0;
  /** Yarım kalan sürüklemeden sonra alttaki ekranı gizleme zamanlayıcısı */
  let geriAlma = 0;

  const azaltilmis = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const durtmeyiBirak = () => {
    window.clearTimeout(durtme);
    window.clearTimeout(geriAlma);
    kok.classList.remove('durtulen');
  };

  const temizle = () => {
    kok.classList.remove('suruklenen', 'cikiyor');
    kok.style.transform = '';
    alt?.removeAttribute('data-alttan');
    alt = null;
  };

  kok.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary || acikSayfa()) return;
    if ((e.target as Element).closest('button, .reel__ilerleme, .alt-sayfa')) return;
    bas = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId };
    yatay = false;
    dx = 0;
  });

  kok.addEventListener('pointermove', (e) => {
    if (!bas || e.pointerId !== bas.id) return;
    const mx = e.clientX - bas.x;
    const my = e.clientY - bas.y;
    if (!yatay) {
      // Önce dikey hareket başlarsa bu dokunuş video değiştirmektir; karışmayız.
      if (Math.abs(my) > ESIK && Math.abs(my) >= Math.abs(mx)) {
        bas = null;
        return;
      }
      if (mx < ESIK || mx < Math.abs(my) * 1.3) return;
      yatay = true;
      durtmeyiBirak();
      s.basladi?.();
      alt ??= s.alttaki();
      alt?.setAttribute('data-alttan', '');
      kok.classList.add('suruklenen');
      try {
        kok.setPointerCapture(e.pointerId);
      } catch {
        // dokunuş bitmiş olabilir
      }
    }
    dx = Math.max(0, mx);
    kok.style.transform = `translate3d(${dx}px, 0, 0)`;
  });

  const bitir = (e: PointerEvent) => {
    if (!bas || e.pointerId !== bas.id) return;
    const sure = Math.max(1, e.timeStamp - bas.t);
    bas = null;
    if (!yatay) return;
    yatay = false;
    tiklamayiYut = true;
    setTimeout(() => (tiklamayiYut = false), 350);
    const gec = e.type === 'pointerup' && (dx > kok.clientWidth * 0.33 || (dx > 40 && dx / sure > 0.55));
    kok.classList.remove('suruklenen');
    if (!gec) {
      kok.style.transform = '';
      const geriAl = () => {
        alt?.removeAttribute('data-alttan');
        alt = null;
      };
      if (azaltilmis()) geriAl();
      else geriAlma = window.setTimeout(geriAl, 300);
      return;
    }
    kok.classList.add('cikiyor');
    kok.style.transform = 'translate3d(100%, 0, 0)';
    setTimeout(
      () => {
        s.cik();
        // Görünüm gizlendikten sonra yerine döner (gizliyken görünmez).
        setTimeout(temizle, 50);
      },
      azaltilmis() ? 0 : 220,
    );
  };
  kok.addEventListener('pointerup', bitir);
  kok.addEventListener('pointercancel', bitir);

  function durt(): void {
    if (azaltilmis() || bas || kok.classList.contains('cikiyor')) return;
    window.clearTimeout(geriAlma);
    alt = s.alttaki();
    alt?.setAttribute('data-alttan', '');
    kok.classList.add('durtulen');
    kok.style.transform = 'translate3d(12px, 0, 0)';
    durtme = window.setTimeout(() => {
      kok.style.transform = '';
      durtme = window.setTimeout(() => {
        kok.classList.remove('durtulen');
        alt?.removeAttribute('data-alttan');
        alt = null;
      }, 520);
    }, 1000);
  }

  // Sürükleme biterken parmağın kalktığı yerdeki "tıklama" videoyu durdurmasın.
  kok.addEventListener(
    'click',
    (e) => {
      if (!tiklamayiYut) return;
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );

  return { durt };
}
