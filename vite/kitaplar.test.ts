import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { basiliSayfa, bolumBul, kitapKimligi, pdfSayfasi, sayfaninVideosu } from '../src/gunes/ortak';
import { rafOku } from './kitaplar';

const kok = resolve(__dirname, '..');

function gecici(json: unknown, dosyalar: Record<string, string> = {}): { json: string; pub: string } {
  const d = mkdtempSync(join(tmpdir(), 'kitap-'));
  const pub = join(d, 'public');
  for (const [f, icerik] of Object.entries(dosyalar)) {
    mkdirSync(join(pub, f, '..'), { recursive: true });
    writeFileSync(join(pub, f), icerik);
  }
  writeFileSync(join(d, 'kitaplar.json'), typeof json === 'string' ? json : JSON.stringify(json));
  return { json: join(d, 'kitaplar.json'), pub };
}

const PDF = '%PDF-1.7\n%örnek\n';
const ornek = (ek: Record<string, unknown> = {}) => ({ kitap: "Lem'alar", pdf: 'kitaplar/lemalar.pdf', ...ek });

describe('rafOku', () => {
  it('gerçek liste okunur', () => {
    const raf = rafOku(join(kok, 'content/kitaplar/kitaplar.json'), join(kok, 'public'));
    expect(typeof raf.kaynak).toBe('string');
    expect(Array.isArray(raf.kitaplar)).toBe(true);
  });

  it('kitapları Külliyat sırasıyla verir, kimlik ve varsayılanları ekler', () => {
    const { json, pub } = gecici(
      {
        kaynak: ' Örnek kaynak ',
        kitaplar: [
          ornek({ sayfaFarki: 4, sayfaSayisi: 300, icindekiler: [{ baslik: ' Birinci Lem’a ', sayfa: 3 }, { baslik: 'Birinci Nükte', sayfa: 5, derinlik: 1 }] }),
          { kitap: 'Sözler', pdf: 'https://ornek.org/sozler.pdf' },
        ],
      },
      { 'kitaplar/lemalar.pdf': PDF },
    );
    const raf = rafOku(json, pub);
    expect(raf.kaynak).toBe('Örnek kaynak');
    expect(raf.kitaplar).toEqual([
      { kitap: 'Sözler', kimlik: 'sozler', pdf: 'https://ornek.org/sozler.pdf', sayfaFarki: 0, icindekiler: [] },
      {
        kitap: "Lem'alar",
        kimlik: 'lemalar',
        pdf: 'kitaplar/lemalar.pdf',
        sayfaSayisi: 300,
        sayfaFarki: 4,
        icindekiler: [
          { baslik: 'Birinci Lem’a', sayfa: 3, derinlik: 0 },
          { baslik: 'Birinci Nükte', sayfa: 5, derinlik: 1 },
        ],
      },
    ]);
  });

  it('hatalı listeyi anlaşılır bir hatayla durdurur', () => {
    const dene = (json: unknown, dosyalar: Record<string, string> = { 'kitaplar/lemalar.pdf': PDF }) => () => {
      const g = gecici(json, dosyalar);
      rafOku(g.json, g.pub);
    };
    expect(dene('{bozuk')).toThrow(/okunamadı/);
    expect(dene({})).toThrow(/"kitaplar"/);
    expect(dene({ kitaplar: [ornek({ kitap: 'Bilinmeyen' })] })).toThrow(/Külliyatı/);
    expect(dene({ kitaplar: [ornek(), ornek()] })).toThrow(/iki kez/);
    expect(dene({ kitaplar: [ornek({ pdf: '' })] })).toThrow(/\.pdf gerekli/);
    expect(dene({ kitaplar: [ornek({ pdf: 'kitaplar/Lem alar.pdf' })] })).toThrow(/yalnız küçük harf/);
    expect(dene({ kitaplar: [ornek({ pdf: '../dis.pdf' })] })).toThrow(/\.pdf/);
    expect(dene({ kitaplar: [ornek()] }, {})).toThrow(/bulunamadı/);
    expect(dene({ kitaplar: [ornek()] }, { 'kitaplar/lemalar.pdf': '<!DOCTYPE html>' })).toThrow(/bir PDF değil/);
    expect(dene({ kitaplar: [ornek({ sayfaFarki: -1 })] })).toThrow(/sayfaFarki/);
    expect(dene({ kitaplar: [ornek({ sayfaSayisi: 0 })] })).toThrow(/sayfaSayisi/);
    expect(dene({ kitaplar: [ornek({ icindekiler: [{ baslik: '', sayfa: 1 }] })] })).toThrow(/baslik/);
    expect(dene({ kitaplar: [ornek({ icindekiler: [{ baslik: 'A', sayfa: 0 }] })] })).toThrow(/sayfa/);
    expect(dene({ kitaplar: [ornek({ sayfaSayisi: 10, icindekiler: [{ baslik: 'A', sayfa: 11 }] })] })).toThrow(/aşıyor/);
    expect(dene({ kitaplar: [ornek({ icindekiler: [{ baslik: 'A', sayfa: 1, derinlik: 5 }] })] })).toThrow(/derinlik/);
  });
});

