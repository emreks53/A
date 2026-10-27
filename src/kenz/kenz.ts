// Kenz ekranı: açılışta alıntı; aşağı kaydırınca gök koyulaşır, sahne ufka yaklaşır ve konular gelir.
// Kaydırmaya bağlı her şey yalnız transform / opacity ile, kare başına bir kez güncellenir.
import { konuGruplari, kutuphaneCiz } from './kutuphane';

export interface Kenz {
  /** Kenz sekmesine yeniden dokunulunca en başa döner */
  basaDon(): void;
}

const sinirla = (x: number) => Math.min(1, Math.max(0, x));

export function kenzBaslat(gorunum: HTMLElement): Kenz {
  const kaydirma = gorunum.querySelector<HTMLElement>('.kenz')!;
  const kahraman = gorunum.querySelector<HTMLElement>('.kahraman')!;
  const yazilar = Array.from(kahraman.querySelectorAll<HTMLElement>('.marka, .quote'));
  const cagri = kahraman.querySelector<HTMLButtonElement>('.cagri')!;
  const ust = gorunum.querySelector<HTMLElement>('.kenz__ust')!;
  const markaDar = ust.querySelector<HTMLElement>('.marka-dar')!;
  const sahne = document.querySelector<HTMLElement>('.bg__img');
  const perde = document.querySelector<HTMLElement>('.bg-perde');
  const azalt = window.matchMedia('(prefers-reduced-motion: reduce)');

  const kutuphane = kutuphaneCiz();
  kaydirma.append(kutuphane);
  cagri.querySelector('.cagri__sayi')!.textContent = `· ${konuGruplari().length}`;

  let cerceve = 0;
  let anlikZamanlayici = 0;

  function guncelle(): void {
    cerceve = 0;
    const h = kaydirma.clientHeight || 1;
    const y = Math.max(0, kaydirma.scrollTop);
    // p: sahnenin derinleşmesi (ekranın %60'ında tamam); kahraman yazıları ilk %40'ta söner.
    const p = sinirla(y / (0.6 * h));
    const yazi = 1 - sinirla(y / (0.4 * h));
    const cagriGor = 1 - sinirla(y / (0.18 * h));
    if (sahne) {
      sahne.style.transform =
        azalt.matches || p === 0 ? '' : `translate3d(0, ${(-2.5 * p).toFixed(3)}%, 0) scale(${(1 + 0.16 * p).toFixed(4)})`;
      sahne.classList.toggle('derin', !azalt.matches && p > 0.6);
    }
    if (perde) perde.style.opacity = p.toFixed(3);
    for (const e of yazilar) e.style.opacity = yazi.toFixed(3);
    cagri.style.opacity = cagriGor.toFixed(3);
    // Görünmez olan çağrı dokunuşu ve odağı almaz.
    cagri.inert = cagriGor < 0.05;
    ust.style.opacity = sinirla((y - 0.3 * h) / (0.2 * h)).toFixed(3);
    kaydirma.classList.toggle('kaydi-alt', y > 0.04 * h);
    kaydirma.classList.toggle('kaydi', y > 0.35 * h);
  }

  kaydirma.addEventListener(
    'scroll',
    () => {
      // Kaydırırken sahne geçişsiz izler; durunca sekme değişimindeki yumuşak geçiş geri gelir.
      sahne?.classList.add('anlik');
      perde?.classList.add('anlik');
      window.clearTimeout(anlikZamanlayici);
      anlikZamanlayici = window.setTimeout(() => {
        sahne?.classList.remove('anlik');
        perde?.classList.remove('anlik');
      }, 180);
      if (!cerceve) cerceve = requestAnimationFrame(guncelle);
    },
    { passive: true },
  );
  new ResizeObserver(() => {
    if (!cerceve) cerceve = requestAnimationFrame(guncelle);
  }).observe(kaydirma);
  azalt.addEventListener('change', guncelle);

  // "Konular": ilk konunun başlığı üstteki markanın hemen altına gelecek kadar kaydırır.
  cagri.addEventListener('click', () => {
    const ilk = kutuphane.querySelector<HTMLElement>('.konu');
    if (!ilk) return;
    const kutu = kaydirma.getBoundingClientRect();
    const pay = markaDar.getBoundingClientRect().bottom - kutu.top + 16;
    const hedef = kaydirma.scrollTop + ilk.getBoundingClientRect().top - kutu.top - pay;
    kaydirma.scrollTo({ top: Math.max(0, hedef), behavior: azalt.matches ? 'auto' : 'smooth' });
    kutuphane.querySelector<HTMLElement>('.kutuphane__baslik')?.focus({ preventScroll: true });
  });

  // Maske yalnız görünüşü değiştirir: menünün yanında/altında ya da üstteki markanın üstünde tamamen saydam
  // kalan bir karta dokunuş onu açmasın. (Kaydırma bu bantlardan da başlayabilsin diye dokunuş alanı kesilmez.)
  const menu = document.querySelector<HTMLElement>('.tabbar');
  kaydirma.addEventListener(
    'click',
    (e) => {
      if (e.detail === 0 || !kaydirma.classList.contains('kaydi-alt')) return; // klavyeyle etkinleştirme
      const altSinir = (menu?.getBoundingClientRect().top ?? innerHeight) + 6;
      const ustSinir = kaydirma.classList.contains('kaydi') ? markaDar.getBoundingClientRect().top + 15 : -Infinity;
      if (e.clientY > altSinir || e.clientY < ustSinir) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  guncelle();

  return {
    basaDon() {
      kaydirma.scrollTo({ top: 0, behavior: azalt.matches ? 'auto' : 'smooth' });
    },
  };
}
