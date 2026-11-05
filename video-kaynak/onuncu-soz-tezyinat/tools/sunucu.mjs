// Proje klasörünü yerelde sunan küçük statik sunucu (yazı tipleri file:// ile sorun çıkarmasın diye)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
export function sunucuBaslat(kok) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const f = path.join(kok, u === '/' ? 'index.html' : u);
      if (!f.startsWith(kok)) { rsp.writeHead(403); return rsp.end(); }
      fs.readFile(f, (err, data) => {
        if (err) { rsp.writeHead(404); return rsp.end('404'); }
        rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        rsp.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => res({ srv, port: srv.address().port }));
  });
}