describe('Güneş yardımcıları', () => {
  it('kitap kimliği adreste sade yazılır', () => {
    expect(kitapKimligi("Lem'alar")).toBe('lemalar');
    expect(kitapKimligi("İşârâtü'l-İ'câz")).toBe('isaratul-icaz');
    expect(kitapKimligi('Şuâlar')).toBe('sualar');
    expect(kitapKimligi('İman ve Küfür Muvâzeneleri')).toBe('iman-ve-kufur-muvazeneleri');
  });

  it('basılı sayfa ile PDF sayfası arasında çevirir', () => {
    const k = { sayfaFarki: 4 };
    expect(basiliSayfa(k, 5)).toBe(1);
    expect(basiliSayfa(k, 4)).toBeNull();
    expect(pdfSayfasi(k, 154)).toBe(158);
    expect(pdfSayfasi(k, 999, 300)).toBe(300);
    expect(pdfSayfasi(k, -3)).toBe(1);
  });

  it('sayfanın içinde bulunduğu en derin bölüm', () => {
    const k = {
      sayfaFarki: 2,
      icindekiler: [
        { baslik: 'Birinci Lem’a', sayfa: 1, derinlik: 0 },
        { baslik: 'Birinci Nükte', sayfa: 3, derinlik: 1 },
        { baslik: 'İkinci Lem’a', sayfa: 9, derinlik: 0 },
      ],
    };
    expect(bolumBul(k, 2)).toBeNull();
    expect(bolumBul(k, 3)?.baslik).toBe('Birinci Lem’a');
    expect(bolumBul(k, 6)?.baslik).toBe('Birinci Nükte');
    expect(bolumBul(k, 11)?.baslik).toBe('İkinci Lem’a');
  });

  it('okuyucuda o sayfada geçen video bulunur (iki sayfa yan yanaysa ikisinde de)', () => {
    const videolar = [
      { id: 'ihlas', kitap: "Lem'alar", sayfa: 154 },
      { id: 'fenler', kitap: 'Şuâlar', sayfa: 203 },
      { id: 'sayfasiz', kitap: "Lem'alar" },
    ];
    expect(sayfaninVideosu(videolar, "Lem'alar", [154])?.id).toBe('ihlas');
    expect(sayfaninVideosu(videolar, "Lem'alar", [153, 154])?.id).toBe('ihlas');
    expect(sayfaninVideosu(videolar, "Lem'alar", [155])).toBeUndefined();
    expect(sayfaninVideosu(videolar, "Lem'alar", [null])).toBeUndefined();
    expect(sayfaninVideosu(videolar, 'Sözler', [154])).toBeUndefined();
  });
});
