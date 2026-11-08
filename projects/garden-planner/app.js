const CLINGO_URL = "./vendor/clingo/index.web.js";
let ENCODING = "";   // loaded from garden.lp at startup

const SEASONS = [null,
  {name:"Spring", note:"cool season"},
  {name:"Summer", note:"warm season"},
  {name:"Fall", note:"cool season"}];
const SUN_WORD = {3:"full sun", 2:"part sun", 1:"shade"};
const FAMILIES = {solanaceae:"Nightshades", lamiaceae:"Mints", poaceae:"Grasses", fabaceae:"Legumes", cucurbitaceae:"Gourds", asteraceae:"Daisies", tropaeolaceae:"Nasturtiums", apiaceae:"Carrot family", amaranthaceae:"Goosefoots", brassicaceae:"Cabbage family", amaryllidaceae:"Alliums"};

// sun: minimum light level; seasons: 1 spring, 2 summer, 3 fall; spread: sprawl radius
const CROPS = [
  {id:"tomato",    name:"Tomato",      abbr:"To", fam:"solanaceae",    sun:3, seasons:[2],   spread:1, tall:true,  feeder:"heavy", want:3},
  {id:"pepper",    name:"Pepper",      abbr:"Pp", fam:"solanaceae",    sun:3, seasons:[2],   spread:0, tall:false, feeder:"heavy", want:3},
  {id:"basil",     name:"Basil",       abbr:"Ba", fam:"lamiaceae",     sun:3, seasons:[2],   spread:0, tall:false, feeder:"light", want:4},
  {id:"corn",      name:"Sweet corn",  abbr:"Co", fam:"poaceae",       sun:3, seasons:[2],   spread:0, tall:true,  feeder:"heavy", want:6},
  {id:"pole_bean", name:"Pole bean",   abbr:"PB", fam:"fabaceae",      sun:3, seasons:[2],   spread:0, tall:true,  feeder:"fixer", want:4},
  {id:"bush_bean", name:"Bush bean",   abbr:"BB", fam:"fabaceae",      sun:3, seasons:[2],   spread:0, tall:false, feeder:"fixer", want:3, off:true},
  {id:"squash",    name:"Zucchini",    abbr:"Zu", fam:"cucurbitaceae", sun:3, seasons:[2],   spread:2, tall:false, feeder:"heavy", want:2},
  {id:"cucumber",  name:"Cucumber",    abbr:"Cu", fam:"cucurbitaceae", sun:3, seasons:[2],   spread:1, tall:false, feeder:"heavy", want:2},
  {id:"marigold",  name:"Marigold",    abbr:"Ma", fam:"asteraceae",    sun:3, seasons:[2],   spread:0, tall:false, feeder:"light", want:3},
  {id:"nasturtium",name:"Nasturtium",  abbr:"Na", fam:"tropaeolaceae", sun:2, seasons:[2],   spread:0, tall:false, feeder:"light", want:2, off:true},
  {id:"dill",      name:"Dill",        abbr:"Di", fam:"apiaceae",      sun:3, seasons:[1,2], spread:0, tall:false, feeder:"light", want:2},
  {id:"pea",       name:"Snap pea",    abbr:"Pe", fam:"fabaceae",      sun:2, seasons:[1,3], spread:0, tall:true,  feeder:"fixer", want:6},
  {id:"lettuce",   name:"Lettuce",     abbr:"Le", fam:"asteraceae",    sun:1, seasons:[1,3], spread:0, tall:false, feeder:"light", want:6},
  {id:"spinach",   name:"Spinach",     abbr:"Sp", fam:"amaranthaceae", sun:1, seasons:[1,3], spread:0, tall:false, feeder:"light", want:4},
  {id:"kale",      name:"Kale",        abbr:"Ka", fam:"brassicaceae",  sun:2, seasons:[1,3], spread:0, tall:false, feeder:"heavy", want:3},
  {id:"broccoli",  name:"Broccoli",    abbr:"Br", fam:"brassicaceae",  sun:2, seasons:[1,3], spread:1, tall:false, feeder:"heavy", want:2, off:true},
  {id:"radish",    name:"Radish",      abbr:"Ra", fam:"brassicaceae",  sun:2, seasons:[1,3], spread:0, tall:false, feeder:"light", want:4},
  {id:"carrot",    name:"Carrot",      abbr:"Ca", fam:"apiaceae",      sun:2, seasons:[1,3], spread:0, tall:false, feeder:"light", want:6},
  {id:"beet",      name:"Beet",        abbr:"Be", fam:"amaranthaceae", sun:2, seasons:[1,3], spread:0, tall:false, feeder:"light", want:3},
  {id:"onion",     name:"Onion",       abbr:"On", fam:"amaryllidaceae",sun:3, seasons:[1],   spread:0, tall:false, feeder:"light", want:4},
  {id:"garlic",    name:"Garlic",      abbr:"Ga", fam:"amaryllidaceae",sun:3, seasons:[3],   spread:0, tall:false, feeder:"light", want:6},
];
const BY_ID = Object.fromEntries(CROPS.map(c => [c.id, c]));

