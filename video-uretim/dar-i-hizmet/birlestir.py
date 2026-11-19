"""Kareleri ve sesi videoya dönüştürür.

python3 birlestir.py [--kareler DIZIN] [--ses miks.wav] [--cikti dar-i-hizmet.mp4]
Ana çıktı: 1080x1920, 30 fps, H.264 (yüksek kalite). Ayrıca uygulama (Oku) için README'deki 720x1280 sürüm.
"""
import argparse
import os
import subprocess

SCR = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--kareler', default=os.path.join(SCR, 'kareler'))
    ap.add_argument('--ses', default=os.path.join(SCR, 'ses', 'miks.wav'))
    ap.add_argument('--cikti', default=os.path.join(SCR, 'dar-i-hizmet.mp4'))
    ap.add_argument('--uygulama', default=os.path.join(SCR, 'dar-i-hizmet-720.mp4'))
    a = ap.parse_args()
    ses = ['-i', a.ses] if os.path.exists(a.ses) else []
    kmt = ['ffmpeg', '-y', '-framerate', '30', '-i', os.path.join(a.kareler, '%05d.png'), *ses,
           '-c:v', 'libx264', '-preset', 'slow', '-crf', '13', '-tune', 'film', '-profile:v', 'high',
           '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
           '-g', '60', '-movflags', '+faststart']
    if ses:
        kmt += ['-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest']
    kmt += [a.cikti]
    print(' '.join(kmt))
    subprocess.run(kmt, check=True)
    # uygulama sürümü (README: Oku: video ekleme)
    kmt2 = ['ffmpeg', '-y', '-i', a.cikti, '-vf', 'scale=720:1280:flags=lanczos,format=yuv420p', '-c:v', 'libx264',
            '-preset', 'slow', '-profile:v', 'high', '-crf', '23', '-maxrate', '2500k', '-bufsize', '5000k',
            '-g', '48', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', a.uygulama]
    subprocess.run(kmt2, check=True)


if __name__ == '__main__':
    main()
