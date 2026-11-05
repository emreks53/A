# Video üretim sistemi

Risale-i Nur ders videoları için dikey (9:16, 1080×1920) kısa video üreten sistem. Okunan metnin her cümlesine Shutterstock'tan seçilmiş bir sahne yerleştiriyor ve üzerine altın çizgili animasyonlar ekliyor. Günümüz Türkçesinde kullanılmayan kelimelerin anlamı, kelime okunduğu anda ekranda beliriyor. Arka planda müzik yok, yalnızca sesin altında kalan kısık efektler var. Video, kaynağı gösteren kitap sahnesiyle bitiyor.

## Klasörler

| Klasör | İçerik |
|---|---|
| `motor/` | Video motoru: zamanlama, kurgu, renk, geçişler, animasyonlar, anlam altyazıları, ses ve render |
| `proje-32-soz/plan/` | Okunan metin, kelime anlamları listesi, sahne planı |
| `proje-32-soz/zamanlama/` | Kelime kelime zamanlamalar (hizalanmış), anlamların çıkış anları, ses zarfı |
| `proje-32-soz/kitap/` | Kapanıştaki Risale-i Nur ve Kur'an-ı Kerim sahnesinin Blender render'ları ve üretim betikleri |
| `proje-32-soz/klipler.json` | Videodaki 64 sahnenin 62 Shutterstock klibi, kadraj için kullanılan önizleme bağlantıları |
| `proje-32-soz/klip_listesi.md` | Lisanslanacak kliplerin okunur listesi |

Ses kaydı bu repoda **yok**, çünkü repo herkese açık. Devam ederken kaydı yeniden yüklemek gerekiyor.

## Kaldığı yerden devam etmek (yeni oturumda)

```bash
# bağımlılıklar
apt-get update && apt-get install -y libegl1 libgl1 ffmpeg
pip install skia-python opencv-python-headless scipy soundfile numpy pillow

# çalışma klasörünü hazırla (zamanlama, plan, kitap, yazı tipleri, önizleme klipleri)
export VIDEO_ROOT=~/video-calisma
python3 video-uretim/motor/kur.py proje-32-soz
cp /kayit/yeri/voice.mp3 $VIDEO_ROOT/audio/voice.mp3

# render
cd video-uretim/motor
python3 render_all.py final 4 17      # -> $VIDEO_ROOT/renders/final.mp4
```

Lisanslı 4K klipler `$VIDEO_ROOT/licensed/` klasöründe durursa motor önizlemelerin yerine kendiliğinden onları kullanıyor.

## Shutterstock lisanslama

- `motor/license_fetch.py --site`: Sitede lisanslanan klipleri API ile 4K olarak yeniden indirir. Yeniden indirme indirme hakkı harcamaz. Ardından klibin yalnızca kullanılan bölümünü saklar.
- `motor/license_fetch.py`: Lisansı doğrudan API ile alır. Bunun için Shutterstock'un hesaptaki web aboneliğini API lisanslamasına açması gerekiyor; 1 Kasım 2026'da talep edildi, cevap bekleniyor.
- Erişim anahtarı ortam ayarlarındaki Network secrets kaydından, `api.shutterstock.com` için `Authorization: Bearer ...` başlığı olarak geliyor. Anahtar repoya yazılmıyor.

## Kurallar (bu projede uygulananlar)

- Görüntülerde insan, insan vücudu ya da uzuv yok. Kadın figürü hiç yok. Cami, Kâbe, seccade ve Kur'an uygun yerlerde kullanılıyor.
- Uzay teması yok; tema okunan metnin manasından seçiliyor.
- Anlam altyazısı yalnızca anlamı gösteriyor: kutu yok, eski kelime yazılmıyor. Kelimenin ilk sesiyle aynı karede beliriyor.
- Arka planda müzik yok. Efektler konuşma anlarında sesin en az ~14 dB altında tutuluyor.
- Kapanış: masada üst üste soluk, asil kırmızı Risale-i Nur'lar ve üstünde Kur'an-ı Kerim; kaynak ve sayfa bilgisi ekranda.