const GOOD = [["tomato","basil"],["tomato","carrot"],["tomato","marigold"],["tomato","onion"],["pepper","basil"],["pepper","onion"],["pepper","carrot"],
  ["corn","pole_bean"],["corn","squash"],["pole_bean","squash"],["corn","bush_bean"],["corn","cucumber"],["cucumber","dill"],["cucumber","nasturtium"],
  ["cucumber","bush_bean"],["squash","nasturtium"],["squash","marigold"],["basil","marigold"],["lettuce","carrot"],["lettuce","radish"],["lettuce","beet"],
  ["lettuce","onion"],["pea","carrot"],["pea","radish"],["pea","spinach"],["pea","lettuce"],["carrot","onion"],["carrot","radish"],["beet","onion"],
  ["kale","beet"],["kale","onion"],["kale","dill"],["broccoli","onion"],["broccoli","beet"],["spinach","radish"],["garlic","beet"],["garlic","lettuce"],
  ["garlic","kale"],["garlic","spinach"]];
const BAD = [["tomato","corn"],["tomato","kale"],["tomato","broccoli"],["tomato","dill"],["pole_bean","onion"],["bush_bean","onion"],["pea","onion"],
  ["pea","garlic"],["pole_bean","garlic"],["bush_bean","garlic"],["carrot","dill"],["pole_bean","beet"]];
const pairKey = (a,b) => a < b ? a + "|" + b : b + "|" + a;
const GOOD_SET = new Set(GOOD.map(([a,b]) => pairKey(a,b)));
const BAD_SET = new Set(BAD.map(([a,b]) => pairKey(a,b)));

// ---------- state ----------
const state = {
  W: 8, H: 4, sun: [], brush: 3,
  picks: Object.fromEntries(CROPS.map(c => [c.id, {on: !c.off, want: c.want}])),
  plan: null,      // Map "x,y,s" -> crop id
  shaded: new Set(),
  short: {},
  sel: null,
  view: "enc",
  facts: "",
  optimal: false,
};
function defaultSun(W, H){
  const g = [];
  for (let y = 0; y < H; y++){
    g.push([]);
    for (let x = 0; x < W; x++){
      let v = 3;
      if (x < 2) v = 2;                       // a fence casts afternoon shade on the west end
      if (x === 0 && y < 2) v = 1;            // tree in the northwest corner
      g[y].push(v);
    }
  }
  return g;
}
state.sun = defaultSun(state.W, state.H);

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));

// ---------- bed + sun painter ----------
function fillSelect(el, from, to, val){
  el.innerHTML = "";
  for (let i = from; i <= to; i++){ const o = document.createElement("option"); o.value = i; o.textContent = i + " ft"; if (i === val) o.selected = true; el.appendChild(o); }
}
fillSelect($("#bed-w"), 3, 10, state.W);
fillSelect($("#bed-h-sel"), 2, 6, state.H);
function resizeBed(){
  const W = +$("#bed-w").value, H = +$("#bed-h-sel").value;
  const g = [];
  for (let y = 0; y < H; y++){ g.push([]); for (let x = 0; x < W; x++) g[y].push(state.sun[y]?.[x] ?? 3); }
  state.W = W; state.H = H; state.sun = g; state.plan = null; state.sel = null;
  renderPaint(); renderAll();
}
$("#bed-w").addEventListener("change", resizeBed);
$("#bed-h-sel").addEventListener("change", resizeBed);

