# Mohamed Rafat · Portfolio

> I build the screen, and everything behind it.
> أبني الواجهة… وكل ما خلفها.

A hand-built portfolio. The site is drawn like a set of architectural sheets:
the front-end is the **facade** (a generated mashrabiya screen), the back-end is
the **building behind it**, and the page is lit by the **real sun over Assiut**.

No build step, no framework. Open `index.html` and it runs.

## What's in it

| Sheet | Section | What happens |
|---|---|---|
| A-00 | Facade | A lattice screen is laser-cut on load, then you scroll *through* it |
| A-01 | About | Shutters open on the portrait; spec sheet; skills as a "materials schedule" |
| A-02 | Work | API as a building section, desktop client as an elevation, and a live lattice generator |
| A-03 | Experience | A construction-schedule (Gantt) with a live "today" line |
| A-04 | Contact | Carved doors swing open on a lit doorway: تفضّل, come in |
| A-05 | Footer | A drawing title block with a Ruqʿah signature |

Details worth knowing:

- **Lighting follows Assiut.** The theme is chosen from the sun's real altitude
  at 27.18°N 31.18°E. By day the screen casts its shadow across the page, at
  night it glows like a lamp-lit window. The button in the top bar cycles
  Auto, Day and Night, and remembers the choice.
- **Every lattice is generated.** `js/lattice.js` implements Hankin's
  polygons-in-contact method on three tilings (4.8.8, 6.6.6 and 4.6.12).
  The generator in Work 03 re-cuts the whole site, favicon included.
- **CAD cursor** on desktop: a crosshair with page coordinates that snaps a
  selection box onto links and buttons.
- **Motion respects the reader.** With *reduce motion* switched on, everything
  is shown in its final state with no pinning or smooth scrolling. Without
  JavaScript, all content is still readable.

## Files

```
index.html          content and structure
css/style.css       design tokens (day and night), layout, every section
js/lattice.js       the pattern engine (tilings + Hankin's method)
js/main.js          light, cursor, diagrams, generator and scroll choreography
vendor/             GSAP 3.15 (core, ScrollTrigger, SplitText) and Lenis 1.3
assets/             portrait (jpg + webp), favicon, touch icon, og.jpg share image
```

## Preview locally

Double-click `index.html`, or serve the folder (closer to GitHub Pages):

```bash
python -m http.server 8080
# then open http://localhost:8080
```

## Deploy to GitHub Pages

The live site is `https://0xrafat.github.io/portfolio/`, so this folder
replaces the contents of the `portfolio` repository.

**With the GitHub website:** open the repository, delete the old
`index.html`, `styles.css`, `script.js` and `portrait.jpg`, then use
*Add file → Upload files* and drag in `index.html`, `README.md` and the
`css`, `js`, `vendor` and `assets` folders. Commit.

**With git:**

```bash
git clone https://github.com/0xrafat/portfolio.git
# copy this folder's contents into it, replacing the old files
git add -A
git commit -m "New portfolio: facade and structure"
git push
```

Pages republishes in a minute or two. All paths are relative, so the
`/portfolio/` sub-path works as is.

## Editing content

- **Text** lives in `index.html`; each section is marked with a comment
  (`A-00 FACADE`, `A-01 ABOUT`, …).
- **Experience bars** read their dates from attributes on each row:
  `data-start="2026-03"` and `data-end="now"` (or `"2026-08"`, or a year).
  A year without a month draws a soft fade-in, because the exact month isn't
  known. Give a month to get a crisp start. The inline `style` values on the
  rows are only a fallback for when JavaScript is off.
- **Colours** are tokens at the top of `css/style.css`, one set per surface
  (`--ext-*` limestone, `--int-*` terracotta, `--pap-*` paper or blueprint,
  `--dsk-*` dusk, `--ink-*` footer), redefined under `[data-theme="night"]`.
- **The default lattice** is `DEFAULT` in `js/main.js` (`fold: '8', angle: 67.5`).

## Credits

Typefaces from Google Fonts: Bodoni Moda, Archivo, Martian Mono, Reem Kufi,
Amiri and Aref Ruqaa. Motion by GSAP (free under the GSAP standard licence)
and Lenis (MIT). Pattern method after E. H. Hankin (1925) and Craig Kaplan (2005).
