// Hipster Menu Generator: hands menu.lp to clingo-wasm with a random seed and
// renders the answer set as a menu. "Most pretentious" adds maximize.lp and
// streams each better menu until the time limit.
const CLINGO_URL = "../garden-planner/vendor/clingo/index.web.js";
const MAX_SECONDS = 8;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const files = {};
let clingo = null, busy = false, stopFn = null, view = "menu.lp";

async function getClingo() {
  if (!clingo) { const m = await import(CLINGO_URL); clingo = m.default ?? m; }
  return clingo;
}
function setStatus(html) { $("#status").innerHTML = html; }
function setBusy(on, maxing = false) {
  busy = on;
  $("#new").disabled = on;
  $("#max").disabled = on;
  $("#stop").hidden = !maxing;
}

// ---------- reading the answer set ----------
// Splits `main(small,1,"pork belly")` into ["main", ["small", 1, "pork belly"]].
function parseAtom(a) {
  const i = a.indexOf("(");
  if (i < 0) return [a, []];
  const name = a.slice(0, i), body = a.slice(i + 1, -1), args = [];
  let cur = "", inStr = false, esc_ = false, depth = 0, quoted = false;
  const push = () => { args.push(quoted ? cur : /^-?\d+$/.test(cur) ? +cur : cur); cur = ""; quoted = false; };
  for (const ch of body) {
    if (inStr) {
      if (esc_) { cur += ch; esc_ = false; }
      else if (ch === "\\") esc_ = true;
      else if (ch === '"') inStr = false;
      else cur += ch;
    } else if (ch === '"') { inStr = true; quoted = true; }
    else if (ch === "(") { depth++; cur += ch; }
    else if (ch === ")") { depth--; cur += ch; }
    else if (ch === "," && depth === 0) push();
    else cur += ch;
  }
  push();
  return [name, args];
}

