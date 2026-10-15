/* /belgeler/* : önce statik dosya (site/belgeler); yoksa R2 kovası `idealist-belgeler`
   (25 MB üzeri 4 izahname PDF'i ve yönetim panelinden yüklenen belgeler). Belge adresleri değişmez. */
interface Env { BELGELER?: R2Bucket; ASSETS: Fetcher }
export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const staticRes = await env.ASSETS.fetch(request);
  if (staticRes.status !== 404) return staticRes;
  if ((request.method !== 'GET' && request.method !== 'HEAD') || !env.BELGELER) return staticRes;
  const key = decodeURIComponent((params.path as string[]).join('/'));
  const obj = request.method === 'HEAD' ? await env.BELGELER.head(key) : await env.BELGELER.get(key);
  if (!obj) return staticRes;
  const headers = new Headers(); obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('content-type', 'application/pdf');
  /* Panelden kaldırılıp aynı adla yeniden yüklenen belge eski sürümüyle önbellekte kalmasın: kısa süre + etag doğrulaması */
  headers.set('cache-control', 'public, max-age=3600');
  if (request.headers.get('if-none-match') === obj.httpEtag) return new Response(null, { status: 304, headers });
  headers.set('content-length', String(obj.size));
  return new Response(request.method === 'HEAD' ? null : (obj as R2ObjectBody).body, { headers });
};
