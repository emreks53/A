import { describe, expect, it } from 'vitest';
import { kuranSvg } from './kuran-cizim';
import { menbaSvgIcerigi } from './menba-cizim';
import { CILT, KALINLIK, KULLIYAT, reelKaynagi, SIRT, TEN, tipografik, YIGIN_SUTUN } from './ortak';

/** Sırt yazıları (her satır bir <text class="sirt">) */
const sirtlar = (svg: string) => [...svg.matchAll(/<text[^>]*class="sirt"[^>]*>([^<]*)</g)].map((m) => m[1]);

/** Bant grupları: ad, seçili mi, yazı boyu, ilk rect'in yüksekliği ve satırları (çizim sırasıyla) */
const bantlar = (svg: string) =>
  [...svg.matchAll(/<g class="cilt" data-ad="([^"]+)"( data-secili="")?[^>]*>(.*?)<\/g><\/g>/g)].map((m) => ({
    ad: m[1],
    secili: !!m[2],
    h: Number(m[3].match(/<rect [^>]*height="([\d.]+)"/)![1]),
    boy: Number(m[3].match(/font-size="([\d.]+)"/)![1]),
    satirlar: sirtlar(m[3]),
  }));

/** Kimlikler ve başvurular: her url(#…) ve href="#…" bu çizimin kendi kimliğine gider */
function kimlikDenetle(svg: string, onek: string) {
  const kimlikler = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  expect(kimlikler.length).toBeGreaterThan(10);
  expect(new Set(kimlikler).size).toBe(kimlikler.length);
  expect(kimlikler.every((k) => k.startsWith(onek))).toBe(true);
  const basvurular = [...svg.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map((m) => m[1] ?? m[2]);
  expect(basvurular.length).toBeGreaterThan(10);
  for (const b of basvurular) expect(kimlikler, b).toContain(b);
}

describe('Menba çizimi', () => {
  it('videonun eseri yığından çekilir, tam adıyla yazılıdır; öteki 13 eser kısa adlarıyla Külliyat sırasında', () => {
    for (const eser of KULLIYAT) {
      const svg = menbaSvgIcerigi(eser, 't');
      const b = bantlar(svg);
      expect(b, eser).toHaveLength(14);
      // çekilen en son çizilir (öteki ciltlerin önündedir)
      const one = b[13];
      expect(one.secili, eser).toBe(true);
      expect(one.ad, eser).toBe(eser);
      expect(b.filter((x) => x.secili)).toHaveLength(1);
      const tam = SIRT[eser].satirlar;
      expect([tam, [tam.join(' ')]], eser).toContainEqual(one.satirlar);
      expect(one.boy, eser).toBeGreaterThanOrEqual(5.6);
      expect(one.boy, eser).toBeLessThanOrEqual(11.5);
      const digerleri = b.slice(0, 13);
      expect(digerleri.map((x) => x.satirlar.join(' '))).toEqual(KULLIYAT.filter((k) => k !== eser).map((k) => SIRT[k].kisa));
      expect(digerleri.every((x) => x.boy <= 7.6)).toBe(true);
      const toplam = sirtlar(svg).length;
      expect(toplam === 14 || toplam === 15, eser).toBe(true);
    }
  });

  it('İman ve Küfür çekilince iki satırlı ad tek satırda daha büyükse tek satır yazılır', () => {
    const one = bantlar(menbaSvgIcerigi('İman ve Küfür Muvâzeneleri', 't'))[13];
    expect(one.satirlar.length).toBeGreaterThanOrEqual(1);
    expect(one.satirlar.join(' ')).toBe('İman ve Küfür Muvâzeneleri');
  });

  it('Külliyat dışı bir eserde hiçbiri çekilmez: 14 kısa ad Külliyat sırasında, boş yuva yok', () => {
    const svg = menbaSvgIcerigi('Başka', 't');
    expect(svg).not.toContain('data-secili');
    expect(sirtlar(svg)).toEqual(KULLIYAT.map((k) => SIRT[k].kisa));
    expect(svg).not.toMatch(/fill="url\(#t-yuva\)"/);
  });

  it('iki düz yığın: ilk 7 eser solda, kalanı sağda; ikisi de aynı tabanda', () => {
    const svg = menbaSvgIcerigi('Başka', 't');
    const kutular = [...svg.matchAll(/<g class="cilt" data-ad="([^"]+)"><rect x="([\d.]+)" y="([\d.]+)" width="114" height="([\d.]+)"/g)].map((m) => ({
      ad: m[1],
      x: Number(m[2]),
      alt: Number(m[3]) + Number(m[4]),
    }));
    expect(kutular.map((k) => k.ad)).toEqual([...KULLIYAT]);
    const sol = kutular.slice(0, YIGIN_SUTUN);
    const sag = kutular.slice(YIGIN_SUTUN);
    expect(new Set(sol.map((k) => k.x)).size).toBe(1);
    expect(new Set(sag.map((k) => k.x)).size).toBe(1);
    expect(sol[0].x).toBeLessThan(sag[0].x);
    expect(sol[sol.length - 1].alt).toBeCloseTo(304, 1);
    expect(sag[sag.length - 1].alt).toBeCloseTo(304, 1);
    expect(sag[sag.length - 1].ad).toBe('Muhâkemat');
  });

  it('bütün ciltler tek renk (#D7787B), adlar ten rengi; çizimde nokta (daire), Tinos, NaN ya da undefined yoktur', () => {
    expect(CILT).toBe('#D7787B');
    for (const eser of [...KULLIYAT, 'Başka']) {
      const svg = menbaSvgIcerigi(eser, 't');
      expect(svg).not.toMatch(/<circle|Tinos|NaN|undefined/);
      expect([...svg.matchAll(/ fill="#D7787B"/g)]).toHaveLength(14);
      const gruplar = [...svg.matchAll(/<g font-family="([^"]+)" font-weight="600"[^>]*fill="([^"]+)"/g)];
      expect(gruplar).toHaveLength(14);
      expect(new Set(gruplar.map((m) => `${m[1]} ${m[2]}`))).toEqual(new Set([`EB Garamond, serif ${TEN}`]));
    }
  });

  it('bant yüksekliği fotoğraftaki kalınlıkla orantılı (tek ölçek): Sözler / Muhâkemat ≈ 3,044', () => {
    const b = bantlar(menbaSvgIcerigi('Başka', 't'));
    const h = Object.fromEntries(b.map((x) => [x.ad, x.h]));
    expect(h['Sözler'] / h['Muhâkemat']).toBeCloseTo(KALINLIK['Sözler'] / KALINLIK['Muhâkemat'], 1);
    expect(h['Sözler'] / h['Muhâkemat']).toBeCloseTo(3.044, 1);
    const olcek = b.map((x) => x.h / KALINLIK[x.ad as keyof typeof KALINLIK]);
    // yükseklikler iki ondalığa yuvarlanır: göreli fark binde birin altında
    expect(Math.max(...olcek) / Math.min(...olcek)).toBeLessThan(1.001);
  });

  it('çekilenin adı tipografik kesme işaretiyle', () => {
    const one = bantlar(menbaSvgIcerigi("Lem'alar", 't'))[13];
    expect(one.satirlar).toEqual([tipografik("Lem'alar")]);
  });

  it('nur çizimin içinde kalır (kaydırma kutusu onu kesmez)', () => {
    const svg = menbaSvgIcerigi('Şuâlar', 't');
    const m = svg.match(/<g transform="translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)">/);
    expect(m).not.toBeNull();
    const [ty, s] = [Number(m![2]), Number(m![3])];
    expect(s).toBeCloseTo(0.6, 5);
    // nurun merkezi y = ty + 95·s; ışınlar 128·s birimde söner
    expect(ty + 95 * s - 128 * s).toBeGreaterThanOrEqual(0);
    expect(svg).toContain('r="128"');
  });

  it('kimlikler önekle ayrışır (aynı sayfada iki çizim çakışmaz), her başvuru çözülür', () => {
    kimlikDenetle(menbaSvgIcerigi('Sözler', 'menba1'), 'menba1-');
    kimlikDenetle(menbaSvgIcerigi('İman ve Küfür Muvâzeneleri', 'menba2'), 'menba2-');
  });
});

