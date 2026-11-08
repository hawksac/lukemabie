// Block Party Whodunit: the page. case.js builds each case with clingo;
// this file draws it, keeps the player's notes, and judges the accusation.
import { makeCase, proven, describe, facts, rng } from "./case.js";

const CLINGO_URL = "../garden-planner/vendor/clingo/index.web.js";
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let ENCODING = "";
let clingo = null;
const state = { level: "easy", w: null, texts: [], used: new Set(), notes: {}, done: false, hints: 0, view: "enc", busy: false };

// ---------- storage (optional: the game works without it) ----------
function loadRecord() {
  try { return JSON.parse(localStorage.getItem("whodunit-record")) || { solved: 0, played: 0 }; }
  catch (e) { return { solved: 0, played: 0 }; }
}
function saveRecord(r) { try { localStorage.setItem("whodunit-record", JSON.stringify(r)); } catch (e) {} }
function showRecord() {
  const r = loadRecord();
  $("#record").textContent = r.played ? `Solved ${r.solved} of ${r.played}` : "";
}

// ---------- solver ----------
async function getClingo() {
  if (!clingo) { const m = await import(CLINGO_URL); clingo = m.default ?? m; }
  return clingo;
}
const solve = (program, models, options) => clingo.run(program, models, options);

function setStatus(html) { $("#status").innerHTML = html; }

// ---------- case lifecycle ----------
function parseHash() {
  const m = /^#(easy|hard)-(\d{1,9})$/.exec(location.hash);
  return m ? { level: m[1], seed: +m[2] } : null;
}