document.querySelectorAll(".brush").forEach(b => b.addEventListener("click", () => {
  state.brush = +b.dataset.lvl;
  document.querySelectorAll(".brush").forEach(o => o.setAttribute("aria-pressed", String(o === b)));
}));

let painting = false;
function renderPaint(){
  const p = $("#paint");
  p.style.gridTemplateColumns = `repeat(${state.W}, minmax(0,1fr))`;
  p.innerHTML = "";
  for (let y = 0; y < state.H; y++) for (let x = 0; x < state.W; x++){
    const d = document.createElement("div");
    d.className = "s" + state.sun[y][x];
    d.dataset.x = x; d.dataset.y = y;
    d.title = `${x+1},${y+1}: ${SUN_WORD[state.sun[y][x]]}`;
    p.appendChild(d);
  }
}
function paintAt(target){
  if (!target || target.dataset.x === undefined) return;
  const x = +target.dataset.x, y = +target.dataset.y;
  if (state.sun[y][x] === state.brush) return;
  state.sun[y][x] = state.brush;
  target.className = "s" + state.brush;
  target.title = `${x+1},${y+1}: ${SUN_WORD[state.brush]}`;
  sunChanged = true;
}
let sunChanged = false;
$("#paint").addEventListener("pointerdown", e => { painting = true; sunChanged = false; e.preventDefault(); paintAt(e.target); });
$("#paint").addEventListener("pointermove", e => { if (!painting) return; paintAt(document.elementFromPoint(e.clientX, e.clientY)); });
window.addEventListener("pointerup", () => { if (painting){ painting = false; if (sunChanged){ renderBoards(); } } });

// ---------- crop picker ----------
function seasonText(c){
  const s = c.seasons;
  if (s.length === 2 && s[0] === 1 && s[1] === 3) return "spring & fall";
  return s.map(i => SEASONS[i].name.toLowerCase()).join(" & ");
}
function cropMeta(c){
  const bits = [SUN_WORD[c.sun] === "shade" ? "shade ok" : SUN_WORD[c.sun], seasonText(c)];
  if (c.tall) bits.push("tall");
  if (c.spread) bits.push(c.spread > 1 ? "sprawls wide" : "sprawls");
  if (c.feeder === "fixer") bits.push("fixes nitrogen");
  return bits.join(" · ");
}
function renderCrops(){
  const groups = [
    ["Warm season", CROPS.filter(c => c.seasons.includes(2))],
    ["Cool season", CROPS.filter(c => !c.seasons.includes(2))],
  ];
  const root = $("#crops");
  root.innerHTML = groups.map(([title, list]) => `
    <div class="crop-group"><h3>${title}</h3>
    ${list.map(c => { const p = state.picks[c.id]; return `
      <div class="crop ${p.on ? "" : "off"}" data-id="${c.id}">
        <input type="checkbox" id="c-${c.id}" ${p.on ? "checked" : ""}>
        <label for="c-${c.id}"><span class="sw" style="--c:var(--f-${c.fam})">${c.abbr}</span>
          <span class="nm">${c.name}<small>${cropMeta(c)}</small></span></label>
        <div class="step"><button id="m-${c.id}" aria-label="Fewer ${c.name}" data-d="-1">−</button><output id="o-${c.id}">${p.want}</output><button id="p-${c.id}" aria-label="More ${c.name}" data-d="1">+</button></div>
      </div>`; }).join("")}
    </div>`).join("");
}
$("#crops").addEventListener("change", e => {
  const row = e.target.closest(".crop"); if (!row) return;
  state.picks[row.dataset.id].on = e.target.checked;
  row.classList.toggle("off", !e.target.checked);
});
$("#crops").addEventListener("click", e => {
  const b = e.target.closest("button[data-d]"); if (!b) return;
  const id = b.closest(".crop").dataset.id, p = state.picks[id];
  p.want = Math.max(1, Math.min(24, p.want + +b.dataset.d));
  $("#o-" + id).textContent = p.want;
});

