// Hero toy: a tiny stand-in for clingo. It packs a moving truck (a side view,
// 8 squares long and 5 high by default, resizable) so that every rule shown
// beside it holds: each
// item gets one spot, no two items share a square, nothing floats, heavy things
// ride on the floor, and nothing sits on top of anything fragile. When the
// truck is too small for everything, it packs as many items as it can and
// leaves the rest on the curb.
(function () {
  var W = 8, H = 5;
  var KINDS = {
    heavy:   { name: 'Heavy',     color: 'var(--tomato)' },
    fragile: { name: 'Fragile',   color: 'var(--squash)' },
    stuff:   { name: 'Furniture', color: 'var(--peas)' },
    box:     { name: 'Boxes',     color: 'var(--corn)' }
  };
  var ITEMS = [
    { name: 'Couch',    w: 4, h: 1, kind: 'heavy' },
    { name: 'Fridge',   w: 1, h: 3, kind: 'heavy' },
    { name: 'Dresser',  w: 2, h: 2, kind: 'heavy' },
    { name: 'Books',    w: 1, h: 1, kind: 'heavy' },
    { name: 'Mattress', w: 3, h: 1, kind: 'stuff' },
    { name: 'Chair',    w: 1, h: 2, kind: 'stuff' },
    { name: 'TV',       w: 2, h: 1, kind: 'fragile' },
    { name: 'Mirror',   w: 1, h: 2, kind: 'fragile' },
    { name: 'Lamp',     w: 1, h: 1, kind: 'fragile' },
    { name: 'Box',      w: 1, h: 1, kind: 'box' },
    { name: 'Box',      w: 1, h: 1, kind: 'box' },
    { name: 'Box',      w: 1, h: 1, kind: 'box' },
    { name: 'Box',      w: 1, h: 1, kind: 'box' },
    { name: 'Box',      w: 1, h: 1, kind: 'box' },
    { name: 'Box',      w: 1, h: 1, kind: 'box' }
  ];
  var RULE = { place: 0, overlap: 1, floats: 2, heavy: 3, fragile: 4 };

  var cargo = document.getElementById('cargo');
  if (!cargo) return;
  var packedEl = document.getElementById('packed');
  var brokenEl = document.getElementById('broken');
  var statusEl = document.getElementById('status');
  var legendEl = document.getElementById('legend');
  var lines = document.querySelectorAll('#rules .ln');
  var solveBtn = document.getElementById('solve');
  var clearBtn = document.getElementById('clear');
  var lenIn = document.getElementById('truck-len');
  var hgtIn = document.getElementById('truck-hgt');
  var lenOut = document.getElementById('truck-len-out');
  var hgtOut = document.getElementById('truck-hgt-out');
  document.getElementById('total').textContent = ITEMS.length;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var slots = [];      // slots[x][y]: the empty-square element
  var placed = [];     // placed[i]: { x, y } or null
  var els = [];        // els[i]: the item's button, or null
  var timer = null, flashTimer = null;

  // Grid rows count down from the top in CSS, while y counts up from the floor.
  function rowOf(y, h) { return (H - y - h + 1) + ' / span ' + h; }

  // (Re)build the empty squares for the current W x H.
  function build() {
    slots.forEach(function (col) { col.forEach(function (s) { s.remove(); }); });
    slots = [];
    cargo.style.gridTemplateColumns = 'repeat(' + W + ', minmax(0, 1fr))';
    cargo.setAttribute('aria-label', 'Moving truck, side view, ' + W + ' squares long and ' +
      H + ' high. Doors on the left.');
    for (var x = 0; x < W; x++) {
      slots.push([]);
      for (var y = 0; y < H; y++) {
        var s = document.createElement('span');
        s.className = 'slot';
        s.style.gridColumn = (x + 1);
        s.style.gridRow = rowOf(y, 1);
        cargo.appendChild(s);
        slots[x].push(s);
      }
    }
  }
  build();
  Object.keys(KINDS).forEach(function (k) {
    var s = document.createElement('span');
    s.innerHTML = '<i style="background:' + KINDS[k].color + '"></i>' + KINDS[k].name;
    legendEl.appendChild(s);
  });

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function emptyGrid() {
    var g = [];
    for (var x = 0; x < W; x++) g.push(new Array(H).fill(-1));
    return g;
  }

  // Which items hold item i up (the squares directly under its bottom edge).
  function under(g, i, pos) {
    var out = [];
    if (pos.y === 0) return out;
    for (var dx = 0; dx < ITEMS[i].w; dx++) {
      var j = g[pos.x + dx][pos.y - 1];
      if (out.indexOf(j) < 0) out.push(j);
    }
    return out;
  }

  function fits(g, i, x, y) {
    var it = ITEMS[i];
    if (it.kind === 'heavy' && y > 0) return false;              // heavy rides on the floor
    for (var dx = 0; dx < it.w; dx++) {
      for (var dy = 0; dy < it.h; dy++) {
        if (g[x + dx][y + dy] >= 0) return false;                // one thing per square
      }
      if (y > 0) {
        var below = g[x + dx][y - 1];
        if (below < 0) return false;                             // nothing floats
        if (ITEMS[below].kind === 'fragile') return false;       // nothing on fragile
      }
    }
    return true;
  }

  function put(g, i, x, y, v) {
    for (var dx = 0; dx < ITEMS[i].w; dx++)
      for (var dy = 0; dy < ITEMS[i].h; dy++) g[x + dx][y + dy] = v;
  }

  // Plan a packing up front with a small backtracking search, then replay it,
  // so every item the animation drops in already satisfies all the rules.
  // Items are placed bottom-up, which is how "nothing floats" can be checked
  // the moment each one lands. Leaving an item behind is the last option tried
  // for each one, so a full packing is found whenever the search can find one;
  // otherwise the search keeps the packing that fits the most items.
  function plan() {
    var n = ITEMS.length, best = [];
    for (var attempt = 0; attempt < 20 && best.length < n; attempt++) {
      var order = ITEMS.map(function (_, i) { return i; });
      var heavy = shuffle(order.filter(function (i) { return ITEMS[i].kind === 'heavy'; }));
      var rest = order.filter(function (i) { return ITEMS[i].kind !== 'heavy'; })
        .map(function (i) { return { i: i, k: ITEMS[i].w * ITEMS[i].h + Math.random() * 1.5 }; })
        .sort(function (a, b) { return b.k - a.k; })
        .map(function (o) { return o.i; });
      order = heavy.concat(rest);

      var g = emptyGrid(), steps = [], budget = 4000;
      (function dfs(k) {
        if (steps.length > best.length) best = steps.slice();
        if (best.length === n) return true;
        if (k === n || --budget < 0) return false;
        if (steps.length + (n - k) <= best.length) return false; // can't beat the best
        var i = order[k], spots = [];
        for (var x = 0; x <= W - ITEMS[i].w; x++)
          for (var y = 0; y <= H - ITEMS[i].h; y++)
            if (fits(g, i, x, y)) spots.push({ x: x, y: y, r: y + Math.random() * 2.5 });
        spots.sort(function (a, b) { return a.r - b.r; }); // lean toward the floor
        for (var s = 0; s < spots.length; s++) {
          put(g, i, spots[s].x, spots[s].y, i);
          steps.push([i, spots[s].x, spots[s].y]);
          if (dfs(k + 1)) return true;
          steps.pop();
          put(g, i, spots[s].x, spots[s].y, -1);
        }
        return dfs(k + 1); // leave item i on the curb
      })(0);
    }
    return best;
  }

  function doneText(steps) {
    var left = ITEMS.length - steps.length;
    return left ? 'packed · ' + left + ' left on the curb' : 'packed';
  }

  function hot(k) {
    lines.forEach(function (l, j) { l.classList.toggle('hot', j === k); });
  }

  function ruleFor(i, y) {
    if (ITEMS[i].kind === 'heavy') return RULE.heavy;
    if (ITEMS[i].kind === 'fragile') return RULE.fragile;
    return y > 0 ? RULE.floats : RULE.overlap;
  }

  function grid() {
    var g = emptyGrid();
    placed.forEach(function (p, i) { if (p) put(g, i, p.x, p.y, i); });
    return g;
  }

  function stats() {
    var n = placed.filter(Boolean).length, broken = 0, g = grid();
    // count anything resting on a fragile item (always 0 for a valid packing)
    placed.forEach(function (p, i) {
      if (p && under(g, i, p).some(function (j) { return j >= 0 && ITEMS[j].kind === 'fragile'; })) broken++;
    });
    packedEl.textContent = n;
    brokenEl.textContent = broken;
  }

  function addItem(i, x, y, animate) {
    var it = ITEMS[i], b = document.createElement('button');
    b.type = 'button';
    b.className = 'item' + (it.w === 1 && it.h > 1 ? ' tall' : '') + (animate ? ' drop' : '');
    b.style.gridColumn = (x + 1) + ' / span ' + it.w;
    b.style.gridRow = rowOf(y, it.h);
    b.style.backgroundColor = KINDS[it.kind].color;
    b.innerHTML = '<span>' + it.name + '</span>';
    b.setAttribute('aria-label', it.name + ' (' + KINDS[it.kind].name.toLowerCase() + '), ' +
      (y === 0 ? 'on the floor' : 'stacked ' + y + ' up') + ', ' + (x + 1) + ' from the doors');
    b.dataset.i = i;
    b.addEventListener('click', onItemClick);
    cargo.appendChild(b);
    els[i] = b;
    placed[i] = { x: x, y: y };
    if (animate) { void b.offsetWidth; b.classList.remove('drop'); } // reflow, then let it drop in
  }

  function unflash() {
    if (flashTimer) { clearTimeout(flashTimer); flashTimer = null; }
    cargo.querySelectorAll('.flash').forEach(function (el) { el.classList.remove('flash'); });
  }

  function stop() { if (timer) { clearInterval(timer); timer = null; } unflash(); hot(-1); }

  function unload() {
    stop();
    els.forEach(function (el) { if (el) el.remove(); });
    els = []; placed = [];
    stats();
  }

  function solve() {
    unload();
    var steps = plan();
    if (!steps.length) { statusEl.textContent = 'nothing fits'; return; }
    if (reduce) {
      steps.forEach(function (s) { addItem(s[0], s[1], s[2], false); });
      stats();
      statusEl.textContent = doneText(steps);
      return;
    }
    statusEl.textContent = 'packing…';
    var k = 0;
    timer = setInterval(function () {
      if (k >= steps.length) {
        stop();
        stats();
        statusEl.textContent = doneText(steps);
        return;
      }
      var s = steps[k++];
      addItem(s[0], s[1], s[2], true);
      hot(ruleFor(s[0], s[2]));
      stats();
    }, 190);
  }

  function clear() {
    unload();
    statusEl.textContent = 'ready';
  }

  // Clicking an item shows the rule that shaped where it went.
  function onItemClick(e) {
    if (timer) return;
    unflash();
    var i = Number(e.currentTarget.dataset.i), it = ITEMS[i], p = placed[i], g = grid(), msg;
    if (it.kind === 'fragile') {
      var top = p.y + it.h;
      for (var dx = 0; dx < it.w; dx++) if (top < H) slots[p.x + dx][top].classList.add('flash');
      hot(RULE.fragile);
      msg = top < H ? it.name + ': nothing on top' : it.name + ': up against the roof';
    } else if (it.kind === 'heavy') {
      for (var fx = 0; fx < it.w; fx++) slots[p.x + fx][0].classList.add('flash');
      hot(RULE.heavy);
      msg = it.name + ' rides on the floor';
    } else if (p.y > 0) {
      var held = under(g, i, p);
      held.forEach(function (j) { els[j].classList.add('flash'); });
      hot(RULE.floats);
      msg = it.name + ' rests on ' + held.map(function (j) { return ITEMS[j].name.toLowerCase(); })
        .filter(function (n, k, a) { return a.indexOf(n) === k; }).join(' + ');
    } else {
      hot(RULE.overlap);
      msg = it.name + ' has its own spot on the floor';
    }
    e.currentTarget.classList.add('flash');
    statusEl.textContent = msg;
    flashTimer = setTimeout(function () {
      unflash();
      hot(-1);
      if (!timer) statusEl.textContent = doneText(placed.filter(Boolean));
    }, 1600);
  }

  solveBtn.addEventListener('click', solve);
  clearBtn.addEventListener('click', clear);

  // Resizing the truck rebuilds the grid and packs it again.
  function resize() {
    W = Number(lenIn.value); H = Number(hgtIn.value);
    lenOut.textContent = W; hgtOut.textContent = H;
    unload();
    build();
    solve();
  }
  if (lenIn && hgtIn) {
    lenIn.value = W; hgtIn.value = H;
    lenIn.addEventListener('input', resize);
    hgtIn.addEventListener('input', resize);
  }

  // Start packing when the truck scrolls into view (right away on most screens).
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); solve(); }
    }, { threshold: 0.3 });
    io.observe(cargo);
  } else {
    solve();
  }
})();
