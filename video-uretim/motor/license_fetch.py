"""License (with the user's own Shutterstock subscription) and download the clips used by the
shot table, then keep only the used segment (+margin) as a high-quality H.264 file.
Auth: the environment's network secret injects the Authorization header for api.shutterstock.com.
Usage: python3 license_fetch.py [--only ID] [--limit N] [--dry]"""
import os, sys, json, re, subprocess, time, urllib.request, urllib.error
from common import ROOT
import shots

API = 'https://api.shutterstock.com/v2'
SUB = os.environ.get('SHUTTERSTOCK_SUBSCRIPTION_ID')  # found automatically below when unset
OUT = ROOT + '/licensed'
RAW = ROOT + '/licensed_raw'
STATE = OUT + '/state.json'
os.makedirs(OUT, exist_ok=True)
os.makedirs(RAW, exist_ok=True)


def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Content-Type': 'application/json', 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b'{}')
        except Exception:
            return e.code, {}


def footage_subscription():
    global SUB
    if SUB:
        return SUB
    code, r = call('GET', '/user/subscriptions')
    for s in r.get('data', []):
        if s.get('license') == 'footage_standard':
            SUB = s['id']
            return SUB
    raise SystemExit('No footage subscription found on this account.')


def load_state():
    return json.load(open(STATE)) if os.path.exists(STATE) else {}


def save_state(st):
    json.dump(st, open(STATE + '.tmp', 'w'), indent=1)
    os.replace(STATE + '.tmp', STATE)


def clip_ranges():
    """clip id -> (src_start, src_end) union of the source ranges the plates read."""
    sh = shots.shot_table()
    rng = {}
    for k, s in enumerate(sh):
        m = re.search(r'/(\d+)\.mp4$', s['src'])
        if not m:
            continue
        cid = m.group(1)
        pre = sh[k].get('trans', {}).get('dur', 0) / 2 if k > 0 else 0
        post = sh[k + 1].get('trans', {}).get('dur', 0) / 2 if k + 1 < len(sh) else 0
        sp = s.get('speed', 1.0)
        off = s.get('_lic_offset', 0.0)
        t0 = max(0.0, s.get('t_in', 0.0) + off - pre * sp)
        t1 = t0 + (s['end'] - s['start'] + pre + post) * sp
        a, b = rng.get(cid, (1e9, -1e9))
        rng[cid] = (min(a, t0), max(b, t1))
    return rng


def download(url, dst):
    for attempt in range(4):
        r = subprocess.run(['curl', '-sS', '-L', '--fail', '-o', dst, url])
        if r.returncode == 0 and os.path.getsize(dst) > 10000:
            return True
        time.sleep(2 ** (attempt + 1))
    return False


def trim(raw, cid, t0, t1):
    a = max(0.0, t0 - 0.6)
    dur = (t1 + 0.6) - a
    dst = f'{OUT}/{cid}.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.3f}', '-i', raw, '-t', f'{dur:.3f}',
                    '-map', '0:v:0', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14',
                    '-pix_fmt', 'yuv420p', dst], check=True)
    json.dump({'offset': a, 'raw_range': [t0, t1]}, open(f'{OUT}/{cid}.json', 'w'))
    return dst


