// Kenz ekranı: Risale-i Nur'dan videolar, geçtiği kitap ve bölüme göre ("gece kütüphanesi").
import { kutuphaneCiz } from './kutuphane';

/** Nur-u Hakikat düğümü, yalnız çizgi (başlıkta ve sonda) */
const DUGUM_SVG =
  '<svg class="dugum" viewBox="0 0 32 32" aria-hidden="true"><path d="M14.556 13.5A5.3 5.3 0 1 1 17.444 13.5A5.3 5.3 0 1 1 18.887 16A5.3 5.3 0 1 1 17.444 18.5A5.3 5.3 0 1 1 14.556 18.5A5.3 5.3 0 1 1 13.113 16A5.3 5.3 0 1 1 14.556 13.5Z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="16" r="1.69" fill="currentColor"/></svg>';

export function kenzBaslat(gorunum: HTMLElement): void {
  const kaydirma = gorunum.querySelector<HTMLElement>('.kenz')!;
  const bas = document.createElement('header');
  bas.className = 'kenz__bas';
  const baslik = document.createElement('h1');
  baslik.className = 'kenz__baslik';
  baslik.id = 'kenz-baslik';
  baslik.tabIndex = -1;
  baslik.innerHTML = DUGUM_SVG;
  const ad = document.createElement('span');
  ad.textContent = 'Kenz';
  baslik.append(ad);
  const alt = document.createElement('p');
  alt.className = 'kenz__alt';
  alt.textContent = 'Risale-i Nur’dan okumalar, eser eser.';
  bas.append(baslik, alt);
  const son = document.createElement('div');
  son.className = 'kenz__son';
  son.setAttribute('aria-hidden', 'true');
  son.innerHTML = DUGUM_SVG;
  // Altta menünün arkası ve yanları, üstte durum çubuğunun altı düz gece rengidir; orada görünmeyen kartlar
  // dokunuş ve fare almasın diye o bantlara saydam kalkanlar konur. Kaydırma alanının içinde yapışkan
  // oldukları için kaydırma oradan da başlar; yer kaplamazlar.
  const kalkan = (yer: string) => {
    const k = document.createElement('div');
    k.className = `kenz__kalkan kenz__kalkan--${yer}`;
    k.setAttribute('aria-hidden', 'true');
    return k;
  };
  // (kalkanlar kaydırma alanının iç boşluğuna göre değil kenarına göre dursun diye iç boşluk ayrı kaptadır)
  const ic = document.createElement('div');
  ic.className = 'kenz__ic';
  ic.append(bas, kutuphaneCiz(), son);
  kaydirma.append(kalkan('ust'), ic, kalkan('alt'));
}
