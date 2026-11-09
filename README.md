# lukemabie.com

Personal portfolio + consulting site. Plain HTML/CSS/JS with no build step.

```
index.html                        homepage with the live solver hero
projects/clingo-garden-planner.html
projects/garden-planner/             interactive planner + clingo WebAssembly
projects/the-buck-ends-here.html  with the before/after scan slider
projects/whodunit/                   logic mystery game; clingo writes and checks each case
projects/hipster-menu/               menu generator; clingo obeys the Laws of Artisanal Dining (also a Python CLI)
projects/binary-clock/              binary clock (two layouts, no solver)
css/styles.css                    all styles (light + dark mode)
js/truck.js                       hero animation (packs an 8×5 moving truck)
js/solver.js                      old garden-bed hero animation (unused)
js/compare.js                     OCR vs. transcription wipe
favicon.svg
```

The planner's browser build and solver are served from `projects/garden-planner/`;
the vendored `clingo-wasm` distribution includes its Apache 2.0 license.
The whodunit and hipster menu load that same copy from `../garden-planner/vendor/clingo/`, so keep
the two folders side by side if either one moves.

## Preview locally

```
cd ~/coding_projects/lukemabie
python3 -m http.server 8000
```

Then open http://localhost:8000. The garden planner needs to be served over
HTTP so its WebAssembly solver and worker can load; the rest of the site can
also be opened directly from `index.html`.

## Adding to the Workbench

New experiments go in `projects/<name>/`. Then copy the `<li>` in the
Workbench list in `index.html` to the top of that list and set its status
(class `live`, `progress`, or `paused`; label text is up to you).
A Workbench item can move up to Projects once it has a write-up.

## Before going live

Search for `todo` (highlighted yellow on the page) and `TODO` in the HTML:

- Current job: one line about what you build
- `hello@lukemabie.com`: make sure the mailbox exists, or change it
- Buck Ends Here: column count, transcription endpoint name, how you found the column, your own "why" line
- Swap the placeholder OCR/clean text in the slider for a real passage

## Hosting

Any static host works: GitHub Pages, Netlify, or Cloudflare Pages. Point the
lukemabie.com DNS at whichever one you pick.
