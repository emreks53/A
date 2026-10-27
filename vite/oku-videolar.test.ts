import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { menbaYazisi, paylasimAdresi, sureYazisi, tipografik } from '../src/oku/ortak';
import { akisOku, mp4Suresi, paylasimSayfasi } from './oku-videolar';

const kok = resolve(__dirname, '..');

function kutu(tur: string, ...icerik: Buffer[]): Buffer {
  const govde = Buffer.concat(icerik);
  const b = Buffer.alloc(8);
  b.writeUInt32BE(8 + govde.length, 0);
  b.write(tur, 4, 'latin1');
  return Buffer.concat([b, govde]);
}

/** Yalnız süre bilgisi taşıyan küçük bir MP4 (ftyp + moov/mvhd). surum 1: 64 bitlik alanlar. */
function kucukMp4(saniye: number, surum: 0 | 1 = 0, moovSonda = false): Buffer {
  const olcek = 1000;
  let mvhd: Buffer;
  if (surum === 0) {
    mvhd = Buffer.alloc(100);
    mvhd.writeUInt32BE(olcek, 12);
    mvhd.writeUInt32BE(saniye * olcek, 16);
  } else {
    mvhd = Buffer.alloc(112);
    mvhd.writeUInt8(1, 0);
    mvhd.writeUInt32BE(olcek, 20);
    mvhd.writeBigUInt64BE(BigInt(saniye * olcek), 24);
  }
  const ftyp = kutu('ftyp', Buffer.from('isom\0\0\x02\0isomiso2', 'latin1'));
  const moov = kutu('moov', kutu('mvhd', mvhd));
  const mdat = kutu('mdat', Buffer.alloc(64));
  return moovSonda ? Buffer.concat([ftyp, mdat, moov]) : Buffer.concat([ftyp, moov, mdat]);
}

function gecici(json: unknown, dosyalar: string[] = []): { json: string; pub: string } {
  const d = mkdtempSync(join(tmpdir(), 'oku-'));
  const pub = join(d, 'public');
  for (const f of dosyalar) {
    mkdirSync(join(pub, f, '..'), { recursive: true });
    writeFileSync(join(pub, f), f.endsWith('.mp4') ? kucukMp4(75) : '');
  }
  writeFileSync(join(d, 'videolar.json'), typeof json === 'string' ? json : JSON.stringify(json));
  return { json: join(d, 'videolar.json'), pub };
}

const KONULAR = [{ id: 'k', baslik: 'Konu' }];
const ornek = (ek: Record<string, unknown> = {}) => ({
  id: 'bir',
  baslik: 'Bir',
  konu: 'k',
  video: 'v/bir.mp4',
  kapak: 'v/bir.jpg',
  onizleme: 'v/bir-o.jpg',
  menba: [{ eser: 'Sözler', yer: '19. Söz' }],
  ...ek,
});
const liste = (videolar: unknown[], ek: Record<string, unknown> = {}) => ({ site: 'https://ornek.com/', konular: KONULAR, videolar, ...ek });
const DOSYALAR = ['v/bir.mp4', 'v/bir.jpg', 'v/bir-o.jpg'];

describe('mp4Suresi', () => {
  it('moov baştaysa da sondaysa da, 32 ve 64 bitlik başlıkta da süreyi okur', () => {
    const d = mkdtempSync(join(tmpdir(), 'mp4-'));
    const yaz = (ad: string, b: Buffer) => (writeFileSync(join(d, ad), b), join(d, ad));
    expect(mp4Suresi(yaz('a.mp4', kucukMp4(134)))).toBe(134);
    expect(mp4Suresi(yaz('b.mp4', kucukMp4(126, 1)))).toBe(126);
    expect(mp4Suresi(yaz('c.mp4', kucukMp4(9, 0, true)))).toBe(9);
    expect(mp4Suresi(yaz('d.mp4', Buffer.from('mp4 değil')))).toBeNull();
  });

  it('gerçek videoların süresi', () => {
    expect(Math.round(mp4Suresi(join(kok, 'public/videolar/sevgi-ve-guzellik.mp4'))!)).toBe(134);
    expect(Math.round(mp4Suresi(join(kok, 'public/videolar/ahlak-mucizesi.mp4'))!)).toBe(126);
  });
});

