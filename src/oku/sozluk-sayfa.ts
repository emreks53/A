// Dokunulan kelimenin lügattaki manasını gösteren alt sayfa içeriği.
import { SVG } from './ikonlar';
import { kelimeAra, maddeAc, type SozlukSonuc } from './sozluk';

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif?: string, metin?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

function maddeCiz(kap: HTMLElement, sonuc: SozlukSonuc, dokunulan: string | null, yigin: SozlukSonuc[], ac: (kelime: string) => void, geri: () => void): void {
  const parcalar: Node[] = [];
  if (yigin.length) {
    const g = el('button', 'madde__geri');
    g.type = 'button';
    g.innerHTML = SVG.geri;
    g.append(yigin[yigin.length - 1].madde.kelime);
    g.addEventListener('click', geri);
    parcalar.push(g);
  }
  const { madde } = sonuc;
  const baslik = el('p', 'madde__kelime', madde.kelime);
  baslik.lang = 'tr';
  parcalar.push(baslik);
  const yazilan = dokunulan?.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
  if (yazilan && yazilan.toLocaleLowerCase('tr') !== madde.kelime.toLocaleLowerCase('tr')) {
    parcalar.push(el('p', 'madde__dokunulan', `Metinde: ${yazilan}`));
  }
  for (const m of madde.manalar) {
    const p = el('p', 'madde__mana');
    if (m.asil) p.append(el('strong', undefined, m.asil));
    if (m.asil && m.kalan) p.append(' ');
    if (m.kalan) p.append(m.kalan);
    parcalar.push(p);
  }
  const baglar = (etiket: string, kelimeler: string[]) => {
    if (!kelimeler.length) return;
    const satir = el('div', 'madde__baglar');
    satir.append(el('span', 'madde__baglar-etiket', etiket));
    for (const k of kelimeler) {
      const b = el('button', 'madde__bag', k);
      b.type = 'button';
      b.addEventListener('click', () => ac(k));
      satir.append(b);
    }
    parcalar.push(satir);
  };
  baglar('Bakınız', madde.bakiniz);
  baglar('Diğer', sonuc.digerleri);
  kap.replaceChildren(...parcalar);
  kap.closest('.alt-sayfa__govde')?.scrollTo(0, 0);
}

export function kelimeSayfasi(kelime: string, once: string[], sonra: string[]): HTMLElement {
  const kap = el('div', 'madde');
  kap.setAttribute('aria-live', 'polite');
  const durum = el('p', 'madde__durum', 'Lügat açılıyor…');
  kap.append(durum);
  const yigin: SozlukSonuc[] = [];
  let simdiki: SozlukSonuc | null = null;
  let dokunulan: string | null = kelime;

  const goster = (s: SozlukSonuc) => {
    simdiki = s;
    maddeCiz(kap, s, dokunulan, yigin, ac, geri);
  };
  const ac = (hedef: string) => {
    void maddeAc(hedef).then((s) => {
      if (!s || !simdiki) return;
      yigin.push(simdiki);
      dokunulan = null;
      goster(s);
    });
  };
  const geri = () => {
    const onceki = yigin.pop();
    if (!onceki) return;
    dokunulan = yigin.length ? null : kelime;
    goster(onceki);
  };

  kelimeAra(kelime, once, sonra)
    .then((s) => {
      if (s) goster(s);
      else {
        const temiz = kelime.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
        kap.replaceChildren(el('p', 'madde__kelime', temiz), el('p', 'madde__durum', 'Bu kelime lügatta bulunamadı.'));
      }
    })
    .catch(() => {
      durum.textContent = 'Lügat açılamadı.';
    });
  return kap;
}