// ---------- facts ----------
function buildFacts(){
  const L = [];
  L.push("% bed " + state.W + " x " + state.H + " ft");
  for (let y = 0; y < state.H; y++){
    const row = [];
    for (let x = 0; x < state.W; x++) row.push(`cell(${x+1},${y+1}). sun(${x+1},${y+1},${state.sun[y][x]}).`);
    L.push(row.join(" "));
  }
  L.push("", "% crops you picked");
  const on = CROPS.filter(c => state.picks[c.id].on);
  for (const c of on){
    const f = [`crop(${c.id}).`, `family(${c.id},${c.fam}).`, `needs(${c.id},${c.sun}).`, `spread(${c.id},${c.spread}).`, `feeder(${c.id},${c.feeder}).`, `want(${c.id},${state.picks[c.id].want}).`];
    for (const s of c.seasons) f.push(`grows(${c.id},${s}).`);
    if (c.tall) f.push(`tall(${c.id}).`);
    L.push(f.join(" "));
  }
  const ids = new Set(on.map(c => c.id));
  L.push("", "% companion lore");
  L.push(GOOD.filter(([a,b]) => ids.has(a) && ids.has(b)).map(([a,b]) => `good(${a},${b}).`).join(" "));
  L.push(BAD.filter(([a,b]) => ids.has(a) && ids.has(b)).map(([a,b]) => `bad(${a},${b}).`).join(" "));
  if ($("#fill").checked) L.push("", "fill.");
  return L.join("\n");
}

// ---------- solving ----------
let clingoLib = null;
async function getClingo(){
  if (!clingoLib){ const m = await import(CLINGO_URL); clingoLib = m.default ?? m; }
  return clingoLib;
}
let running = false, stopFn = null, tick = null;

function setStatus(html){ $("#status").innerHTML = html; }

function parseAtoms(atoms){
  const plan = new Map(), shaded = new Set(), short = {};
  for (const a of atoms){
    let m;
    if ((m = /^at\((\d+),(\d+),(\d+),(\w+)\)$/.exec(a))) plan.set(`${m[1]-1},${m[2]-1},${m[3]}`, m[4]);
    else if ((m = /^shaded\((\d+),(\d+),(\d+)\)$/.exec(a))) shaded.add(`${m[1]-1},${m[2]-1},${m[3]}`);
    else if ((m = /^short\((\w+),(\d+)\)$/.exec(a))) short[m[1]] = +m[2];
  }
  return {plan, shaded, short};
}
let pending = null;
function showModel(atoms){
  pending = atoms;
  requestAnimationFrame(() => {
    if (!pending) return;
    const r = parseAtoms(pending); pending = null;
    state.plan = r.plan; state.shaded = r.shaded; state.short = r.short;
    renderAll();
  });
}

