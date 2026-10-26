import { describe, expect, it } from 'vitest';
import { arapcaMi, bolumCoz, duzYazi, satirIci } from './metin';

describe('satirIci', () => {
  it('kalın, italik ve iç içe işaretler', () => {
    expect(satirIci('a **kalın** ve *eğik* b')).toEqual([
      { tur: 'metin', metin: 'a ' },
      { tur: 'kalin', icerik: [{ tur: 'metin', metin: 'kalın' }] },
      { tur: 'metin', metin: ' ve ' },
      { tur: 'italik', icerik: [{ tur: 'metin', metin: 'eğik' }] },
      { tur: 'metin', metin: ' b' },
    ]);
    expect(satirIci('**kalın *ve eğik***')).toEqual([
      { tur: 'kalin', icerik: [{ tur: 'metin', metin: 'kalın ' }, { tur: 'italik', icerik: [{ tur: 'metin', metin: 've eğik' }] }] },
    ]);
  });

  it('kapanmayan ya da boşlukla açılan yıldız düz metin kalır', () => {
    expect(duzYazi(satirIci('2 * 3 = 6 ve *açık'))).toBe('2 * 3 = 6 ve *açık');
    expect(satirIci('a * b *')).toEqual([{ tur: 'metin', metin: 'a * b *' }]);
  });

  it('kaçış ve satır kırma', () => {
    expect(duzYazi(satirIci('\\*yıldız\\*'))).toBe('*yıldız*');
    expect(satirIci('bir\\\niki')).toEqual([{ tur: 'metin', metin: 'bir' }, { tur: 'kirma' }, { tur: 'metin', metin: 'iki' }]);
  });

  it('Türkçe paragraf içindeki Arapça kısım ayrı işaretlenir', () => {
    const s = satirIci('Besmele: بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ diye başlar.');
    expect(s).toEqual([
      { tur: 'metin', metin: 'Besmele: ' },
      { tur: 'arapca', metin: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ' },
      { tur: 'metin', metin: ' diye başlar.' },
    ]);
  });
});

describe('arapcaMi', () => {
  it('harflerin çoğunluğuna bakar', () => {
    expect(arapcaMi('بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ')).toBe(true);
    expect(arapcaMi('Besmele: بِسْمِ اللّٰهِ diye başlayan uzun bir Türkçe cümle')).toBe(false);
    expect(arapcaMi('kudret')).toBe(false);
  });
});

describe('bolumCoz', () => {
  const md = `# Birinci Bölüm

بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ

İlk paragraf
iki satırda.[^a] Bir daha[^b] ve yine[^a].

## Ara başlık

> Alıntı satırı
> devamı

---

Şiir satırı\\
ikinci satır

[^b]: İkinci dipnot.
[^a]: Birinci dipnot
  devam eden satır.
`;
  const b = bolumCoz(md);

  it('başlık ve blok türleri', () => {
    expect(b.baslik).toBe('Birinci Bölüm');
    expect(b.bloklar.map((x) => x.tur)).toEqual(['baslik', 'paragraf', 'paragraf', 'baslik', 'alinti', 'ayrac', 'paragraf']);
    expect(b.bloklar[1]).toMatchObject({ tur: 'paragraf', arapca: true });
    expect(b.bloklar[2]).toMatchObject({ tur: 'paragraf', arapca: false });
  });

  it('satır sonları boşluk olur, "\\" satırı kırar', () => {
    const p = b.bloklar[2];
    expect(p.tur === 'paragraf' && duzYazi(p.icerik)).toBe('İlk paragraf iki satırda. Bir daha ve yine.');
    const siir = b.bloklar[6];
    expect(siir.tur === 'paragraf' && duzYazi(siir.icerik)).toBe('Şiir satırı\nikinci satır');
    const alinti = b.bloklar[4];
    expect(alinti.tur === 'alinti' && duzYazi(alinti.icerik)).toBe('Alıntı satırı devamı');
  });

  it('dipnotlar metindeki sıraya göre numaralanır', () => {
    const p = b.bloklar[2];
    const isaretler = p.tur === 'paragraf' ? p.icerik.filter((s) => s.tur === 'dipnot') : [];
    expect(isaretler).toEqual([
      { tur: 'dipnot', id: 'a', no: 1 },
      { tur: 'dipnot', id: 'b', no: 2 },
      { tur: 'dipnot', id: 'a', no: 1 },
    ]);
    expect(b.dipnotlar.map((d) => [d.id, d.no, duzYazi(d.icerik)])).toEqual([
      ['a', 1, 'Birinci dipnot devam eden satır.'],
      ['b', 2, 'İkinci dipnot.'],
    ]);
  });

  it('tanımı olmayan dipnot boş metinle listelenir, çökmez', () => {
    const x = bolumCoz('# B\n\nMetin[^yok].');
    expect(x.dipnotlar).toEqual([{ id: 'yok', no: 1, icerik: [] }]);
  });

  it('Windows satır sonları ve BOM', () => {
    expect(bolumCoz('﻿# Başlık\r\n\r\nMetin\r\n').bloklar.map((x) => x.tur)).toEqual(['baslik', 'paragraf']);
  });
});
