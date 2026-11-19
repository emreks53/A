"""insan.py — ADAM (videodaki tek karakter), dijital suluboya (Atölye S-146) üslubunda, yandan (profil) görünüş.

Sade ve yüzsüz (göz/ağız/kaş yok; yalnız alın-burun-çene silüeti ve küçük kulak), kısa koyu kahve saç ve kısa,
düzgün sakal silüeti; uzun kollu toz mavisi gömlek (bol, üst uyluğa kadar dışarıda), sıcak gri pantolon, koyu kahve
ayakkabı (seccadede: sıcak koyu gri çorap). Her parça ayrı saydam lavi + ışıktan uzak yanda ikinci (koyu) sır; çizgi
yok, yalnız ıslak kenar pigmenti. Önden arkaya boyanır ve her parça bitince saklamaya (resist) yazılır: yakın kol/el ->
(elde tutulan nesne) -> baş (saç+sakal tek lavi, kulak, deri) -> gömlek -> boyun -> yakın bacak+ayakkabı/çorap -> uzak
bacak+ayakkabı/çorap -> uzak kol+el (uzak uzuvlar bir ton koyu) -> zemin gölgesi. Battaniye varsa: baş -> battaniye ->
yakın kol ... (kollar battaniyenin altında). Sonuçta figürün bütün silüeti saklamadadır (sakla_sonra=False ile çağrı
öncesi saklama geri yüklenir). Uyluk göğse çekildiğinde (oturma, çömelme) yakın uyluk gövdenin önüne geçer (gömlek
maskesi oyulur); ayakta ve yürürken gömlek eteği uyluk kökünü örter. Eklem iç köşeleri köprü kapsüllerle yuvarlanır.
Bol gömlek: gövde öne eğikken (sulama) önü göğüsten dikey sarkar; çömelip öne eğilince arka etek gerilip kalça hattına
sıyrılır (pantolonun oturağı görünür, "pelerin" olmaz); kumaş silüeti ~4.5 birim yuvarlanır.
Doku tohumları parça başına sabittir (_Boyaci.bolum): bir parçadaki koşullu darbe (dirsek kıvrımı eşiği, boş gölge)
sonraki parçaların dokusunu kaydırmaz -> geçişlerde doku sıçraması / titreme yok.
Sabitler: RENK, YOG (renk/yoğunluk), EL_OLCEK, BAS_OLCEK, DIZ, KALKIS_DX, KALKIS_YUKSELIS, YURUYUS_ADIM, IBRIK_ALT_EL,
SECDE_EL, SUKUR_EL, SUKUR_EL_ACI, DIZ_OTUR_EL_F, SECDE_TEMAS, SECDE_KALK_EL, SULA_COKME, YUMUSAK_ERISIM.

YEREL KOORDİNAT (bütün ölçüler "yerel birim")
  * köken: ayakta duruşta kalçanın altındaki zemin noktası; y = 0 zemin.  +x = yüzün baktığı yön, y AŞAĞI (ekran).
  * ayakta boy 600 (saç üstü y≈-600), baş (tepe-çene) ≈ 76 birim, saç ve sakalla ≈ 82 (görsel ~7.3 baş).
    Kalça eklemi (0, -318), omuz ≈ (-4, -490), boyun kökü ≈ (0, -513), diz ≈ y -171, ayak bileği y -25.
  * Segment boyları: L_BEL 100 + L_GOG 95 (gövde), L_BOYUN 30, L_UST 112, L_ON 88, L_EL 64*EL_OLCEK,
    L_UYLUK 147, L_BALDIR 146, AYAK_YUK 25; ayakkabı topuk x -24 .. burun x +80, çorap topuk x -21 .. burun x +70
    (ayak çerçevesinde; ikisinde de taban y=+26, yani ayak çapaları aynı).
  * Ekrana: M (3x3, yerel->ekran) — örn. M = kamera.M() @ M_yerlestir(x, y, olcek); boy_px = 600 * olcek.
    yon=-1 figürü x'te aynalar (sola bakar); ışık (isik) EKRAN yönüdür, aynalamadan etkilenmez.

ANA FONKSİYON
  ciz_insan(t, M, poz, yon=1, isik=(-0.6, -0.8), battaniye=0.0, sakla_sonra=True, elde=None, nefes=0.0,
            zemin_golge=0.35, tohum=0, renkler=None, battaniye_alfa=1.0, ayakkabi=True) -> dict
    t        : motor.Tuval;  M: yerel->ekran;  poz: poz sözlüğü (POZLAR[...], yuruyus(faz), karışımlar ...)
    isik     : ışığa doğru birim vektör (ekran); (-0.6,-0.8) = sol üstten ışık -> gölge sağ/alt yanlarda.
    battaniye: 0..1 omuzlardan dökülen yün battaniye (sıcak soluk lavanta, etekte iki ince şerit); değer büyüdükçe
               etek omuzdan zemine iner (1 = ayaklara kadar sarılı, ayakkabı burnu görünür). oturus_* pozları için
               tasarlandı. battaniye_alfa 1..0: battaniyeden kurtulma (kalkışta): azaldıkça battaniye omuzlardan
               kayar (dalgalı, kıvrık üst kenarı zemine iner, beden yukarıdan aşağı açılır) ve üst kenar zemine
               varınca TAMAMEN biter; 0 = yok. Saydamlaşma YOKTUR (eski sürümün son %45'teki solması bedeni battaniyenin
               içinden çift pozlama gibi gösteriyordu). Kalkışta battaniye_alfa=kalkis_battaniye(t) kullanın.
               Eller yalnız dizin çevresindeyse battaniye onları da sarar (öne uzanan kollar onu şişirmez).
    elde     : elde(t, M_el) — yakın elde tutulan nesneyi çizen geri çağrı; M_el = el çerçevesi->ekran:
               köken = avuç merkezi, +x = parmak yönü, +y = +x'in saat yönünde 90° dönmüşü (yerel birimler,
               ölçeksiz). Yakın el + yakın koldan SONRA, baş/gövdeden ÖNCE çağrılır (gövdenin önünde, elin arkasında).
               Nesne kendi silüetini saklamaya yazmalıdır. Yumruk (kivrim≈0.9) kabaca x∈[-24, 32], y∈[-12, 12]
               kaplar; tutulan sap, x ≈ +4..+16 arasında y boyunca geçen bir çubuk gibi düşünülmeli.
               'sula' pozunda uzak elin avucu yakın el çerçevesinde IBRIK_ALT_EL = (42, 40)'tadır (ibriğin altı).
    nefes    : 0..1 nefes fazı (sin): omuzlar ~3, göğüs ~1.6 birim yükselir/genişler (döngü için faz = t/periyot).
    zemin_golge: 0..1 figürün yere değdiği yerin altına yumuşak lila gölge (figürün arkasında, saklamaya yazılmaz).
    renkler  : RENK anahtarlarını geçersiz kılmak için sözlük (ör. {'gomlek': '#...', 'corap': '#...'}).
    tohum    : doku tohumu (aynı tohum + aynı poz = aynı kare; titreme yok).
    ayakkabi : True (varsayılan) koyu kahve ayakkabı. False = ÇORAP (seccadede): aynı ayak biçimi ama daha ince ve
               kısa, taban/topuk yok; sıcak koyu gri (RENK['corap'] = #5F5A57, gölge #47423F) ve ince ıslak kenar.
               Secde'de ve diz çökmede parmaklar yumuşak bir kıvrımla yerde bükülür; oturuşta düz basar.
    DÖNÜŞ (ekran koordinatı, np.array([x, y])):
      'bas' baş merkezi, 'bas_ust' baş tepesi (saç üstü), 'alin' alın, 'burun' burun ucu (secde'de ikisi yerde),
      'kalp' göğüs/kalp noktası (göğsün önünde), 'boyun' boyun kökü (C7), 'omuz_on' / 'omuz_arka',
      'dirsek_on' / 'dirsek_arka', 'bilek_on' / 'bilek_arka', 'el_on' / 'el_arka' avuç merkezleri,
      'parmak_ucu_on' / 'parmak_ucu_arka', 'el_on_aci' yakın el ekseninin ekran açısı (derece, atan2(dy, dx)),
      'diz' / 'diz_arka' diz eklemleri, 'kalca' kalça eklemi (pelvis kökü), 'ayak_on' / 'ayak_arka' taban ortası,
      'ayak_ucu_on' / 'ayak_ucu_arka' ayakkabı/çorap burnu, 'topuk_on' / 'topuk_arka' topuk (ayakkabi'ya göre),
      'yerel' : aynı noktalar yerel koordinatta (dict), 'iskelet' : Iskelet (bütün eklemler, yerel).
    Süre (tek çekirdek): ~500 px 0.04–0.05 sn, ~1350 px 0.08–0.15 sn, ~1750 px 0.2–0.26 sn; battaniyeli 2600 px
    yakın plan ~0.65 sn. Poz fonksiyonları (secdeye, kalkis ...) ~2 ms.
  capalar(poz, M, yon=1, nefes=0.0, ayakkabi=True) -> dict : ciz_insan'ın dönüşüyle aynı çapalar, BOYAMADAN (yalnız
            iskelet; ~1 ms). Kamera/efekt konumlamak için figürü ayrıca çizmeyin.
  ciz_ayakkabi_cifti(t, M, olcek=1.0, tohum=0, yon=1, isik=(-0.6, -0.8), sakla_sonra=True, renkler=None,
            zemin_golge=0.3) -> dict : adamın kendi koyu kahve ayakkabıları, BOŞ, yerde yan yana düzgün bir çift
            (yandan; yakın teki önde, uzak teki ~22 birim ileride ve 3 birim geride/yukarıda, bir ton serin, hafif
            bindirmeli; ağızdan koyu iç astar ve koyu taban şeridi görünür). Köken = çiftin zemindeki orta noktası,
            +x burun yönü (yon=-1 aynalar); çift x ≈ -61..+91, y ≈ -32..0. Ölçek figürünkiyle aynı (M figürün M'i gibi
            verilirse ayakkabılar ayağındakilerle aynı boyda; olcek ek çarpan). Silüetini saklamaya yazar; altına
            yumuşak zemin gölgesi (saklamasız). Dönüş: 'on' / 'arka' burun uçları, 'orta' köken (ekran).

POZ = sözlük (ANAHTARLAR; bos_poz() hepsini 0'la doldurur). Açılar derece:
  kx, ky       : kalça ekleminin (pelvis kökü) yerel konumu (ayakta 0, -318).
  bel          : bel (lumbar) mutlak açısı, 0 dik yukarı, + öne eğik.  gogus: göğüs, bele göre (+ öne).
  bel_kambur   : sırt ortasına ek kamburluk (+).  boyun: boyun, göğse göre.  bas: baş, boyuna göre (+ öne eğilir).
  omuz_kalk    : omuz silkme (birim).
  omuz_X       : üst kol, gövdenin aşağı eksenine göre (0 gövdeye paralel sarkık, + öne/yukarı).  X = on (yakın) | ar (uzak)
  dirsek_X     : dirsek bükülmesi (>= 0, ön kol öne/yukarı döner).  el_bilek_X: el, ön kola göre (+ yukarı/öne).
  kivrim_X     : 0 açık el .. 1 yumruk.  yan_X: 0 elin sırtı/avucu görünür (geniş eldiven, başparmak önde/üstte),
                 +1 kenardan, avuç el çerçevesinin +y yanında (ör. yerdeki ya da dizdeki el), -1 avuç -y yanında
                 (ör. dua: avuç yukarı/yüze).  kisalt_X: 0..1 el boyu kısalması (öne/derinliğe bakan el).
  duz_X        : (YENİ) 0..1 avuç içiyle bir yüzeye (yer, uyluk) DÜZ basmış el: kenar görünüşte avuç tarafı dümdüz,
                 başparmak silüetin içinde; yan'ın işaretindeki yana yatar. Taban bilekten 10.5*EL_OLCEK (≈9.45) uzakta
                 (yerdeki elde bilek y ≈ -9.3). Eski pozlarda 0 (eski görünüş).
  kol_kisalt_X, ust_kisalt_X, onkol_kisalt_X : 0..1 kol / yalnız üst kol / yalnız ön kol perspektif kısalması
                 (secde: dirsekler yana açık; kıyam: ön kol karnın önünden karşı yana geçer).
  kalca_X      : uyluk mutlak açısı (0 aşağı, + öne).  diz_X: diz bükülmesi (>= 0).
  ayak_bilek_X : ayak, baldıra göre (0 = baldıra dik; + parmak ucu aşağı).  parmak_X: parmaklar (+ yukarı kıvrık).
  etek_on, etek_ar, etek_ar_boy : gömlek eteği kanatlarına poz özel düzeltme (açı / ek boy).
Ters kinematik yardımcıları (poz yazmak için, poz sözlüğünü yerinde değiştirir):
  bacak_ik(p, 'on'|'ar', ayak_bilegi_xy), kol_ik(p, taraf, bilek_xy, isaret=-1 (dirsek arkada) | +1, yumusak=0.0),
  el_aci(p, taraf, mutlak_asg_aci), ayak_duz(p, taraf, aci=90 (yere paralel)), kol_mutlak(p, taraf, ust_aci, dirsek).
  kol_ik(..., yumusak=b) (YENİ): erişimin son b kesrinde (ör. 0.07) hedef uzaklığı yumuşakça doyurulur — serbest
  hareket eden elde kol tam gerilip dirsek tekil noktada sıçramaz (temas eden ellerde 0 bırakın; varsayılan 0 = eski).
  kol_2d(p, taraf, dirsek_xy, bilek_xy) (YENİ): kolu GÖRÜNEN (yandan izdüşüm) dirsek ve bilek noktalarına kurar; omuz/
  dirsek açıları ile ust_kisalt / onkol_kisalt (gerekirse kol_kisalt) birlikte çözülür (yana açılan dirsek, secde).
iskelet(poz, nefes=0) -> Iskelet: 'kok','N','Hp','S_on','E_on','Wr_on','H_on','K_on','A_on' (ve _ar), 'M_bas',
  'M_el_on', 'M_ayak_on' (yerel çerçeve matrisleri), 'avuc_on' ...   sinir_kutusu(poz) -> (x0, y0, x1, y1) yerel.

POZLAR (sözlük; hepsi +x'e bakar)
  ayakta       : rahat duruş.                     ayakta_dik : dimdik, göğüs açık, çene hafif yukarıda (kuvvet).
  yuru_0..3    : yuruyus(0, .25, .5, .75) anlık görüntüleri.
  sula         : sula_pozu(0) — (YENİ varsayılan) dizler ~40° bükük, kalça aşağıda ve geride, gövde ~56° öne eğik
                 (eğilmiş bahçıvan), baş fidana bakar; yakın el ibriği sapından tutar, eller eskisinden ~115 birim
                 aşağıda (yakın avuç y≈-270; ibrik fidana yakın, su kısa düşer).  sula_dok: sula_pozu(1).
                 Sulama hareketi için sula_pozu(dok, alt_el=esyalar.ibrik_alt_nokta(egim)) kullanın (aşağıya bakın).
  kiyam        : namazda ayakta, eller karın önünde bağlı (ön kollar profilde kısalır, dirsekler gövde yanında),
                 baş hafif eğik.
  ruku         : bel yatay, dizler kilitli, kollar omuzdan dizlere neredeyse düz, eller dizlerde, baş sırtla bir
                 hizada (ayaklar ayakta ile aynı yerde).
  secde        : (YENİ anatomi) dizler ve ayak parmakları yerde (DIZ), uyluk ~dik (4°), kalça en yüksek nokta; sırt
                 kalçadan omza hafif yay çizerek iner (bel 104, göğüs +36, kambur 8), omuz başı silüette okunur; alın
                 VE burun yerde (alin ≈ (305, -0.4), burun ≈ (278, -0.5)); avuçlar başın iki yanında yere DÜZ basmış
                 (duz=1), kulak-alın hizasında, parmak uçları yüzün biraz önünde ve öne dönük (avuç merkezi ≈ (312, -9),
                 parmak ucu ≈ (349, -9)); dirsekler yerden kalkık ve yana açık (dirsek ≈ (246, -43); yandan kısalır),
                 ön kollar ~36° eğik. Kalça (114, -168). SECDE_EL = bilekler {'on': (293.1, -9.3), 'ar': (300.1, -9.3)}.
  secde_kalk   : (YENİ) secdeden_kalk(0.6): eller hâlâ yerde, gövde ~yatay, baş kalkmış (kalça (74, -159)).
  oturus_hasta : yerde oturmuş, dizler çekik, kollar dizlere sarılı, sırt yuvarlak, baş eğik (hasta, yorgun).
  oturus_dik   : aynı oturuş, sırt doğrulmuş, baş dik, sakin (sabır). Bu ikisi poz_karistir ile sorunsuz geçişir.
  diz_dua      : topuklar üstünde diz çökmüş, sırt dik, ön kollar göğüs önünde kalkık, avuçlar yukarı/yüze (eski dua).
  diz_otur     : (YENİ) topuklar üstünde diz çökmüş oturuş (kalça (0, -100)), sırt dik, baş düz; iki el avuç içi aşağı
                 uyluklarda dizlere yakın (avuç merkezi uyluk boyunca DIZ_OTUR_EL_F = 0.55; yakın avuç ≈ (89, -87),
                 parmak ucu ≈ (117, -64)), kollar gevşek (erişimin ~%90'ı).
  diz_sukur    : (YENİ) diz çökmüş, iki el şükre/duaya kalkık: avuçlar yukarı ve yüze dönük, hafifçe izleyiciye açık
                 (yan -0.6, kivrim 0.16), göğüs-omuz hizasında ve göğsün belirgin önünde (bilekler SUKUR_EL:
                 yakın (84, -246), uzak (95, -263) — uzak elin parmakları yakınınkinin üstünden görünür, iki el okunur;
                 el ekseni SUKUR_EL_ACI 134° / 142°), dirsekler gövdeye yakın ve gevşek (≈ (42, -169)), baş ~10°
                 yukarı. 300–400 px figür boyunda telefonda okunur.
  kalkis_1..4  : kalkis_u(KALKIS_ZAMAN[i]) ara pozları (YENİ kalkış; kalkis_4 = ayakta_dik, x'te KALKIS_DX=72 kaymış).
  diz_secde_1,2: secdeye ara pozları (iç ilerleme 0.30 ve SECDE_TEMAS: diz_secde_2'de avuçlar yere yeni değmiş).
  Aileler ve kökler: AYAKTA ailesi (ayakta, ayakta_dik, sula*, kiyam, ruku): ayaklar x≈±10..±36'da, köken kalçanın
  altı. OTURMA ailesi: kalça yerde (0, -44), ayaklar x≈+90..+96. DİZ ailesi (diz_dua, diz_otur, diz_sukur, secde,
  secde_kalk, ara pozlar): dizler sabit DIZ=(124, -21), ayak parmakları x≈-45..-50'de; köken diz_otur'da kalçanın altı.

HAREKET / GEÇİŞ (hepsi parametrik: aynı girdi = aynı kare; zaman durumu yok; temas eden noktalar kaymaz)
  yuruyus(faz) -> poz : doğal yürüyüş döngüsü, faz 0..1 = bir tam döngü (faz 0 yakın ayak, 0.5 uzak ayak topuk
                        vuruşu; kollar bacakların tersine sallanır, kalça ~12 birim iner-kalkar). Yerinde yürür:
                        sahne figürü x += YURUYUS_ADIM (=330) * Δfaz kadar ilerletirse basan ayak zeminde kaymaz.
  poz_karistir(a, b, t, sabit=None) -> poz : bütün değerler doğrusal; sabit='ayak_on'|'ayak_ar'|'diz_on'|'diz_ar'|
                        'kalca'|'el_on' verilirse o nokta iki pozdaki yerinin karışımına oturtulur (kök kaydırılır).
  poz_yolu(pozlar, t, sabit=None, sureler=None) -> poz : poz dizisi boyunca C1-yumuşak (aşmayan Hermite) geçiş.
  poz_zaman_yolu(pozlar, zamanlar, u, sabit=None) -> poz (YENİ): zaman damgalı anahtarlar arasında monoton kübik
                        (Fritsch-Butland): uçlarda hız 0, ara anahtarlarda hız ZAMANDA sürekli (farklı uzunlukta
                        aralıklarda kırbaç yok), aşma yok.
  secdeye(t)  : diz_dua -> secde (t 0..1, içeride smoothstep). Dizler/parmaklar sabit. Eller göğüs önünden gövdeyle
                birlikte öne-aşağı bir yay çizer (kol omuzdan ~25° öne, avuçlar yere doğru döner), yerdeki yerlerinin
                üstünden dikine iner ve BİR KEZ yere değer (dış t = secdeye_temas_t() ≈ 0.59; temas anında hız 0);
                sonra IK ile yerinde kalır (kayma ölçümü 0.000), gövde inmeyi sürdürür, alın en son yere değer
                (alın hiçbir karede zemine girmez). Geri dönüş için secdeye(1 - t) da çalışır.
  secdeden_kalk(u) (YENİ) : secde -> diz_otur (u 0..1, doğrudan zaman ekseni). 0–0.6 (SECDE_KALK_EL): baş kalkar,
                gövde ~yataya doğrulur, kalça biraz geri gelir; avuçlar yerde sabit (IK, kayma 0). 0.6–1: eller yerden
                kalkıp omzun altından geri-yukarı bir yayla uyluklara konar (IK; öne uzanma yok, ön kol hiç öne yatay
                olmaz), kalça topuklara oturur, sırt dikleşir. Gövde poz_zaman_yolu ile (hız sürekli, sonda yumuşak duruş).
  dua_kaldir(u) (YENİ) : diz_otur -> diz_sukur (u 0..1). Eller uyluklardan kalkar (düzlük bırakılır), gövdeye yakın
                bir yayla (IK yolu, açı karıştırma değil) göğüs-omuz hizasına yükselir; bilekler dönerek avuçlar yukarı/
                yüze döner; baş ~10° kalkar. Uçlarda hız ve ivme sıfır.
  kalkis(t)   : (YENİDEN YAZILDI) oturus_dik -> ayakta_dik (t 0..1, içeride smoothstep; kalkis_u(u) iç eksen).
                Gövde öne eğilir, ayaklar çekilir (t≈0.36'ya dek; sonra yerde sabit), yakın el kalçanın önü-yanında yere
                basıp iter (uzak el de, biraz geride; kalkis_temas_t()['yer']), kalça KALKIS_YUKSELIS (≈0.375) sonra
                yerden kalkar, gövde ~52° öne eğik yarım çömelmeden geçerken eller dizlere konup iter
                (kalkis_temas_t()['diz']), uyluk boyunca yukarı kayar, bacaklar doğrulur, kollar açı karışımıyla yana
                sarkar. Oturuştaki başlangıç kolları bırakıldıktan sonra (t > 0.2) kol omuzdan en çok ~10° öne uzanır
                (öne yatay uzanma yok); baş gövdeyi izler (eğilip sinmez). t=1 sonucu ayakta_dik'in
                KALKIS_DX (= 72, eskisiyle aynı) kadar +x'e kaymışıdır: sonrasında ayakta_dik çizilecekse yerleşimi
                KALKIS_DX * olcek * yon kadar kaydırın. Kalça oturuk evrede kaymaz (0.04 birim).
  kalkis_battaniye(t, bas=0.0) (YENİ) : kalkis(t) ile verilecek battaniye_alfa (1 -> 0); battaniye kalça yerden
                kalkmadan (KALKIS_YUKSELIS - 0.02) önce TAMAMEN kayar. Daha uzun kayış için bas<0 verip t'yi 0'ın
                altından başlatın (kalkis(t<0) = oturus_dik).
  kalkis_temas_t(), secdeye_temas_t() (YENİ): temas aralıklarının dış t değerleri (ses/efekt zamanlaması için).
  sula_pozu(dok=0, alt_el=None, cokme=None, destek_yolu=None) : dok 0..1 bilekler öne döner (ibrik eğilir).
                cokme (YENİ) 0..1, varsayılan SULA_COKME = 1: yeni alçak/eğilmiş duruş; 0 = eski dimdik duruş (birebir).
                Uzak avuç alt_el'e (ibriğin altı) IK ile oturur; büyük ibrikte alçak ellerle kol yetişmezse destek
                noktası ibriğin kaide -> karın arka-alt çizgisi boyunca yukarı, kolun %97 erişimine dek kayar (alt_el
                esyalar.ibrik_alt_nokta(egim)'den geliyorsa yol ibrik biçiminden kendiliğinden kurulur; destek_yolu
                ile el çerçevesinde nokta listesi verilebilir). Sahnedeki gibi (egim = 33 + 9 dok_s,
                sula_pozu(0.25 dok_s, ...)) emzik ucu yerel y: egim 33 -> -242, 38 -> -215 (x ≈ 232), 42 -> -195
                (eski: -355 / -328 / -308; ~113 birim aşağıda).
"""
from __future__ import annotations

