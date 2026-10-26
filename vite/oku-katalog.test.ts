import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { katalogOku, kelimeSay } from './oku-katalog';

function gecici(dosyalar: Record<string, string>): string {
  const kok = mkdtempSync(join(tmpdir(), 'oku-'));
  for (const [yol, icerik] of Object.entries(dosyalar)) {
    mkdirSync(join(kok, yol, '..'), { recursive: true });
    writeFileSync(join(kok, yol), icerik);
  }
  return kok;
}

describe('katalogOku', () => {
  it('gerçek içerik klasörünü okur', () => {
    const kok = resolve(__dirname, '..');
    const kitaplar = katalogOku(join(kok, 'content/oku'), kok);
    const ornek = kitaplar.find((k) => k.id === 'ornek');
    expect(ornek).toMatchObject({ baslik: 'Örnek Kitap', ornek: true });
    expect(ornek!.bolumler.map((b) => [b.id, b.baslik, b.dosya])).toEqual([
      ['okuma-ekrani', 'Okuma Ekranı', '/content/oku/ornek/01-okuma-ekrani.md'],
      ['okuma-uzerine', 'Okuma Üzerine Notlar', '/content/oku/ornek/02-okuma-uzerine.md'],
    ]);
    expect(ornek!.bolumler[1].kelime).toBeGreaterThan(300);
  });

  it('kitapları sıraya, sonra başlığa göre dizer; bölümleri dosya adına göre', () => {
    const kok = gecici({
      'oku/b/kitap.json': '{"baslik":"Şualar","sira":2}',
      'oku/b/02-iki.md': '# İki',
      'oku/b/01-bir.md': '# Bir',
      'oku/a/kitap.json': '{"baslik":"Çay"}',
      'oku/a/1-x.md': '# X',
      'oku/c/kitap.json': '{"baslik":"Ayna"}',
      'oku/c/x.md': '# X',
    });
    const k = katalogOku(join(kok, 'oku'), kok);
    expect(k.map((x) => x.baslik)).toEqual(['Şualar', 'Ayna', 'Çay']);
    expect(k[0].bolumler.map((b) => b.id)).toEqual(['bir', 'iki']);
  });

  it('eksik ya da hatalı içerikte anlaşılır hata verir', () => {
    expect(() => katalogOku(join(gecici({ 'oku/a/01-x.md': '# X' }), 'oku'), '/')).toThrow(/kitap\.json yok/);
    expect(() => katalogOku(join(gecici({ 'oku/a/kitap.json': '{"baslik":"A"}', 'oku/a/01-x.md': 'başlıksız' }), 'oku'), '/')).toThrow(
      /# Başlık/,
    );
    expect(() => katalogOku(join(gecici({ 'oku/Sözler/kitap.json': '{"baslik":"A"}' }), 'oku'), '/')).toThrow(/klasör adı/);
    expect(() =>
      katalogOku(join(gecici({ 'oku/a/kitap.json': '{"baslik":"A"}', 'oku/a/01-x.md': '# X', 'oku/a/02-x.md': '# X' }), 'oku'), '/'),
    ).toThrow(/başka bir bölüm/);
    expect(() => katalogOku(join(gecici({ 'oku/a/kitap.json': '{baslik' }), 'oku'), '/')).toThrow(/JSON/);
    expect(() => katalogOku(join(gecici({ 'oku/a/kitap.json': '{"baslik":"A"}' }), 'oku'), '/')).toThrow(/hiç bölüm/);
  });

  it('klasör yoksa boş katalog', () => {
    expect(katalogOku('/yok/boyle/bir/yer', '/')).toEqual([]);
  });
});

describe('kelimeSay', () => {
  it('işaretleri ve dipnot tanımlarını saymaz', () => {
    expect(kelimeSay("# Başlık\n\n**Kalın** söz, Hakk'ın[^1] nuru.\n\n[^1]: dipnot metni burada")).toBe(5);
  });
});
