"""Contact sheet: python3 contact.py out.jpg frame1.png frame2.png ... (labels from file names)."""
import sys, math, re, pathlib
from PIL import Image, ImageDraw, ImageFont

out, files = sys.argv[1], sys.argv[2:]
cols = 4 if len(files) > 6 else len(files)
rows = math.ceil(len(files) / cols)
tw, th = 360, 640
sheet = Image.new('RGB', (cols * tw, rows * (th + 34)), (30, 30, 34))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 20)
except Exception:
    font = ImageFont.load_default()
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
    x, y = (i % cols) * tw, (i // cols) * (th + 34)
    sheet.paste(im, (x, y + 34))
    m = re.search(r't_?(\d+\.\d+)', pathlib.Path(f).name)
    d.text((x + 8, y + 6), (m.group(1) + ' s') if m else pathlib.Path(f).stem, fill=(235, 235, 235), font=font)
sheet.save(out, quality=90)