def process(cid, rng, st, dry=False):
    ent = st.get(cid, {})
    if ent.get('done') and os.path.exists(f'{OUT}/{cid}.mp4'):
        return 'done'
    if dry:
        return 'would-license'
    url = None
    if ent.get('license_id'):
        code, r = call('POST', f"/videos/licenses/{ent['license_id']}/downloads", {'size': ent.get('size', '4k')})
        url = r.get('url')
    if not url:
        for size in ('4k', 'hd'):
            code, r = call('POST', f'/videos/licenses?subscription_id={footage_subscription()}', {'videos': [{'video_id': cid, 'size': size}]})
            d = (r.get('data') or [{}])[0]
            if d.get('download', {}).get('url'):
                url = d['download']['url']
                ent.update(license_id=d.get('license_id'), size=size, allotment_charge=d.get('allotment_charge'))
                st[cid] = ent; save_state(st)
                break
            ent.setdefault('errors', []).append({'size': size, 'code': code, 'resp': str(r)[:400]})
            st[cid] = ent; save_state(st)
            if code in (401, 403):
                return f'auth-error {code}'
    if not url:
        return 'license-failed'
    ext = os.path.splitext(url.split('?')[0])[1] or '.mov'
    raw = f'{RAW}/{cid}{ext}'
    if not download(url, raw):
        return 'download-failed'
    pr = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                         'stream=width,height,r_frame_rate,codec_name', '-of', 'csv=p=0', raw],
                        capture_output=True, text=True).stdout.strip()
    trim(raw, cid, *rng)
    os.remove(raw)
    ent.update(done=True, probe=pr)
    st[cid] = ent; save_state(st)
    return f"ok {ent.get('size')} {pr} charge={ent.get('allotment_charge')}"


def site_licenses():
    """video id -> license id for licenses the user made on shutterstock.com (re-download is free)."""
    out, page = {}, 1
    while True:
        code, r = call('GET', f'/videos/licenses?per_page=100&page={page}&sort=newest')
        for x in r.get('data', []):
            if x.get('is_downloadable'):
                out.setdefault(x['video']['id'], x['id'])
        if len(r.get('data', [])) < 100:
            break
        page += 1
    return out


def fetch_from_site(cid, lic_id, rng, st):
    """Re-download (free) a license made on the website, at 4K, then keep only the used segment."""
    if st.get(cid, {}).get('done') and os.path.exists(f'{OUT}/{cid}.mp4'):
        return 'done'
    raw = f'{RAW}/{cid}.bin'
    if not (os.path.exists(raw) and os.path.getsize(raw) > 10_000_000):
        url = None
        for size in ('4k', 'hd'):
            code, r = call('POST', f'/videos/licenses/{lic_id}/downloads', {'size': size})
            if r.get('url'):
                url, got = r['url'], size
                break
        if not url:
            return f'no-url {code}'
        if not download(url, raw):
            return 'download-failed'
    else:
        got = 'cached'
    pr = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                         'stream=width,height,r_frame_rate,codec_name', '-of', 'csv=p=0', raw],
                        capture_output=True, text=True).stdout.strip()
    trim(raw, cid, *rng)
    os.remove(raw)
    st[cid] = dict(done=True, license_id=lic_id, size=got, probe=pr, source='site')
    save_state(st)
    return f'ok {got} {pr}'


def main():
    args = sys.argv[1:]
    dry = '--dry' in args
    only = args[args.index('--only') + 1] if '--only' in args else None
    limit = int(args[args.index('--limit') + 1]) if '--limit' in args else None
    rng = clip_ranges()
    ids = [only] if only else list(rng)
    if limit:
        ids = ids[:limit]
    st = load_state()
    if '--site' in args:
        lic = site_licenses()
        todo = [c for c in ids if c in lic]
        missing = [c for c in ids if c not in lic]
        print(f'{len(todo)} licensed on site, {len(missing)} not yet', flush=True)
        for i, cid in enumerate(todo):
            res = fetch_from_site(cid, lic[cid], rng[cid], st)
            print(f'[{i + 1}/{len(todo)}] {cid} -> {res}', flush=True)
        json.dump(missing, open(OUT + '/missing.json', 'w'))
        return
    print(len(ids), 'clips', flush=True)
    for i, cid in enumerate(ids):
        res = process(cid, rng[cid], st, dry)
        print(f'[{i + 1}/{len(ids)}] {cid} range={rng[cid][0]:.1f}-{rng[cid][1]:.1f} -> {res}', flush=True)
        if res.startswith('auth-error'):
            break
    code, r = call('GET', '/user/subscriptions')
    for s in r.get('data', []):
        if s.get('license') == 'footage_standard':
            print('downloads_left:', s.get('allotment', {}).get('downloads_left'), flush=True)


if __name__ == '__main__':
    main()
