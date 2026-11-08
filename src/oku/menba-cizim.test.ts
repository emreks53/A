import { describe, expect, it } from 'vitest';
import { kuranSvg } from './kuran-cizim';
import { menbaSvgIcerigi } from './menba-cizim';
import { CILT, KULLIYAT, reelKaynagi, SIRT, tipografik } from './ortak';

/** Sırt yazıları: [yazı boyu, metin]; her <g font-size> içindeki <text>'ler sırasıyla */
const sirtlar = (svg: string) =>
  [...svg.matchAll(/<g transform="[^"]*rotate\(-90\)" font-family="([^"]+)"[^>]*font-size="([\d.]+)"[^>]*>(.*?)<\/g>/g)].map((m) => ({
    yazi: m[1],
    boy: Number(m[2]),
    satirlar: [...m[3].matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((t) => t[1]),
  }));

describe('Menba çizimi', () => {
  it('videonun eseri raftan öne çıkar, Güneş’teki satırları sırtında yazılıdır; öteki 13 eser kısa adlarıyla rafta durur', () => {
    for (const eser of KULLIYAT) {
      const s = sirtlar(menbaSvgIcerigi(eser, 't'));
      expect(s, eser).toHaveLength(14);
      expect(s.every((x) => x.yazi.startsWith('EB Garamond'))).toBe(true);
      // öne çekilen en son çizilir (öteki ciltlerin önündedir)
      const one = s[13];
      expect(one.satirlar, eser).toEqual(SIRT[eser].satirlar);
      expect(one.boy, eser).toBeGreaterThanOrEqual(5.4);
      expect(one.boy, eser).toBeLessThanOrEqual(7.6);
      const raftakiler = s.slice(0, 13).map((x) => x.satirlar.join(' '));
      expect(raftakiler).toEqual(KULLIYAT.filter((k) => k !== eser).map((k) => SIRT[k].kisa));
      // toplam <text>: 13 kısa ad + öne çekilenin satırları (1 ya da 2)
      expect([...menbaSvgIcerigi(eser, 't').matchAll(/<text/g)]).toHaveLength(13 + SIRT[eser].satirlar.length);
    }
  });

  it('Külliyat dışı bir eserde hiçbiri öne çıkmaz, 14 sırt da kısa adlarıyla rafta', () => {
    const svg = menbaSvgIcerigi('Başka', 't');
    const s = sirtlar(svg);
    expect(s.map((x) => x.satirlar.join(' '))).toEqual(KULLIYAT.map((k) => SIRT[k].kisa));
    expect([...svg.matchAll(/<text/g)]).toHaveLength(14);
    expect(svg).not.toMatch(/-cekilen\)" transform/);
  });

  it('bütün ciltler tek renk (#D7787B); çizimde nokta (daire), Tinos, NaN ya da undefined yoktur', () => {
    expect(CILT).toBe('#D7787B');
    for (const eser of [...KULLIYAT, 'Başka']) {
      const svg = menbaSvgIcerigi(eser, 't');
      expect(svg).not.toMatch(/<circle|Tinos|NaN|undefined/);
      expect([...svg.matchAll(/ fill="#D7787B"/g)]).toHaveLength(14);
    }
    expect(kuranSvg('k')).not.toMatch(/<circle/);
  });

  it('cilt genişliği kitabın kalınlığıyla orantılı: Sözler en kalın, Muhâkemat en ince', () => {
    const svg = menbaSvgIcerigi('Başka', 't');
    const g = [...svg.matchAll(/<g><rect x="[\d.]+" y="199" width="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(g).toHaveLength(14);
    expect(Math.max(...g)).toBe(g[0]);
    expect(Math.min(...g)).toBe(g[KULLIYAT.indexOf('Muhâkemat')]);
    expect(g[0] / g[KULLIYAT.indexOf('Muhâkemat')]).toBeCloseTo(49.1 / 13.15, 1);
  });

  it('öne çekilenin adı tipografik kesme işaretiyle; yazılar EB Garamond, koyu mürekkeple (bezde okunur)', () => {
    const svg = menbaSvgIcerigi("Lem'alar", 't');
    const one = sirtlar(svg)[13];
    expect(one.satirlar).toEqual([tipografik("Lem'alar")]);
    const gruplar = [...svg.matchAll(/<g [^>]*font-family="([^"]+)"[^>]*fill="([^"]+)"/g)];
    expect(gruplar).toHaveLength(14);
    expect(new Set(gruplar.map((m) => `${m[1]} ${m[2]}`))).toEqual(new Set(['EB Garamond, serif #3C0E16']));
  });

  it('arkadaki ışık çizimin içinde kalır (kaydırma kutusu onu kesmez)', () => {
    const svg = menbaSvgIcerigi('Şuâlar', 't');
    const isik = svg.match(/<ellipse cx="([\d.]+)" cy="([\d.]+)" rx="([\d.]+)" ry="([\d.]+)" fill="url\(#t-isik\)"/);
    expect(isik).not.toBeNull();
    const [, , cy, , ry] = isik!.map(Number);
    expect(cy - ry).toBeGreaterThanOrEqual(0);
    expect(svg).not.toContain('t-k-spot');
  });

  it('kimlikler önekle ayrışır (aynı sayfada iki çizim çakışmaz)', () => {
    const a = menbaSvgIcerigi('Sözler', 'menba1');
    const kimlikler = [...a.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(kimlikler.length).toBeGreaterThan(10);
    expect(new Set(kimlikler).size).toBe(kimlikler.length);
    expect(kimlikler.every((k) => k.startsWith('menba1-'))).toBe(true);
    // her url(#…) başvurusu bu çizimin kendi kimliğine gider
    const basvurular = [...a.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
    expect(basvurular.length).toBeGreaterThan(10);
    expect(basvurular.every((b) => kimlikler.includes(b))).toBe(true);
  });
});

describe('ortak yardımcılar', () => {
  it('reels altındaki kaynak: bölüm, varsa " · kısım"', () => {
    expect(reelKaynagi({ bolum: "On Yedinci Lem'a" })).toBe('On Yedinci Lem’a');
    expect(reelKaynagi({ bolum: 'On Birinci Şuâ', kisim: 'Altıncı Mesele' })).toBe('On Birinci Şuâ · Altıncı Mesele');
  });
});
