import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { menbaYazisi, paylasimAdresi } from '../src/oku/ortak';
import { akisOku, paylasimSayfasi } from './oku-videolar';

const kok = resolve(__dirname, '..');

function gecici(json: unknown, dosyalar: string[] = []): { json: string; pub: string } {
  const d = mkdtempSync(join(tmpdir(), 'oku-'));
  const pub = join(d, 'public');
  for (const f of dosyalar) {
    mkdirSync(join(pub, f, '..'), { recursive: true });
    writeFileSync(join(pub, f), '');
  }
  writeFileSync(join(d, 'videolar.json'), typeof json === 'string' ? json : JSON.stringify(json));
  return { json: join(d, 'videolar.json'), pub };
}

const ornek = (ek: Record<string, unknown> = {}) => ({
  id: 'bir',
  baslik: 'Bir',
  video: 'v/bir.mp4',
  kapak: 'v/bir.jpg',
  onizleme: 'v/bir-o.jpg',
  menba: [{ eser: 'Sözler', yer: '19. Söz' }],
  ...ek,
});
const DOSYALAR = ['v/bir.mp4', 'v/bir.jpg', 'v/bir-o.jpg'];

describe('akisOku', () => {
  it('gerçek video listesini okur', () => {
    const akis = akisOku(join(kok, 'content/oku/videolar.json'), join(kok, 'public'));
    expect(akis.site).toBe('https://emreks53.github.io/A/');
    expect(akis.videolar.map((v) => [v.id, v.baslik, menbaYazisi(v.menba)])).toEqual([
      ['sevgi-ve-guzellik', 'Sevgi ve Güzellik', "Lem'alar, 64. sayfa"],
      ['ahlak-mucizesi', "Ahlâk Mu'cizesi", 'Mektubat, 195. sayfa · Sözler, 19. Söz'],
    ]);
    expect(akis.videolar[0].kunye?.some((k) => k.includes('CC BY 4.0'))).toBe(true);
  });

  it('geçerli bir listeyi kabul eder', () => {
    const { json, pub } = gecici({ site: 'https://ornek.com/', videolar: [ornek()] }, DOSYALAR);
    expect(akisOku(json, pub).videolar).toEqual([ornek()]);
  });

  it('hatalı listede anlaşılır hata verir', () => {
    const dene = (json: unknown, dosyalar = DOSYALAR) => {
      const g = gecici(json, dosyalar);
      return () => akisOku(g.json, g.pub);
    };
    expect(dene('{bozuk')).toThrow(/geçerli JSON/);
    expect(dene({ site: 'http://ornek.com/', videolar: [ornek()] })).toThrow(/"site"/);
    expect(dene({ site: 'https://ornek.com', videolar: [ornek()] })).toThrow(/"site"/);
    expect(dene({ site: 'https://ornek.com/', videolar: [] })).toThrow(/"videolar"/);
    expect(dene({ site: 'https://ornek.com/', videolar: [ornek({ id: 'Büyük Harf' })] })).toThrow(/\.id/);
    expect(dene({ site: 'https://ornek.com/', videolar: [ornek(), ornek()] })).toThrow(/iki kez/);
    expect(dene({ site: 'https://ornek.com/', videolar: [ornek()] }, ['v/bir.mp4', 'v/bir.jpg'])).toThrow(/public\/v\/bir-o\.jpg bulunamadı/);
    expect(dene({ site: 'https://ornek.com/', videolar: [ornek({ video: '../dis.mp4' })] })).toThrow(/\.video/);
    expect(dene({ site: 'https://ornek.com/', videolar: [ornek({ menba: [] })] })).toThrow(/menba/);
    expect(dene({ site: 'https://ornek.com/', videolar: [ornek({ menba: [{ yer: '1' }] })] })).toThrow(/eser/);
    expect(dene({ site: 'https://ornek.com/', videolar: [ornek({ kunye: [1] })] })).toThrow(/kunye/);
  });
});

describe('paylaşım sayfası', () => {
  const v = { ...ornek({ baslik: 'Ahlâk "Mu\'cizesi" <b>' }), id: 'ahlak' } as Parameters<typeof paylasimSayfasi>[1];
  const html = paylasimSayfasi('https://ornek.com/A/', v);

  it('önizleme etiketleri tam adreslerle', () => {
    expect(paylasimAdresi('https://ornek.com/A/', 'ahlak')).toBe('https://ornek.com/A/v/ahlak/');
    expect(html).toContain('<link rel="canonical" href="https://ornek.com/A/v/ahlak/" />');
    expect(html).toContain('<meta property="og:image" content="https://ornek.com/A/v/bir-o.jpg" />');
    expect(html).toContain('<meta property="og:video" content="https://ornek.com/A/v/bir.mp4" />');
    expect(html).toContain('Menba: Sözler, 19. Söz');
  });

  it('başlıktaki özel karakterler kaçırılır', () => {
    expect(html).toContain('<title>Ahlâk &quot;Mu&#39;cizesi&quot; &lt;b&gt; · Kenz</title>');
    expect(html).not.toContain('<b>');
  });

  it('uygulamadaki videoya göreli adresle yönlendirir', () => {
    expect(html).toContain('<script>location.replace("../../#/oku/ahlak");</script>');
    expect(html).toContain('<meta http-equiv="refresh" content="0; url=../../#/oku/ahlak" />');
  });
});