async function solve(){
  if (running) return;
  state.facts = buildFacts();
  if (state.view === "facts") renderCode();
  if (!CROPS.some(c => state.picks[c.id].on)){ setStatus('<span class="pill err">Pick at least one crop</span>'); return; }
  running = true; state.optimal = false;
  $("#solve").disabled = true; $("#stop").disabled = false;
  setStatus('<span class="pill busy">Loading clingo</span>');
  let c;
  try { c = await getClingo(); }
  catch (e){
    running = false; $("#solve").disabled = false; $("#stop").disabled = true;
    setStatus(`<span class="pill err">Couldn't load clingo</span><span class="hint">The solver files didn't load. Check your connection and reload the page.</span>`);
    return;
  }
  const t0 = performance.now();
  let n = 0, best = null, stopped = false;
  let resolveStop; const stopP = new Promise(r => resolveStop = r);
  stopFn = () => { if (stopped) return; stopped = true; try { c.restart(); } catch (e) {} resolveStop({stopped: true}); };
  const limit = +$("#limit").value;
  const timer = setTimeout(() => stopFn(), limit * 1000);
  const busy = () => setStatus(`<span class="pill busy">Searching</span><span class="hint">${n} improving plan${n === 1 ? "" : "s"} · ${((performance.now()-t0)/1000).toFixed(1)} s of ${limit} s</span>`);
  busy(); tick = setInterval(busy, 250);
  const onModel = m => {
    const atoms = Array.isArray(m) ? m : (m && (m.Value || m.value)) || [];
    n++; best = atoms; showModel(atoms);
  };
  let res;
  try { res = await Promise.race([c.run(ENCODING + "\n" + state.facts, 0, [], onModel), stopP]); }
  catch (e){ res = {Result: "ERROR", Error: String(e && e.message || e)}; }
  clearTimeout(timer); clearInterval(tick);
  if (!best && res && res.Call){
    const ws = res.Call[res.Call.length - 1]?.Witnesses || [];
    if (ws.length){ best = ws[ws.length - 1].Value; n = ws.length; showModel(best); }
  }
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  running = false; stopFn = null;
  $("#solve").disabled = false; $("#stop").disabled = true;
  if (res && res.Result === "ERROR"){
    setStatus(`<span class="pill err">Solver error</span><span class="hint">${esc(res.Error || "unknown")}</span>`);
  } else if (!best){
    setStatus(stopped ? `<span class="pill err">No plan yet</span><span class="hint">Search stopped after ${secs} s before the first plan. Try a longer search time.</span>`
                      : `<span class="pill err">No plan exists</span><span class="hint">These settings can't all hold at once.</span>`);
  } else {
    state.optimal = !stopped && res && (res.Result === "OPTIMUM FOUND" || res.Models?.Optimum === "yes");
    setStatus(state.optimal
      ? `<span class="pill ok">Proven best plan</span><span class="hint">${n} improving plans · ${secs} s</span>`
      : `<span class="pill">Best plan found</span><span class="hint">${n} improving plans in ${secs} s; a longer search may still improve it.</span>`);
  }
}
$("#solve").addEventListener("click", solve);
$("#stop").addEventListener("click", () => stopFn && stopFn());

// ---------- scoring (mirrors the encoding's objectives) ----------
function neighbors(x, y){
  const out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < state.W && ny < state.H) out.push([nx, ny]);
  }
  return out;
}
function score(){
  const plan = state.plan; const links = {1:[],2:[],3:[]};
  let comp = 0, rot = 0, planted = 0;
  if (!plan) return null;
  for (let s = 1; s <= 3; s++) for (let y = 0; y < state.H; y++) for (let x = 0; x < state.W; x++){
    const p = plan.get(`${x},${y},${s}`); if (!p) continue;
    planted++;
    for (const [nx, ny] of neighbors(x, y)){
      if (ny < y || (ny === y && nx <= x)) continue;      // each pair once
      const q = plan.get(`${nx},${ny},${s}`);
      if (q && GOOD_SET.has(pairKey(p, q))){ comp++; links[s].push([x, y, nx, ny]); }
    }
    if (s < 3){
      const q = plan.get(`${x},${y},${s+1}`);
      if (q && BY_ID[p].feeder === "heavy" && BY_ID[q].feeder === "fixer") rot++;
    }
  }
  const counts = {};
  for (const p of plan.values()) counts[p] = (counts[p] || 0) + 1;
  return {comp, rot, planted, links, counts};
}