async function newCase(level, seed) {
  if (state.busy) return;
  state.busy = true;
  $("#new").disabled = true;
  state.level = level;
  document.querySelectorAll(".segbtn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.level === level)));
  if (seed == null) seed = 1 + Math.floor(Math.random() * 99999);
  setStatus('<span class="pill busy">Writing a case</span>');
  const t0 = performance.now();
  try {
    await getClingo();
    const w = await makeCase({
      seed, level, solve, encoding: ENCODING,
      onProgress: (n) => { if (n % 10 === 0) setStatus(`<span class="pill busy">Writing a case</span><span class="hint">clingo has checked ${n} clue sets</span>`); }
    });
    w.ms = performance.now() - t0;
    start(w);
    history.replaceState(null, "", `#${level}-${seed}`);
    setStatus(`<span class="pill ok">Case ready</span><span class="hint">clingo checked ${w.calls} clue sets in ${(w.ms / 1000).toFixed(1)} s to make sure exactly one neighbor fits.</span>`);
  } catch (e) {
    setStatus(`<span class="pill err">Couldn't write a case</span><span class="hint">${esc(e && e.message || e)}. Reload the page to try again.</span>`);
  } finally {
    state.busy = false;
    $("#new").disabled = false;
  }
}

function start(w) {
  state.w = w;
  const r = rng(w.seed ^ 0x5bd1e995); // phrasing is seeded too, so a shared case reads the same
  state.texts = w.clues.map((c) => describe(w, c, r));
  state.used = new Set();
  state.notes = {};
  state.done = false;
  state.hints = 0;
  $("#app").hidden = false;
  $("#verdict").hidden = true;
  $("#accuse").hidden = false;
  $("#hint-text").textContent = "";
  render();
  $("#build-stats").textContent = `This case: ${w.clues.length} clues, kept from ${w.calls} solver checks${w.attempts > 1 ? ` (${w.attempts - 1} draft${w.attempts > 2 ? "s" : ""} thrown out as too easy or too long)` : ""}.`;
  renderCode();
}

// ---------- drawing ----------
const placeOf = (id) => state.w.places.find((p) => p.id === id);
const dishOf = (id) => state.w.dishes.find((d) => d.id === id);
const personOf = (id) => state.w.people.find((p) => p.id === id);

function render() {
  const w = state.w;
  const scene = placeOf(w.scene);
  $("#case-no").textContent = `#${w.seed} · ${w.level === "easy" ? "Easy" : "Hard"}`;
  $("#story").innerHTML =
    `Someone walked off with <b>${esc(w.missing)}</b>, last seen <b>${esc(scene.at)}</b>. ` +
    `${w.people.length} neighbors came: ${listOf(w.people.map((p) => esc(p.name)))}. ` +
    `Each one stayed in a single spot all afternoon and brought one dish, and no two shared either. ` +
    `<span class="rule">Whoever was ${esc(scene.at)} did it.</span>`;
  renderClues();
  $("#suspects").innerHTML = w.people.map((p) =>
    `<button type="button" class="suspect" data-p="${p.id}">${esc(p.name)}</button>`).join("");
  renderGrids();
}

function listOf(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }

function renderClues(highlight = []) {
  $("#clues").innerHTML = state.texts.map((t, i) => {
    const n = i + 1, used = state.used.has(n), hot = highlight.includes(n);
    return `<li class="${used ? "used" : ""}${hot ? " hot" : ""}"><button type="button" data-n="${n}" aria-pressed="${used}">${esc(t)}</button></li>`;
  }).join("");
}

const MARKS = ["", "no", "yes"];
const GLYPH = { "": "", no: "✕", yes: "●" };
function renderGrids() {
  const w = state.w;
  const table = (title, cols, key) => {
    const head = cols.map((c) => `<th scope="col" class="${key === "at" && c.id === w.scene ? "scene" : ""}"><span>${esc(c.name)}</span></th>`).join("");
    const rows = w.people.map((p) => {
      const cells = cols.map((c) => {
        const k = `${key}:${p.id}:${c.id}`, m = state.notes[k] || "";
        const sc = key === "at" && c.id === w.scene ? " scene" : "";
        return `<td class="${sc}"><button type="button" class="mark ${m}" data-k="${k}" aria-label="${esc(p.name)}, ${esc(c.name)}: ${m === "yes" ? "yes" : m === "no" ? "no" : "unmarked"}">${GLYPH[m]}</button></td>`;
      }).join("");
      return `<tr><th scope="row">${esc(p.name)}</th>${cells}</tr>`;
    }).join("");
    return `<div class="grid"><h3>${title}</h3><table><thead><tr><td></td>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  };
  $("#grids").innerHTML = table("Where they stood", w.places, "at") + table("What they brought", w.dishes, "dish");
}

function renderCode() {
  const src = state.view === "enc" || !state.w ? ENCODING : facts(state.w, state.w.clues);
  $("#code").innerHTML = src.split("\n").map((l) => {
    const e = esc(l);
    return /^\s*%/.test(l) ? `<span class="c">${e}</span>` : e;
  }).join("\n");
}

// ---------- verdict ----------
async function accuse(pid) {
  if (state.done || state.busy) return;
  const w = state.w;
  state.done = true;
  const right = pid === w.culprit;
  const rec = loadRecord(); rec.played++; if (right) rec.solved++; saveRecord(rec); showRecord();
  document.querySelectorAll(".suspect").forEach((b) => {
    b.disabled = true;
    b.classList.toggle("picked", b.dataset.p === pid);
    b.classList.toggle("guilty", b.dataset.p === w.culprit);
  });
  $("#accuse").hidden = true;

  let pv = { at: {}, brought: {} };
  try { pv = await proven({ w, solve, encoding: ENCODING }); } catch (e) {}

  const culprit = personOf(w.culprit).name;
  const why = w.people.filter((p) => p.id !== w.culprit).map((p) => {
    const ids = w.why[p.id];
    return `<li><button type="button" class="why" data-ids="${ids.join(",")}"><b>${esc(p.name)}</b> is cleared by clue${ids.length > 1 ? "s" : ""} ${listOf(ids.map(String))}</button></li>`;
  }).join("");
  const truth = w.people.map((p) => {
    const t = w.truth[p.id];
    const sure = pv.at[p.id] === t.at, sureD = pv.brought[p.id] === t.brought;
    return `<tr class="${p.id === w.culprit ? "guilty" : ""}"><th scope="row">${esc(p.name)}</th>` +
      `<td>${esc(placeOf(t.at).name)}${sure ? "" : '<small title="The clues never pin this down">?</small>'}</td>` +
      `<td>${esc(dishOf(t.brought).name)}${sureD ? "" : '<small title="The clues never pin this down">?</small>'}</td></tr>`;
  }).join("");

  const v = $("#verdict");
  v.hidden = false;
  v.innerHTML =
    `<h3 class="${right ? "ok" : "bad"}">${right ? `Case closed. It was ${esc(culprit)}.` : `Not ${esc(personOf(pid).name)}. It was ${esc(culprit)}.`}</h3>` +
    `<p class="hint">Clingo found the fewest clues that clear each innocent neighbor. Tap one to light up its clues.</p>` +
    `<ul class="whylist">${why}</ul>` +
    `<details><summary>What really happened</summary>` +
    `<table class="truth"><thead><tr><td></td><th scope="col">Stood</th><th scope="col">Brought</th></tr></thead><tbody>${truth}</tbody></table>` +
    `<p class="hint">A <b>?</b> means the clues never pin that down. Clingo only made sure the thief was certain.</p></details>` +
    `<div class="row"><button type="button" class="btn" id="again">Next case</button></div>`;
  $("#again").addEventListener("click", () => newCase(state.level));
  v.querySelectorAll(".why").forEach((b) => b.addEventListener("click", () => {
    renderClues(b.dataset.ids.split(",").map(Number));
  }));
  v.querySelector("h3").focus?.();
}

// ---------- events ----------
$("#clues").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-n]");
  if (!b) return;
  const n = +b.dataset.n;
  state.used.has(n) ? state.used.delete(n) : state.used.add(n);
  b.parentElement.classList.toggle("used", state.used.has(n));
  b.setAttribute("aria-pressed", String(state.used.has(n)));
});

$("#grids").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-k]");
  if (!b) return;
  const k = b.dataset.k, m = MARKS[(MARKS.indexOf(state.notes[k] || "") + 1) % MARKS.length];
  if (m) state.notes[k] = m; else delete state.notes[k];
  b.className = "mark " + m;
  b.textContent = GLYPH[m];
  b.setAttribute("aria-label", b.getAttribute("aria-label").replace(/: \w+$/, ": " + (m === "yes" ? "yes" : m === "no" ? "no" : "unmarked")));
});

$("#suspects").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-p]");
  if (b) accuse(b.dataset.p);
});

// Each hint clears one more innocent neighbor, easiest first.
$("#hint").addEventListener("click", () => {
  const w = state.w;
  const order = Object.entries(w.why).sort((a, b) => a[1].length - b[1].length);
  const [pid, ids] = order[state.hints % order.length];
  state.hints++;
  $("#hint-text").textContent = `Clue${ids.length > 1 ? "s" : ""} ${listOf(ids.map(String))} ${ids.length > 1 ? "together clear" : "clears"} ${personOf(pid).name}.`;
  renderClues(ids);
});

$("#clear-notes").addEventListener("click", () => { state.notes = {}; renderGrids(); });
$("#new").addEventListener("click", () => newCase(state.level));
document.querySelectorAll(".segbtn").forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.level !== state.level || !state.w) newCase(b.dataset.level);
}));
$("#share").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(location.href); $("#share").textContent = "Copied"; }
  catch (e) { $("#share").textContent = "Copy the address bar"; }
  setTimeout(() => { $("#share").textContent = "Copy link"; }, 1600);
});
const setView = (v) => {
  state.view = v;
  $("#view-enc").setAttribute("aria-pressed", String(v === "enc"));
  $("#view-facts").setAttribute("aria-pressed", String(v === "facts"));
  renderCode();
};
$("#view-enc").addEventListener("click", () => setView("enc"));
$("#view-facts").addEventListener("click", () => setView("facts"));
window.addEventListener("hashchange", () => {
  const h = parseHash();
  if (h && state.w && (h.seed !== state.w.seed || h.level !== state.w.level)) newCase(h.level, h.seed);
});

// ---------- boot ----------
(async function boot() {
  showRecord();
  try { ENCODING = await (await fetch("whodunit.lp")).text(); }
  catch (e) {
    setStatus('<span class="pill err">Couldn\'t load the rules</span><span class="hint">This page needs to be served over HTTP.</span>');
    return;
  }
  renderCode();
  try { await getClingo(); }
  catch (e) {
    setStatus('<span class="pill err">Couldn\'t load clingo</span><span class="hint">The solver files didn\'t load. Check your connection and reload the page.</span>');
    return;
  }
  const h = parseHash();
  newCase(h ? h.level : "easy", h ? h.seed : null);
})();