import math

import cv2
import numpy as np
import skia

from motor import (M_bilesik, M_oteleme, M_olcek, M_donme, yol_egri, yol_elips, yol_op, maske_ciz, yollar_kirp,
                   karistir, smoothstep)

# =================================================================================================================
# oranlar (yerel birim; ayakta boy 600 = 7.5 baş, baş 80)
# =================================================================================================================
BOY = 600.0
L_BEL = 100.0          # kalça eklemi -> bel (T12)
L_GOG = 95.0           # bel -> boyun kökü (C7)
L_GOVDE = L_BEL + L_GOG
L_BOYUN = 30.0         # boyun kökü -> baş pivotu (atlas)
L_UST = 112.0          # omuz -> dirsek
L_ON = 88.0            # dirsek -> bilek
L_EL = 64.0            # bilek -> parmak ucu
L_UYLUK = 147.0        # kalça -> diz
L_BALDIR = 146.0       # diz -> ayak bileği
AYAK_YUK = 25.0        # ayak bileği eklemi, taban üstünde (ayakkabıyla)
KALCA_Y = -(L_UYLUK + L_BALDIR + AYAK_YUK)   # -318: ayakta kalça eklemi
TOPUK_X, TOP_X, BURUN_X = -20.0, 50.0, 78.0  # ayak çerçevesinde topuk, tarak (top) ve burun x'i
EL_OLCEK = 0.90        # el biçiminin ölçeği (el boyu L_EL * EL_OLCEK)
BAS_OLCEK = 0.93       # baş biçimlerinin ölçeği (saç ve sakal hacmiyle görsel boy ~7.3 baş)
AVUC_X = 21.0          # el çerçevesinde avuç merkezi (bilekten, ölçeksiz)

# =================================================================================================================
# renkler
# =================================================================================================================
RENK = dict(
    ten='#EDBE9E', ten_golge='#D8957C', ten_boyun='#E2A98E', kulak='#DE9F86',
    sac='#5A3D2C', sac_golge='#3A271C',
    gomlek='#8BA7C6', gomlek_golge='#6886AE', gomlek_kat='#56739C',
    pantolon='#978C82', pantolon_golge='#72675F',
    ayakkabi='#573D30', ayakkabi_golge='#3B2A22', taban='#33251E', ayakkabi_ic='#2A1E19',
    corap='#5F5A57', corap_golge='#47423F',
    battaniye='#B9A6BC', battaniye_golge='#927D9C', battaniye_serit='#8C7593', battaniye_serit2='#C9A79A',
    uzak='#77738F', zemin_golge='#958FB0',
)
YOG = dict(ten=0.40, sac=0.60, gomlek=0.50, pantolon=0.56, ayakkabi=0.86, battaniye=0.50, corap=0.66)


# =================================================================================================================
# vektör yardımcıları
# =================================================================================================================
def _v(x, y):
    return np.array([x, y], np.float64)


def _yuk(a):
    """Yukarı bakan segment açısı (0 = yukarı, + = öne yatık) -> birim vektör."""
    r = math.radians(a)
    return np.array([math.sin(r), -math.cos(r)])


def _asg(a):
    """Aşağı bakan segment açısı (0 = aşağı, + = uç öne) -> birim vektör."""
    r = math.radians(a)
    return np.array([math.sin(r), math.cos(r)])


def _onn(a):
    """Yukarı-çerçevenin ön normali (göğüs/karın yönü)."""
    r = math.radians(a)
    return np.array([math.cos(r), math.sin(r)])


def _aci_asg(v):
    return math.degrees(math.atan2(v[0], v[1]))


def _cerceve(o, a):
    return M_bilesik(M_oteleme(float(o[0]), float(o[1])), M_donme(a))


def _uygula(Mx, pts):
    pts = np.asarray(pts, np.float64)
    return pts @ Mx[:2, :2].T + Mx[:2, 2]


def _nokta(Mx, p):
    v = Mx @ np.array([p[0], p[1], 1.0])
    return np.array([v[0], v[1]])


def _smax(a, b, k=12.0):
    """Yumuşak maksimum (derece)."""
    h = max(0.0, min(1.0, 0.5 + 0.5 * (a - b) / k))
    return b + (a - b) * h + k * h * (1 - h) * 0.5


def _smin(a, b, k=12.0):
    return -_smax(-a, -b, k)


def _ss(a, b, x):
    if b == a:
        return 1.0 if x >= b else 0.0
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def _yol(pts, kapali=True, gerilim=0.5):
    return yol_egri([tuple(map(float, q)) for q in pts], kapali=kapali, gerilim=gerilim)


def _birlesim(*yollar):
    out = None
    for y in yollar:
        if y is None:
            continue
        out = y if out is None else yol_op(out, y, 'birlesim')
    return out if out is not None else skia.Path()


# =================================================================================================================
# poz
# =================================================================================================================
ANAHTARLAR = (
    'kx', 'ky', 'bel', 'gogus', 'boyun', 'bas', 'omuz_kalk',
    'omuz_on', 'dirsek_on', 'el_bilek_on', 'kivrim_on', 'yan_on', 'kisalt_on', 'kol_kisalt_on', 'ust_kisalt_on',
    'omuz_ar', 'dirsek_ar', 'el_bilek_ar', 'kivrim_ar', 'yan_ar', 'kisalt_ar', 'kol_kisalt_ar', 'ust_kisalt_ar',
    'kalca_on', 'diz_on', 'ayak_bilek_on', 'parmak_on',
    'kalca_ar', 'diz_ar', 'ayak_bilek_ar', 'parmak_ar',
    'etek_on', 'etek_ar', 'etek_ar_boy', 'bel_kambur', 'onkol_kisalt_on', 'onkol_kisalt_ar',
    'duz_on', 'duz_ar',
)


def bos_poz():
    p = {k: 0.0 for k in ANAHTARLAR}
    p['ky'] = KALCA_Y
    p['kivrim_on'] = p['kivrim_ar'] = 0.35
    return p


# =================================================================================================================
# iskelet (ileri kinematik)
# =================================================================================================================
class Iskelet(dict):
    """Yerel koordinatta eklem konumları ve açılar (yüz +x'e bakar, y aşağı)."""

    def C(self, s):
        return np.array([np.interp(s, self['S'], self['Cx']), np.interp(s, self['S'], self['Cy'])])

    def A(self, s):
        return float(np.interp(s, self['S'], self['Aa']))


def iskelet(p, nefes=0.0):
    sk = Iskelet()
    nf = 0.5 - 0.5 * math.cos(2 * math.pi * nefes)
    kok = _v(p['kx'], p['ky'])
    a_b = p['bel']
    a_g = a_b + p['gogus']
    LT = L_GOVDE + 1.2 * nf
    n_ust, n_alt = 26, 7
    ds = LT / n_ust
    S = np.arange(-n_alt, n_ust + 1) * ds
    kamb = p.get('bel_kambur', 0.0)
    u = S / LT
    Aa = a_b + (a_g - a_b) * smoothstep(0.30, 0.80, u) + kamb * np.sin(np.clip(u, 0, 1) * math.pi) ** 2
    Aa[u < 0] = a_b
    C = np.zeros((len(S), 2))
    i0 = n_alt
    C[i0] = kok
    for i in range(i0, len(S) - 1):
        C[i + 1] = C[i] + ds * _yuk(0.5 * (Aa[i] + Aa[i + 1]))
    for i in range(i0, 0, -1):
        C[i - 1] = C[i] - ds * _yuk(a_b)
    sk['S'], sk['Cx'], sk['Cy'], sk['Aa'], sk['LT'] = S, C[:, 0], C[:, 1], Aa, LT
    sk['kok'] = kok
    sk['a_b'], sk['a_g'] = a_b, a_g
    sk['W'] = sk.C(L_BEL)
    N = sk.C(LT)
    a_N = sk.A(LT)
    sk['N'], sk['a_N'] = N, a_N
    # omuz
    s_om = 0.875 * LT
    a_om = sk.A(s_om)
    S_on = sk.C(s_om) - 4.0 * _onn(a_om) + _yuk(a_om) * (p['omuz_kalk'] + 2.2 * nf)
    sk['s_om'] = s_om
    # boyun / baş
    a_n = a_N + p['boyun']
    Hp = N + L_BOYUN * _yuk(a_n)
    a_h = a_n + p['bas']
    sk['Hp'], sk['a_n'], sk['a_h'] = Hp, a_n, a_h
    sk['M_bas'] = M_bilesik(_cerceve(Hp, a_h), M_olcek(BAS_OLCEK))
    sk['nf'] = nf
    # kollar
    for t, ofs in (('on', 0.0), ('ar', 1.0)):
        St = S_on + (-3.5 * _onn(a_om) + 1.2 * _yuk(a_om)) * ofs
        tu = -a_om + p['omuz_' + t]
        tf = tu + p['dirsek_' + t]
        th = tf + p['el_bilek_' + t]
        kk = 1.0 - 0.5 * p.get('kol_kisalt_' + t, 0.0)
        ku = 1.0 - 0.65 * p.get('ust_kisalt_' + t, 0.0)
        kf = 1.0 - 0.5 * p.get('onkol_kisalt_' + t, 0.0)
        E = St + L_UST * kk * ku * _asg(tu)
        Wr = E + L_ON * kk * kf * _asg(tf)
        sk['S_' + t], sk['E_' + t], sk['Wr_' + t] = St, E, Wr
        sk['tu_' + t], sk['tf_' + t], sk['th_' + t] = tu, tf, th
        ks = 1.0 - 0.45 * p['kisalt_' + t]
        sk['M_el_' + t] = M_bilesik(_cerceve(Wr, 90.0 - th), M_olcek(ks * EL_OLCEK, EL_OLCEK))
        sk['avuc_' + t] = _nokta(sk['M_el_' + t], (AVUC_X, 0.0))
    # bacaklar
    f_b = _onn(a_b)
    for t, ofs in (('on', 0.0), ('ar', 1.0)):
        Hj = kok - f_b * 2.5 * ofs
        tt = p['kalca_' + t]
        ts = tt - p['diz_' + t]
        tfo = ts + 90.0 - p['ayak_bilek_' + t]
        K = Hj + L_UYLUK * _asg(tt)
        A = K + L_BALDIR * _asg(ts)
        sk['H_' + t], sk['K_' + t], sk['A_' + t] = Hj, K, A
        sk['tt_' + t], sk['ts_' + t], sk['tfo_' + t] = tt, ts, tfo
        sk['tp_' + t] = p['parmak_' + t]
        sk['M_ayak_' + t] = _cerceve(A, 90.0 - tfo)
    return sk