const titleCase = (s) => s.replace(/(^|[^A-Za-z'])([a-z])/g, (_, a, b) => a + b.toUpperCase());

function buildMenu(atoms) {
  const f = {};
  for (const a of atoms) { const [n, args] = parseAtom(a); (f[n] ||= []).push(args); }
  const g = (n) => f[n] || [];
  const pv = Object.fromEntries(g("pv"));
  const dishes = new Map(), key = (s, n) => `${s}:${n}`;
  const dish = (s, n) => { const k = key(s, n); if (!dishes.has(k)) dishes.set(k, { section: s, sides: [], buzz: {} }); return dishes.get(k); };
  for (const [s, n, i] of g("main")) dish(s, n).main = i;
  for (const [s, n, i] of g("side")) dish(s, n).sides.push(i);
  for (const [s, n, i] of g("garnish")) dish(s, n).garnish = i;
  for (const [s, n, p] of g("prep")) dish(s, n).prep = p;
  for (const [s, n, i, t] of g("buzz")) dish(s, n).buzz[i] = t;
  const base = { small: 8, large: 18 };
  for (const d of dishes.values()) {
    d.score = [d.main, d.garnish, d.prep, ...d.sides].reduce((t, x) => t + (pv[x] || 0), 0);
    d.price = base[d.section] + d.score;
  }
  const drinks = new Map();
  const drink = (n) => { if (!drinks.has(n)) drinks.set(n, { mods: [] }); return drinks.get(n); };
  for (const [d, x] of g("base")) drink(d).spirit = x;
  for (const [d, m] of g("mod")) drink(d).mods.push(m);
  for (const [d, v] of g("vessel")) drink(d).vessel = v;
  for (const [d, x] of g("dgarnish")) drink(d).garnish = x;
  for (const [d, c] of g("cname")) drink(d).name = c;
  for (const d of drinks.values()) {
    d.score = [d.spirit, d.vessel, d.garnish, ...d.mods].reduce((t, x) => t + (pv[x] || 0), 0);
    d.price = 11 + d.score;
  }
  const one = (n) => (g(n)[0] || [""])[0];
  const all = [...dishes.values(), ...drinks.values()];
  return {
    bar: `${one("bar_first")} & ${one("bar_second")} ${one("bar_suffix")}`,
    where: one("located"), est: one("est"),
    taglines: g("tagline").map((t) => t[0]).sort(),
    pretension: all.reduce((t, d) => t + d.score, 0),
    small: [...dishes.values()].filter((d) => d.section === "small").sort((a, b) => a.price - b.price),
    large: [...dishes.values()].filter((d) => d.section === "large").sort((a, b) => a.price - b.price),
    drinks: [...drinks.values()].sort((a, b) => a.price - b.price)
  };
}

// ---------- drawing ----------
const BUZZ = { foraged: "foraged", pickled: "pickled", heritage: "heritage", fermented: "fermented", house: "house-made", local: "local" };
function ing(d, i) {
  const t = d.buzz[i];
  return t ? `<span class="buzz" title="${BUZZ[t] || t}">${esc(i)}</span>` : esc(i);
}
function item(title, desc, price) {
  return `<div class="item"><div class="item-row"><span class="t">${title}</span><span class="dots" aria-hidden="true"></span><span class="p">${price}</span></div><div class="d">${desc}</div></div>`;
}
function dishItem(d) {
  const sides = d.sides.slice().sort();
  const title = `${esc(titleCase(d.prep))} ${d.buzz[d.main] ? `<span class="buzz" title="${BUZZ[d.buzz[d.main]]}">${esc(titleCase(d.main))}</span>` : esc(titleCase(d.main))}`;
  return item(title, `${sides.map((s) => ing(d, s)).join(" &amp; ")}, ${ing(d, d.garnish)}`, d.price);
}
function drinkItem(d) {
  const mods = d.mods.slice().sort().map(esc).join(", ");
  return item(esc(d.name), `${esc(d.spirit)}, ${mods}. Served in ${esc(d.vessel)} with ${esc(d.garnish)}.`, d.price);
}
function render(m, note) {
  const el = $("#menu");
  el.hidden = false;
  el.innerHTML =
    `<header class="menu-head"><h2>${esc(m.bar)}</h2><div class="sub">${esc(m.where)} · Est. ${esc(m.est)}</div></header>` +
    `<section><h3>Small Plates</h3>${m.small.map(dishItem).join("")}</section>` +
    `<section><h3>Large Plates</h3>${m.large.map(dishItem).join("")}</section>` +
    `<section><h3>Cocktails</h3>${m.drinks.map(drinkItem).join("")}</section>` +
    `<footer class="menu-foot">${m.taglines.map((t) => `<p>${esc(t)}</p>`).join("")}` +
    `<p class="meta">Pretension ${m.pretension}${note ? " · " + esc(note) : ""} · solved by clingo</p></footer>`;
}

// ---------- solving ----------
const seedArgs = (seed) => ["--rand-freq=1", "--sign-def=rnd", `--seed=${seed}`];

async function newMenu(seed) {
  if (busy) return;
  setBusy(true);
  if (seed == null) seed = 1 + Math.floor(Math.random() * 999999);
  setStatus('<span class="pill busy">Consulting the laws</span>');
  try {
    await getClingo();
    const t0 = performance.now();
    const res = await clingo.run(files["menu.lp"], 1, seedArgs(seed));
    if (res.Result === "ERROR") throw new Error(res.Error);
    const w = res.Call?.[res.Call.length - 1]?.Witnesses?.[0];
    if (!w) { setStatus('<span class="pill err">Unsatisfiable</span><span class="hint">The Laws of Artisanal Dining cannot all be obeyed.</span>'); return; }
    render(buildMenu(w.Value), `menu #${seed}`);
    history.replaceState(null, "", `#${seed}`);
    $("#share").hidden = false;
    setStatus(`<span class="pill ok">All seven laws obeyed</span><span class="hint">Menu #${seed}, found in ${Math.max(1, Math.round(performance.now() - t0))} ms.</span>`);
  } catch (e) {
    setStatus(`<span class="pill err">Solver error</span><span class="hint">${esc(e && e.message || e)}</span>`);
  } finally { setBusy(false); }
}

async function mostPretentious() {
  if (busy) return;
  setBusy(true, true);
  $("#share").hidden = true;
  history.replaceState(null, "", location.pathname);
  const seed = 1 + Math.floor(Math.random() * 999999);
  let n = 0, best = null, stopped = false, pending = null, resolveStop;
  const stopP = new Promise((r) => (resolveStop = r));
  const t0 = performance.now();
  stopFn = () => { if (stopped) return; stopped = true; try { clingo.restart(); } catch (e) {} resolveStop({ stopped: true }); };
  const tick = setInterval(() => {
    setStatus(`<span class="pill busy">Raising the pretension</span><span class="hint">${best ? `score ${best.pretension}` : "warming up"} · ${n} better menu${n === 1 ? "" : "s"} · ${((performance.now() - t0) / 1000).toFixed(1)} of ${MAX_SECONDS} s</span>`);
  }, 200);
  const timer = setTimeout(() => stopFn(), MAX_SECONDS * 1000);
  const onModel = (m) => {
    const atoms = Array.isArray(m) ? m : (m && (m.Value || m.value)) || [];
    n++; pending = atoms;
    requestAnimationFrame(() => { if (!pending) return; best = buildMenu(pending); pending = null; render(best, "the most pretentious menu so far"); });
  };
  let res;
  try {
    await getClingo();
    res = await Promise.race([clingo.run(files["menu.lp"] + "\n" + files["maximize.lp"], 0, [...seedArgs(seed), "--opt-mode=opt"], onModel), stopP]);
  } catch (e) { res = { Result: "ERROR", Error: String(e && e.message || e) }; }
  clearTimeout(timer); clearInterval(tick);
  if (pending) { best = buildMenu(pending); pending = null; }
  stopFn = null;
  setBusy(false);
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  if (res && res.Result === "ERROR" && !stopped) {
    setStatus(`<span class="pill err">Solver error</span><span class="hint">${esc(res.Error || "unknown")}</span>`);
  } else if (!best) {
    setStatus('<span class="pill err">No menu yet</span><span class="hint">Stopped before the first menu.</span>');
  } else {
    const proven = !stopped && res && (res.Result === "OPTIMUM FOUND" || res.Models?.Optimum === "yes");
    render(best, proven ? "proven maximum" : "most pretentious found");
    setStatus(proven
      ? `<span class="pill ok">Peak pretension</span><span class="hint">Score ${best.pretension}, and clingo proved nothing beats it (${secs} s).</span>`
      : `<span class="pill ok">Score ${best.pretension}</span><span class="hint">${n} increasingly pretentious menus in ${secs} s. A longer search might find worse.</span>`);
  }
}

// ---------- code viewer ----------
function renderCode() {
  $("#code").innerHTML = (files[view] || "").split("\n").map((l) => {
    const e = esc(l), c = l.indexOf("%");
    if (c < 0) return e;
    return esc(l.slice(0, c)) + `<span class="c">${esc(l.slice(c))}</span>`;
  }).join("\n");
  $("#dl").href = view;
  $("#dl").setAttribute("download", view);
  document.querySelectorAll("[data-file]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.file === view)));
}

// ---------- events + boot ----------
$("#new").addEventListener("click", () => newMenu());
$("#max").addEventListener("click", () => mostPretentious());
$("#stop").addEventListener("click", () => stopFn && stopFn());
$("#share").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(location.href); $("#share").textContent = "Copied"; }
  catch (e) { $("#share").textContent = "Copy the address bar"; }
  setTimeout(() => { $("#share").textContent = "Copy link"; }, 1600);
});
document.querySelectorAll("[data-file]").forEach((b) => b.addEventListener("click", () => { view = b.dataset.file; renderCode(); }));

(async function boot() {
  try {
    const [a, b] = await Promise.all(["menu.lp", "maximize.lp"].map((f) => fetch(f).then((r) => { if (!r.ok) throw new Error(f); return r.text(); })));
    files["menu.lp"] = a; files["maximize.lp"] = b;
  } catch (e) {
    setStatus('<span class="pill err">Couldn\'t load the laws</span><span class="hint">This page needs to be served over HTTP.</span>');
    return;
  }
  renderCode();
  try { await getClingo(); }
  catch (e) {
    setStatus('<span class="pill err">Couldn\'t load clingo</span><span class="hint">The solver files didn\'t load. Check your connection and reload the page.</span>');
    return;
  }
  const m = /^#(\d{1,7})$/.exec(location.hash);
  newMenu(m ? +m[1] : null);
})();
