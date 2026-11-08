#!/usr/bin/env python3
"""Hipster Menu Generator, clingo edition.

Usage:
    python generate.py                  # random menu to the terminal
    python generate.py --seed 42        # reproducible menu
    python generate.py --html menu.html # also write a printable HTML menu
    python generate.py --max            # the most pretentious menu possible
"""
import argparse
import html
import random
from collections import defaultdict
from pathlib import Path

import clingo

HERE = Path(__file__).resolve().parent


def val(sym):
    if sym.type == clingo.SymbolType.String:
        return sym.string
    if sym.type == clingo.SymbolType.Number:
        return sym.number
    return sym.name


def solve(seed, maximize=False):
    args = ["--models=0" if maximize else "--models=1",
            "--rand-freq=1", "--sign-def=rnd", f"--seed={seed}"]
    if maximize:
        args.append("--opt-mode=opt")
    ctl = clingo.Control(args)
    ctl.load(str(HERE / "menu.lp"))
    if maximize:
        ctl.load(str(HERE / "maximize.lp"))
    ctl.ground([("base", [])])

    best = {}

    def on_model(model):  # with --max, each new model is better than the last
        best["symbols"] = model.symbols(shown=True)

    # Proving optimality can take a long time, so --max keeps the best menu found in 20s.
    with ctl.solve(on_model=on_model, async_=True) as handle:
        if not handle.wait(20 if maximize else 60):
            handle.cancel()
    last = best.get("symbols")
    if last is None:
        raise SystemExit("UNSATISFIABLE: the Laws of Artisanal Dining cannot all be obeyed.")

    facts = defaultdict(list)
    for sym in last:
        facts[sym.name].append(tuple(val(a) for a in sym.arguments))
    return facts


def build_menu(f):
    one = lambda name: f[name][0][0]
    dishes = defaultdict(lambda: {"sides": []})
    for s, n, i in f["main"]:
        dishes[(s, n)]["main"] = i
    for s, n, i in f["side"]:
        dishes[(s, n)]["sides"].append(i)
    for s, n, i in f["garnish"]:
        dishes[(s, n)]["garnish"] = i
    for s, n, p in f["prep"]:
        dishes[(s, n)]["prep"] = p
    pv = dict(f["pv"])  # pretension of each chosen thing; prices are base + pretension
    base_price = {"small": 8, "large": 18}
    for (s, n), d in dishes.items():
        d["price"] = base_price[s] + sum(pv[x] for x in [d["main"], d["garnish"], d["prep"], *d["sides"]])

    drinks = defaultdict(lambda: {"mods": []})
    for d, x in f["base"]:
        drinks[d]["spirit"] = x
    for d, m in f["mod"]:
        drinks[d]["mods"].append(m)
    for d, v in f["vessel"]:
        drinks[d]["vessel"] = v
    for d, g in f["dgarnish"]:
        drinks[d]["garnish"] = g
    for d, c in f["cname"]:
        drinks[d]["name"] = c
    for d in drinks.values():
        d["price"] = 11 + sum(pv[x] for x in [d["spirit"], d["vessel"], d["garnish"], *d["mods"]])

    def dish_text(d):
        title = f"{d['prep']} {d['main']}".title()
        desc = f"{' & '.join(sorted(d['sides']))}, {d['garnish']}"
        return {"title": title, "desc": desc, "price": d["price"]}

    def drink_text(d):
        desc = f"{d['spirit']}, {', '.join(sorted(d['mods']))}. Served in {d['vessel']} with {d['garnish']}."
        return {"title": d["name"], "desc": desc, "price": d["price"]}

    section = lambda s: sorted((dish_text(v) for (k, _), v in dishes.items() if k == s),
                               key=lambda x: x["price"])
    return {
        "bar": f"{one('bar_first')} & {one('bar_second')} {one('bar_suffix')}",
        "where": one("located"),
        "est": one("est"),
        "taglines": sorted(t for (t,) in f["tagline"]),
        "pretension": sum(v["price"] - base_price[s] for (s, _), v in dishes.items())
                      + sum(v["price"] - 11 for v in drinks.values()),
        "sections": [
            ("Small Plates", section("small")),
            ("Large Plates", section("large")),
            ("Cocktails", sorted((drink_text(v) for v in drinks.values()), key=lambda x: x["price"])),
        ],
    }