// ---------- rendering ----------
function renderStats(sc){
  const on = CROPS.filter(c => state.picks[c.id].on);
  const total = state.W * state.H * 3;
  if (!sc){
    $("#stats").innerHTML = [["—","wishlist crops met"],["—","good-neighbor pairs"],["—","legumes after heavy feeders"],[`— / ${total}`,"squares planted"]]
      .map(([b,s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join("");
    return;
  }
  const met = on.filter(c => (sc.counts[c.id] || 0) >= state.picks[c.id].want).length;
  $("#stats").innerHTML = `
    <div class="stat ${met < on.length ? "bad" : ""}"><b>${met} / ${on.length}</b><span>wishlist crops met</span></div>
    <div class="stat"><b>${sc.comp}</b><span>good-neighbor pairs</span></div>
    <div class="stat"><b>${sc.rot}</b><span>legumes after heavy feeders</span></div>
    <div class="stat"><b>${sc.planted} / ${total}</b><span>squares planted</span></div>`;
}
function renderBoards(){
  const sc = score();
  renderStats(sc);
  const show = $("#showlinks").checked;
  const html = [];
  for (let s = 1; s <= 3; s++){
    const cells = [];
    for (let y = 0; y < state.H; y++) for (let x = 0; x < state.W; x++){
      const key = `${x},${y},${s}`;
      const p = state.plan?.get(key);
      const c = p && BY_ID[p];
      const sel = state.sel && state.sel.x === x && state.sel.y === y && state.sel.s === s;
      const label = `${SEASONS[s].name}, square ${x+1},${y+1}: ${c ? c.name : "open"}, ${SUN_WORD[state.sun[y][x]]}${state.shaded.has(key) ? ", shaded by a tall neighbor" : ""}`;
      cells.push(`<button class="sq s${state.sun[y][x]} ${state.shaded.has(key) ? "shaded" : ""} ${sel ? "sel" : ""}" data-k="${key}" aria-label="${esc(label)}" title="${esc(c ? c.name : "Open")}">
        ${c ? `<span class="chip" style="--c:var(--f-${c.fam})">${c.abbr}</span>${c.tall ? '<span class="tall" aria-hidden="true">▲</span>' : ""}` : ""}</button>`);
    }
    const lines = show && sc ? sc.links[s].map(([x1,y1,x2,y2]) =>
      `<line x1="${x1+.5}" y1="${y1+.5}" x2="${x2+.5}" y2="${y2+.5}" stroke="var(--link)" stroke-width=".07" stroke-linecap="round" stroke-dasharray=".14 .1" />`).join("") : "";
    const n = state.plan ? [...state.plan.keys()].filter(k => k.endsWith("," + s)).length : 0;
    html.push(`<figure class="board" style="margin:0">
      <div class="board-h"><h3>${SEASONS[s].name}</h3><small>${SEASONS[s].note}${state.plan ? ` · ${n} planted` : ""}</small></div>
      <div class="bedwrap">
        <div class="bed" style="grid-template-columns:repeat(${state.W},minmax(0,1fr))">${cells.join("")}</div>
        <svg class="links" viewBox="0 0 ${state.W} ${state.H}" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
      </div></figure>`);
  }
  $("#boards").innerHTML = html.join("");
}
$("#boards").addEventListener("click", e => {
  const b = e.target.closest(".sq"); if (!b) return;
  const [x, y, s] = b.dataset.k.split(",").map(Number);
  state.sel = {x, y, s}; renderBoards(); renderDetail();
});
$("#showlinks").addEventListener("change", renderBoards);

function renderLegend(){
  const fams = [...new Set(CROPS.filter(c => state.picks[c.id].on).map(c => c.fam))];
  $("#legend").innerHTML =
    `<span><i class="s3" style="--c:var(--sun-full)"></i>Full sun</span><span><i style="--c:var(--sun-part)"></i>Part sun</span><span><i style="--c:var(--sun-shade)"></i>Shade</span>` +
    `<span><i class="hatch"></i>Shaded by a tall crop</span><span><i class="ln"></i>Good companions</span><span>▲ Tall</span>` +
    fams.map(f => `<span><i style="--c:var(--f-${f})"></i>${FAMILIES[f]}</span>`).join("");
}

function renderDetail(){
  const box = $("#detail");
  if (!state.sel || !state.plan){ box.innerHTML = `<p class="hint">Click any square in the plan to see why it holds what it does.</p>`; return; }
  const {x, y, s} = state.sel, key = `${x},${y},${s}`;
  const p = state.plan.get(key), c = p && BY_ID[p];
  const base = state.sun[y][x], shaded = state.shaded.has(key);
  const light = shaded ? Math.max(1, base - 1) : base;
  const prev = s > 1 ? state.plan.get(`${x},${y},${s-1}`) : null;
  const next = s < 3 ? state.plan.get(`${x},${y},${s+1}`) : null;
  const nb = neighbors(x, y).map(([nx, ny]) => state.plan.get(`${nx},${ny},${s}`)).filter(Boolean);
  const goodN = c ? [...new Set(nb.filter(q => GOOD_SET.has(pairKey(p, q))))].map(q => BY_ID[q].name) : [];
  const rows = [
    ["Where", `${SEASONS[s].name}, column ${x+1}, row ${y+1} from the north edge`],
    ["Light", `${SUN_WORD[light]}${shaded ? ` (was ${SUN_WORD[base]}; a tall crop to the south shades it)` : ""}`],
  ];
  if (c){
    rows.unshift(["Crop", `<b>${c.name}</b> · ${FAMILIES[c.fam]}`]);
    rows.push(["Needs", `${SUN_WORD[c.sun] === "shade" ? "shade or better" : SUN_WORD[c.sun]}${c.spread ? `, spread ${c.spread}` : ""}`]);
    rows.push(["Companions", goodN.length ? goodN.join(", ") : "none next to it"]);
  } else rows.unshift(["Crop", "Open square"]);
  rows.push(["Before", prev ? `${BY_ID[prev].name} (${FAMILIES[BY_ID[prev].fam]})` : (s > 1 ? "open" : "start of the year")]);
  rows.push(["After", next ? `${BY_ID[next].name} (${FAMILIES[BY_ID[next].fam]})` : (s < 3 ? "open" : "end of the year")]);
  if (c && next && c.feeder === "heavy" && BY_ID[next].feeder === "fixer") rows.push(["Rotation", "A legume follows this heavy feeder and puts nitrogen back."]);
  box.innerHTML = `<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
}

function renderTally(){
  const sc = score();
  const on = CROPS.filter(c => state.picks[c.id].on);
  if (!sc){ $("#tally").innerHTML = `<p class="hint">Counts appear after the first plan.</p>`; return; }
  $("#tally").innerHTML = on.map(c => {
    const have = sc.counts[c.id] || 0, want = state.picks[c.id].want;
    return `<span class="${have < want ? "short" : ""}" title="${esc(c.name)}"><span class="sw" style="--c:var(--f-${c.fam})">${c.abbr}</span>${have}/${want}</span>`;
  }).join("");
}

function highlight(src){
  return esc(src).split("\n").map(line => {
    const i = line.indexOf("%");
    let code = i >= 0 ? line.slice(0, i) : line, com = i >= 0 ? line.slice(i) : "";
    code = code.replace(/(#minimize|#maximize|#show|#count|not )/g, '<span class="k">$1</span>');
    return code + (com ? `<span class="c">${com}</span>` : "");
  }).join("\n");
}
function renderCode(){
  const src = state.view === "enc" ? ENCODING : (state.facts || buildFacts());
  $("#code").innerHTML = highlight(src);
}
function setView(v){
  state.view = v;
  $("#view-enc").setAttribute("aria-pressed", String(v === "enc"));
  $("#view-facts").setAttribute("aria-pressed", String(v === "facts"));
  if (v === "facts") state.facts = buildFacts();
  renderCode();
}
$("#view-enc").addEventListener("click", () => setView("enc"));
$("#view-facts").addEventListener("click", () => setView("facts"));
$("#copy").addEventListener("click", async () => {
  const text = state.view === "enc" ? ENCODING : state.facts;
  try { await navigator.clipboard.writeText(text); $("#copy").textContent = "Copied"; }
  catch (e){ const r = document.createRange(); r.selectNodeContents($("#code")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $("#copy").textContent = "Selected"; }
  setTimeout(() => $("#copy").textContent = "Copy", 1500);
});

function renderAll(){ renderBoards(); renderLegend(); renderDetail(); renderTally(); }

// ---------- saving, opening, printing ----------
const host = window.gardenApp;   // provided by preload.js in the desktop app; undefined on the website
function snapshot(){
  return {
    version: 1,
    W: state.W, H: state.H, sun: state.sun, picks: state.picks,
    fill: $("#fill").checked, limit: $("#limit").value,
    plan: state.plan ? [...state.plan.entries()] : null,
    shaded: [...state.shaded], short: state.short, optimal: state.optimal,
  };
}
function restore(d){
  if (!d || d.version !== 1 || !Array.isArray(d.sun)) return false;
  state.W = d.W; state.H = d.H; state.sun = d.sun;
  for (const c of CROPS){ if (d.picks?.[c.id]) state.picks[c.id] = {on: !!d.picks[c.id].on, want: +d.picks[c.id].want || c.want}; }
  $("#fill").checked = d.fill !== false;
  if (d.limit) $("#limit").value = d.limit;
  fillSelect($("#bed-w"), 3, 10, state.W);
  fillSelect($("#bed-h-sel"), 2, 6, state.H);
  state.plan = d.plan ? new Map(d.plan) : null;
  state.shaded = new Set(d.shaded || []);
  state.short = d.short || {};
  state.optimal = !!d.optimal;
  state.sel = null;
  renderPaint(); renderCrops(); renderAll();
  return true;
}
let saveTimer = null;
function persist(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const text = JSON.stringify(snapshot());
    if (host){
      host.saveState(text).catch(e => flash("Couldn't save garden: " + (e.message || e), "err"));
      return;
    }
    try { localStorage.setItem("garden-planner-state", text); }
    catch (e){ flash("Couldn't save garden in this browser: " + (e.message || e), "err"); }
  }, 600);
}
const _renderAll = renderAll;
renderAll = function(){ _renderAll(); persist(); };
$("#crops").addEventListener("change", persist);
$("#crops").addEventListener("click", persist);
$("#fill").addEventListener("change", persist);
$("#limit").addEventListener("change", persist);
window.addEventListener("pointerup", persist);

function flash(msg, cls = "ok"){ setStatus(`<span class="pill ${cls}">${esc(msg)}</span>`); }
$("#save-file").addEventListener("click", async () => {
  const text = JSON.stringify(snapshot(), null, 2);
  if (host){
    const r = await host.saveFile(text);
    if (r?.saved) flash("Saved " + r.name);
    return;
  }
  const url = URL.createObjectURL(new Blob([text], {type:"application/json"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = "my-garden.garden.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  flash("Downloaded my-garden.garden.json");
});
function openLayout(text, name){
  try {
    if (restore(JSON.parse(text))){ flash("Opened " + name); persist(); return; }
  } catch (e) {}
  flash("That file isn't a garden layout", "err");
}
$("#open-file").addEventListener("click", async () => {
  if (running) return;
  if (host){
    const r = await host.openFile();
    if (r?.text) openLayout(r.text, r.name);
    return;
  }
  $("#layout-file").click();
});
$("#layout-file").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  openLayout(await file.text(), file.name);
  e.target.value = "";
});
$("#print").addEventListener("click", () => window.print());

// ---------- start ----------
(async () => {
  try { ENCODING = await (await fetch("garden.lp")).text(); }
  catch (e){ setStatus(`<span class="pill err">Couldn't load the planner's rules (garden.lp). Reload the page to try again.</span>`); return; }
  renderPaint(); renderCrops(); renderAll(); renderCode();
  let saved = null;
  try {
    const text = host ? await host.loadState() : localStorage.getItem("garden-planner-state");
    saved = JSON.parse(text || "null");
  } catch (e) { console.error("Couldn't restore the saved garden", e); }
  if (saved && restore(saved) && state.plan){
    setStatus(`<span class="pill ${state.optimal ? "ok" : ""}">${state.optimal ? "Proven best plan" : "Best plan found"}</span><span class="hint">Restored from your last session. Press Plan my bed to solve again.</span>`);
  } else {
    solve();
  }
})();
