// Builds a Block Party Whodunit case with clingo doing the checking.
//
// 1. Pick a hidden truth: where each neighbor stood and what they brought.
// 2. List every true statement about that truth as a candidate clue.
// 3. Add clues in random order until clingo finds exactly one possible culprit.
// 4. Try dropping each clue; keep it out if the culprit is still unique.
//
// The solver is passed in as `solve(program, models, options)` so this file
// runs the same in the browser (clingo-wasm in a worker) and in Node tests.

export const NAMES = ["Marge", "Dale", "Rosa", "Theo", "June", "Hank", "Priya", "Gus", "Nell", "Omar", "Lou", "Ivy"];
export const PLACES = [
  { id: "porch",    name: "porch",      at: "on the porch" },
  { id: "kitchen",  name: "kitchen",    at: "in the kitchen" },
  { id: "backyard", name: "backyard",   at: "in the backyard" },
  { id: "garage",   name: "garage",     at: "in the garage" },
  { id: "driveway", name: "driveway",   at: "in the driveway" },
  { id: "frontyard", name: "front yard", at: "in the front yard" }
];
export const DISHES = [
  { id: "chili",     name: "chili" },
  { id: "salad",     name: "potato salad" },
  { id: "eggs",      name: "deviled eggs" },
  { id: "lemonade",  name: "lemonade" },
  { id: "brownies",  name: "brownies" },
  { id: "corn",      name: "sweet corn" },
  { id: "jello",     name: "jello salad" }
];
export const MISSING = [
  "the last slice of rhubarb pie",
  "the good grill tongs",
  "the plastic lawn flamingo",
  "the Bluetooth speaker",
  "the prize-winning zucchini",
  "the cooler's last root beer",
  "the borrowed folding table",
  "Grandma's casserole dish"
];

// deep: how many innocent neighbors must take two or more clues to rule out
export const LEVELS = {
  easy: { size: 4, minClues: 4, maxClues: 8,  deep: 1 },
  hard: { size: 5, minClues: 6, maxClues: 11, deep: 3 }
};

// Small seeded RNG (mulberry32) so a case number always rebuilds the same case.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(a, r) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pick = (a, r) => a[Math.floor(r() * a.length)];
const lc = (s) => s.toLowerCase();

function makeWorld(level, r) {
  const n = LEVELS[level].size;
  const people = shuffle(NAMES.slice(), r).slice(0, n).map((name) => ({ id: lc(name), name }));
  const places = shuffle(PLACES.slice(), r).slice(0, n);
  const dishes = shuffle(DISHES.slice(), r).slice(0, n);
  const spot = shuffle(places.map((p) => p.id), r);
  const dish = shuffle(dishes.map((d) => d.id), r);
  const truth = {};
  people.forEach((p, i) => { truth[p.id] = { at: spot[i], brought: dish[i] }; });
  const scene = pick(places, r).id;
  const culprit = people.find((p) => truth[p.id].at === scene).id;
  return { level, people, places, dishes, truth, scene, culprit, missing: pick(MISSING, r) };
}

// Every true statement about the hidden truth, as clue terms.
function candidates(w, r) {
  const out = [];
  const add = (term, weight) => { for (let k = 0; k < weight; k++) out.push(term); };
  const who = (pid) => w.truth[pid];
  const holder = (did) => w.people.find((p) => who(p.id).brought === did).id;
  for (const p of w.people) {
    const t = who(p.id);
    // naming the culprit at the scene outright would give the game away
    if (t.at !== w.scene) add(`at(${p.id},${t.at})`, 1);
    add(`brought(${p.id},${t.brought})`, 1);
    // an alibi for the scene itself clears someone in one step, so leave those out
    for (const l of w.places) if (l.id !== t.at && l.id !== w.scene) add(`not_at(${p.id},${l.id})`, 2);
    for (const d of w.dishes) if (d.id !== t.brought) add(`not_brought(${p.id},${d.id})`, 1);
    const others = w.people.filter((q) => q.id !== p.id);
    const q = pick(others, r);
    const pair = r() < 0.5 ? [p.id, q.id] : [q.id, p.id];
    add(`either(${pair[0]},${pair[1]},${t.at})`, 2);
    const wrong = pick(w.dishes.filter((d) => d.id !== t.brought), r).id;
    const ds = r() < 0.5 ? [t.brought, wrong] : [wrong, t.brought];
    add(`brought_either(${p.id},${ds[0]},${ds[1]})`, 1);
  }
  for (const d of w.dishes) {
    const at = who(holder(d.id)).at;
    add(`dish_at(${d.id},${at})`, 2);
    for (const l of w.places) if (l.id !== at) add(`dish_not_at(${d.id},${l.id})`, 1);
  }
  // weights add duplicates to make a type likelier; keep only the first copy
  return shuffle(out, r).filter((t, i, a) => a.indexOf(t) === i);
}

export function facts(w, clues, extra = "") {
  const L = [];
  L.push(w.people.map((p) => `person(${p.id}).`).join(" "));
  L.push(w.places.map((p) => `place(${p.id}).`).join(" "));
  L.push(w.dishes.map((d) => `dish(${d.id}).`).join(" "));
  L.push(`scene(${w.scene}).`);
  clues.forEach((c, i) => L.push(`clue(${i + 1}, ${c}).`));
  if (extra) L.push(extra);
  return L.join("\n");
}

