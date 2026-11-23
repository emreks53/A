# audio/PROGRESS.md — sound-effects redesign after the client's review of v3 (started Nov 23)

Brief: no coarse / unpleasant effects, bus about 3 dB quieter, new ending (no coin throw; gold hour dissolves into light).
Plan: 1 audit_before.md (audit.py) -> 2 new small palette in sfx.py -> 3 new cues.json -> 4 mix + verify -> 5 audit_after.md + README.

- [done] v3 state backed up to audio/v3_backup/ (sfx.py mix.py verify.py meter.py cues.json mix_report.json sfx_bus.wav README.md).
  Nothing else changed yet.
- [done] audit.py written (per-sound + per-cue measurements, --lib DIR to audit an older palette); audit_before.md written
  (v3 numbers: bus gated -37.1, speech -43.9, peak -15.0 dBFS; 19 of 30 cues hard-attack). json in v3_backup/audit_before.json.
- NEXT: rewrite sfx.py to the small palette (air, glow, glint, rise, room_tone + spares drop, touch), new cues.json (17 cues:
  air x6 at 1.80 4.57 8.42 13.13 16.33 21.55; glow x7 at 4.23 9.67 11.65 16.97 22.87(rising) 23.23 25.55; glint 13.97 + 15.37;
  room_tone 23.0; rise 24.35; no end-card taps), mix.py sfx_peak_max -18, verify.py names, then audit_after.md + README.
- [done] sfx.py = palette v4 (air, glow, glint, rise, room_tone; spares drop, touch). cues.json = sheet v4 (18 cues, no end-card taps).
  mix.py defaults: sfx_peak_max -18, duck 4 dB with 50/50/350 ms. verify.py adapted (v4 names, no-hiss and nothing-struck checks,
  anchor test with glint/air, click self-test cuts at waveform peaks). mix + verify: ALL CHECKS PASSED (verify_v5.log):
  bus gated -42.1, speech -51.3, pauses -44.4, mom max -32.7, peak -22.0 dBFS; click score 0.0002.
- NEXT: look at spectrograms of the bus (scratchpad look.py), check the two overlapping end glows for beating, masking analysis
  (narrator dominance per critical band), then audit_after.md, README.md rewrite, sfx_demo re-render, final report.
- [done] DESIGN CHANGE after looking at spectrograms + thinking about "no music": glow is no longer a low harmonic tone
  (512/768/1024 Hz read as a pad note / hum). glow = un-pitched warm air body (250 Hz-1.8 kHz) + four soft HIGH partials
  (1536/2048/3072/4096 Hz, slow shimmer). glint = soft-attack coin modes at 2048/3541/4768 Hz. rise/air high-passed (no rumble).
  Spare `drop` removed (only spare: touch). Sheet now 18 cues: air 1.80 4.57 8.42 14.72 16.33 21.55; glow 4.23 9.67 11.65 16.97
  20.33 22.87(rising) 23.23 25.55; glint 13.97 15.37; room_tone 23.0; rise 24.35. audit.py got section 4 (masking model).
  Bus now: gated about -42, speech -50.5, peak -23 dBFS.
- NEXT: final mix + verify (verify_v5.log), regenerate audit_before.md with section 4 (keep the verdict section!), audit_after.md,
  README.md rewrite, sfx_demo re-render (old demo -> v3_backup/sfx_demo), final report via SubagentHandback.
- [done] FINAL STATE: cues.json v4 (18 cues), mix.wav / sfx_bus.wav / voice_bus.wav / mix_report.json rendered, verify ALL PASSED
  (verify_v5.log, mix_v5.log). audit_before.md + audit_after.md (with before/after, fate of every v3 cue, clicks, not-verified list),
  README.md rewritten, sfx_demo re-rendered (old one in v3_backup/sfx_demo), pictures/ (spectrograms + look.py).
  Bus: gated -41.9, speech -50.5, pauses -44.2, mom max -33.1, peak -22.9 dBFS. Nothing left running.
- REMAINING: final report to the lead (SubagentHandback).
- [done] Report handed to the lead. JOB COMPLETE. md5 mix.wav daad2aa7..., sfx_bus.wav c0e1fcac... . To change anything:
  edit cues.json -> python3 mix.py cues.json -v -> python3 verify.py cues.json -> python3 audit.py cues.json --out <file>.
