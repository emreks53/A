import { describe, expect, it } from 'vitest';
import type { Video } from '../oku/ortak';
import { kartEtiketi, kartYeri, kitapGruplari } from './kutuphane';

const v = (id: string, kitap: string, bolum: string, ek: Partial<Video> = {}): Video => ({
  id,
  baslik: `${bolum}'dan`,
  kitap,
  bolum,
  etiketler: ['a', 'b', 'c'],
  sure: 61,
  video: `videolar/${id}.mp4`,
  kapak: `videolar/${id}-kapak.jpg`,
  onizleme: `videolar/${id}-onizleme.jpg`,
  ...ek,
});

describe('Kenz kütüphanesi', () => {
  it('kitaplar Külliyat sırasıyla, bölümler ve videolar listedeki sırayla gruplanır', () => {
    const g = kitapGruplari([
      v('s1', 'Şuâlar', 'Yedinci Şuâ'),
      v('l1', "Lem'alar", "On Yedinci Lem'a"),
      v('s2', 'Şuâlar', 'On Birinci Şuâ', { kisim: 'Altıncı Mesele' }),
      v('s3', 'Şuâlar', 'Yedinci Şuâ'),
      v('z1', 'Sözler', 'On Dokuzuncu Söz'),
    ]);
    expect(g.map((k) => [k.kitap, k.bolumler.map((b) => [b.bolum, b.videolar.map((x) => x.id)])])).toEqual([
      ['Sözler', [['On Dokuzuncu Söz', ['z1']]]],
      ["Lem'alar", [["On Yedinci Lem'a", ['l1']]]],
      ['Şuâlar', [['Yedinci Şuâ', ['s1', 's3']], ['On Birinci Şuâ', ['s2']]]],
    ]);
  });

  it('yazımı ufak farklı aynı bölüm tek başlık altında toplanır', () => {
    const g = kitapGruplari([v('a', "Lem'alar", "On Yedinci Lem'a"), v('b', "Lem'alar", 'On Yedinci Lem’a')]);
    expect(g[0].bolumler).toHaveLength(1);
    expect(g[0].bolumler[0].videolar.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('kart: alt satır ve erişilebilir ad', () => {
    expect(kartYeri({ sayfa: 154 })).toBe('154. sayfa');
    expect(kartYeri({ kisim: 'Altıncı Mesele', sayfa: 203 })).toBe('Altıncı Mesele · 203. sayfa');
    expect(kartYeri({})).toBe('');
    expect(kartEtiketi(v('l1', "Lem'alar", "On Yedinci Lem'a", { sayfa: 154, etiketler: ['ihlas', 'muhabbet', 'kurtuluş'], sure: 119 }))).toBe(
      'On Yedinci Lem’a’dan, 1:59. Lem’alar, 154. sayfa. #ihlas #muhabbet #kurtuluş',
    );
  });
});