def to_text(m, seed):
    out = [m["bar"].upper(), f"{m['where']} · Est. {m['est']}", ""]
    for name, items in m["sections"]:
        out.append(f"— {name} —")
        for it in items:
            out.append(f"  {it['title']:<45} ${it['price']}")
            out.append(f"     {it['desc']}")
        out.append("")
    out += [f"  * {t}" for t in m["taglines"]]
    out.append(f"\n  pretension score: {m['pretension']}   seed: {seed}")
    return "\n".join(out)


def to_html(m, seed):
    e = html.escape
    sections = ""
    for name, items in m["sections"]:
        rows = "".join(
            f'<div class="item"><div class="row"><span class="t">{e(it["title"])}</span>'
            f'<span class="dots"></span><span class="p">{it["price"]}</span></div>'
            f'<div class="d">{e(it["desc"])}</div></div>' for it in items)
        sections += f'<section><h2>{e(name)}</h2>{rows}</section>'
    tags = "".join(f"<p>{e(t)}</p>" for t in m["taglines"])
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(m['bar'])}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Lora:ital@0;1&display=swap" rel="stylesheet">
<style>
:root{{--paper:#efe6d2;--ink:#2b2520;--muted:#7a6b5a;--rule:#b9a888}}
body{{margin:0;background:var(--paper);color:var(--ink);font-family:Lora,Georgia,serif}}
main{{max-width:640px;margin:0 auto;padding:48px 16px}}
header{{text-align:center;border-bottom:2px solid var(--ink);padding-bottom:20px;margin-bottom:8px}}
h1{{font-family:'Playfair Display',serif;font-weight:900;font-size:clamp(28px,7vw,46px);margin:0;letter-spacing:.02em;text-transform:uppercase}}
.sub{{color:var(--muted);font-style:italic;margin-top:6px}}
h2{{font-family:'Playfair Display',serif;text-align:center;font-size:20px;letter-spacing:.3em;text-transform:uppercase;margin:36px 0 16px}}
h2::before,h2::after{{content:'~';margin:0 12px;color:var(--rule)}}
.item{{margin:0 0 18px}}
.row{{display:flex;align-items:baseline;gap:8px;font-weight:700}}
.dots{{flex:1;border-bottom:1px dotted var(--rule)}}
.d{{color:var(--muted);font-style:italic;font-size:15px;margin-top:2px}}
footer{{margin-top:40px;border-top:2px solid var(--ink);padding-top:16px;text-align:center;font-size:14px;color:var(--muted)}}
footer p{{margin:4px 0}} .meta{{margin-top:14px;font-size:12px;letter-spacing:.08em;text-transform:uppercase}}
</style></head><body><main>
<header><h1>{e(m['bar'])}</h1><div class="sub">{e(m['where'])} · Est. {m['est']}</div></header>
{sections}
<footer>{tags}<p class="meta">Pretension score {m['pretension']} · solved by clingo · seed {seed}</p></footer>
</main></body></html>"""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--html", metavar="PATH")
    ap.add_argument("--max", action="store_true", help="maximize pretension")
    a = ap.parse_args()

    seed = a.seed if a.seed is not None else random.randint(0, 2**31 - 1)
    menu = build_menu(solve(seed, a.max))
    print(to_text(menu, seed))
    if a.html:
        Path(a.html).write_text(to_html(menu, seed), encoding="utf-8")
        print(f"\nwrote {a.html}")


if __name__ == "__main__":
    main()
