// Kenz ekranı: Risale-i Nur'dan videolar, geçtiği kitap ve bölüme göre.
import { kutuphaneCiz } from './kutuphane';

export function kenzBaslat(gorunum: HTMLElement): void {
  const kaydirma = gorunum.querySelector<HTMLElement>('.kenz')!;
  const bas = document.createElement('header');
  bas.className = 'kenz__bas';
  const baslik = document.createElement('h1');
  baslik.className = 'kenz__baslik';
  baslik.id = 'kenz-baslik';
  baslik.tabIndex = -1;
  baslik.textContent = 'Kenz';
  const alt = document.createElement('p');
  alt.className = 'kenz__alt';
  alt.textContent = 'Risale-i Nur’dan, kitap kitap';
  bas.append(baslik, alt);
  kaydirma.append(bas, kutuphaneCiz());
}