describe('akisOku', () => {
  it('gerçek video listesini okur', () => {
    const akis = akisOku(join(kok, 'content/oku/videolar.json'), join(kok, 'public'));
    expect(akis.site).toBe('https://emreks53.github.io/A/');
    expect(akis.konular.map((k) => k.baslik)).toEqual(['Muhabbet', 'Nübüvvet']);
    expect(akis.videolar.map((v) => [v.id, v.baslik, v.konu, sureYazisi(v.sure), menbaYazisi(v.menba)])).toEqual([
      ['sevgi-ve-guzellik', 'Sevgi ve Güzellik', 'muhabbet', '2:14', "Lem'alar, 64. sayfa"],
      ['ahlak-mucizesi', "Ahlâk Mu'cizesi", 'nubuvvet', '2:06', 'Mektubat, 195. sayfa · Sözler, 19. Söz'],
    ]);
    expect(akis.videolar[0].kunye?.some((k) => k.includes('CC BY 4.0'))).toBe(true);
  });

  it('geçerli bir listeyi kabul eder; süreyi dosyadan okur', () => {
    const { json, pub } = gecici(liste([ornek()]), DOSYALAR);
    expect(akisOku(json, pub)).toEqual({ site: 'https://ornek.com/', konular: KONULAR, videolar: [{ ...ornek(), sure: 75 }] });
  });

  it('hatalı listede anlaşılır hata verir', () => {
    const dene = (json: unknown, dosyalar = DOSYALAR) => {
      const g = gecici(json, dosyalar);
      return () => akisOku(g.json, g.pub);
    };
    expect(dene('{bozuk')).toThrow(/geçerli JSON/);
    expect(dene(liste([ornek()], { site: 'http://ornek.com/' }))).toThrow(/"site"/);
    expect(dene(liste([ornek()], { site: 'https://ornek.com' }))).toThrow(/"site"/);
    expect(dene(liste([]))).toThrow(/"videolar"/);
    expect(dene(liste([ornek()], { konular: [] }))).toThrow(/"konular"/);
    expect(dene(liste([ornek()], { konular: [{ id: 'k', baslik: 'A' }, { id: 'k', baslik: 'B' }] }))).toThrow(/iki kez tanımlanmış/);
    expect(dene(liste([ornek()], { konular: [{ id: 'k' }] }))).toThrow(/konular\[0\]\.baslik/);
    expect(dene(liste([ornek({ konu: 'yok' })]))).toThrow(/\.konu/);
    expect(dene(liste([ornek({ id: 'Büyük Harf' })]))).toThrow(/\.id/);
    expect(dene(liste([ornek(), ornek()]))).toThrow(/iki kez kullanılmış/);
    expect(dene(liste([ornek()]), ['v/bir.mp4', 'v/bir.jpg'])).toThrow(/public\/v\/bir-o\.jpg bulunamadı/);
    expect(dene(liste([ornek({ video: '../dis.mp4' })]))).toThrow(/\.video/);
    expect(dene(liste([ornek({ video: 'v/bir.jpg' })]))).toThrow(/geçerli bir MP4 değil/);
    expect(dene(liste([ornek({ menba: [] })]))).toThrow(/menba/);
    expect(dene(liste([ornek({ menba: [{ yer: '1' }] })]))).toThrow(/eser/);
    expect(dene(liste([ornek({ kunye: [1] })]))).toThrow(/kunye/);
  });
});

describe('sureYazisi', () => {
  it('dakika:saniye', () => {
    expect(sureYazisi(134)).toBe('2:14');
    expect(sureYazisi(125.7)).toBe('2:06');
    expect(sureYazisi(9)).toBe('0:09');
  });
});

describe('tipografik', () => {
  it('ekranda düz kesme işareti yerine tipografik olanı', () => {
    expect(tipografik("Ahlâk Mu'cizesi")).toBe('Ahlâk Mu’cizesi');
    expect(tipografik("Lem'alar, 64. sayfa")).toBe('Lem’alar, 64. sayfa');
    expect(tipografik('Sözler')).toBe('Sözler');
  });
});

describe('paylaşım sayfası', () => {
  const v = { ...ornek({ baslik: 'Ahlâk "Mu\'cizesi" <b>' }), id: 'ahlak', sure: 126 } as Parameters<typeof paylasimSayfasi>[1];
  const html = paylasimSayfasi('https://ornek.com/A/', v);

  it('önizleme etiketleri tam adreslerle', () => {
    expect(paylasimAdresi('https://ornek.com/A/', 'ahlak')).toBe('https://ornek.com/A/v/ahlak/');
    expect(html).toContain('<link rel="canonical" href="https://ornek.com/A/v/ahlak/" />');
    expect(html).toContain('<meta property="og:image" content="https://ornek.com/A/v/bir-o.jpg" />');
    expect(html).toContain('<meta property="og:video" content="https://ornek.com/A/v/bir.mp4" />');
    expect(html).toContain('Menba: Sözler, 19. Söz');
  });

  it('başlıktaki özel karakterler kaçırılır', () => {
    expect(html).toContain('<title>Ahlâk &quot;Mu&#39;cizesi&quot; &lt;b&gt; · Nur-u Hakikat</title>');
    expect(html).not.toContain('<b>');
  });

  it('uygulamadaki videoya göreli adresle yönlendirir', () => {
    expect(html).toContain('<script>location.replace("../../#/oku/ahlak");</script>');
    expect(html).toContain('<meta http-equiv="refresh" content="0; url=../../#/oku/ahlak" />');
  });
});