describe('Kur’an-ı Kerim (nurlu)', () => {
  it('rahle ve nokta yok; kapakta tek küçük altın “Kur’an”; 3 bulanıklık + 1 gren süzgeci; başvurular çözülür', () => {
    const svg = kuranSvg('k');
    expect(svg).not.toMatch(/<circle|NaN|undefined|rahle|-ayak|-ceviz|spot/);
    const yazilar = [...svg.matchAll(/<text[^>]*class="kuran-yazi"[^>]*>([^<]*)</g)].map((m) => m[1]);
    expect(yazilar).toEqual(['Kur’an']);
    expect([...svg.matchAll(/<filter/g)]).toHaveLength(4);
    expect([...svg.matchAll(/<feGaussianBlur/g)]).toHaveLength(3);
    expect([...svg.matchAll(/<feTurbulence/g)]).toHaveLength(1);
    expect(svg).not.toContain('<mask');
    kimlikDenetle(svg, 'k-');
  });

  it('yazi: false iken “Kur’an” yazılmaz; nur gücü ve yarıçap seçeneklere uyar', () => {
    expect(kuranSvg('k', { yazi: false })).not.toContain('kuran-yazi');
    expect(kuranSvg('k', { r: 128 })).toContain('id="k-kama" cx="120" cy="95" r="128"');
    expect(kuranSvg('k')).toContain('id="k-kama" cx="120" cy="95" r="168"');
    expect(kuranSvg('k', { nur: 0.5 })).toContain('fill-opacity="0.24"');
  });
});

describe('ortak yardımcılar', () => {
  it('reels altındaki kaynak: bölüm, varsa " · kısım"', () => {
    expect(reelKaynagi({ bolum: "On Yedinci Lem'a" })).toBe('On Yedinci Lem’a');
    expect(reelKaynagi({ bolum: 'On Birinci Şuâ', kisim: 'Altıncı Mesele' })).toBe('On Birinci Şuâ · Altıncı Mesele');
  });
});