function count(res) {
  if (!res || res.Result === "ERROR") throw new Error((res && res.Error) || "clingo failed");
  return res.Models ? res.Models.Number : 0;
}

// How many different neighbors could be the culprit under these clues (stops at 2).
async function culprits(solve, enc, w, clues) {
  return count(await solve(enc + "\n" + facts(w, clues), 2, ["--project"]));
}

export async function makeCase({ seed, level = "easy", solve, encoding, onProgress }) {
  const r = rng(seed);
  const lim = LEVELS[level];
  let calls = 0;
  const check = async (clues) => { calls++; onProgress && onProgress(calls); return culprits(solve, encoding, w, clues); };
  let w;
  for (let attempt = 0; attempt < 60; attempt++) {
    w = makeWorld(level, r);
    const pool = candidates(w, r);
    let clues = [];
    // add clues until only one neighbor fits
    for (const c of pool) {
      clues.push(c);
      if (clues.length >= lim.size && (await check(clues)) === 1) break;
    }
    // drop every clue the answer doesn't need
    for (const c of shuffle(clues.slice(), r)) {
      const without = clues.filter((x) => x !== c);
      if ((await check(without)) === 1) clues = without;
    }
    if (clues.length < lim.minClues || clues.length > lim.maxClues) continue;
    w.clues = shuffle(clues, r);
    w.why = await explain({ w, solve, encoding });
    if (Object.values(w.why).filter((ids) => ids.length >= 2).length < lim.deep) continue;
    // if several neighbors can only be cleared by every clue at once, hints have nothing to point at
    if (Object.values(w.why).filter((ids) => ids.length === clues.length).length > 1) continue;
    w.seed = seed;
    w.calls = calls;
    w.attempts = attempt + 1;
    return w;
  }
  throw new Error("could not build a case");
}

// For each innocent neighbor, the smallest set of clues (found by dropping
// clues one at a time) that still makes "they did it" impossible.
export async function explain({ w, solve, encoding }) {
  const out = {};
  for (const p of w.people) {
    if (p.id === w.culprit) continue;
    const assume = `:- not culprit(${p.id}).`;
    const unsat = async (idx) =>
      count(await solve(encoding + "\n" + factsSubset(w, idx, assume), 1, [])) === 0;
    let keep = w.clues.map((_, i) => i);
    for (const i of keep.slice()) {
      const without = keep.filter((x) => x !== i);
      if (await unsat(without)) keep = without;
    }
    out[p.id] = keep.map((i) => i + 1);
  }
  return out;
}

// Keeps each clue's original number so explanations can cite them.
function factsSubset(w, idx, extra) {
  const base = facts(w, [], extra).split("\n").filter((l) => !l.startsWith("clue("));
  return base.concat(idx.map((i) => `clue(${i + 1}, ${w.clues[i]}).`)).join("\n");
}

// Facts that hold in every world the clues allow (clingo's cautious consequences).
export async function proven({ w, solve, encoding }) {
  const res = await solve(encoding + "\n" + facts(w, w.clues, "#show at/2. #show brought/2."), 0, ["--enum-mode=cautious"]);
  count(res);
  const calls = res.Call || [];
  const ws = (calls[calls.length - 1] && calls[calls.length - 1].Witnesses) || [];
  const atoms = ws.length ? ws[ws.length - 1].Value : [];
  const at = {}, brought = {};
  for (const a of atoms) {
    let m;
    if ((m = /^at\((\w+),(\w+)\)$/.exec(a))) at[m[1]] = m[2];
    else if ((m = /^brought\((\w+),(\w+)\)$/.exec(a))) brought[m[1]] = m[2];
  }
  return { at, brought };
}

// ---------- plain-English clues ----------
export function describe(w, term, r = Math.random) {
  const P = Object.fromEntries(w.people.map((p) => [p.id, p.name]));
  const L = Object.fromEntries(w.places.map((p) => [p.id, p]));
  const D = Object.fromEntries(w.dishes.map((d) => [d.id, d.name]));
  const m = /^(\w+)\((.*)\)$/.exec(term);
  const [kind, a] = [m[1], m[2].split(",")];
  const one = (opts) => opts[Math.floor(r() * opts.length)];
  switch (kind) {
    case "at": return one([`${P[a[0]]} spent the whole party ${L[a[1]].at}.`, `${P[a[0]]} never left the ${L[a[1]].name}.`]);
    case "not_at": return one([`${P[a[0]]} never set foot ${L[a[1]].at}.`, `Nobody saw ${P[a[0]]} ${L[a[1]].at}.`]);
    case "brought": return `${P[a[0]]} brought the ${D[a[1]]}.`;
    case "not_brought": return one([`${P[a[0]]} didn't bring the ${D[a[1]]}.`, `The ${D[a[1]]} wasn't ${P[a[0]]}'s.`]);
    case "dish_at": return one([`Whoever brought the ${D[a[0]]} stayed ${L[a[1]].at}.`, `The person who brought the ${D[a[0]]} was ${L[a[1]].at}.`]);
    case "dish_not_at": return one([`Whoever brought the ${D[a[0]]} wasn't ${L[a[1]].at}.`, `The person who brought the ${D[a[0]]} never went near the ${L[a[1]].name}.`]);
    case "either": return `Either ${P[a[0]]} or ${P[a[1]]} was ${L[a[2]].at}.`;
    case "brought_either": return `${P[a[0]]} brought either the ${D[a[1]]} or the ${D[a[2]]}.`;
  }
  return term;
}
