# MUNDA — FUTURE LIGHT LAB

**“Design the light. Shape the future.”**

An interactive, premium automotive-technology experience for **MUNDA Kosova** and the Digital School competition. It demonstrates how textile + flexible-LED technology becomes part of a modern vehicle interior.

> The vehicle interior is a **concept / demo**. MUNDA and Audi are **not** official partners; the Audi-inspired cabin is presented purely as a design concept.

---

## Run it locally

No build step — just serve the folder:

```bash
cd Finalproject
python -m http.server 8123
```

Then open **http://localhost:8123** (or `http://localhost:8123/?fresh=2` to force a reload).

> Needs internet for the Google Fonts (`Space Grotesk`, `Inter`, `JetBrains Mono`) — everything else is self-contained. The experience gracefully falls back to system fonts offline.

---

## What's inside

| Screen | What it does |
|---|---|
| **Landing** | Cinematic "ENTER THE LIGHT" — light line draws the MUNDA wordmark. |
| **From Textile to Light** | Drag across the fabric to advance TEXTILE → TECHNOLOGY → LIGHT → AUTOMOTIVE → FUTURE, ending in the *"What if light could be fabric?"* reveal. |
| **Interior Lab** | The full configurator: 6 interior zones, color (8 incl. custom gradient), 7 patterns, brightness, 6 animations, speed, 4 textile materials, and CITY/SPORT/NIGHT/ECO drive modes — all live. |
| **Technology Explorer** | Five nodes (LED, Textile, Flexibility, Design, Automotive) that activate short explanations. |
| **Made in Kosova** | A light line radiates from Kosovo across Europe — *“Innovation made in Kosovo.”* |
| **Design Challenge** | 3:00 timed game with DESIGN → TEST → REVIEW → FINAL progress. |
| **Jury Mode** | Live 3-minute jury control, then the cinematic darken → 3·2·1 → full interior light-up → *“You just designed the future.”* |
| **Beat the Designer** | Your design vs. the MUNDA Concept design, scored on the same engine (labeled *Concept Evaluation*). |
| **My Design** | Showcase with score ring, tags, SAVE / REPLAY LIGHT SHOW / NEW. |
| **Gallery** | Saved designs (localStorage), sortable by top score / innovation / latest. |
| **Finale** | *“MUNDA — LIGHTING THE EXPERIENCE. Made in Kosovo. Designed for the future.”* |

---

## Key interactions

- **Controls** (`data-ctl`, `data-zone`, `data-mode`) are wired globally — every swatch, chip, slider, zone button and mode button actually changes the interior, instantly.
- **Light show** — temporarily hides the UI and cycles the interior through a cinematic color/pattern sequence.
- **Presentation mode** — the **PRESENT** button hides the chrome and enters fullscreen for a clean live demo.
- **Scoring** — deterministic and choice-driven (design, innovation, energy efficiency, integration, UX); not random.
- **Jury Mode** — reachable instantly from the top navigation.

### Keyboard
- `Esc` — exit the light show / close the finale.

---

## Structure

```
Finalproject/
├── index.html      # all screens + the SVG interior
├── css/style.css   # design system
└── js/
    ├── particles.js  # ambient light-mote canvas
    ├── interior.js   # lighting engine + design state
    ├── lab.js        # textile / technology / kosova interactions
    ├── game.js       # scoring, challenge, jury, light show, reveal
    └── app.js        # navigation, wiring, gallery, presentation mode
```

---

## Notes for the jury

1. Open the experience → **ENTER THE LIGHT LAB**.
2. Walk the story: *From Textile to Light* → *Interior Lab* → *Technology* → *Kosova*.
3. Press **Jury Mode** in the top bar, hand control to the jury.
4. Let them design, then **ACTIVATE LIGHT SHOW** (or *YOUR DESIGN IS READY*) for the darken → 3·2·1 → full light-up moment.
5. Finish with **FINISH → LIGHTING THE EXPERIENCE**.
