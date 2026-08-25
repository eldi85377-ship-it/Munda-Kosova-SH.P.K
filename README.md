# MUNDA — FUTURE LAB

**"Design the light. Shape the future."**

An interactive, bilingual (EN/SQ) automotive-technology experience for **MUNDA Kosova** and the Digital School competition. You become a MUNDA design engineer and build the illuminated interior of tomorrow's premium vehicle — the way the real product works: **DESIGN → LIGHT → CONNECT → TEST → SHOWCASE**.

> The vehicle interior is a **design concept** created for this experience. MUNDA is presented as the technology maker; no brand partnership is implied.

---

## 🚀 Run it locally

No build step — just serve the folder:

```bash
python -m http.server 8123
```

Then open:

| URL | What it is |
|---|---|
| **http://localhost:8123** | The marketing website — **company first**: MUNDA Kosova SH.P.K, its technology, method, interactive car, MUNDA SCORE demo, gallery, the **team/staff section** (photos load from `assets/photos/`), then the game promo at the end |
| **http://localhost:8123/experience.html** | **THE GAME** — MUNDA FUTURE LAB |

> Needs internet for Google Fonts (Space Grotesk / Inter / JetBrains Mono) — everything else is fully self-contained and works offline. All audio is **synthesized live in the browser** (Web Audio API) — zero external sound files, 100% safe for a competition.

---

## 🎮 The Game — MUNDA FUTURE LAB

You are a **MUNDA design engineer**. Build the interior lighting of a premium vehicle through 5 phases:

1. **DESIGN** — pick the illuminated textile (Carbon Weave, Soft Knit, Tech Mesh, Lumen Silk — each with real specs).
2. **LIGHT** — activate the 6 interior zones, choose colour, pattern, brightness, animation, drive mode and environment (City, Tunnel, Showroom, Night City — all rendered live behind the windshield).
3. **CONNECT** — wire every LED module to its controller port (beams on success, shake on mistakes).
4. **TEST** — run 5 automotive tests: LIGHT OUTPUT, VIBRATION, TEMPERATURE, DURABILITY, ENERGY EFFICIENCY.
5. **SHOWCASE** — the cinematic WOW moment: lights die, the arena appears, the cabin illuminates section by section, the MUNDA light-logo draws itself, then your **MUNDA SCORE** is revealed.

> ⏱️ **The whole build is a 1:30 challenge.** The clock counts down from 01:30 — when it hits zero the lab auto-shows your design with what you managed to build.

### MUNDA SCORE
`lighting·0.24 + precision·0.20 + efficiency·0.18 + durability·0.18 + design·0.20` → 0–100, with the rank ladder:

`ROOKIE (0–39) → ENGINEER (40–59) → DESIGNER (60–74) → SENIOR ENGINEER (75–89) → MUNDA MASTER (90–99) → FUTURE ARCHITECT (100)`

### Progression system
- **XP + levels** (quadratic curve, max level 20) — every build pays out
- **Credits** — earned per run, level bonuses
- **14 achievements**, **9 missions**, **10 unlockables** (gradient colour, Lumen Silk, Tech Mesh, custom/dynamic patterns, tunnel/showroom/night-city/arena environments, Neon HUD theme)
- **Local leaderboard** — best runs per engineer
- Everything persists in `localStorage` (`munda_progress_v1`)

### Feedback everywhere
Every action has sound + particles: button clicks, hovers, collects, wiring success/failure, tests, level-ups, achievements, rank-ups. Volume controls (master/music/SFX + toggles) live in the 🔊 panel.

### Other screens
- **Story** — "From Textile to Light" drag-to-advance sequence
- **Technology** — 5-node explorer (LED, Textile, Flexibility, Design, Automotive)
- **Made in Kosova** — light radiating from the factory in Obiliq
- **Jury Mode** — live 3-minute jury control + cinematic 3·2·1 reveal (great for the presentation)
- **Gallery** — saved designs with mini interior previews

---

## 🌐 The Website

A premium automotive-tech brand site (dark, cinematic, glassmorphism):

1. **Hero** — MUNDA KOSOVA SH.P.K branding, animated illuminated-car backdrop, parallax, particles
2. **The Company** — who MUNDA Kosova SH.P.K is, the factory in Obiliq, stats, disclaimer
3. **Technology** — 4 cards (Illuminated Textiles, LED Integration, Automotive Interior Technology, Innovation)
4. **How It Works** — 4 illustrated steps (Design → Illuminate → Test → Innovate)
5. **Interactive Car** — hover/click the 6 zones, change colour & brightness live
6. **MUNDA SCORE Demo** — live score calculator with the same formula as the game
7. **Gallery** — 8 CSS/SVG artworks with lightbox
8. **Team / Staff** — the people of MUNDA Kosova SH.P.K (cards load real photos from `assets/photos/`)
9. **The Game** — full promo at the end, one click from the top-nav "PLAY THE GAME"
10. **Final CTA** — "Ready to design the future?"
11. **Footer** — links + language switch

Bilingual **EN/SQ** with a working switcher on both surfaces.

---

## 🔧 Structure

```
Munda-Kosova-SH.P.K/
├── index.html           # marketing website
├── experience.html      # the game
├── css/
│   ├── tokens.css       # shared design system (one brand, both surfaces)
│   ├── site.css         # website styles
│   ├── style.css        # game legacy screens
│   └── futurelab.css    # game chrome (HUD, hub, build, cinematic)
└── js/
    ├── i18n.js          # bilingual engine
    ├── i18n-experience.js / site.js dicts
    ├── audio.js         # 100% synthesized Web Audio engine (music + SFX)
    ├── fx.js            # particle / FX engine
    ├── progress.js      # XP, levels, missions, achievements, unlocks, leaderboard
    ├── interior.js      # SVG lighting engine (6 zones)
    ├── futurelab.js     # the 5-phase build flow + MUNDA SCORE + WOW moment
    ├── game.js          # jury mode, light show, reveal, finale
    ├── lab.js           # story / technology / kosova screens
    ├── particles.js     # ambient motes
    └── app.js           # navigation, gallery, wiring
```

## 🎤 Notes for the jury

1. Open the site → **PLAY THE EXPERIENCE**.
2. Type your engineer name → **ENTER THE LAB**.
3. **START NEW BUILD** and walk DESIGN → LIGHT → CONNECT → TEST.
4. Press **BEGIN FINAL SHOWCASE** for the cinematic WOW moment and your MUNDA SCORE.
5. Check the **Lab** screen for the career (missions, leaderboard, achievements, unlockables).
6. **Jury Mode** from the top bar for a live 3-minute interactive demo with the cinematic reveal.
7. Toggle **EN/SQ** anywhere; adjust sound in the 🔊 panel.

*Made in Kosovo. Designed for the future.*
