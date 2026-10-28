import { describe, expect, it } from 'vitest';
import { menbaSvgIcerigi } from './menba-cizim';
import { ciltRengi, KULLIYAT, reelKaynagi, tipografik } from './ortak';

const yazilar = (svg: string) => [...svg.matchAll(/<text[^>]*font-family="([^"]+)"[^>]*>([^<]*)<\/text>/g)].map((m) => [m[1], m[2]]);

describe('Menba çizimi', () => {
  it('videonun eseri raftan öne çıkar, adı sırtında yazılıdır; öteki 13 eser rafta durur', () => {
    for (const eser of ['Lem\'alar', 'Şuâlar']) {
      const y = yazilar(menbaSvgIcerigi(eser, 't'));
      expect(y.filter(([f]) => f.startsWith('Tinos')).map(([, ad]) => ad)).toEqual([tipografik(eser)]);
      // "RİSALE-İ NUR KÜLLİYATI" + 13 sırt + öne çıkan
      expect(y).toHaveLength(15);
    }
  });

  it('her eser için çizilir; uzun adlar sırta sığacak kadar küçülür', () => {
    for (const eser of KULLIYAT) {
      const svg = menbaSvgIcerigi(eser, 't');
      const one = svg.match(/font-family="Tinos, serif"[^>]*font-size="([\d.]+)"/);
      expect(one, eser).not.toBeNull();
      expect(Number(one![1])).toBeGreaterThanOrEqual(8);
      expect(Number(one![1])).toBeLessThanOrEqual(12);
      expect(svg).not.toMatch(/NaN|undefined/);
    }
  });

  it('Külliyat dışı bir eserde hiçbiri öne çıkmaz, 14 sırt da rafta', () => {
    const y = yazilar(menbaSvgIcerigi('Başka', 't'));
    expect(y.filter(([f]) => f.startsWith('Tinos'))).toEqual([]);
    expect(y).toHaveLength(15);
  });

  it('kimlikler önekle ayrışır (aynı sayfada iki çizim çakışmaz)', () => {
    const a = menbaSvgIcerigi('Sözler', 'menba1');
    const kimlikler = [...a.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(kimlikler.length).toBeGreaterThan(10);
    expect(new Set(kimlikler).size).toBe(kimlikler.length);
    expect(kimlikler.every((k) => k.startsWith('menba1-'))).toBe(true);
    // her url(#…) başvurusu bu çizimin kendi kimliğine gider
    const basvurular = [...a.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
    expect(basvurular.every((b) => kimlikler.includes(b))).toBe(true);
  });
});

describe('ortak yardımcılar', () => {
  it('reels altındaki kaynak: bölüm, varsa " · kısım"', () => {
    expect(reelKaynagi({ bolum: "On Yedinci Lem'a" })).toBe('On Yedinci Lem’a');
    expect(reelKaynagi({ bolum: 'On Birinci Şuâ', kisim: 'Altıncı Mesele' })).toBe('On Birinci Şuâ · Altıncı Mesele');
  });

  it('cilt rengi Külliyat sırasıyla döner; Kenz ile Menba aynı rengi kullanır', () => {
    expect(ciltRengi("Lem'alar")).toBe('#1F4A3B');
    expect(ciltRengi('Şuâlar')).toBe('#5A3720');
    expect(ciltRengi('Asâ-yı Mûsâ')).toBe(ciltRengi('Sözler'));
    const svg = menbaSvgIcerigi("Lem'alar", 't');
    // Lem'alar (3. eser) cilt degradesi t-c2: ortası Kenz'deki sırt rengi
    expect(svg).toMatch(/id="t-c2"[^]*?stop-color="#1F4A3B"/);
  });
});
