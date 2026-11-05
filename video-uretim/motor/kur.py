"""Prepare a working folder to continue a project in a fresh session.

    python3 video-uretim/motor/kur.py [proje-32-soz]

- copies the project's timing, plan and book renders into $VIDEO_ROOT (default ~/video-calisma)
- downloads the fonts from Google Fonts
- downloads the Shutterstock preview clips listed in klipler.json
The narration recording is NOT in the repository (the repo is public): put it at
$VIDEO_ROOT/audio/voice.mp3 yourself before rendering.
"""
import json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.join(os.path.dirname(HERE), sys.argv[1] if len(sys.argv) > 1 else 'proje-32-soz')
ROOT = os.environ.get('VIDEO_ROOT', os.path.expanduser('~/video-calisma'))

FONTS = ["Cormorant Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600", "Cormorant SC:wght@500;600",
         "Playfair Display:ital,wght@0,500;0,600;1,500", "Marcellus", "Cinzel:wght@500;600",
         "EB Garamond:ital,wght@0,500;1,500", "Amiri:wght@400;700"]


def copy_tree(src, dst):
    os.makedirs(dst, exist_ok=True)
    for name in os.listdir(src):
        s = os.path.join(src, name)
        if os.path.isfile(s):
            shutil.copy2(s, os.path.join(dst, name))


def fonts():
    out = os.path.join(ROOT, 'fonts')
    os.makedirs(out, exist_ok=True)
    for f in FONTS:
        css = subprocess.run(['curl', '-sS', '-A', 'Wget/1.0', 'https://fonts.googleapis.com/css2?family=' + f.replace(' ', '+')],
                             capture_output=True, text=True).stdout
        for block in re.findall(r"@font-face\s*{(.*?)}", css, re.S):
            style = re.search(r"font-style:\s*(\w+)", block).group(1)
            wt = re.search(r"font-weight:\s*(\d+)", block).group(1)
            url = re.search(r"url\((.*?)\)", block).group(1)
            name = f.split(':')[0].replace(' ', '') + f'-{wt}-{style}.ttf'
            if not os.path.exists(os.path.join(out, name)):
                subprocess.run(['curl', '-sS', '-o', os.path.join(out, name), url], check=True)


def clips():
    rows = json.load(open(os.path.join(PROJ, 'klipler.json')))
    done = set()
    for r in rows:
        dst = os.path.join(ROOT, 'clips', r['path'])
        if r['path'] in done or os.path.exists(dst):
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        subprocess.run(['curl', '-sS', '-L', '--fail', '-o', dst, r['preview']], check=True)
        done.add(r['path'])
        print('clip', r['clip_id'])


def main():
    copy_tree(os.path.join(PROJ, 'zamanlama'), os.path.join(ROOT, 'audio'))
    copy_tree(os.path.join(PROJ, 'plan'), os.path.join(ROOT, 'plan'))
    copy_tree(os.path.join(PROJ, 'kitap'), os.path.join(ROOT, 'ending'))
    fonts()
    clips()
    voice = os.path.join(ROOT, 'audio', 'voice.mp3')
    print('\nReady in', ROOT)
    if not os.path.exists(voice):
        print('Missing narration: copy the recording to', voice)


if __name__ == '__main__':
    main()
