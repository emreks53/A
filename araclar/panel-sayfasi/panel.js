// Yönetim paneli istemci kodu (site/yonetim/panel/index.html içine gömülür; kaynak: araclar/panel-sayfasi/)
(() => {
  const $ = (s, k = document) => k.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mb = (b) => (b / 1e6).toFixed(1).replace('.', ',') + ' MB';
  const tarihTr = (t) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : t || ''; };
  const mesajKutu = $('#mesaj');
  const mesaj = (m, iyi = false) => { mesajKutu.textContent = m; mesajKutu.className = 'y-mesaj ' + (iyi ? 'iyi' : 'kotu'); mesajKutu.hidden = !m; if (m) mesajKutu.scrollIntoView({ block: 'nearest' }); };
  const girise = () => location.replace('/yonetim/');

  async function api(yol, secenek = {}) {
    const ayar = { credentials: 'same-origin', method: secenek.method || 'GET', headers: { 'x-panel': '1' } };
    if (secenek.json !== undefined) { ayar.headers['content-type'] = 'application/json'; ayar.body = JSON.stringify(secenek.json); }
    const r = await fetch('/api/yonetim/' + yol, ayar);
    if (r.status === 401 && yol !== 'cikis') { girise(); throw new Error('oturum'); }
    const veri = await r.json().catch(() => ({ hata: 'Sunucuya ulaşılamadı.' }));
    if (!r.ok) throw new Error(veri.hata || 'İşlem yapılamadı.');
    return veri;
  }
  function yukle(yol, form, cubuk) {
    return new Promise((coz, red) => {
      const x = new XMLHttpRequest();
      x.open('POST', '/api/yonetim/' + yol); x.setRequestHeader('x-panel', '1'); x.withCredentials = true;
      const ic = cubuk.firstElementChild; cubuk.hidden = false; ic.style.width = '0';
      x.upload.onprogress = (e) => { if (e.lengthComputable) ic.style.width = Math.round((e.loaded / e.total) * 100) + '%'; };
      x.onload = () => { cubuk.hidden = true; let v = {}; try { v = JSON.parse(x.responseText); } catch { v = { hata: 'Sunucuya ulaşılamadı.' }; }
        if (x.status === 401) { girise(); return red(new Error('oturum')); }
        x.status >= 200 && x.status < 300 ? coz(v) : red(new Error(v.hata || 'Yükleme başarısız.')); };
      x.onerror = () => { cubuk.hidden = true; red(new Error('Bağlantı hatası. İnternet bağlantınızı kontrol edin.')); };
      x.send(new FormData(form));
    });
  }

  /* Sekmeler */
  const sekmeler = ['belge', 'haber', 'kayit'];
  function sekmeAc(ad) {
    sekmeler.forEach((s) => { $('#s-' + s).setAttribute('aria-selected', String(s === ad)); $('#b-' + s).hidden = s !== ad; });
    if (ad === 'kayit') kayitlariGetir();
    try { history.replaceState(null, '', '#' + ad); } catch {}
  }
  sekmeler.forEach((s) => $('#s-' + s).addEventListener('click', () => { mesaj(''); sekmeAc(s); }));

  /* Bölüm haritası */
  let H = null;
  const bolum = (kid) => H.bolumler.find((b) => b.kid === kid);
  function sayfaAdresi(b) {
    const bol = bolum(b.kid); if (!bol) return '/';
    if (bol.tip === 'yil') return (bol.yillar[b.yil] && bol.yillar[b.yil].tr) || bol.kok.tr + b.yil + '/';
    if (bol.tip === 'grup') return bol.kok.tr;
    return b.hedef || bol.kok.tr;
  }
  function bolumSecimi() {
    const bol = bolum($('#kid').value);
    const grupAlan = $('#grupAlan'), hedefAlan = $('#hedefAlan');
    grupAlan.hidden = !(bol && bol.tip === 'grup');
    if (!grupAlan.hidden) $('#grup').innerHTML = bol.gruplar.map((g) => `<option>${esc(g.ad)}</option>`).join('');
    hedefAlan.hidden = !(bol && (bol.tip === 'alt') && bol.hedefler.length > 1);
    if (!hedefAlan.hidden) $('#hedef').innerHTML = bol.hedefler.map((h) => `<option value="${esc(h.rota)}">${esc(h.ad)}</option>`).join('');
    else $('#hedef').innerHTML = bol ? `<option value="${esc(bol.kok.tr)}"></option>` : '';
  }

  /* Belgeler */
  async function belgeleriGetir() {
    const { belgeler } = await api('belgeler');
    $('#belgeSayi').textContent = belgeler.length ? `(${belgeler.length})` : '';
    $('#belgeListe').innerHTML = belgeler.length ? belgeler.map((b) => {
      const bol = bolum(b.kid);
      const yer = bol ? bol.ad + (b.grup ? ' · ' + b.grup : '') + (b.hedef && bol.hedefler.find((h) => h.rota === b.hedef) ? ' · ' + bol.hedefler.find((h) => h.rota === b.hedef).ad : '') : b.kid;
      return `<article class="y-kart p-oge" data-id="${b.id}">
        <div class="p-oge-ust"><span class="p-etiket">${esc(b.yil)}</span><b class="p-ad">${esc(b.etiket)}</b></div>
        <div class="p-ek">${esc(yer)}</div>
        <div class="p-ek">EN: ${b.etiket_en ? esc(b.etiket_en) : '<i>İngilizce sitede gösterilmiyor</i>'}</div>
        <div class="p-ek">${esc(b.dosya_adi)} · PDF ${mb(b.boyut)} · ${esc(tarihTr((b.olusturma || '').slice(0, 10)))} · ${esc(b.olusturan)}</div>
        <div class="p-eylem"><a class="y-dugme ikincil kucuk" href="${esc(sayfaAdresi(b))}" target="_blank" rel="noopener">Sayfada gör</a><a class="y-dugme ikincil kucuk" href="/belgeler/${b.anahtar.split('/').map(encodeURIComponent).join('/')}" target="_blank" rel="noopener">PDF'i aç</a><button class="y-dugme ikincil kucuk" type="button" data-is="ad">Adını düzenle</button><button class="y-dugme tehlike kucuk" type="button" data-is="kaldir">Kaldır</button></div>
        <form class="p-duzen" hidden novalidate><label class="y-etiket">Türkçe adı<input class="y-girdi" name="etiket" maxlength="300" value="${esc(b.etiket)}" required></label><label class="y-etiket">İngilizce adı<input class="y-girdi" name="etiket_en" maxlength="300" value="${esc(b.etiket_en)}"></label><div class="p-eylem"><button class="y-dugme kucuk" type="submit">Kaydet</button><button class="y-dugme ikincil kucuk" type="button" data-is="vazgec">Vazgeç</button></div></form>
      </article>`;
    }).join('') : '<p class="p-bos">Henüz panelden belge eklenmedi.</p>';
  }
  $('#belgeListe').addEventListener('click', async (e) => {
    const d = e.target.closest('button[data-is]'); if (!d) return;
    const oge = d.closest('.p-oge'); const id = oge.dataset.id; const is = d.dataset.is;
    if (is === 'ad') { oge.querySelector('.p-duzen').hidden = false; oge.querySelector('.p-duzen input').focus(); }
    if (is === 'vazgec') oge.querySelector('.p-duzen').hidden = true;
    if (is === 'kaldir') {
      if (!confirm('Bu belge siteden ve depodan kalıcı olarak kaldırılacak. Emin misiniz?')) return;
      d.disabled = true;
      try { await api('belgeler/' + id, { method: 'DELETE' }); mesaj('Belge kaldırıldı.', true); await belgeleriGetir(); } catch (h) { d.disabled = false; if (h.message !== 'oturum') mesaj(h.message); }
    }
  });
  $('#belgeListe').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; const id = f.closest('.p-oge').dataset.id;
    const b = f.querySelector('button[type=submit]'); b.disabled = true;
    try { await api('belgeler/' + id, { method: 'PATCH', json: { etiket: f.etiket.value, etiket_en: f.etiket_en.value } }); mesaj('Belge adı güncellendi.', true); await belgeleriGetir(); }
    catch (h) { b.disabled = false; if (h.message !== 'oturum') mesaj(h.message); }
  });
  $('#belgeForm').addEventListener('submit', async (e) => {
    e.preventDefault(); mesaj('');
    const f = e.currentTarget; const b = f.querySelector('button[type=submit]');
    if (!f.dosya.files.length) return mesaj('PDF dosyasını seçin.');
    if (!/^\d{4}$/.test(f.yil.value.trim())) return mesaj('Yılı dört haneli yazın (ör. 2026).');
    if (!f.etiket.value.trim()) return mesaj('Belgenin Türkçe adını yazın.');
    b.disabled = true;
    try { await yukle('belgeler', f, $('#belgeIlerleme')); mesaj('Belge yayınlandı. Sitede birkaç saniye içinde görünür.', true); f.etiket.value = ''; f.etiket_en.value = ''; f.dosya.value = ''; await belgeleriGetir(); }
    catch (h) { if (h.message !== 'oturum') mesaj(h.message); }
    b.disabled = false;
  });

  /* Duyurular */
  async function haberleriGetir() {
    const { haberler } = await api('haberler');
    $('#haberSayi').textContent = haberler.length ? `(${haberler.length})` : '';
    $('#haberListe').innerHTML = haberler.length ? haberler.map((n) => {
      let ekler = []; try { ekler = JSON.parse(n.ekler || '[]'); } catch {}
      return `<article class="y-kart p-oge" data-id="${n.id}">
        <div class="p-oge-ust"><span class="p-etiket">${esc(tarihTr(n.tarih))}</span><b class="p-ad">${esc(n.baslik)}</b></div>
        <div class="p-ek">${ekler.length ? ekler.map((x) => esc(x.ad)).join(', ') : 'Ek yok'} · ${esc(n.olusturan)}</div>
        <div class="p-eylem"><a class="y-dugme ikincil kucuk" href="/haberler/${esc(n.slug)}/" target="_blank" rel="noopener">Sayfada gör</a><button class="y-dugme ikincil kucuk" type="button" data-is="duzenle">Düzenle</button><button class="y-dugme tehlike kucuk" type="button" data-is="kaldir">Kaldır</button></div>
        <form class="p-duzen" hidden novalidate><label class="y-etiket">Başlık<input class="y-girdi" name="baslik" maxlength="300" value="${esc(n.baslik)}" required></label><label class="y-etiket">Tarih<input class="y-girdi" name="tarih" type="date" value="${esc(n.tarih)}" required></label><label class="y-etiket">Metin<textarea class="y-girdi" name="govde" maxlength="20000" required>${esc(n.govde)}</textarea></label><div class="p-eylem"><button class="y-dugme kucuk" type="submit">Kaydet</button><button class="y-dugme ikincil kucuk" type="button" data-is="vazgec">Vazgeç</button></div></form>
      </article>`;
    }).join('') : '<p class="p-bos">Henüz panelden duyuru eklenmedi.</p>';
  }
  $('#haberListe').addEventListener('click', async (e) => {
    const d = e.target.closest('button[data-is]'); if (!d) return;
    const oge = d.closest('.p-oge'); const id = oge.dataset.id; const is = d.dataset.is;
    if (is === 'duzenle') { oge.querySelector('.p-duzen').hidden = false; oge.querySelector('.p-duzen input').focus(); }
    if (is === 'vazgec') oge.querySelector('.p-duzen').hidden = true;
    if (is === 'kaldir') {
      if (!confirm('Bu duyuru ve ekleri siteden kalıcı olarak kaldırılacak. Emin misiniz?')) return;
      d.disabled = true;
      try { await api('haberler/' + id, { method: 'DELETE' }); mesaj('Duyuru kaldırıldı.', true); await haberleriGetir(); } catch (h) { d.disabled = false; if (h.message !== 'oturum') mesaj(h.message); }
    }
  });
  $('#haberListe').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; const id = f.closest('.p-oge').dataset.id;
    const b = f.querySelector('button[type=submit]'); b.disabled = true;
    try { await api('haberler/' + id, { method: 'PATCH', json: { baslik: f.baslik.value, tarih: f.tarih.value, govde: f.govde.value } }); mesaj('Duyuru güncellendi.', true); await haberleriGetir(); }
    catch (h) { b.disabled = false; if (h.message !== 'oturum') mesaj(h.message); }
  });
  $('#haberForm').addEventListener('submit', async (e) => {
    e.preventDefault(); mesaj('');
    const f = e.currentTarget; const b = f.querySelector('button[type=submit]');
    if (!f.baslik.value.trim() || !f.tarih.value || !f.govde.value.trim()) return mesaj('Başlık, tarih ve metin zorunludur.');
    if (f.ek.files.length > 5) return mesaj('En çok 5 PDF eklenebilir.');
    b.disabled = true;
    try { const v = await yukle('haberler', f, $('#haberIlerleme')); mesaj('Duyuru yayınlandı: /haberler/' + v.slug + '/', true); f.reset(); f.tarih.value = bugun(); await haberleriGetir(); }
    catch (h) { if (h.message !== 'oturum') mesaj(h.message); }
    b.disabled = false;
  });

  /* İşlem geçmişi */
  const ISLEM = { giris: 'Giriş', 'belge-ekle': 'Belge eklendi', 'belge-duzenle': 'Belge adı değişti', 'belge-kaldir': 'Belge kaldırıldı', 'haber-ekle': 'Duyuru eklendi', 'haber-duzenle': 'Duyuru düzenlendi', 'haber-kaldir': 'Duyuru kaldırıldı' };
  async function kayitlariGetir() {
    try {
      const { kayitlar } = await api('kayit');
      $('#kayitListe').innerHTML = kayitlar.map((k) => { let a = k.ayrinti; try { const j = JSON.parse(k.ayrinti); a = j.etiket || j.baslik || j.yeni || j.anahtar || ''; } catch {} return `<tr><td>${esc(k.zaman)}</td><td>${esc(k.email)}</td><td>${esc(ISLEM[k.islem] || k.islem)}</td><td>${esc(a)}</td></tr>`; }).join('') || '<tr><td colspan="4">Kayıt yok.</td></tr>';
    } catch (h) { if (h.message !== 'oturum') mesaj(h.message); }
  }

  const bugun = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  $('#cikis').addEventListener('click', async () => { try { await api('cikis', { method: 'POST' }); } catch {} girise(); });

  (async () => {
    try {
      const ben = await api('ben'); $('#ben').textContent = ben.email;
      H = await (await fetch('/panel-veri/harita.json', { credentials: 'same-origin' })).json();
      $('#kid').innerHTML = H.bolumler.map((b) => `<option value="${esc(b.kid)}">${esc(b.ad)}</option>`).join('');
      $('#kid').addEventListener('change', bolumSecimi); bolumSecimi();
      $('#yil').value = String(new Date().getFullYear()); $('#tarih').value = bugun();
      await Promise.all([belgeleriGetir(), haberleriGetir()]);
      const ilk = (location.hash || '').slice(1); if (sekmeler.includes(ilk)) sekmeAc(ilk);
    } catch (h) { if (h.message !== 'oturum') mesaj(h.message); }
  })();
})();
