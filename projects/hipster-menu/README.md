# Hipster Menu Generator (clingo)

A logic-programming take on the 2015 Brooklyn Bar Menu Generator. The joke is written as
Answer Set Programming: each answer set clingo finds is a menu that follows every
Non-Negotiable Principle of Culinary Authenticity.

The web version (`index.html` + `app.js`) runs clingo in the browser through the
clingo-wasm build vendored in `../garden-planner/vendor/clingo/`. The Python CLI below
uses the same `menu.lp`.

## Run the CLI

```bash
pip install clingo
python generate.py                    # random menu in the terminal
python generate.py --seed 42          # same menu every time
python generate.py --html menu.html   # printable HTML menu
python generate.py --max              # most pretentious menu found in 20s
```

Or call the solver directly:

```bash
clingo menu.lp --rand-freq=1 --sign-def=rnd --seed=$RANDOM
clingo menu.lp maximize.lp
```

## Files

- `menu.lp`: vocabulary (facts), generation (choice rules), the Laws (integrity constraints) and pricing.
- `maximize.lp`: optional `#maximize` over total pretension.
- `generate.py`: runs clingo through its Python API and renders the answer set as text or HTML.
- `index.html`, `app.js`, `styles.css`: the in-browser version.

## The Principles

1. No ingredient appears twice anywhere on the menu.
2. Every dish has a buzzword (foraged, pickled, heritage, fermented, house-made, local).
3. Ramps are mandatory.
4. Exactly one dish is deconstructed.
5. Something on the menu is fermented.
6. Something on the menu is foraged (already guaranteed by the ramps; the chef wanted it in writing).
7. Every large plate costs more than every small plate.
8. Each cocktail gets its own spirit, vessel, garnish and name, and at least one involves smoke.
9. At least one cocktail comes in an impractical vessel (pretension 4 or more).
10. Prices go up with pretension, plus three per-plate surcharges chosen from `fee/2`.
11. No small plate under $16, no large plate under $32.

Each menu also gets an origin story (`origin_story/1`).

To add a principle, write a constraint. To add vocabulary, add a fact.

## Why pricing is written the way it is

The first version computed each dish's score and the menu's total pretension with
assignment aggregates (`score(S,N,X) :- X = #sum{...}`, `pretension(T) :- T = #sum{...}`).
Clingo grounds one atom for every total those sums could reach, so a single menu took
about 50 s to ground and another 50 s to solve. Law 5 is now one `#sum` per
small/large pair (small score − large score < 10, which is the same as
$8 + small < $18 + large), and `#maximize` sums the chosen items directly. Prices are
read off the `pv/2` atoms afterwards. Same laws, same prices, and a menu now takes
a few milliseconds.