# ---- ters kinematik yardımcıları (poz yazarken) -----------------------------------------------------------------
def _ik2(A, B, l1, l2, isaret):
    """A'dan B'ye iki kemik; orta eklem. isaret +1: orta eklem açıyı büyüten (asg açısı) tarafta."""
    d = B - A
    L = float(np.hypot(*d))
    L = min(max(L, abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3)
    phi = _aci_asg(d)
    c = (l1 * l1 + L * L - l2 * l2) / (2 * l1 * L)
    al = math.degrees(math.acos(max(-1.0, min(1.0, c))))
    return A + l1 * _asg(phi + isaret * al)


def bacak_ik(p, taraf, ayak_bilegi):
    """Ayak bileğini verilen yerel noktaya koyacak kalça/diz açılarını yazar (diz önde)."""
    sk = iskelet(p)
    Hj = sk['H_' + taraf]
    A = np.asarray(ayak_bilegi, float)
    K = _ik2(Hj, A, L_UYLUK, L_BALDIR, +1)
    tt = _aci_asg(K - Hj)
    ts = _aci_asg(A - K)
    p['kalca_' + taraf] = tt
    p['diz_' + taraf] = tt - ts
    return p


def _yumusak_erisim(St, W, Lmax, bant):
    """Hedef kolun erişim sınırına yaklaşınca (|W-St| > (1-bant)·Lmax) uzaklığı yumuşakça doyurur: kol hiç tam
    gerilmez, dirsek tekil noktada sıçramaz (C1). bant=0: dokunulmaz."""
    if bant <= 0:
        return W
    d = W - St
    L = float(np.hypot(*d))
    r0 = 1.0 - bant
    r = L / Lmax
    if r <= r0 or L < 1e-9:
        return W
    r_e = r0 + bant * (1.0 - math.exp(-(r - r0) / bant))
    return St + d * (r_e * Lmax / L)


def kol_ik(p, taraf, bilek, isaret=-1, yumusak=0.0):
    """Bileği verilen yerel noktaya koyacak omuz/dirsek açılarını yazar (isaret -1: dirsek arkada/aşağıda,
    +1: dirsek önde/yukarıda). yumusak (ör. 0.08): erişimin son bu kesrinde hedef yumuşakça doyurulur (serbest
    hareket eden ellerde kol tam gerilip dirsek sıçramasın; temas eden ellerde 0 bırakın)."""
    sk = iskelet(p)
    St = sk['S_' + taraf]
    Wr = np.asarray(bilek, float)
    kk = 1.0 - 0.5 * p.get('kol_kisalt_' + taraf, 0.0)
    ku = 1.0 - 0.65 * p.get('ust_kisalt_' + taraf, 0.0)
    kf = 1.0 - 0.5 * p.get('onkol_kisalt_' + taraf, 0.0)
    Wr = _yumusak_erisim(St, Wr, L_UST * kk * ku + L_ON * kk * kf, yumusak)
    E = _ik2(St, Wr, L_UST * kk * ku, L_ON * kk * kf, isaret)
    tu = _aci_asg(E - St)
    tf = _aci_asg(Wr - E)
    a_om = sk.A(sk['s_om'])
    p['omuz_' + taraf] = tu + a_om
    p['dirsek_' + taraf] = tf - tu
    return p


def el_aci(p, taraf, aci_asg):
    """El eksenini (bilek->parmak) verilen mutlak asg açısına getirir."""
    sk = iskelet(p)
    p['el_bilek_' + taraf] = aci_asg - sk['tf_' + taraf]
    return p


def ayak_duz(p, taraf, aci=90.0):
    """Ayağı verilen mutlak açıya (90 = yere paralel) getirir."""
    ts = p['kalca_' + taraf] - p['diz_' + taraf]
    p['ayak_bilek_' + taraf] = ts + 90.0 - aci
    return p


# =================================================================================================================
# biçimler (yerel koordinat)
# =================================================================================================================
def _kapsul_pts(A, B, ra, rb, bp=0.0, bm=0.0, bu=0.45, uc_b='y', ek_b=0.0, n=12, nc=9, uc_a='y'):
    """A'dan B'ye incelen kapsül. bp/bm: +normal / -normal tarafındaki şişkinlik. uc_b='d' düz kesik (manşet)."""
    A = np.asarray(A, float)
    B = np.asarray(B, float)
    d = B - A
    L = float(np.hypot(*d))
    if L < 1e-6:
        d = np.array([0.0, 1.0])
        L = 1e-6
    else:
        d = d / L
    nr = np.array([-d[1], d[0]])
    us = np.linspace(0, 1, n)
    bump = np.exp(-((us - bu) / 0.30) ** 2) * np.sin(np.pi * us) ** 0.6
    wp = ra + (rb - ra) * us + bp * bump
    wm = ra + (rb - ra) * us + bm * bump
    yan_p = A + np.outer(us * L, d) + np.outer(wp, nr)
    yan_m = A + np.outer(us * L, d) - np.outer(wm, nr)
    if uc_b == 'y':
        ph = np.linspace(0, np.pi, nc + 2)[1:-1]
        cap_b = B + rb * (np.outer(np.cos(ph), nr) + np.outer(np.sin(ph), d))
    else:
        Bf = B + d * ek_b
        cap_b = np.array([Bf + nr * wp[-1] * 1.02, Bf + d * 1.2 + nr * wp[-1] * 0.55, Bf + d * 1.5,
                          Bf + d * 1.2 - nr * wm[-1] * 0.55, Bf - nr * wm[-1] * 1.02])
    if uc_a == 'y':
        ph = np.linspace(0, np.pi, nc + 2)[1:-1]
        cap_a = A + ra * (-np.outer(np.cos(ph), nr) - np.outer(np.sin(ph), d))
    else:
        cap_a = np.array([A - d * 1.5])
    return np.vstack([yan_p, cap_b, yan_m[::-1], cap_a])


def _kapsul(*a, **k):
    return _yol(_kapsul_pts(*a, **k), gerilim=0.5)


# ---- el -------------------------------------------------------------------------------------------------------
_EL_GENIS = np.array([
    (-6.0, 9.8), (2.0, 10.8), (12.0, 12.0), (22.0, 12.6), (31.0, 12.4), (40.0, 11.6), (48.0, 10.6), (55.0, 9.0),
    (60.0, 6.2), (62.6, 2.0), (62.6, -2.4), (60.4, -6.6),
    (55.0, -9.6), (47.0, -11.4), (39.0, -12.4), (31.0, -12.8), (22.0, -12.6), (12.0, -11.8), (2.0, -10.8),
    (-6.0, -9.8)])
_EL_KENAR = np.array([
    (-6.0, 6.8), (3.0, 8.4), (12.0, 9.6), (20.0, 9.8), (28.0, 8.8), (36.0, 5.8), (44.0, 4.6), (52.0, 4.0),
    (58.5, 3.2), (61.4, 1.8), (62.2, -0.2), (60.5, -2.2),
    (56.0, -3.4), (50.0, -4.0), (42.0, -4.6), (33.0, -5.2), (24.0, -6.0), (14.0, -6.6), (4.0, -6.8),
    (-6.0, -6.6)])


# yüzeye (yer, uyluk) avuç içiyle düz basmış el, kenardan (avuç +y yanında): taban düz, bilek üstü ince, parmaklar
# bitişik ve uca doğru incelir; başparmak avucun arkasında kalır (silüette görünmez)
_EL_DUZ = np.array([
    (-6.0, 7.6), (3.0, 10.0), (12.0, 10.6), (22.0, 10.6), (31.0, 10.5), (40.0, 10.4), (48.0, 10.3), (55.0, 10.1),
    (60.0, 9.4), (62.8, 7.6), (62.4, 5.4), (59.6, 3.8),
    (55.0, 2.8), (48.0, 1.6), (41.0, 0.0), (33.0, -2.0), (24.0, -3.6), (14.0, -4.6), (4.0, -5.0),
    (-6.0, -5.2)])


def _el_yolu(kivrim, yan, duz=0.0):
    """El çerçevesinde (köken bilek, +x parmaklara, -y başparmak/ön kenar) eldiven biçimi: tek parça yumuşak gövde
    + başparmak. yan 0: elin sırtı/avucu görünür (geniş), +-1: kenardan (ince; avuç +y (+1) ya da -y (-1) yanında).
    kivrim: 0 açık .. 1 yumruk (geniş görünüşte parmaklar kısalır, kenar görünüşte avuca doğru bükülür).
    duz: 0..1 avuç içiyle bir yüzeye düz basmış el (kenar görünüşte avuç tarafı dümdüz, başparmak silüetin içinde);
    yan'ın işaretindeki yana yatar (yan≈+1: avuç yere/uyluğa)."""
    w = min(1.0, abs(yan))
    sg = 1.0 if yan >= 0 else -1.0
    kv = min(1.0, max(0.0, kivrim))
    dz = min(1.0, max(0.0, duz)) * w
    kenar = _EL_KENAR if sg > 0 else np.stack([_EL_KENAR[:, 0], -_EL_KENAR[:, 1]], 1)[::-1]
    if dz > 1e-4:
        duz_b = _EL_DUZ if sg > 0 else np.stack([_EL_DUZ[:, 0], -_EL_DUZ[:, 1]], 1)[::-1]
        kenar = kenar * (1.0 - dz) + duz_b * dz
        kv = kv * (1.0 - dz)
    pts = _EL_GENIS * (1.0 - w) + kenar * w
    # parmaklar: eklem hattı (x≈31) ötesi kısalır (geniş) ve avuca doğru döner (kenar)
    x, y = pts[:, 0].copy(), pts[:, 1].copy()
    wf = smoothstep(24.0, 36.0, x)
    kis = 1.0 - 0.58 * kv * (1.0 - w)
    x = 31.0 + (x - 31.0) * (1.0 - wf * (1.0 - kis))
    th = math.radians(kv * 82.0 * w) * sg * wf
    piv_y = 2.0 * sg * w
    dx, dy = x - 31.0, y - piv_y
    x2 = 31.0 + dx * np.cos(th) - dy * np.sin(th)
    y2 = piv_y + dx * np.sin(th) + dy * np.cos(th)
    govde = _yol(np.stack([x2, y2], 1), gerilim=0.5)
    # başparmak
    b_g0, b_g1 = np.array([6.0, -9.0]), np.array([25.5, -15.2])
    b_g1 = b_g1 + (np.array([29.0, -10.0]) - b_g1) * _ss(0.35, 1.0, kv)
    b_k0, b_k1 = np.array([5.0, 4.0 * sg]), np.array([26.0, 8.8 * sg])
    if dz > 1e-4:                        # düz basan elde başparmak avucun arkasında (silüetin içinde)
        b_k0 = b_k0 + (np.array([6.0, 2.5 * sg]) - b_k0) * dz
        b_k1 = b_k1 + (np.array([22.0, 4.5 * sg]) - b_k1) * dz
    b0 = b_g0 + (b_k0 - b_g0) * w
    b1 = b_g1 + (b_k1 - b_g1) * w
    p_bas = _kapsul(b0, b1, 5.8 - 1.0 * w, 4.5 - 0.6 * w, n=6, nc=7)
    return _birlesim(govde, p_bas)


# ---- ayakkabı ---------------------------------------------------------------------------------------------------
_AYAKKABI = np.array([
    (-19.0, 25.6), (-22.5, 19.0), (-23.6, 10.0), (-22.0, 1.0), (-18.5, -6.5), (-11.0, -9.5), (-1.0, -10.5),
    (8.0, -9.0), (16.0, -5.5), (26.0, -1.0), (38.0, 4.0), (50.0, 7.6), (61.0, 10.0), (70.0, 12.4), (76.5, 15.8),
    (79.0, 20.0), (77.5, 24.2), (72.0, 25.8), (50.0, 26.0), (20.0, 26.0), (0.0, 26.0),
])


# çoraplı ayak (ayakkabısız; seccadede): aynı ayak çerçevesi, daha ince ve kısa, taban/topuk yok, yumuşak burun
_CORAP = np.array([
    (-13.6, 25.6), (-18.8, 22.6), (-21.0, 16.4), (-20.6, 9.6), (-18.4, 3.4), (-15.6, -2.2), (-14.2, -8.0),
    (-12.6, -12.8), (-3.0, -14.2), (6.2, -12.4), (8.8, -6.4), (14.6, -1.4), (25.0, 3.8), (37.0, 8.6), (49.0, 12.4),
    (58.5, 15.2), (65.0, 17.4), (69.2, 20.4), (69.0, 24.2), (64.6, 26.0), (50.0, 26.2), (34.0, 25.1), (16.0, 25.1),
    (2.0, 25.9),
])


def _parmak_bük(pts, parmak, w0=-6.0, w1=4.0):
    if abs(parmak) > 1e-3:
        px, py = TOP_X, 26.0
        for i, (x, y) in enumerate(pts):
            w = _ss(TOP_X + w0, TOP_X + w1, x)
            if w <= 0:
                continue
            a = math.radians(parmak * w)
            dx, dy = x - px, y - py
            pts[i] = (px + dx * math.cos(a) + dy * math.sin(a), py - dx * math.sin(a) + dy * math.cos(a))
    return pts


def _ayakkabi_pts(parmak):
    return _parmak_bük(_AYAKKABI.copy(), parmak)


def _corap_pts(parmak):
    return _parmak_bük(_CORAP.copy(), parmak, -11.0, 7.0)      # yumuşak (kumaş) kıvrım


def _ayak_pts(parmak, ayakkabi=True):
    return _ayakkabi_pts(parmak) if ayakkabi else _corap_pts(parmak)


# ---- baş --------------------------------------------------------------------------------------------------------
# baş çerçevesi: köken = baş pivotu (atlas), +x yüz yönü, y aşağı; ayakta baş tepesi y≈-59, çene altı y≈+21
_BAS_DERI = np.array([
    (24.2, -44.0), (27.0, -39.0), (29.4, -33.0), (30.9, -27.4), (31.2, -23.6), (30.1, -20.0), (31.4, -16.6),
    (33.6, -12.0), (35.4, -9.4), (36.7, -7.4), (37.2, -5.5), (36.8, -3.9), (35.6, -2.8), (33.6, -2.1), (32.4, 2.0),
    (31.8, 6.0), (31.6, 10.0), (31.2, 14.5), (28.8, 19.0), (23.5, 21.2), (14.0, 19.0), (6.0, 15.5),
    (-6.0, 10.0), (-22.0, 2.0), (-31.0, -4.0), (-36.5, -16.0), (-37.6, -29.0), (-34.6, -43.0), (-25.0, -54.6),
    (-9.0, -59.8), (7.0, -58.6), (17.6, -53.6),
])
_SAC = np.array([
    (24.2, -44.0), (24.7, -46.8), (23.2, -50.8), (19.4, -55.0), (12.6, -59.2), (3.0, -61.8), (-9.0, -62.2),
    (-21.5, -58.8), (-30.8, -51.8), (-37.0, -41.5), (-39.4, -29.0), (-38.8, -17.0), (-36.2, -9.0), (-33.0, -4.2),
    (-30.0, -2.0), (-26.0, -3.4), (-21.5, -7.2), (-18.2, -13.0), (-16.6, -19.5), (-14.6, -24.5), (-10.6, -27.4),
    (-5.6, -28.2), (-1.6, -27.0), (0.6, -23.5), (1.0, -17.0), (1.2, -10.0), (6.2, -10.0), (6.2, -18.0),
    (6.8, -25.0), (9.4, -31.2), (13.6, -36.6), (19.0, -40.8),
])
_SAKAL = np.array([
    (1.0, -16.0), (6.2, -16.0), (6.2, -9.5), (9.0, -3.0), (14.0, 1.2), (19.5, 3.4), (24.0, 4.4),
    (26.6, 3.4), (27.6, 0.6), (30.0, -1.0), (32.4, -1.5), (34.3, -0.8), (35.0, 1.0), (34.6, 3.2),
    (33.8, 5.4), (34.3, 8.4), (34.9, 12.4), (33.9, 17.4), (30.8, 21.6), (25.0, 23.6), (17.0, 22.2),
    (9.0, 18.4), (2.6, 13.8), (-1.4, 8.6), (-2.0, 2.0), (-0.6, -6.0), (0.6, -12.0),
])
_KULAK = np.array([
    (-9.6, -22.4), (-13.0, -19.4), (-14.2, -13.0), (-12.8, -6.6), (-10.2, -2.4), (-7.4, -2.0), (-5.6, -4.4),
    (-4.8, -10.0), (-5.0, -16.6), (-6.6, -21.0),
])
_KULAK_IC = np.array([(-7.6, -18.2), (-10.6, -16.6), (-11.4, -12.0), (-10.0, -7.2)])


def _bas_yollari():
    deri = _yol(_BAS_DERI, gerilim=0.5)
    sac = _yol(_SAC, gerilim=0.5)
    sakal = _yol(_SAKAL, gerilim=0.5)
    kulak = _yol(_KULAK, gerilim=0.5)
    return deri, sac, sakal, kulak


_BAS_YOLLARI = None
_KIL = None


def _sac_sakal_yolu():
    """Saç + sakal tek biçim (favori ekleminde dikiş olmasın)."""
    global _KIL
    if _KIL is None:
        deri, sac, sakal, kulak = bas_yollari()
        _KIL = _birlesim(sac, sakal)
    return _KIL


def bas_yollari():
    global _BAS_YOLLARI
    if _BAS_YOLLARI is None:
        _BAS_YOLLARI = _bas_yollari()
    return _BAS_YOLLARI


# ---- gövde / gömlek ---------------------------------------------------------------------------------------------
_GU = np.array([-0.30, -0.12, 0.00, 0.20, 0.36, 0.50, 0.62, 0.72, 0.80, 0.88, 0.95, 1.00])
_GF = np.array([40.0, 40.0, 39.5, 38.8, 39.0, 40.6, 42.6, 43.6, 43.0, 38.5, 30.5, 21.0])   # ön (karın/göğüs)
_GB = np.array([45.0, 46.5, 45.5, 39.5, 37.6, 38.2, 40.0, 41.6, 42.0, 39.6, 33.0, 23.0])   # arka (kalça/sırt)


def _govde_genislik(u, nf=0.0):
    wf = np.interp(u, _GU, _GF) + nf * 1.6 * np.exp(-((u - 0.7) / 0.15) ** 2)
    wb = np.interp(u, _GU, _GB)
    return wf, wb


def _kose_r(d_gir, d_cik, r0, r1, uzun):
    """Köşe yuvarlama yarıçapı: dönüş açısı büyüdükçe (sivri köşe) r0 -> r1; komşu kenarların ~%40'ını aşmaz."""
    c = float(np.clip(np.dot(d_gir, d_cik), -1.0, 1.0))
    donus = math.degrees(math.acos(c))
    return float(min(r0 + (r1 - r0) * _ss(60.0, 150.0, donus), max(2.0, 0.4 * uzun)))


def _kose(P, d_gir, d_cik, r):
    """P köşesini yuvarlayan 3 nokta (gelen yön d_gir, giden yön d_cik)."""
    a = P - d_gir * r
    b = P + d_cik * r
    m = P + (b - a) * 0.0 + (-d_gir + d_cik) * r * 0.30
    return [a, m, b]


def _gomlek_yolu(sk, p):
    LT = sk['LT']
    nf = sk['nf']
    a_b = sk['a_b']
    f_b = _onn(a_b)
    phi_govde = -a_b
    tt_on, tt_ar = sk['tt_on'], sk['tt_ar']
    tt_max = _smax(tt_on, tt_ar, 8.0)
    tt_min = _smin(tt_on, tt_ar, 8.0)
    hf = tt_max + a_b                        # kalça bükülmesi (derece)
    wk = _ss(35.0, 85.0, hf)                 # uyluk gövdeye yaklaştıkça ön etek uyluğun üstüne yatar
    s_alt = -0.10 * LT
    s_on_men = s_alt + (0.12 * LT - s_alt) * wk
    # etek menteşeleri ve kanatlar (yerçekimi + uyluk + zemin)
    c0 = sk.C(s_alt)
    wf0, wb0 = _govde_genislik(s_alt / LT)
    F0a = c0 + f_b * wf0
    # ön yüz noktaları; gövde öne eğikken bol gömlek göğüsten DİKEY sarkar (karına yapışıp kalçada içe kırılmaz)
    on_s = np.linspace(s_on_men, LT, 20)
    on = []
    for s_ in on_s:
        wf, _ = _govde_genislik(s_ / LT, nf)
        on.append(sk.C(s_) + _onn(sk.A(s_)) * wf)
    on = np.array(on)
    w_d = 0.7 * _ss(4.0, 16.0, a_b) * (1.0 - _ss(40.0, 60.0, a_b)) * (1.0 - wk)
    dx0 = 0.0
    if w_d > 1e-3:
        ust = on_s / LT > 0.4
        i_t = int(np.argmax(np.where(ust, on[:, 0], -1e9)))
        xt, yt = on[i_t]
        x_once = float(on[0, 0])
        for i in range(i_t - 1, -1, -1):
            x_d = max(on[i, 0], xt - (on[i, 1] - yt) * 0.26)
            on[i, 0] += (x_d - on[i, 0]) * w_d
        dx0 = float(on[0, 0]) - x_once           # etek menteşesi de aynı kadar öne (w_d ile sürekli)
    F0a = F0a + _v(dx0, 0.0)
    L_on, L_ar = 25.0, 26.0
    phi_g = 0.28 * max(-60.0, min(60.0, phi_govde))      # kumaş gövdeyi kısmen izler, kısmen sarkar
    phi_f = _smax(phi_g, tt_max - 3.0, 10.0) + p.get('etek_on', 0.0)
    phi_f = phi_f + (max(phi_f, 0.0) - phi_f) * w_d      # sarkan ön etek geriye kaçmaz
    F1a = F0a + L_on * _asg(phi_f)
    Hj = sk['H_on'] if tt_on >= tt_ar else sk['H_ar']
    dt = _asg(tt_max)
    nt = np.array([-dt[1], dt[0]])
    F1b = Hj + dt * 50.0 - nt * 28.0        # uyluğun üst yüzüne yatan etek ucu (yakın uyluk onu örter)
    F1 = F1a + (F1b - F1a) * wk
    # çömelip öne eğilince (uyluk kalkık, gövde öne) sırt kumaşı gerilir: arka kanat kısalır ve oturağın altına
    # doğru döner (aşağı sarkan sivri kuyruk olmasın); dik oturuş, secde ve ayakta etkilenmez. Gömlek sırtta
    # yukarı sıyrılır: arka etek kalça hattına çıkar (pantolonun oturağı altında görünür, "pelerin" olmaz)
    g_c = wk * _ss(4.0, 30.0, sk['a_b']) * (1.0 - _ss(55.0, 80.0, sk['a_b']))
    s_alt_b = s_alt + (0.04 * LT - s_alt) * g_c
    c0b = sk.C(s_alt_b)
    B0 = c0b - _onn(sk.A(s_alt_b)) * _govde_genislik(s_alt_b / LT)[1]
    phi_b = _smin(phi_g, tt_min + 2.0, 10.0) + p.get('etek_ar', 0.0) + 30.0 * g_c
    db = _asg(phi_b)
    Lb = (L_ar + p.get('etek_ar_boy', 0.0)) * (1.0 - 0.55 * g_c)
    batma = B0[1] + Lb * db[1] + 1.5          # >0: kanat zemine giriyor
    if db[1] > 1e-3 and batma > 0:           # zemine değince orada biter (yerde yatar)
        Lb = max(0.0, (-1.5 - B0[1]) / db[1])
    w_yer = _ss(-12.0, 6.0, batma)           # kanat ucu zemine yaklaşınca etek yere yatmaya başlar (sivri kuyruk yok)
    B1 = B0 + Lb * db
    F1[1] = min(F1[1], -1.5)
    B1[1] = min(B1[1], -1.5)
    # arka kanat kalçanın (oturak) üstünden dolansın: B0-B1 doğrusu oturağı kesiyorsa orta nokta dışarı itilir
    a_bb = sk['a_b']
    f_bb, u_bb = _onn(a_bb), _yuk(a_bb)
    oc = sk['H_on'] - f_bb * 12.0 - u_bb * 9.0
    orta_b = 0.5 * (B0 + B1)
    dv = B1 - B0
    nb = np.array([dv[1], -dv[0]]) / (np.hypot(*dv) + 1e-9)
    if np.dot(orta_b - sk["kok"], nb) < 0:
        nb = -nb
    ihtiyac = (29.0 + 4.0) - float(np.dot(orta_b - oc, nb))
    Bm = orta_b + nb * max(1.5, ihtiyac)
    orta = 0.5 * (F1 + B1) + _v(0, 2.0)
    orta[1] = min(orta[1], -1.5)
    on = list(on)
    ar = []
    for s in np.linspace(s_alt_b, LT, 22):
        c = sk.C(s)
        _, wb = _govde_genislik(s / LT, nf)
        ar.append(c - _onn(sk.A(s)) * wb)
    N = sk['N']
    aN = sk['a_N']
    fN, uN = _onn(aN), _yuk(aN)
    yaka_on = N + fN * 18.0 - uN * 5.0
    yaka_ar = N - fN * 20.5 + uN * 7.0
    F0 = on[0]
    dh = orta - B1
    dh = dh / (np.hypot(*dh) + 1e-9)
    df = F1 - orta
    df = df / (np.hypot(*df) + 1e-9)
    dF = F1 - F0
    dF = dF / (np.hypot(*dF) + 1e-9)
    # köşeler dönüş açısıyla orantılı yarıçapla yuvarlanır (çömelme/oturmada sivri "kuyruk" olmasın);
    # her köşe hep 3 nokta: geçişlerde biçim sürekli
    din = B1 - Bm
    din = din / (np.hypot(*din) + 1e-9)
    rB = _kose_r(din, dh, 6.0, 15.0, min(2.0 * np.hypot(*(B1 - Bm)), np.hypot(*(orta - B1))))
    rF = _kose_r(df, -dF, 6.5, 12.0, min(np.hypot(*(F1 - orta)), np.hypot(*(F1 - F0))))
    kB = _kose(B1, din, dh, rB)
    kF = _kose(F1, df, -dF, rF)
    etek_a = [Bm] + kB + [0.6 * B1 + 0.4 * orta, orta, 0.4 * orta + 0.6 * F1] + kF
    # etek yerde yatıyor: köşe yuvarlak, kenar zemin boyunca öne (aynı nokta sayısı: sürekli geçiş)
    yer_d = _v(1.0, 0.0)
    rBy = _kose_r(din, yer_d, 6.0, 12.0, 2.0 * np.hypot(*(B1 - Bm)))
    B1y = B1 + _v(max(24.0, 0.3 * (F1[0] - B1[0])) + rBy, 0.0)
    kBy = _kose(B1, din, yer_d, rBy)
    etek_b = [Bm] + kBy + [B1y, 0.5 * (B1y + F1), 0.25 * B1y + 0.75 * F1] + kF
    etek = [a_ * (1.0 - w_yer) + b_ * w_yer for a_, b_ in zip(etek_a, etek_b)]
    cevre = ([0.45 * F1 + 0.55 * F0] + on + [yaka_on, N + uN * 3.0 + fN * 2.0, yaka_ar] + ar[::-1] + etek)
    yol = _yol(cevre, gerilim=0.42)
    return yol, dict(F1=F1, B1=B1, F0=F0, B0=B0)


def _gomlek_maskesi(sk, gom, Mf, kenar):
    """Gömlek maskesi; kalça hattının üstünde (gövde yönünde) yakın uyluğun örttüğü yer oyulur: uyluk göğse
    çekildiğinde (oturma, secde) uyluk gövdenin önünde görünür, ayakta/yürürken etek uyluk kökünü örter."""
    olc = math.sqrt(abs(np.linalg.det(Mf[:2, :2])))
    sig = 4.5 * olc                          # kumaşta sivri köşe yok: bulanıklaştır + yeniden eşikle (yuvarlama)
    k = yollar_kirp([gom], Mf, 6 + 3 * kenar + 2.0 * sig)
    m = maske_ciz([gom], Mf, k)
    if k.bos():
        return k, m
    if sig > 0.8:
        mb = cv2.GaussianBlur(m, (0, 0), sig)
        m = np.clip((mb - 0.5) * (2.5 * sig) + 0.5, 0.0, 1.0).astype(np.float32)
    tt = sk['tt_on']
    dt = _asg(tt)
    Hj = sk['H_on']
    u_b = _yuk(sk['a_b'])
    kok = sk['kok']
    # uyluğun kalça hattının üstünde kalan kısmı var mı? (hızlı ret)
    K = sk['K_on']
    if float(np.dot(K - kok, u_b)) < -10.0 or tt < 70.0:
        return k, m
    Mi = np.linalg.inv(Mf)
    xs = np.arange(k.x0, k.x0 + k.w, dtype=np.float32) + 0.5
    ys = np.arange(k.y0, k.y0 + k.h, dtype=np.float32) + 0.5
    XX, YY = np.meshgrid(xs, ys)
    X = Mi[0, 0] * XX + Mi[0, 1] * YY + Mi[0, 2]
    Y = Mi[1, 0] * XX + Mi[1, 1] * YY + Mi[1, 2]
    t_boy = (X - Hj[0]) * dt[0] + (Y - Hj[1]) * dt[1]
    h = (X - kok[0]) * u_b[0] + (Y - kok[1]) * u_b[1]
    w = smoothstep(16.0, 36.0, t_boy) * smoothstep(-4.0, 14.0, h) * _ss(70.0, 105.0, tt)
    if w.max() < 1e-3:
        return k, m
    ml = maske_ciz([_bacak_yolu(sk, 'on')], Mf, k)
    return k, (m * (1.0 - ml * w)).astype(np.float32)


def _yaka_cizgisi(sk):
    N = sk['N']
    aN = sk['a_N']
    fN, uN = _onn(aN), _yuk(aN)
    return [N - fN * 19.5 + uN * 0.5, N - fN * 6.0 - uN * 3.5, N + fN * 8.0 - uN * 7.5, N + fN * 17.0 - uN * 10.5]


# ---- kol / bacak ------------------------------------------------------------------------------------------------
def _dolgu(A, J, B, r, L0=40.0):
    """Eklem iç köşesini yuvarlayan köprü kapsül (hafif bükülmede kırık/çentik görünmesin)."""
    ua = A - J
    ub = B - J
    la, lb = float(np.hypot(*ua)), float(np.hypot(*ub))
    if la < 1e-6 or lb < 1e-6:
        return None
    ua, ub = ua / la, ub / lb
    buk = 180.0 - math.degrees(math.acos(max(-1.0, min(1.0, float(np.dot(ua, ub))))))
    if buk < 2.0:
        return None
    L = L0 * max(0.12, min(1.0, 1.0 - buk / 100.0))
    L = min(L, 0.45 * la, 0.45 * lb)
    return _kapsul(J + ua * L, J + ub * L, r, r, n=6, nc=7)


def _kol_yolu(sk, t):
    S, E, Wr = sk['S_' + t], sk['E_' + t], sk['Wr_' + t]
    ust = _kapsul(S, E, 20.5, 16.0, bp=1.0, bm=1.5, bu=0.35)
    on = _kapsul(E, Wr, 16.0, 12.6, bp=1.6, bm=1.2, bu=0.25, uc_b='d', ek_b=2.5)
    return _birlesim(ust, on, _dolgu(S, E, Wr, 15.6, 34.0))


def _bacak_yolu(sk, t):
    Hj, K, A = sk['H_' + t], sk['K_' + t], sk['A_' + t]
    uy = _kapsul(Hj, K, 32.0, 21.5, bp=2.0, bm=3.0, bu=0.35)
    d = A - K
    d = d / (np.hypot(*d) + 1e-9)
    bal = _kapsul(K, A, 21.5, 19.0, bp=4.5, bm=1.0, bu=0.28, uc_b='d', ek_b=5.5)
    # kalça (oturak) kütlesi pelvis çerçevesinde
    a_b = sk['a_b']
    f_b, u_b = _onn(a_b), _yuk(a_b)
    c = Hj - f_b * 12.0 - u_b * 9.0
    otur = yol_elips(float(c[0]), float(c[1]), 29.0, 28.5, a_b)
    return _birlesim(uy, bal, otur, _dolgu(Hj, K, A, 21.0))


# =================================================================================================================
# boyama
# =================================================================================================================
class _Boyaci:
    def __init__(self, t, Mf, isik, tohum):
        self.t = t
        self.Mf = Mf
        self.s = math.sqrt(abs(np.linalg.det(Mf[:2, :2])))
        L = np.asarray(isik, float)
        self.L = L / (np.hypot(*L) + 1e-9)
        self.tohum = int(tohum) * 101
        s = self.s
        self.ed = dict(kenar=float(np.clip(0.55 + 0.28 * s, 0.55, 1.3)), dalga=0.03, islak=1.0,
                       islak_gen=float(np.clip(0.9 + 0.9 * s, 0.9, 3.0)), gran=0.07, akis=0.07)
        self.n = 0

    def _toh(self):
        self.n += 1
        return self.tohum + self.n * 7

    def bolum(self, k):
        """Doku tohum sayacını parçaya özgü sabit bir değere kurar: bir parçadaki koşullu darbe (kıvrım, boş gölge)
        sonraki parçaların dokusunu kaydırmasın (geçişlerde eşik aşılınca doku sıçraması / titreme olmaz)."""
        self.n = 64 * int(k)

    def lavi(self, yol, renk_, yog, M=None, **kw):
        a = dict(self.ed)
        a.update(kw)
        self.t.lavi(yol, self.Mf if M is None else M, renk_, yog=yog, tohum=self._toh(), **a)

    def golge(self, yol, renk_, yog, d, M=None, sertlik=0.30, islak=0.45, carp=None):
        """Işıktan uzak yana ikinci sır: biçim eksi ışığa kaydırılmış biçim (hilal). carp=(k, m): hazır maske
        (biçimin örtülmüş hâli) ile çarpılır."""
        M = self.Mf if M is None else M
        if carp is not None:
            k = carp[0]
        else:
            k = yollar_kirp([yol], M, 6 + 3 * self.ed['kenar'] + d * self.s)
        if k.bos():
            return
        m = maske_ciz([yol], M, k)
        dp = d * self.s
        T = np.float32([[1, 0, self.L[0] * dp], [0, 1, self.L[1] * dp]])
        sh = cv2.warpAffine(m, T, (k.w, k.h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        sig = max(0.5, sertlik * dp)
        sh = cv2.GaussianBlur(sh, (0, 0), sig)
        mm = cv2.GaussianBlur(m, (0, 0), 0.45)
        hil = mm * (1.0 - sh)
        if carp is not None:
            hil = hil * np.clip((carp[1] - 0.25) * 2.0, 0.0, 1.0)
        if hil.max() < 1e-3:
            return
        self.t.lavi([], M, renk_, yog=yog, maske=(k, hil), yumusak=0.35, dalga=0.0, islak=islak,
                    islak_gen=self.ed['islak_gen'], gran=0.08, akis=0.07, tohum=self._toh())

    def kat(self, pts, w0, w1, renk_, yog, M=None, kirp=None, carp=None):
        """İnce, iki ucu sivri kıvrım darbesi. kirp: yalnız bu biçimin içinde; carp=(k, m) hazır maskeyle."""
        pts = np.asarray(pts, float)
        n = len(pts)
        if n < 2:
            return
        u = np.linspace(0, 1, n)
        wd = (w0 + (w1 - w0) * u) * np.sin(np.pi * np.clip(u * 0.92 + 0.04, 0, 1)) ** 0.7
        tan = np.gradient(pts, axis=0)
        tan /= (np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9)
        nr = np.stack([-tan[:, 1], tan[:, 0]], 1)
        sol = pts + nr * wd[:, None]
        sag = pts - nr * wd[:, None]
        yol = _yol(list(sol) + list(sag[::-1]), gerilim=0.45)
        if kirp is not None:
            yol = yol_op(yol, kirp, 'kesisim')
            if yol.isEmpty():
                return
        if carp is not None:
            k, mc = carp
            if k.bos():
                return
            m = maske_ciz([yol], self.Mf if M is None else M, k)
            m = m * np.clip((mc - 0.3) * 2.0, 0.0, 1.0)
            if m.max() < 1e-3:
                return
            self.t.lavi([], self.Mf if M is None else M, renk_, yog=yog, maske=(k, m.astype(np.float32)),
                        tohum=self._toh(), kenar=self.ed['kenar'] * 1.2, dalga=0.03, islak=0.5,
                        islak_gen=self.ed['islak_gen'], gran=0.05, akis=0.1)
            return
        self.lavi(yol, renk_, yog, M=M, kenar=self.ed['kenar'] * 1.2, islak=0.5, gran=0.05, akis=0.1)

    def sakla(self, yol, M=None, asin=0.6, maske=None):
        """Biçimi saklamaya yazar; kenarı asin px içeri çekilir ki arkadaki lavi hafifçe altına girsin
        (beyaz boşluk değil, ince pigment bindirmesi)."""
        M = self.Mf if M is None else M
        if maske is not None:
            k, m = maske
        else:
            k = yollar_kirp([yol], M, 4)
            m = maske_ciz([yol], M, k)
        if k.bos() or m.size == 0:
            return
        m = cv2.GaussianBlur(m, (0, 0), 0.7)
        m = np.clip((m - 0.5) / 0.32 + 0.5 - asin * 0.9, 0.0, 1.0)
        self.t.sakla_ekle(None, M, yumusak=0.0, maske=(k, m))


def _uzak(c, miktar=0.22):
    return karistir(c, RENK['uzak'], miktar)


def _battaniye_yolu(sk, b, dus=0.0):
    """Omuzlardan dökülüp oturan bedeni ayaklara kadar saran battaniye; b (0..1) görünen kısım (etek omuzdan
    zemine iner). dus (0..1): battaniye omuzlardan kayar (üst kenarı zemine iner).
    Dönüş: (görünen biçim, şerit bandı, ikinci şerit, kıvrım darbeleri, üst kenar noktaları ya da None)."""
    LT = sk['LT']
    N, aN = sk['N'], sk['a_N']
    fN, uN = _onn(aN), _yuk(aN)
    a_om = sk.A(sk['s_om'])
    S = sk['S_on']
    K = sk['K_on'] if sk['K_on'][1] < sk['K_ar'][1] else sk['K_ar']
    A = sk['A_on']
    # arka: sırt boyunca dışarıda
    arka = []
    for s_ in np.linspace(0.97 * LT, -0.08 * LT, 12):
        c = sk.C(s_)
        _, wb = _govde_genislik(s_ / LT)
        arka.append(c - _onn(sk.A(s_)) * (wb + 12.0 + 3.0 * (1 - s_ / LT)))
    x_arka = min(q[0] for q in arka) - 3.0
    arka.append(np.array([x_arka - 2.0, -12.0]))
    arka.append(np.array([x_arka + 6.0, 0.6]))
    # ön: göğüsten dize, dizden kaval önünden ayağa
    ts = sk['ts_on']
    ds = _asg(ts)
    ns = np.array([-ds[1], ds[0]])           # +: baldır arkası, -: ön (kaval)
    on_ust = N + fN * 21.0 - uN * 2.0
    diz_ust = K + _v(6.0, -35.0)
    sarkma = 0.5 * (on_ust + diz_ust) + _v(4.0, 6.0)
    kaval1 = K - ns * 40.0 + ds * 34.0
    kaval2 = A - ns * 33.0 + ds * 4.0
    ayak_on = np.array([A[0] + 34.0, 0.6])
    ust = [N - fN * 25.0 + uN * 5.0, S + _yuk(a_om) * 29.0 - _onn(a_om) * 2.0,
           S + _yuk(a_om) * 27.0 + _onn(a_om) * 15.0, N + fN * 14.0 + uN * 6.0]
    # eller dizin önündeyse battaniye onları da örter
    # (yalnız diz çevresindeki eller; öne uzanan kollar battaniyeyi şişirmesin)
    w_el = 0.0
    el_x = K[0] + 18.0
    for t_ in ('on', 'ar'):
        av = sk['avuc_' + t_]
        w_ = _ss(112.0, 82.0, float(np.hypot(*(av - K))))
        if w_ > 0:
            el_x = max(el_x, K[0] + 18.0 + (av[0] - K[0] - 18.0) * w_)
    on_diz = K + _v(38.0, -10.0)
    on_el = np.array([max(K[0] + 38.0, el_x + 20.0), 0.5 * (on_diz[1] + kaval1[1])])
    kaval1 = np.array([max(kaval1[0], on_el[0] - 4.0), kaval1[1]])
    # çevre: üst (boyun arkası -> omuz) -> ön (göğüs -> diz -> kaval -> ayak) -> zemin -> arka (yukarı)
    cevre = ust + [on_ust, sarkma, diz_ust, on_diz, on_el, kaval1, kaval2, ayak_on] + arka[::-1]
    tam = _yol(cevre, gerilim=0.42)
    # etek hattı
    y_ust = S[1] - 34.0
    y_alt = 10.0
    yh = y_ust + (y_alt - y_ust) * b
    xs = np.linspace(x_arka - 60.0, A[0] + 120.0, 16)
    xc = 0.5 * (xs[0] + xs[-1])

    def etek_y(x, ek=0.0):
        return yh + ek - 0.10 * (x - xc) + 3.0 * math.sin(x * 0.045 + 1.3)
    bolge = [(x, etek_y(x)) for x in xs] + [(xs[-1], -900.0), (xs[0], -900.0)]
    gorunen = yol_op(tam, _yol(bolge, gerilim=0.3), 'kesisim')
    ust_kenar = None
    if dus > 1e-3:                           # omuzlardan kayış: üst kenar (yumuşak dalgalı kumaş kenarı) zemine iner
        e = dus * dus * (3.0 - 2.0 * dus)
        y0 = S[1] - 70.0
        def ust_y(x):
            return y0 + (12.0 - y0) * e + 0.12 * (x - xc) * (1.0 - e) + 4.0 * math.sin(x * 0.05 + 0.4) * (1 - e)
        ust_kenar = [(x, ust_y(x)) for x in xs]
        kes = ust_kenar + [(xs[-1], 40.0), (xs[0], 40.0)]
        gorunen = yol_op(gorunen, _yol(kes, gerilim=0.3), 'kesisim')
    bant_pts = [(x, etek_y(x, -21.0)) for x in xs] + [(x, etek_y(x, -31.0)) for x in xs[::-1]]
    bant = yol_op(gorunen, _yol(bant_pts, gerilim=0.3), 'kesisim')
    bant2_pts = [(x, etek_y(x, -36.0)) for x in xs] + [(x, etek_y(x, -39.5)) for x in xs[::-1]]
    bant2 = yol_op(gorunen, _yol(bant2_pts, gerilim=0.3), 'kesisim')
    kivrim = [[S + _yuk(a_om) * 10.0 - _onn(a_om) * 22.0, sk.C(0.55 * LT) - _onn(sk.A(0.55 * LT)) * 44.0,
               sk.C(0.15 * LT) - _onn(sk.A(0.15 * LT)) * 50.0],
              [diz_ust + _v(-6.0, 22.0), K + _v(14.0, 40.0), A + _v(6.0, -20.0)]]
    return gorunen, bant, bant2, kivrim, ust_kenar


def _boya_battaniye(B, sk, b, R, dus=0.0):
    gor, bant, bant2, kivrim, ust_kenar = _battaniye_yolu(sk, b, dus)
    if gor.isEmpty():
        return
    B.lavi(gor, R['battaniye'], YOG['battaniye'])
    # aşağıya doğru koyulaşan ikinci, eşiksiz sır (kumaşın ağırlığı / zemine yakın gölge)
    y_ust = sk['S_on'][1]

    def _asagi(X, Y, y0=y_ust):
        return smoothstep(y0 + 40.0, 0.0, Y).astype(np.float32)
    B.lavi(gor, R['battaniye_golge'], 0.16, yog_fn=_asagi, islak=0.2)
    B.golge(gor, R['battaniye_golge'], 0.30, 16.0)
    if not bant.isEmpty():
        B.lavi(bant, R['battaniye_serit'], 0.30, islak=0.6)
    if not bant2.isEmpty():
        B.lavi(bant2, R['battaniye_serit2'], 0.32, islak=0.5)
    for k_ in kivrim:
        B.kat(k_, 2.2, 1.0, R['battaniye_golge'], 0.20, kirp=gor)
    if ust_kenar is not None:                # kayan üst kenar: kıvrılmış kumaşın koyu, yumuşak katı
        uk = np.array(ust_kenar) + _v(0.0, 7.0)
        B.kat(uk, 4.0, 4.0, R['battaniye_golge'], 0.30, kirp=gor)
    B.sakla(gor)


def _zemin_golge(B, sk, guc, R, ayakkabi=True):
    """Figürün yere değdiği yerin altına yumuşak, saydam lila gölge (figürün arkasında kalır)."""
    pts = []
    for t_ in ('on', 'ar'):
        pts += list(_uygula(sk['M_ayak_' + t_], _ayak_pts(sk['tp_' + t_], ayakkabi)))
        pts += [sk['K_' + t_] + _v(0, 22.0), sk['avuc_' + t_] + _v(0, 8.0)]
    pts += [sk['kok'] + _v(-40.0, 40.0), sk['kok'] + _v(30.0, 40.0)]
    pts = np.array([q for q in pts if q[1] > -14.0])
    if len(pts) == 0:
        return
    x0, x1 = pts[:, 0].min() - 10.0, pts[:, 0].max() + 10.0
    yol = yol_elips(0.5 * (x0 + x1), 1.0, 0.5 * (x1 - x0) + 6.0, 7.0)
    B.lavi(yol, R['zemin_golge'], 0.30 * guc, yumusak=max(2.0, 5.0 * B.s), dalga=0.0, islak=0.0, gran=0.05)


def ciz_insan(t, M, poz, yon=1, isik=(-0.6, -0.8), battaniye=0.0, sakla_sonra=True, elde=None, nefes=0.0,
              zemin_golge=0.35, tohum=0, renkler=None, battaniye_alfa=1.0, ayakkabi=True):
    R = dict(RENK)
    if renkler:
        R.update(renkler)
    Mf = M_bilesik(np.asarray(M, np.float64), M_olcek(float(yon), 1.0))
    sk = iskelet(poz, nefes)
    B = _Boyaci(t, Mf, isik, tohum)
    kayit = None
    if not sakla_sonra:
        kayit = None if t.saklama is None else t.saklama.copy()
    batt = float(min(1.0, max(0.0, battaniye)))
    b_alfa = float(min(1.0, max(0.0, battaniye_alfa)))
    if b_alfa <= 1e-3:
        batt = 0.0

    def yakin_kol():
        B.bolum(1)
        kol_on = _kol_yolu(sk, 'on')
        B.lavi(kol_on, R['gomlek'], YOG['gomlek'])
        B.golge(kol_on, R['gomlek_golge'], 0.36, 9.0)
        _kol_kivrimi(B, sk, 'on', R)
        B.sakla(kol_on)
        B.bolum(2)
        el_on = _el_yolu(poz['kivrim_on'], poz['yan_on'], poz.get('duz_on', 0.0))
        M_el_on = M_bilesik(Mf, sk['M_el_on'])
        B.lavi(el_on, R['ten'], YOG['ten'] + 0.04, M=M_el_on)
        B.golge(el_on, R['ten_golge'], 0.30, 5.0, M=M_el_on)
        B.sakla(el_on, M=M_el_on)
        if elde is not None:
            M_tut = M_bilesik(Mf, M_oteleme(*sk['avuc_on']), M_donme(90.0 - sk['th_on']))
            elde(t, M_tut)

    def bas():
        B.bolum(3)
        deri, sac, sakal, kulak = bas_yollari()
        M_bas = M_bilesik(Mf, sk['M_bas'])
        kil = _sac_sakal_yolu()
        B.lavi(kil, R['sac'], YOG['sac'], M=M_bas)
        B.golge(kil, R['sac_golge'], 0.26, 6.5, M=M_bas)
        B.sakla(kil, M=M_bas)
        B.lavi(kulak, R['kulak'], 0.30, M=M_bas, islak=0.7)
        B.kat(_KULAK_IC, 1.3, 1.0, R['ten_golge'], 0.32, M=M_bas)
        B.lavi(deri, R['ten'], YOG['ten'], M=M_bas)
        B.golge(deri, R['ten_golge'], 0.28, 9.0, M=M_bas)
        B.sakla(deri, M=M_bas)

    # ---- önden arkaya ----------------------------------------------------------------------------------------
    if batt > 1e-3:
        bas()
        B.bolum(4)
        dus = 1.0 - b_alfa                    # omuzlardan kayar, üst kenarı zemine inince tamamen biter; saydamlaşma
        _boya_battaniye(B, sk, batt, R, dus)  # YOK (bedenin battaniyeden çift pozlama gibi görünmesi önlenir)
        yakin_kol()
    else:
        yakin_kol()
        bas()
    # gömlek gövde
    B.bolum(5)
    gom, etek = _gomlek_yolu(sk, poz)
    k_g, m_g = _gomlek_maskesi(sk, gom, Mf, B.ed['kenar'])
    if not k_g.bos() and m_g.size and m_g.max() > 1e-4:
        B.lavi([], R['gomlek'], YOG['gomlek'], maske=(k_g, m_g))
        B.golge(gom, R['gomlek_golge'], 0.32, 15.0, carp=(k_g, m_g))
        B.kat(_yaka_cizgisi(sk), 1.4, 1.0, R['gomlek_kat'], 0.30)
        B.sakla(None, maske=(k_g, m_g))
    # boyun
    B.bolum(6)
    N, Hp = sk['N'], sk['Hp']
    boyun = _kapsul(N - (Hp - N) * 0.45, Hp + (Hp - N) * 0.20, 20.0, 18.6, n=8, nc=7)
    B.lavi(boyun, R['ten_boyun'], YOG['ten'] + 0.05)
    ax = (Hp - N) / (np.hypot(*(Hp - N)) + 1e-9)

    def _boyun_golge(X, Y, N=N, ax=ax):
        tt = ((X - N[0]) * ax[0] + (Y - N[1]) * ax[1]) / L_BOYUN
        return smoothstep(0.15, 1.05, tt).astype(np.float32)
    B.lavi(boyun, R['ten_golge'], 0.34, yog_fn=_boyun_golge, islak=0.3)
    B.sakla(boyun)
    # bacaklar: yakın sonra uzak (uzak bir ton koyu)
    for t_, uzak in (('on', False), ('ar', True)):
        B.bolum(7 if not uzak else 9)
        bac = _bacak_yolu(sk, t_)
        cp = _uzak(R['pantolon']) if uzak else R['pantolon']
        B.lavi(bac, cp, YOG['pantolon'] * (1.24 if uzak else 1.0))
        B.golge(bac, R['pantolon_golge'], 0.32, 11.0)
        _bacak_kivrimi(B, sk, t_, R, bac)
        B.sakla(bac)
        B.bolum(8 if not uzak else 10)
        M_ay = M_bilesik(Mf, sk['M_ayak_' + t_])
        if ayakkabi:
            ay = _yol(_ayakkabi_pts(sk['tp_' + t_]), gerilim=0.45)
            ca = _uzak(R['ayakkabi'], 0.15) if uzak else R['ayakkabi']
            B.lavi(ay, ca, YOG['ayakkabi'] * (1.06 if uzak else 1.0), M=M_ay)
            B.golge(ay, R['ayakkabi_golge'], 0.30, 6.0, M=M_ay)
        else:                                # çorap: yumuşak, sıcak koyu gri; ince ıslak kenar
            ay = _yol(_corap_pts(sk['tp_' + t_]), gerilim=0.5)
            ca = _uzak(R['corap'], 0.12) if uzak else R['corap']
            B.lavi(ay, ca, YOG['corap'] * (1.08 if uzak else 1.0), M=M_ay, islak=1.25, gran=0.09, akis=0.10)
            B.golge(ay, R['corap_golge'], 0.26, 5.0, M=M_ay)
        B.sakla(ay, M=M_ay)
    # uzak kol + el
    B.bolum(11)
    kol_ar = _kol_yolu(sk, 'ar')
    B.lavi(kol_ar, _uzak(R['gomlek']), YOG['gomlek'] * 1.25)
    B.golge(kol_ar, R['gomlek_golge'], 0.36, 9.0)
    B.sakla(kol_ar)
    B.bolum(12)
    el_ar = _el_yolu(poz['kivrim_ar'], poz['yan_ar'], poz.get('duz_ar', 0.0))
    M_el_ar = M_bilesik(Mf, sk['M_el_ar'])
    B.lavi(el_ar, _uzak(R['ten']), YOG['ten'] * 1.22, M=M_el_ar)
    B.golge(el_ar, R['ten_golge'], 0.30, 5.0, M=M_el_ar)
    B.sakla(el_ar, M=M_el_ar)
    # zemin gölgesi (figürün arkasında; saklamaya yazılmaz)
    if zemin_golge > 0:
        B.bolum(13)
        _zemin_golge(B, sk, zemin_golge, R, ayakkabi)
    if not sakla_sonra:
        t.saklama = kayit
    return _capalar(sk, Mf, ayakkabi)


# ---- kıvrım darbeleri (1-2 yumuşak iz) ----------------------------------------------------------------------
def _kol_kivrimi(B, sk, t, R):
    """Dirsek bükülünce iç tarafta kısa kumaş kıvrımı."""
    dz = sk['tf_' + t] - sk['tu_' + t]
    if dz < 25.0:
        return
    E, S, Wr = sk['E_' + t], sk['S_' + t], sk['Wr_' + t]
    du = (S - E) / (np.hypot(*(S - E)) + 1e-9)
    df = (Wr - E) / (np.hypot(*(Wr - E)) + 1e-9)
    ic = du + df
    ic = ic / (np.hypot(*ic) + 1e-9)
    g = min(1.0, (dz - 25.0) / 50.0)
    p0 = E + ic * 8.0 + du * 4.0
    p1 = E + ic * 1.0 - du * 2.0 + df * 4.0
    p2 = E - ic * 6.0 + df * 14.0
    B.kat([p0, p1, p2], 1.6, 0.9, R['gomlek_kat'], 0.22 * g)


def _bacak_kivrimi(B, sk, t, R, bac):
    dz = sk['tt_' + t] - sk['ts_' + t]
    K, Hj, A = sk['K_' + t], sk['H_' + t], sk['A_' + t]
    if dz > 28.0:   # diz arkasında kıvrım: iç köşedeki V'nin tepesinden dize doğru kısa bir kat
        du = (Hj - K) / (np.hypot(*(Hj - K)) + 1e-9)
        dl = (A - K) / (np.hypot(*(A - K)) + 1e-9)
        ic = du + dl
        ic = ic / (np.hypot(*ic) + 1e-9)
        g = min(1.0, (dz - 28.0) / 60.0)
        yarim = math.radians(0.5 * max(20.0, 180.0 - dz))
        d = min(80.0, 23.0 / max(0.2, math.sin(yarim)))      # V tepesi (iç kenarların kesiştiği yer)
        yan = np.array([-ic[1], ic[0]])
        B.kat([K + ic * (d + 4.0), K + ic * (d - 7.0) + yan * 1.5, K + ic * (d - 18.0)], 1.5, 0.9,
              R['pantolon_golge'], 0.24 * g, kirp=bac)


def _ayak_ucu(parmak, ayakkabi=True):
    """Ayak çerçevesinde burun ucu (parmak bükülmesi dahil)."""
    if ayakkabi:
        return _parmak_bük(np.array([(79.0, 20.0)]), parmak)[0]
    return _parmak_bük(np.array([(69.4, 21.6)]), parmak, -11.0, 7.0)[0]


def _capalar(sk, Mf, ayakkabi=True):
    yer = {}
    Mb = sk['M_bas']
    yer['bas'] = _nokta(Mb, (-1.0, -22.0))
    yer['bas_ust'] = _nokta(Mb, (-3.0, -63.0))
    yer['alin'] = _nokta(Mb, (29.4, -33.0))
    yer['burun'] = _nokta(Mb, (37.2, -5.5))
    LT = sk['LT']
    sh = 0.62 * LT
    yer['kalp'] = sk.C(sh) + _onn(sk.A(sh)) * 18.0
    yer['el_on'], yer['el_arka'] = sk['avuc_on'], sk['avuc_ar']
    yer['parmak_ucu_on'] = _nokta(sk['M_el_on'], (62.0, 0.0))
    yer['parmak_ucu_arka'] = _nokta(sk['M_el_ar'], (62.0, 0.0))
    yer['bilek_on'], yer['bilek_arka'] = sk['Wr_on'], sk['Wr_ar']
    yer['dirsek_on'], yer['dirsek_arka'] = sk['E_on'], sk['E_ar']
    yer['omuz_on'], yer['omuz_arka'] = sk['S_on'], sk['S_ar']
    yer['boyun'] = sk['N']
    yer['diz'], yer['diz_arka'] = sk['K_on'], sk['K_ar']
    yer['kalca'] = sk['kok']
    yer['ayak_on'] = _nokta(sk['M_ayak_on'], (28.0, 26.0))
    yer['ayak_arka'] = _nokta(sk['M_ayak_ar'], (28.0, 26.0))
    topuk = (-22.5, 19.0) if ayakkabi else (-18.8, 21.6)
    for t, ad in (('on', 'on'), ('ar', 'arka')):
        yer['ayak_ucu_' + ad] = _nokta(sk['M_ayak_' + t], _ayak_ucu(sk['tp_' + t], ayakkabi))
        yer['topuk_' + ad] = _nokta(sk['M_ayak_' + t], topuk)
    out = {k: _nokta(Mf, v) for k, v in yer.items()}
    ex = Mf[:2, :2] @ _asg(sk['th_on'])
    out['el_on_aci'] = math.degrees(math.atan2(ex[1], ex[0]))
    out['yerel'] = yer
    out['iskelet'] = sk
    return out


def capalar(poz, M, yon=1, nefes=0.0, ayakkabi=True):
    """ciz_insan'ın döndürdüğü çapa sözlüğünün AYNISI, boyamadan (ucuz: yalnız iskelet). Sahnede kamera/efekt
    konumlamak için figürü ayrıca çizmeye gerek yok: capalar(poz, M, yon)['kalp'] ... ayakkabi=False: çoraplı
    ayağın burun/topuk çapaları (ciz_insan(..., ayakkabi=False) ile aynı)."""
    Mf = M_bilesik(np.asarray(M, np.float64), M_olcek(float(yon), 1.0))
    return _capalar(iskelet(poz, nefes), Mf, ayakkabi)


# ---- yerde duran boş ayakkabı çifti (seccadenin kenarında) --------------------------------------------------------
_BOS_AYAKKABI = np.array([
    (-19.0, 25.6), (-22.5, 19.0), (-23.6, 10.0), (-23.0, 3.0), (-21.4, -1.2), (-13.0, -2.8), (-3.0, -3.4),
    (7.0, -2.8), (13.5, -1.8), (18.0, -3.4), (25.0, -1.4), (35.0, 3.2), (46.0, 7.0), (58.0, 9.8), (68.0, 12.2),
    (75.5, 15.4), (79.0, 20.0), (77.5, 24.2), (72.0, 25.8), (50.0, 26.0), (20.0, 26.0), (0.0, 26.0),
])
_BOS_AYAKKABI_IC = np.array([   # ağız: uzak kenar (üstte) -> yakın kenar (altta); hafif yukarıdan bakış
    (-20.6, -1.0), (-13.0, -2.6), (-3.0, -3.2), (7.0, -2.6), (13.4, -1.4), (9.0, 0.6), (0.0, 1.9), (-9.0, 1.8),
    (-16.0, 0.6)])
_BOS_TABAN = np.array([(-30.0, 19.4), (-6.5, 19.4), (-3.0, 22.6), (60.0, 22.9), (84.0, 21.4), (84.0, 32.0),
                       (-30.0, 32.0)])


def ciz_ayakkabi_cifti(t, M, olcek=1.0, tohum=0, yon=1, isik=(-0.6, -0.8), sakla_sonra=True, renkler=None,
                       zemin_golge=0.3):
    """Adamın kendi koyu kahve ayakkabıları, boş, yerde yan yana düzgün bir çift (yandan; hafif bindirmeli, uzaktaki
    biraz geride ve bir ton serin). Köken = çiftin zemindeki orta noktası (y=0 zemin), +x burun yönü (yon=-1 aynalar).
    Ölçek figürünkiyle aynı: M figürün M'i gibi verilirse (ör. kamera.M() @ M_yerlestir(x, y, ADAM_OLCEK)) ayakkabılar
    ayağındakilerle aynı boydadır (~103 birim); olcek ek çarpan. Önden arkaya boyar ve silüetini saklamaya yazar
    (sakla_sonra=False ile çağrı öncesi saklama geri yüklenir). Dönüş: {'on': yakın teki, 'arka': uzak teki} burun
    ucu, 'orta' köken (ekran)."""
    R = dict(RENK)
    if renkler:
        R.update(renkler)
    Mc = M_bilesik(np.asarray(M, np.float64), M_olcek(float(yon) * olcek, olcek))
    kayit = None
    if not sakla_sonra:
        kayit = None if t.saklama is None else t.saklama.copy()
    B = _Boyaci(t, Mc, isik, tohum + 17)
    govde = _yol(_BOS_AYAKKABI, gerilim=0.45)
    ic = _yol(_BOS_AYAKKABI_IC, gerilim=0.5)
    taban = yol_op(govde, _yol(_BOS_TABAN, gerilim=0.2), 'kesisim')
    out = {}
    tekler = (('on', M_bilesik(Mc, M_oteleme(-27.7 - 10.0, -26.0)), False),
              ('arka', M_bilesik(Mc, M_oteleme(-27.7 + 12.0, -29.0)), True))
    for ad, Mt, uzak in tekler:
        B.bolum(2 if uzak else 1)
        c = _uzak(R['ayakkabi'], 0.15) if uzak else R['ayakkabi']
        k = 1.06 if uzak else 1.0
        B.lavi(govde, c, YOG['ayakkabi'] * k, M=Mt)
        B.golge(govde, R['ayakkabi_golge'], 0.30, 6.0, M=Mt)
        B.lavi(taban, R['taban'], 0.50 * k, M=Mt, islak=0.6)
        B.lavi(ic, R['ayakkabi_ic'], 0.62 * k, M=Mt, islak=0.5)
        B.kat([(-17.0, 6.0), (-4.0, 8.6), (10.0, 7.4)], 0.9, 0.7, R['ayakkabi_golge'], 0.22, M=Mt)   # yakın kenar katı
        B.sakla(govde, M=Mt)
        out[ad] = _nokta(Mt, (79.0, 20.0))
    if zemin_golge > 0:
        yol = yol_elips(2.0, 0.6, 66.0, 5.5)
        B.lavi(yol, R['zemin_golge'], 0.30 * zemin_golge, yumusak=max(2.0, 4.0 * B.s), dalga=0.0, islak=0.0, gran=0.05)
    if not sakla_sonra:
        t.saklama = kayit
    out['orta'] = _nokta(Mc, (0.0, 0.0))
    return out


def sinir_kutusu(poz, pay=6.0):
    """Pozun yerel sınır kutusu (x0, y0, x1, y1), yon=+1 için (yon=-1'de x'ler ters işaretli)."""
    sk = iskelet(poz)
    pts = []
    deri, sac, sakal, kulak = bas_yollari()
    for yol in (sac, sakal, deri):
        b = yol.computeTightBounds()
        pts += list(_uygula(sk['M_bas'], [(b.left(), b.top()), (b.right(), b.top()), (b.left(), b.bottom()),
                                            (b.right(), b.bottom())]))
    for t in ('on', 'ar'):
        pts += list(_uygula(sk['M_ayak_' + t], _ayakkabi_pts(sk['tp_' + t])))
        pts += list(_uygula(sk['M_el_' + t], [(-6, -13), (66, -13), (66, 13), (-6, 13)]))
        for k, r in (('S_', 21), ('E_', 17), ('Wr_', 14), ('H_', 50), ('K_', 24)):
            c = sk[k + t]
            pts += [c + (r, 0), c - (r, 0), c + (0, r), c - (0, r)]
    for s_ in np.linspace(-0.12 * sk['LT'], sk['LT'], 8):
        c = sk.C(s_)
        pts += [c + (48, 0), c - (48, 0), c + (0, 48), c - (0, 48)]
    pts = np.array(pts)
    x0, y0 = pts.min(0) - pay
    x1, y1 = pts.max(0) + pay
    return float(x0), float(y0), float(x1), min(float(y1), 2.0)


# =================================================================================================================
# pozlar
# =================================================================================================================
def _ayak_parmakta(p, taraf, diz=None, aci=4.0, dx=0.0):
    """Diz yerde, ayak parmakları kıvrık (secde / topuklar üstünde oturma). Ayak bileği, diz noktasından baldır
    boyu uzakta ve tarak (top) yere değecek yerde seçilir; ayak ekseni aci (asg, ~dik)."""
    diz = DIZ if diz is None else np.asarray(diz, float)
    Rm = M_donme(90.0 - aci)
    ofs = _uygula(Rm, [(TOP_X, 26.0)])[0]
    Ay = -0.4 - ofs[1]
    Ax = diz[0] - math.sqrt(max(1.0, L_BALDIR ** 2 - (Ay - diz[1]) ** 2)) + dx
    bacak_ik(p, taraf, (Ax, Ay))
    ayak_duz(p, taraf, aci)
    p['parmak_' + taraf] = 90.0 - aci
    return p


def _poz_ayakta():
    p = bos_poz()
    p.update(ky=KALCA_Y + 1.5, bel=2.0, gogus=-1.5, boyun=14.0, bas=-14.0,
             omuz_on=4.0, dirsek_on=12.0, el_bilek_on=4.0, kivrim_on=0.35,
             omuz_ar=-1.0, dirsek_ar=10.0, el_bilek_ar=3.0, kivrim_ar=0.35)
    bacak_ik(p, 'on', (10.0, -AYAK_YUK))
    bacak_ik(p, 'ar', (-12.0, -AYAK_YUK))
    ayak_duz(p, 'on')
    ayak_duz(p, 'ar')
    return p


def _poz_ayakta_dik():
    p = bos_poz()
    p.update(ky=KALCA_Y + 0.5, bel=-1.0, gogus=-4.0, boyun=9.0, bas=-13.0, omuz_kalk=1.5,
             omuz_on=-4.0, dirsek_on=7.0, el_bilek_on=3.0, kivrim_on=0.4,
             omuz_ar=-6.0, dirsek_ar=7.0, el_bilek_ar=2.0, kivrim_ar=0.4)
    bacak_ik(p, 'on', (6.0, -AYAK_YUK))
    bacak_ik(p, 'ar', (-10.0, -AYAK_YUK))
    ayak_duz(p, 'on')
    ayak_duz(p, 'ar')
    return p


# ---- ibrik (yer tutucu geometri, el çerçevesinde: köken avuç, +x parmak yönü) --------------------------------
IBRIK_ALT_EL = (42.0, 40.0)   # sula pozunda uzak elin avucu, yakın el çerçevesinde (ibriğin altı)


SULA_COKME = 1.0       # sula_pozu varsayılan çökmesi (0 = eski dimdik/kilitli diz duruşu)
SULA_BEL, SULA_GOGUS = 42.0, 14.0


def sula_pozu(dok=0.0, alt_el=None, cokme=None, destek_yolu=None):
    """Sulama pozu: dok 0..1 (bilekler öne döner, ibrik eğilir). alt_el: ibriğin alt noktası (yakın el çerçevesinde;
    varsayılan IBRIK_ALT_EL); uzak el her dok değerinde oraya IK ile oturur (erişemezse kol tam uzanır).
    Kalça geride (karşı ağırlık), yakın üst kol dünyada ~dik sarkar, dirsek gövde silüetinin içinde kalır.
    cokme 0..1 (varsayılan SULA_COKME = 1): 1 = dizler eskisinden ~20° daha bükük (~37-45°), kalça aşağıda ve geride, gövde ~40° öne,
    eller (ve elde tutulan ibrik) eskisinden ~120 birim aşağıda (fidana yakın; su kısa düşer); 0 = eski duruş."""
    c = SULA_COKME if cokme is None else float(cokme)
    L = lambda a, b: a + (b - a) * c
    p = bos_poz()
    p.update(kx=L(-26.0, -50.0), ky=L(KALCA_Y + 7.0, KALCA_Y + 26.0), bel=L(18.0, SULA_BEL), gogus=L(8.0, SULA_GOGUS),
             boyun=L(10.0, 2.0), bas=L(8.0, 14.0),
             kivrim_on=0.92, yan_on=0.0, kivrim_ar=0.15, yan_ar=-1.0)
    bacak_ik(p, 'on', (L(24.0, 20.0), -AYAK_YUK))
    bacak_ik(p, 'ar', (L(-30.0, -36.0), -AYAK_YUK))
    ayak_duz(p, 'on')
    ayak_duz(p, 'ar')
    th = 92.0 - 42.0 * dok
    kol_ik(p, 'on', (L(72.0, 90.0) + 6 * dok, L(-383.0, -270.0) + 6 * dok))
    el_aci(p, 'on', th)
    sk = iskelet(p)
    Mel = M_bilesik(M_oteleme(*sk['avuc_on']), M_donme(90.0 - th))
    x = _asg(th)
    # uzak avuç ibriğin altına (alt_el). Kol yetişmiyorsa (büyük ibrik + alçak eller) destek noktası ibriğin
    # arka-alt yüzü boyunca (kaide -> karın) yukarı, kolun ~%97 erişimine kadar kayar: avuç karnı alttan-arkadan
    # destekler. Yol: destek_yolu (el çerçevesinde noktalar; ilki alt_el) ya da alt_el esyalar.ibrik_alt_nokta'dan
    # geliyorsa ibrik biçiminden kendiliğinden; o da yoksa tutamağa doğru düz. Sürekli (ikiye bölme), titremesiz.
    S = sk['S_ar']
    R = 0.97 * (L_UST + L_ON)
    yol = _destek_yolu(IBRIK_ALT_EL if alt_el is None else alt_el, destek_yolu)
    yol_d = [_nokta(Mel, q) for q in yol]
    W = lambda pt: pt - x * AVUC_X * EL_OLCEK
    if np.hypot(*(W(yol_d[0]) - S)) > R:
        seg = np.array(yol_d)
        uz = np.r_[0.0, np.cumsum(np.hypot(*(seg[1:] - seg[:-1]).T))]

        def nokta(lam):
            return np.array([np.interp(lam * uz[-1], uz, seg[:, 0]), np.interp(lam * uz[-1], uz, seg[:, 1])])
        a, b = 0.0, 1.0
        for _ in range(40):
            m = 0.5 * (a + b)
            if np.hypot(*(W(nokta(m)) - S)) > R:
                a = m
            else:
                b = m
        # cokme=0 eski davranışı birebir korur (erişilemeyen hedefe kol tam uzanır); arada sürekli karışım
        hedef_w = W(yol_d[0]) + (W(nokta(b)) - W(yol_d[0])) * _ss(0.0, 0.5, c)
    else:
        hedef_w = W(yol_d[0])
    kol_ik(p, 'ar', hedef_w)
    el_aci(p, 'ar', th)
    return p


def _destek_yolu(alt_el, destek_yolu=None):
    """sula_pozu: uzak avucun kayabileceği destek yolu (el çerçevesi). alt_el esyalar.ibrik_alt_nokta(egim)'den
    geliyorsa ibriğin kaide -> karın arka-alt çizgisi; değilse alt_el -> tutamak (0, 0) doğrusu."""
    alt = np.asarray(alt_el, float)
    if destek_yolu is not None:
        return [alt] + [np.asarray(q, float) for q in destek_yolu]
    try:
        import esyalar as _es
        r0 = math.degrees(math.atan2(_es.IBRIK_ALT[1], _es.IBRIK_ALT[0]))
        eg = math.degrees(math.atan2(alt[1], alt[0])) - r0
        if np.hypot(*(np.asarray(_es.ibrik_alt_nokta(eg)) - alt)) < 0.5:
            Md = M_bilesik(M_donme(eg), _es._ib_D())
            bx = _es._IB_BX
            tas = [(bx, 53.6), (bx - 13.0, 52.0), (bx - 24.0, 45.5), (bx - 31.0, 36.0), (bx - 35.0, 25.0),
                   (bx - 36.4, 16.0)]
            return [alt] + [_nokta(Md, q) for q in tas[1:]] + [np.zeros(2)]
    except Exception:
        pass
    return [alt, np.zeros(2)]


def _poz_kiyam():
    p = bos_poz()
    # ön kollar karnın önünden karşı yana geçer (profilde kısalır): dirsekler gövdenin yanında, üst kol dik
    p.update(ky=KALCA_Y + 1.0, bel=1.0, gogus=-1.0, boyun=17.0, bas=2.0,
             kivrim_on=0.25, yan_on=0.3, kisalt_on=0.62, kivrim_ar=0.35, yan_ar=0.2, kisalt_ar=0.5,
             onkol_kisalt_on=0.58, onkol_kisalt_ar=0.58)
    bacak_ik(p, 'on', (7.0, -AYAK_YUK))
    bacak_ik(p, 'ar', (-9.0, -AYAK_YUK))
    ayak_duz(p, 'on')
    ayak_duz(p, 'ar')
    kol_ik(p, 'on', (43.0, -382.0))
    el_aci(p, 'on', 68.0)
    kol_ik(p, 'ar', (48.0, -388.0))
    el_aci(p, 'ar', 62.0)
    return p


def _poz_ruku():
    p = bos_poz()
    # dizler kilitli, kalça topukların gerisinde; kollar omuzdan dizlere neredeyse düz iner (dirsek ~10-15°)
    p.update(kx=-26.0, ky=KALCA_Y + 1.5, bel=82.0, gogus=5.0, boyun=-2.0, bas=2.0,
             kivrim_on=0.25, yan_on=0.45, kivrim_ar=0.25, yan_ar=0.45)
    bacak_ik(p, 'on', (5.0, -AYAK_YUK))
    bacak_ik(p, 'ar', (-5.0, -AYAK_YUK))
    ayak_duz(p, 'on')
    ayak_duz(p, 'ar')
    sk = iskelet(p)
    for t, dx in (('on', 0.0), ('ar', 3.0)):
        K = sk['K_' + t]
        kol_ik(p, t, K + _v(17.0 + dx, -27.0))
        el_aci(p, t, 4.0)
    return p


# diz çökme ailesi: dizler (124, -21)'de sabit; köken diz_dua'da kalçanın altı
DIZ = np.array([124.0, -21.0])


def _poz_diz_dua():
    p = bos_poz()
    p.update(kx=0.0, ky=-100.0, bel=0.0, gogus=-2.0, boyun=12.0, bas=-6.0,
             kivrim_on=0.18, yan_on=-1.0, kivrim_ar=0.18, yan_ar=-1.0)
    _ayak_parmakta(p, 'on')
    _ayak_parmakta(p, 'ar', dx=-3.0)
    kol_ik(p, 'on', (64.0, -228.0))
    el_aci(p, 'on', 122.0)
    kol_ik(p, 'ar', (72.0, -236.0))
    el_aci(p, 'ar', 126.0)
    return p


def _bas_yere(p, a_h=106.0, alin=None, yuk=-0.4):
    """Secde: baş açısı a_h iken alın (ve a_h≈106'da burun ucu da) yere (y=yuk) değecek boyun açısını çözer (boyun
    ve bas anahtarları). alin verilmezse deri silüetinin o açıda en alttaki noktası kullanılır."""
    sk = iskelet(p)
    N, aN = sk['N'], sk['a_N']
    Mr = M_bilesik(M_donme(a_h), M_olcek(BAS_OLCEK))
    if alin is None:
        ofs_y = float(np.max(_uygula(Mr, _BAS_DERI)[:, 1]))
    else:
        ofs_y = float(_uygula(Mr, [alin])[0][1])
    py = yuk - ofs_y                         # baş pivotunun olması gereken y
    c = (N[1] - py) / L_BOYUN               # -cos(a_n) * L = py - N.y  ->  cos a_n = (N.y - py)/L
    c = max(-1.0, min(1.0, c))
    a_n = math.degrees(math.acos(c))
    p['boyun'] = a_n - aN
    p['bas'] = a_h - a_n
    return p


def kol_2d(p, taraf, dirsek, bilek):
    """Kolu GÖRÜNEN (yandan izdüşüm) dirsek ve bilek noktalarına kurar: omuz/dirsek açıları ile üst kol / ön kol
    kısaltmaları (ust_kisalt, onkol_kisalt, gerekirse kol_kisalt) birlikte çözülür. Dirsek yana açıldığında (secde)
    kol yandan kısa görünür; bu yardımcı o izdüşümü doğrudan yazar."""
    sk = iskelet(p)
    St = sk['S_' + taraf]
    E = np.asarray(dirsek, float)
    Wr = np.asarray(bilek, float)
    a = float(np.hypot(*(E - St)))
    b = float(np.hypot(*(Wr - E)))
    kk = max(0.5, min(1.0, a / (0.35 * L_UST), b / (0.5 * L_ON)))
    ku = min(1.0, max(0.35, a / (L_UST * kk)))
    kf = min(1.0, max(0.5, b / (L_ON * kk)))
    p['kol_kisalt_' + taraf] = (1.0 - kk) / 0.5
    p['ust_kisalt_' + taraf] = (1.0 - ku) / 0.65
    p['onkol_kisalt_' + taraf] = (1.0 - kf) / 0.5
    tu = _aci_asg(E - St)
    tf = _aci_asg(Wr - E)
    p['omuz_' + taraf] = tu + sk.A(sk['s_om'])
    p['dirsek_' + taraf] = tf - tu
    return p


SECDE_UYLUK = 4.0      # secde'de uyluk açısı (0 dik; kalça dizin biraz gerisinde)


def _secde_govde():
    """Secde gövdesi (kollar hariç): dizler DIZ'de, kalça yukarıda, sırt hafif yay (bel -> göğüs aşağı kıvrılır,
    omuz silüette okunur), alın ve burun yerde."""
    p = bos_poz()
    kok = DIZ - L_UYLUK * _asg(SECDE_UYLUK)
    p.update(kx=kok[0], ky=kok[1], bel=SECDE_BEL, gogus=SECDE_GOGUS, bel_kambur=SECDE_KAMBUR,
             kivrim_on=0.0, yan_on=1.0, kivrim_ar=0.0, yan_ar=1.0, duz_on=1.0, duz_ar=1.0,
             etek_ar=7.6, etek_ar_boy=60.0)
    _ayak_parmakta(p, 'on')
    _ayak_parmakta(p, 'ar', dx=-3.0)
    _bas_yere(p)
    return p


SECDE_BEL, SECDE_GOGUS, SECDE_KAMBUR = 104.0, 36.0, 8.0


def _secde_el_hedefleri(p):
    """Secde'de (dirsek, bilek) hedefleri: avuç başın yanında, kulak-alın hizasında yerde düz, parmaklar öne; ön kol
    ~35° eğik, dirsek yerden kalkık (yana açık olduğundan yandan kısa görünür)."""
    sk = iskelet(p)
    kulak = _nokta(sk['M_bas'], (-9.0, -12.0))
    out = {}
    for t, dx, aci, lf in (('on', 0.0, 36.0, 58.0), ('ar', 7.0, 40.0, 56.0)):
        av_x = kulak[0] + SECDE_AVUC_DX + dx
        Wr = _v(av_x - AVUC_X * EL_OLCEK, SECDE_BILEK_Y)
        r = math.radians(aci)
        E = Wr + lf * _v(-math.cos(r), -math.sin(r))
        out[t] = (E, Wr)
    return out


SECDE_AVUC_DX = 16.0   # secde'de avuç merkezi kulağın bu kadar önünde
SECDE_BILEK_Y = -9.3     # düz basan elin tabanı (bilekten 10.5 * EL_OLCEK) zeminde


def _poz_secde():
    p = _secde_govde()
    for t, (E, Wr) in _secde_el_hedefleri(p).items():
        kol_2d(p, t, E, Wr)
        el_aci(p, t, 90.0)
    return p


# oturma ailesi: kalça yerde, köken kalçanın altı
def _poz_oturus(dik):
    p = bos_poz()
    if dik:
        p.update(kx=0.0, ky=-44.0, bel=-4.0, gogus=3.0, boyun=11.0, bas=-10.0, bel_kambur=0.0,
                 kivrim_on=0.55, yan_on=0.4, kivrim_ar=0.55, yan_ar=0.4)
    else:
        p.update(kx=0.0, ky=-44.0, bel=-6.0, gogus=36.0, boyun=16.0, bas=10.0, bel_kambur=18.0,
                 kivrim_on=0.55, yan_on=0.4, kivrim_ar=0.55, yan_ar=0.4)
    bacak_ik(p, 'on', (96.0, -AYAK_YUK))
    bacak_ik(p, 'ar', (88.0, -AYAK_YUK))
    ayak_duz(p, 'on')
    ayak_duz(p, 'ar')
    sk = iskelet(p)
    K = sk['K_on']
    if dik:
        kol_ik(p, 'on', K + _v(30.0, 44.0))
        el_aci(p, 'on', -10.0)
        kol_ik(p, 'ar', K + _v(36.0, 52.0))
        el_aci(p, 'ar', -20.0)
    else:
        kol_ik(p, 'on', K + _v(24.0, 30.0))
        el_aci(p, 'on', -20.0)
        kol_ik(p, 'ar', K + _v(30.0, 38.0))
        el_aci(p, 'ar', -30.0)
    return p


KALKIS_DX = 72.0   # kalkış sonunda figür ayakta_dik'in KALKIS_DX kadar öne kaymış hâlidir (eski sürüm: 72)


def kol_mutlak(p, taraf, ust_aci, dirsek, bilek=0.0):
    """Kolu mutlak açıyla kurar: ust_aci üst kolun asg açısı (0 aşağı, 90 öne yatay)."""
    sk = iskelet(p)
    a_om = sk.A(sk['s_om'])
    p['omuz_' + taraf] = ust_aci + a_om
    p['dirsek_' + taraf] = dirsek
    p['el_bilek_' + taraf] = bilek
    return p


KALKIS_AYAK = {'on': (6.0 + KALKIS_DX, -AYAK_YUK), 'ar': (-10.0 + KALKIS_DX, -AYAK_YUK)}   # çekilmiş ayaklar
KALKIS_ZAMAN = (0.0, 0.30, 0.54, 0.78, 1.0)   # oturus_dik, kalkis_1, kalkis_2, kalkis_3, kalkis_4 (iç ilerleme)


def _kalkis_govde(i):
    """Kalkış gövde anahtarları (kollar sonra IK ile): 1 öne eğil + ayakları çek (kalça yerde), 2 kalça kalkar,
    yarım çömelme (gövde öne, baş gövdeyi izler), 3 bacaklar iter, gövde doğrulur."""
    p = bos_poz()
    if i == 1:
        p.update(kx=0.0, ky=-44.0, bel=33.0, gogus=8.0, boyun=-6.0, bas=-8.0, kivrim_on=0.1, kivrim_ar=0.1)
    elif i == 2:
        p.update(kx=KALKIS_DX - 42.0, ky=-196.0, bel=46.0, gogus=6.0, boyun=-6.0, bas=-10.0,
                 kivrim_on=0.25, kivrim_ar=0.25, yan_on=1.0, yan_ar=1.0)
    else:
        p.update(kx=KALKIS_DX - 16.0, ky=-268.0, bel=22.0, gogus=1.0, boyun=4.0, bas=-12.0,
                 kivrim_on=0.35, kivrim_ar=0.35, yan_on=0.5, yan_ar=0.5)
    for t in ('on', 'ar'):
        bacak_ik(p, t, KALKIS_AYAK[t])
        ayak_duz(p, t)
    # kollar: yer tutucu (asıl değerleri kalkis() IK ile yazar)
    kol_mutlak(p, 'on', 10.0, 20.0)
    kol_mutlak(p, 'ar', 8.0, 22.0)
    return p


def _poz_kalkis(i):
    return kalkis_u(KALKIS_ZAMAN[i])


def _kaydir(p, dx, dy=0.0):
    q = dict(p)
    q['kx'] += dx
    q['ky'] += dy
    return q


def _diz_secde_ara(i):
    p = bos_poz()
    if i == 1:   # kalça topuklardan kalkar, gövde öne
        th = 34.0
        kok = DIZ - L_UYLUK * _asg(th)
        p.update(kx=kok[0], ky=kok[1], bel=38.0, gogus=6.0, boyun=6.0, bas=-8.0,
                 kivrim_on=0.25, yan_on=0.6, kivrim_ar=0.25, yan_ar=0.6, kol_kisalt_on=0.15, kol_kisalt_ar=0.15,
                 etek_ar=8.0, etek_ar_boy=20.0)
    else:        # eller yere iner: secde'deki yerlerine (secdeye geçişinde artık kaymazlar)
        th = 14.0
        kok = DIZ - L_UYLUK * _asg(th)
        p.update(kx=kok[0], ky=kok[1], bel=96.0, gogus=8.0, boyun=10.0, bas=-14.0,
                 kivrim_on=0.05, yan_on=1.0, kivrim_ar=0.05, yan_ar=1.0, kol_kisalt_on=0.35, kol_kisalt_ar=0.35,
                 ust_kisalt_on=0.2, ust_kisalt_ar=0.2, etek_ar=18.0, etek_ar_boy=48.0)
    _ayak_parmakta(p, 'on')
    _ayak_parmakta(p, 'ar', dx=-3.0)
    sk = iskelet(p)
    for t, dx in (('on', 0.0), ('ar', 6.0)):
        S = sk['S_' + t]
        if i == 1:
            kol_ik(p, t, (S[0] + 70.0 + dx, -78.0))
            el_aci(p, t, 60.0)
        else:
            kol_ik(p, t, SECDE_EL[t], isaret=-1)
            el_aci(p, t, 90.0)
    return p


def _eller_yerde(p):
    """Diz ailesinde (diz DIZ'de) elleri secde'deki yerlerine IK ile oturtur (avuçlar yerde sabit)."""
    for t in ('on', 'ar'):
        kol_ik(p, t, SECDE_EL[t], isaret=-1)
        el_aci(p, t, 90.0)
    return p


# ---- diz ailesi: diz_otur, diz_sukur (eller uylukta / şükre kalkık) ----------------------------------------------
DIZ_OTUR_UYLUK = math.degrees(math.atan2(DIZ[0], DIZ[1] + 100.0))   # topuklar üstünde: kalça (0, -100)


def _diz_govde(uyluk, bel, gogus, boyun, bas, kambur=0.0, **ek):
    """Diz ailesi gövdesi: dizler DIZ'de, ayak parmakları kıvrık yerde; uyluk mutlak açısı (0 dik), gövde/baş."""
    p = bos_poz()
    kok = DIZ - L_UYLUK * _asg(uyluk)
    p.update(kx=float(kok[0]), ky=float(kok[1]), bel=bel, gogus=gogus, boyun=boyun, bas=bas, bel_kambur=kambur)
    p.update(ek)
    _ayak_parmakta(p, 'on')
    _ayak_parmakta(p, 'ar', dx=-3.0)
    return p


def _uyluk_el(sk, taraf, f=0.6, dx=0.0):
    """Avuç içi uyluğun üst yüzüne düz basmış el: (bilek, el ekseni asg açısı). f: avuç merkezinin uyluk boyunca
    kesri (kalça 0 .. diz 1); parmaklar dize doğru."""
    Hj, K = sk['H_' + taraf], sk['K_' + taraf]
    d = K - Hj
    L = float(np.hypot(*d))
    d = d / (L + 1e-9)
    nr = np.array([-d[1], d[0]])                  # +: uyluğun altı
    if nr[1] < 0:
        nr = -nr
    r = lambda ff: 32.0 + (21.5 - 32.0) * ff + 3.0 * math.exp(-((ff - 0.35) / 0.30) ** 2) * math.sin(math.pi * ff) ** 0.6
    yuz = lambda ff: Hj + d * (ff * L) - nr * r(ff)
    t_yuz = yuz(min(1.0, f + 0.12)) - yuz(max(0.0, f - 0.12))      # üst yüzün doğrultusu
    t_yuz = t_yuz / (np.hypot(*t_yuz) + 1e-9)
    n_yuz = np.array([-t_yuz[1], t_yuz[0]])
    if n_yuz[1] > 0:
        n_yuz = -n_yuz                             # yukarı (dışarı)
    avuc = yuz(f) + n_yuz * (10.5 * EL_OLCEK - 0.6) + _v(dx, 0.0)
    bilek = avuc - t_yuz * AVUC_X * EL_OLCEK
    return bilek, _aci_asg(t_yuz)


def _eller_uylukta(p, f=(0.60, 0.62)):
    sk = iskelet(p)
    for t, ff in zip(('on', 'ar'), f):
        W, a = _uyluk_el(sk, t, ff)
        kol_ik(p, t, W, isaret=-1)
        el_aci(p, t, a)
    p.update(kivrim_on=0.0, kivrim_ar=0.0, yan_on=1.0, yan_ar=1.0, duz_on=1.0, duz_ar=1.0,
             kisalt_on=0.0, kisalt_ar=0.0)
    return p


DIZ_OTUR_EL_F = (0.55, 0.55)   # diz_otur: avuç merkezlerinin uyluk boyunca kesri (kalça 0 .. diz 1)


def _poz_diz_otur():
    """Topuklar üstünde diz çökmüş oturuş: sırt dik, eller avuç içi aşağı uyluklarda dizlere yakın, baş düz."""
    p = _diz_govde(DIZ_OTUR_UYLUK, bel=8.0, gogus=-4.0, boyun=11.0, bas=-16.0)
    return _eller_uylukta(p, DIZ_OTUR_EL_F)


SUKUR_EL = {'on': (84.0, -246.0), 'ar': (95.0, -263.0)}   # diz_sukur'da bilekler (yerel; köken diz_otur'daki gibi)
SUKUR_EL_ACI = {'on': 134.0, 'ar': 142.0}                  # el ekseni (asg): parmaklar öne-yukarı


def _poz_diz_sukur():
    """Diz çökmüş, iki el şükre/duaya kalkık: avuçlar yukarı ve yüze dönük, göğüs-omuz hizasında, dirsekler gövdeye
    yakın ve gevşek, baş ~10° yukarı."""
    p = _diz_govde(DIZ_OTUR_UYLUK, bel=1.0, gogus=-4.0, boyun=6.0, bas=-13.0,
                   kivrim_on=0.16, kivrim_ar=0.16, yan_on=SUKUR_YAN, yan_ar=SUKUR_YAN)
    for t in ('on', 'ar'):
        kol_ik(p, t, SUKUR_EL[t], isaret=-1)
        el_aci(p, t, SUKUR_EL_ACI[t])
    return p


SUKUR_YAN = -0.60     # avuç yüze dönük, hafifçe izleyiciye açık (telefonda okunsun)


# =================================================================================================================
# yürüyüş
# =================================================================================================================
YURUYUS_ADIM = 330.0       # bir döngüde (faz 0->1) alınan yol (iki adım); sahne x'i bu hızla ilerletmeli
_YUR_HS = 76.0             # topuk vuruşunda topuğun kalçaya göre x'i
_YUR_TO = 0.62             # parmak kalkışı (stance oranı)


def _yur_ayak(f):
    """Tek ayak: faz f (0 = topuk vuruşu). Dönüş: (ayak bileği, ayak açısı (asg), parmak açısı)."""
    D = YURUYUS_ADIM
    f = f % 1.0
    dorsi = 14.0
    if f < _YUR_TO:
        x_topuk = _YUR_HS - D * f
        if f < 0.10:                       # topuk vuruşu: topuk etrafında yere iner
            a = dorsi * (1.0 - _ss(0.0, 0.10, f))
            piv = np.array([x_topuk, 0.0])
            Rm = M_donme(90.0 - (90.0 + a))
            A = piv - _uygula(Rm, [(TOPUK_X, 26.0)])[0]
            return A, 90.0 + a, 0.0
        if f < 0.36:                       # tam basış
            A = np.array([x_topuk - TOPUK_X, -AYAK_YUK - 1.0])
            return A, 90.0, 0.0
        # topuk kalkar: tarak etrafında döner
        u = (f - 0.36) / (_YUR_TO - 0.36)
        a = 58.0 * (u ** 1.35)
        piv = np.array([x_topuk + (TOP_X - TOPUK_X), 0.0])
        Rm = M_donme(90.0 - (90.0 - a))
        A = piv - _uygula(Rm, [(TOP_X, 26.0)])[0]
        return A, 90.0 - a, a
    # salınım
    A0, a0, p0 = _yur_ayak(_YUR_TO - 1e-6)
    A1, a1, p1 = _yur_ayak(0.0)
    u = (f - _YUR_TO) / (1.0 - _YUR_TO)
    ue = u * u * (3 - 2 * u)
    x = A0[0] + (A1[0] - A0[0]) * (0.15 * u + 0.85 * ue)
    kal = 17.0 * math.sin(math.pi * min(1.0, u * 1.12)) ** 1.2 + 9.0 * math.exp(-((u - 0.25) / 0.16) ** 2)
    y = A0[1] + (A1[1] - A0[1]) * ue - kal
    # ayak açısı: kalkış açısından nötre, sonra topuk vuruşu için yukarı
    a_orta = 82.0
    if u < 0.5:
        a = a0 + (a_orta - a0) * _ss(0.0, 0.5, u)
    else:
        a = a_orta + (a1 - a_orta) * _ss(0.5, 1.0, u)
    par = p0 * (1.0 - _ss(0.0, 0.35, u))
    return np.array([x, y]), a, par


def yuruyus(faz):
    """Doğal yürüyüş döngüsü; faz 0..1 bir tam döngü (faz 0: yakın ayak topuk vuruşu, 0.5: uzak ayak).
    Yerinde yürür: basan ayak geriye YURUYUS_ADIM/döngü hızıyla kayar; sahne figürü x += YURUYUS_ADIM * faz_artışı
    kadar ilerletirse ayaklar yerde kaymaz."""
    f = faz % 1.0
    p = bos_poz()
    bob = math.cos(4 * math.pi * (f - 0.06))
    p['ky'] = -308.0 + 6.0 * bob
    p['kx'] = 0.0
    p['bel'] = 3.0 + 0.8 * bob
    p['gogus'] = 0.5
    p['boyun'] = 13.0
    p['bas'] = -(p['bel'] + p['gogus'] + p['boyun']) + 2.0 - 0.6 * bob
    sal = math.cos(2 * math.pi * f)
    p['omuz_on'] = 2.0 - 12.0 * sal
    p['omuz_ar'] = 2.0 + 12.0 * sal
    p['dirsek_on'] = 11.0 + 13.0 * max(0.0, -sal) ** 1.2
    p['dirsek_ar'] = 11.0 + 13.0 * max(0.0, sal) ** 1.2
    p['el_bilek_on'] = 4.0 + 4.0 * max(0.0, -sal)
    p['el_bilek_ar'] = 4.0 + 4.0 * max(0.0, sal)
    p['kivrim_on'] = p['kivrim_ar'] = 0.38
    for t, ff in (('on', f), ('ar', f + 0.5)):
        A, a, par = _yur_ayak(ff)
        bacak_ik(p, t, A)
        ayak_duz(p, t, a)
        p['parmak_' + t] = par
    return p


# =================================================================================================================
# karıştırma
# =================================================================================================================
def _capa(sk, ad):
    if ad == 'ayak_on':
        return _nokta(sk['M_ayak_on'], (TOP_X, 26.0))
    if ad == 'ayak_ar':
        return _nokta(sk['M_ayak_ar'], (TOP_X, 26.0))
    if ad == 'diz_on':
        return sk['K_on']
    if ad == 'diz_ar':
        return sk['K_ar']
    if ad == 'kalca':
        return sk['kok']
    if ad == 'el_on':
        return sk['avuc_on']
    raise KeyError(ad)


def poz_karistir(a, b, t, sabit=None):
    """İki pozun karışımı (bütün açılar ve kök doğrusal). sabit='ayak_on'|'ayak_ar'|'diz_on'|'diz_ar'|'el_on':
    o noktanın konumu iki pozdaki konumlarının doğrusal karışımına oturtulur (kök kaydırılarak) — yere basan
    nokta iki pozda aynı yerdeyse geçiş boyunca kaymaz."""
    t = float(t)
    out = {k: a.get(k, 0.0) + (b.get(k, 0.0) - a.get(k, 0.0)) * t for k in ANAHTARLAR}
    if sabit:
        hedef = _capa(iskelet(a), sabit) * (1 - t) + _capa(iskelet(b), sabit) * t
        d = hedef - _capa(iskelet(out), sabit)
        out['kx'] += d[0]
        out['ky'] += d[1]
    return out


def _hermite(p0, p1, p2, p3, u):
    """Uç noktada aşmayan (monoton-benzeri) kübik Hermite: p1 -> p2."""
    def teg(a, b, c):
        if (b - a) * (c - b) <= 0:
            return 0.0
        return 0.5 * (c - a)
    m1 = teg(p0, p1, p2)
    m2 = teg(p1, p2, p3)
    u2, u3 = u * u, u * u * u
    return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2


def poz_yolu(pozlar, t, sabit=None, sureler=None):
    """Bir poz dizisi boyunca yumuşak (C1) geçiş; t 0..1 bütün dizi. sureler: her aralığın göreli süresi.
    sabit: poz_karistir'daki gibi; çapa noktası da aynı eğriyle izlenir."""
    n = len(pozlar)
    if n == 1:
        return dict(pozlar[0])
    sureler = sureler or [1.0] * (n - 1)
    top = float(sum(sureler))
    t = min(1.0, max(0.0, float(t))) * top
    i = 0
    while i < n - 2 and t > sureler[i]:
        t -= sureler[i]
        i += 1
    u = min(1.0, max(0.0, t / sureler[i]))
    P = [pozlar[max(0, i - 1)], pozlar[i], pozlar[i + 1], pozlar[min(n - 1, i + 2)]]
    out = {k: _hermite(P[0].get(k, 0.0), P[1].get(k, 0.0), P[2].get(k, 0.0), P[3].get(k, 0.0), u)
           for k in ANAHTARLAR}
    if sabit:
        C = [_capa(iskelet(q), sabit) for q in P]
        hedef = np.array([_hermite(C[0][j], C[1][j], C[2][j], C[3][j], u) for j in range(2)])
        d = hedef - _capa(iskelet(out), sabit)
        out['kx'] += d[0]
        out['ky'] += d[1]
    return out


def _mk_ara(V, zamanlar, u):
    """Zaman damgalı anahtar değerler (n x ...) arasında monoton kübik (Fritsch-Butland) C1 ara değer; uçlarda
    ve yön değiştiren anahtarlarda hız sıfır (aşma yok)."""
    V = np.asarray(V, float)
    ts = np.asarray(zamanlar, float)
    n = len(ts)
    u = float(min(ts[-1], max(ts[0], u)))
    i = int(min(n - 2, max(0, np.searchsorted(ts, u, side='right') - 1)))
    h = ts[i + 1] - ts[i]
    s = (u - ts[i]) / h if h > 0 else 1.0
    s2, s3 = s * s, s * s * s
    b00, b10, b01, b11 = 2 * s3 - 3 * s2 + 1, s3 - 2 * s2 + s, -2 * s3 + 3 * s2, s3 - s2

    def teg(k):
        if k <= 0 or k >= n - 1:
            return np.zeros_like(V[k])
        h0, h1 = ts[k] - ts[k - 1], ts[k + 1] - ts[k]
        d0 = (V[k] - V[k - 1]) / h0
        d1 = (V[k + 1] - V[k]) / h1
        w1, w2 = 2 * h1 + h0, h1 + 2 * h0
        with np.errstate(divide='ignore', invalid='ignore'):
            m = (w1 + w2) / (w1 / d0 + w2 / d1)
        return np.where(d0 * d1 > 0, m, 0.0)
    return V[i] * b00 + teg(i) * h * b10 + V[i + 1] * b01 + teg(i + 1) * h * b11


def poz_zaman_yolu(pozlar, zamanlar, u, sabit=None):
    """Zaman damgalı poz dizisi boyunca C1, aşmayan (monoton kübik, Fritsch-Butland) geçiş: zamanlar artan; u o
    eksende. Uçlarda hız sıfır (yumuşak başlama/durma), ara anahtarlarda hız ZAMANDA süreklidir (farklı uzunlukta
    aralıklarda bile kırbaç yok). sabit: poz_karistir'daki gibi."""
    V = _mk_ara([[q.get(k, 0.0) for k in ANAHTARLAR] for q in pozlar], zamanlar, u)
    out = {k: float(v) for k, v in zip(ANAHTARLAR, V)}
    if sabit:
        hedef = _mk_ara([_capa(iskelet(q), sabit) for q in pozlar], zamanlar, u)
        d = hedef - _capa(iskelet(out), sabit)
        out['kx'] += d[0]
        out['ky'] += d[1]
    return out


def _bezier(P0, P1, P2, P3, s):
    s = float(s)
    a = 1.0 - s
    return a * a * a * P0 + 3 * a * a * s * P1 + 3 * a * s * s * P2 + s * s * s * P3


def _ss5(a, b, x):
    """Smootherstep: hız ve ivme uçlarda sıfır."""
    if b == a:
        return 1.0 if x >= b else 0.0
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * t * (t * (6 * t - 15) + 10)


def _bas_yer_alti(p):
    """Baş deri silüetinin en alt noktasının y'si (yerel; > -0.4 ise alın zemine giriyor)."""
    sk = iskelet(p)
    return float(np.max(_uygula(sk['M_bas'], _BAS_DERI)[:, 1]))


def _bas_yerden_kaldir(p, yuk=-0.4):
    """Geçişlerde alın zemine girerse boyunu (ve başı aynı mutlak açıda tutarak) yukarı çevirip yere oturtur."""
    if _bas_yer_alti(p) <= yuk:
        return p
    a_h = iskelet(p)['a_h']
    return _bas_yere(p, a_h=a_h, yuk=yuk)


# ---- secde ailesi geçişleri -----------------------------------------------------------------------------------
SECDE_TEMAS = 0.64     # secdeye(): avuçlar bu ilerlemede (iç eğri u) yere değer; sonrasında yerinde kalır


def _secde_govdeleri():
    g0 = dict(POZLAR['diz_dua'])
    g1 = _diz_govde(34.0, bel=40.0, gogus=6.0, boyun=4.0, bas=-6.0, etek_ar=8.0, etek_ar_boy=20.0)
    g2 = _diz_govde(14.0, bel=88.0, gogus=18.0, boyun=10.0, bas=-6.0, kambur=4.0, etek_ar=12.0, etek_ar_boy=44.0)
    g3 = dict(POZLAR['secde'])
    # kısaltmalar (dirseklerin yana açılması) yere değmeden başlar, secde'de tamamlanır
    for t in ('on', 'ar'):
        for k in ('kol_kisalt_', 'ust_kisalt_', 'onkol_kisalt_'):
            g2[k + t] = 0.15 * g3[k + t]
    return [g0, g1, g2, g3]


def _secde_el_yolu(t, u):
    """secdeye'de bir elin (bilek, el açısı, yan, düz, kıvrım) değerleri; u iç ilerleme. Bilek zaman damgalı
    anahtarlardan geçen monoton kübik yolla: göğüs önü -> gövdeyle birlikte öne-aşağı (kol omuzdan ~25° öne) ->
    yerdeki yerinin üstü -> yere (temas anında hız sıfır) -> yerinde."""
    W0, th0, yan0, kv0 = _SECDE_EL0[t]
    Wc = SECDE_EL[t]
    if u >= SECDE_TEMAS:
        return Wc.copy(), 90.0, 1.0, 1.0, 0.0
    Wa, Wb = _SECDE_ARA[t]
    ts = (0.0, 0.14, 0.32, 0.50, SECDE_TEMAS, 1.0)
    W = _mk_ara([W0, Wa, Wb, Wc + _v(-8.0, -40.0), Wc, Wc], ts, u)
    a = float(_mk_ara([th0, 80.0, 62.0, 78.0, 90.0, 90.0], ts, u))
    yan = yan0 + (1.0 - yan0) * _ss5(0.0, 0.24, u)
    duz = _ss(0.48, SECDE_TEMAS, u)
    kv = float(_mk_ara([kv0, 0.14, 0.10, 0.04, 0.0, 0.0], ts, u))
    return W, a, yan, duz, kv


def _secdeye_u(u):
    p = poz_zaman_yolu(_SECDE_GOVDE, (0.0, 0.30, SECDE_TEMAS, 1.0), u, sabit='diz_on')
    _bas_yerden_kaldir(p)
    for t in ('on', 'ar'):
        W, a, yan, duz, kv = _secde_el_yolu(t, u)
        kol_ik(p, t, W, isaret=-1, yumusak=YUMUSAK_ERISIM)
        el_aci(p, t, a)
        p['yan_' + t], p['duz_' + t], p['kivrim_' + t], p['kisalt_' + t] = yan, duz, kv, 0.0
    return p


def secdeye(t):
    """diz_dua -> secde (t 0..1, içeride yumuşatılır); dizler ve ayak parmakları yerde sabit. Eller göğüs önünden
    öne-aşağı bir yay çizip secde'deki yerlerinin (SECDE_EL) üstünden dikine iner, bir kez yere değer (iç ilerleme
    SECDE_TEMAS) ve sonra IK ile yerinde kalır (kaymaz); gövde inmeyi sürdürür, alın en son yere değer.
    Geri dönüş (secde -> diz_dua) için secdeye(1 - t); secde -> diz_otur için secdeden_kalk(u)."""
    return _secdeye_u(_ss(0.0, 1.0, t))


SECDE_KALK_EL = 0.6    # secdeden_kalk(): eller bu ilerlemeye dek yerde, sonra uyluklara
YUMUSAK_ERISIM = 0.07  # serbest el yollarında kol erişiminin son %7'si yumuşak doyurulur (temaslar bunun altında)


def _kalk_govdeleri():
    g0 = dict(POZLAR['secde'])
    g1 = _diz_govde(20.0, bel=86.0, gogus=-2.0, boyun=4.0, bas=-8.0, kambur=0.0, etek_ar=10.0, etek_ar_boy=30.0)
    g3 = dict(POZLAR['diz_otur'])
    for g in (g1,):
        for t in ('on', 'ar'):
            for k in ('kol_kisalt_', 'ust_kisalt_', 'onkol_kisalt_'):
                g[k + t] = 0.0
    g2 = poz_karistir(g1, g3, 0.94, sabit='diz_on')      # yavaşlayarak oturma (sonda yumuşak duruş)
    return [g0, g1, g2, g3]


_KALK_ZAMAN = (0.0, 0.6, 0.88, 1.0)


def secdeden_kalk(u):
    """secde -> diz_otur (u 0..1). 0-SECDE_KALK_EL (0.6): baş kalkar, gövde doğrulur, kalça topuklara doğru geri
    gelir; avuçlar yerde sabit (IK). 0.6-1: eller yerden kalkar, geri-yukarı bir yayla uyluklara (dizlere yakın)
    konar (IK; öne uzanma yok, ön kol hiç öne yatay olmaz). Gövde zaman damgalı monoton kübik yolla: hız sürekli."""
    u = float(min(1.0, max(0.0, u)))
    p = poz_zaman_yolu(_KALK_GOVDE, _KALK_ZAMAN, u, sabit='diz_on')
    _bas_yerden_kaldir(p)
    sk = iskelet(p)
    for t, ff in zip(('on', 'ar'), DIZ_OTUR_EL_F):
        Wc = SECDE_EL[t]
        if u <= SECDE_KALK_EL:
            W, a = Wc.copy(), 90.0
        else:
            WT, aT = _uyluk_el(sk, t, ff)
            ts = (SECDE_KALK_EL, 0.74, 0.88, 1.0)
            W = _mk_ara([Wc, _KALK_ARA[t], WT + _v(4.0, -11.0), WT], ts, u)
            a = float(_mk_ara([90.0, 66.0, aT + 4.0, aT], ts, u))
        kol_ik(p, t, W, isaret=-1, yumusak=YUMUSAK_ERISIM)
        el_aci(p, t, a)
        p['yan_' + t], p['duz_' + t], p['kivrim_' + t], p['kisalt_' + t] = 1.0, 1.0, 0.0, 0.0
    return p


def dua_kaldir(u):
    """diz_otur -> diz_sukur (u 0..1): eller uyluklardan kalkar (avuç düzlüğü bırakılır), doğal bir yayla (IK yolu,
    açı karıştırma değil) göğüs-omuz hizasına yükselir; bilekler dönerek avuçlar yukarı/yüze döner; baş ~10° kalkar.
    Hız ve ivme uçlarda sıfır (smootherstep)."""
    u = float(min(1.0, max(0.0, u)))
    g0, g1 = POZLAR['diz_otur'], POZLAR['diz_sukur']
    p = poz_karistir(g0, g1, _ss5(0.0, 1.0, u), sabit='diz_on')
    for t in ('on', 'ar'):
        W0, a0 = _DUA_EL0[t]
        W1 = np.asarray(SUKUR_EL[t], float)
        ts = (0.0, 0.34, 0.68, 1.0)
        W = _mk_ara([W0, W0 + _v(-16.0, -52.0), W1 + _v(-22.0, 46.0), W1], ts, u)
        a = float(_mk_ara([a0, 88.0, 122.0, SUKUR_EL_ACI[t]], ts, u))
        yan = float(_mk_ara([1.0, 0.25, -0.55, SUKUR_YAN], ts, u))
        duz = 1.0 - _ss(0.0, 0.3, u)
        kv = g1['kivrim_' + t] * _ss(0.5, 1.0, u)
        kol_ik(p, t, W, isaret=-1, yumusak=YUMUSAK_ERISIM)
        el_aci(p, t, a)
        p['yan_' + t], p['duz_' + t], p['kivrim_' + t], p['kisalt_' + t] = yan, duz, kv, 0.0
    return p


def _kalkis_el(p, sk, t, u):
    """kalkis'te bir elin bilek hedefi ve el ayarları (zaman damgalı anahtarlar; bazıları canlı: diz üstü ve uyluk
    o anki iskeletten). Yakın el: kalçanın önü-yanında yere basar (itme), sonra dize konar, uyluk boyunca yukarı
    kayar; uzak el aynı, biraz geride. Sonraki bırakış (u > KALKIS_BIRAK) kalkis_u'da açı karışımıyla yapılır."""
    W0, a0 = _KALKIS_EL0[t]
    G = _KALKIS_YER[t]
    WD, aD = _uyluk_el(sk, t, 0.80 if t == 'on' else 0.84)
    WD = WD + _v(0.0, -3.0)
    WU, aU = _uyluk_el(sk, t, 0.42 if t == 'on' else 0.46)       # dizden uyluk boyunca yukarı kayan el
    WU = WU + _v(-4.0, 4.0)
    ts = (0.0, 0.24, 0.335, 0.52, 0.64, KALKIS_BIRAK)
    W = _mk_ara([W0, G, G, WD, WD, WU], ts, u)
    a = float(_mk_ara([a0, 90.0, 90.0, aD, aD, aU + 8.0], ts, u))
    yan = float(_mk_ara([0.4, 1.0, 1.0, 1.0, 1.0, 0.8], ts, u))
    duz = float(_mk_ara([0.0, 1.0, 1.0, 0.6, 0.6, 0.3], ts, u))
    kv = float(_mk_ara([0.55, 0.0, 0.0, 0.15, 0.15, 0.25], ts, u))
    return W, a, yan, duz, kv


KALKIS_BIRAK = 0.80    # kalkis: el uyluktan bırakılır, kol açı karışımıyla yana sarkar (iç ilerleme)


def kalkis_u(u):
    """kalkis'in iç (yumuşatılmamış) ilerlemeli hâli: u 0..1 doğrudan KALKIS_ZAMAN eksenidir."""
    u = float(min(1.0, max(0.0, u)))
    p = poz_zaman_yolu(_KALKIS_GOVDE, KALKIS_ZAMAN, u)
    # ayaklar: ilk aralıkta oturuştaki yerlerinden çekilir, sonra yerde sabit (IK; kayma yok)
    w = _ss5(0.0, KALKIS_ZAMAN[1], u)
    for t in ('on', 'ar'):
        A = _KALKIS_AYAK0[t] + (np.asarray(KALKIS_AYAK[t]) - _KALKIS_AYAK0[t]) * w
        bacak_ik(p, t, A)
        ayak_duz(p, t)
    sk = iskelet(p)
    serbest = {k: p[k] for k in ANAHTARLAR}             # gövde yolunun kendi kolları (ayakta_dik'e gider)
    b = _ss5(KALKIS_BIRAK, 1.0, u)
    for t in ('on', 'ar'):
        W, a, yan, duz, kv = _kalkis_el(p, sk, t, min(u, KALKIS_BIRAK))
        kol_ik(p, t, W, isaret=-1, yumusak=YUMUSAK_ERISIM)
        el_aci(p, t, a)
        p['yan_' + t], p['duz_' + t], p['kivrim_' + t], p['kisalt_' + t] = yan, duz, kv, 0.0
        if b > 0:                                       # bırakış: açılar gövde yolununkilere karışır
            for k in ('omuz_', 'dirsek_', 'el_bilek_', 'yan_', 'duz_', 'kivrim_'):
                p[k + t] = p[k + t] + (serbest.get(k + t, 0.0) - p[k + t]) * b
    return p


def kalkis(t):
    """oturus_dik -> ayakta_dik (t 0..1, içeride yumuşatılır). Doğal kalkış: gövde öne eğilir ve ayaklar çekilir
    (kalça yerde), yakın el kalçanın yanında yere basıp iter (uzak el de, biraz geride), kalça kalkar ve gövde öne
    eğik yarım çömelmeden geçer, el dize konup iter, bacaklar doğrulur, kollar yana sarkar. Baş gövdeyi izler;
    kol hiçbir an öne yatay uzanmaz. Ayaklar ilk ~%30'da çekilir, sonra yerde sabit; yerdeki el kaymaz.
    t=1'de sonuç = ayakta_dik, x'te KALKIS_DX (=64) kadar öne kaymış. Kalça t ≈ KALKIS_YUKSELIS'ten sonra kalkar:
    battaniye için battaniye_alfa=kalkis_battaniye(t) kullanın (kalça kalkmadan önce tamamen kayar)."""
    return kalkis_u(_ss(0.0, 1.0, t))


def _ters_ss(v):
    """_ss(0, 1, t) = v'nin t'si (ikiye bölme)."""
    a, b = 0.0, 1.0
    for _ in range(50):
        m = 0.5 * (a + b)
        if _ss(0.0, 1.0, m) < v:
            a = m
        else:
            b = m
    return 0.5 * (a + b)


def kalkis_temas_t():
    """kalkis(t) temas aralıkları (dış t): {'ayak': ayakların yerde sabitlendiği t, 'yer': (yerdeki avuç başlar,
    biter), 'diz': (el dizde başlar, biter), 'yukselis': KALKIS_YUKSELIS}."""
    return {'ayak': _ters_ss(KALKIS_ZAMAN[1]), 'yer': (_ters_ss(0.24), _ters_ss(0.335)),
            'diz': (_ters_ss(0.52), _ters_ss(0.64)), 'yukselis': KALKIS_YUKSELIS}


def secdeye_temas_t():
    """secdeye(t)'de avuçların yere değdiği dış t (sonrasında yerinde sabit)."""
    return _ters_ss(SECDE_TEMAS)


def kalkis_battaniye(t, bas=0.0):
    """kalkis(t) ile kullanılacak battaniye_alfa (1 -> 0): battaniye omuzlardan kayar ve kalça yerden kalkmadan
    (t = KALKIS_YUKSELIS) önce tamamen biter. bas: kaymanın başladığı t (varsayılan 0; sahne battaniyeyi kalkıştan
    önce kaydırmak isterse negatif verip t'yi 0'ın altından başlatabilir; kalkis(t<0) = oturus_dik)."""
    t_son = KALKIS_YUKSELIS - 0.02
    return 1.0 - _ss5(bas, t_son, t)


POZLAR = {}
POZLAR['ayakta'] = _poz_ayakta()
POZLAR['ayakta_dik'] = _poz_ayakta_dik()
POZLAR['sula'] = sula_pozu(0.0)
POZLAR['sula_dok'] = sula_pozu(1.0)
POZLAR['kiyam'] = _poz_kiyam()
POZLAR['ruku'] = _poz_ruku()
POZLAR['secde'] = _poz_secde()
_sk_secde = iskelet(POZLAR['secde'])
SECDE_EL = {t: _sk_secde['Wr_' + t].copy() for t in ('on', 'ar')}   # secde'de bilekler (diz ailesi çerçevesi)
POZLAR['oturus_hasta'] = _poz_oturus(False)
POZLAR['oturus_dik'] = _poz_oturus(True)
POZLAR['diz_dua'] = _poz_diz_dua()
POZLAR['diz_otur'] = _poz_diz_otur()
POZLAR['diz_sukur'] = _poz_diz_sukur()
_KALKIS_GOVDE = [POZLAR['oturus_dik'], _kalkis_govde(1), _kalkis_govde(2), _kalkis_govde(3),
                 _kaydir(POZLAR['ayakta_dik'], KALKIS_DX)]
_sk = iskelet(POZLAR['oturus_dik'])
_KALKIS_EL0 = {t: (_sk['Wr_' + t].copy(), float(_sk['th_' + t])) for t in ('on', 'ar')}
_KALKIS_AYAK0 = {t: _sk['A_' + t].copy() for t in ('on', 'ar')}
_KALKIS_YER = {'on': _v(61.0, -9.3), 'ar': _v(69.0, -9.3)}     # yere basan avuçlar (bilek; kalçanın önü-yanı)
# kalça yerden kalkma anı (dış t; kalkis(t) içeride smoothstep uygular)
_a, _b = 0.0, 1.0
for _i in range(18):                     # kalça yüksekliği bu aralıkta monoton: ikiye bölme
    _m = 0.5 * (_a + _b)
    if poz_zaman_yolu(_KALKIS_GOVDE, KALKIS_ZAMAN, _ss(0.0, 1.0, _m))['ky'] < POZLAR['oturus_dik']['ky'] - 1.5:
        _b = _m
    else:
        _a = _m
KALKIS_YUKSELIS = round(_b, 3)
POZLAR['kalkis_1'] = _poz_kalkis(1)
POZLAR['kalkis_2'] = _poz_kalkis(2)
POZLAR['kalkis_3'] = _poz_kalkis(3)
POZLAR['kalkis_4'] = _kaydir(POZLAR['ayakta_dik'], KALKIS_DX)
for _i in range(4):
    POZLAR['yuru_%d' % _i] = yuruyus(_i / 4.0)
KALKIS_DIZI = [POZLAR[k] for k in ('oturus_dik', 'kalkis_1', 'kalkis_2', 'kalkis_3', 'kalkis_4')]
# secde ailesi geçiş verileri
_sk = iskelet(POZLAR['diz_dua'])
_SECDE_EL0 = {t: (_sk['Wr_' + t].copy(), float(_sk['th_' + t]), POZLAR['diz_dua']['yan_' + t],
                  POZLAR['diz_dua']['kivrim_' + t]) for t in ('on', 'ar')}
_SECDE_GOVDE = _secde_govdeleri()
_SECDE_ARA = {'on': [], 'ar': []}       # secdeye ara bilek anahtarları: omuzdan öne-aşağı uzanan kol
for _u, _L, _a in ((0.14, 172.0, 28.0), (0.32, 182.0, 24.0)):
    _sk = iskelet(poz_zaman_yolu(_SECDE_GOVDE, (0.0, 0.30, SECDE_TEMAS, 1.0), _u, sabit='diz_on'))
    for _t in ('on', 'ar'):
        _SECDE_ARA[_t].append(_sk['S_' + _t] + _L * _asg(_a + (3.0 if _t == 'ar' else 0.0)))
POZLAR['diz_secde_1'] = _secdeye_u(0.30)
POZLAR['diz_secde_2'] = _secdeye_u(SECDE_TEMAS)
SECDE_DIZI = [POZLAR[k] for k in ('diz_dua', 'diz_secde_1', 'diz_secde_2', 'secde')]
_KALK_GOVDE = _kalk_govdeleri()
_sk = iskelet(poz_zaman_yolu(_KALK_GOVDE, _KALK_ZAMAN, 0.74, sabit='diz_on'))
_KALK_ARA = {t: _sk['S_' + t] + 168.0 * _asg(18.0 + (2.0 if t == 'ar' else 0.0)) for t in ('on', 'ar')}
POZLAR['secde_kalk'] = secdeden_kalk(SECDE_KALK_EL)
_sk = iskelet(POZLAR['diz_otur'])
_DUA_EL0 = {t: (_sk['Wr_' + t].copy(), float(_sk['th_' + t])) for t in ('on', 'ar')}
del _sk
