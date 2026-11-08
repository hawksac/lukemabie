// Hero toy: a tiny stand-in for clingo. It fills an 8×5 bed so that no two
// squares sharing an edge hold the same crop, which is exactly what the
// three rules shown beside it say. The real Garden Planner runs actual clingo.
(function () {
  var W = 8, H = 5, N = W * H;
  var CROPS = [
    { key: 'T', name: 'Tomato', color: '#b83a32' },
    { key: 'B', name: 'Basil', color: '#2f7d58' },
    { key: 'C', name: 'Corn', color: '#8f6b14' },
    { key: 'P', name: 'Peas', color: '#557a24' },
    { key: 'S', name: 'Squash', color: '#23767a' }
  ];

  var bed = document.getElementById('bed');
  if (!bed) return;
  var placedEl = document.getElementById('placed');
  var conflictsEl = document.getElementById('conflicts');
  var statusEl = document.getElementById('status');
  var legendEl = document.getElementById('legend');
  var lines = document.querySelectorAll('#rules .ln');
  var solveBtn = document.getElementById('solve');
  var clearBtn = document.getElementById('clear');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var grid = new Array(N).fill(-1);
  var cells = [];
  var timer = null;

  // build the bed
  for (var i = 0; i < N; i++) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cell';
    b.dataset.i = i;
    b.addEventListener('click', onCellClick);
    bed.appendChild(b);
    cells.push(b);
  }
  CROPS.forEach(function (c) {
    var s = document.createElement('span');
    s.innerHTML = '<i style="background:' + c.color + '"></i>' + c.name;
    legendEl.appendChild(s);
  });

  function neighbors(i) {
    var x = i % W, y = Math.floor(i / W), n = [];
    if (x > 0) n.push(i - 1);
    if (x < W - 1) n.push(i + 1);
    if (y > 0) n.push(i - W);
    if (y < H - 1) n.push(i + W);
    return n;
  }

  function label(i) {
    var x = i % W + 1, y = Math.floor(i / W) + 1, c = grid[i];
    return 'Square ' + x + ',' + y + ': ' + (c < 0 ? 'empty' : CROPS[c].name);
  }

  function paint(i, pop) {
    var c = grid[i], el = cells[i];
    el.style.backgroundColor = c < 0 ? '' : CROPS[c].color;
    el.textContent = c < 0 ? '' : CROPS[c].key;
    el.setAttribute('aria-label', label(i));
    if (pop && !reduce) {
      el.classList.add('pop');
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.remove('pop'); }); });
    }
  }

  function stats() {
    var placed = 0, conflicts = 0;
    for (var i = 0; i < N; i++) {
      if (grid[i] < 0) continue;
      placed++;
      neighbors(i).forEach(function (n) { if (n > i && grid[n] === grid[i]) conflicts++; });
    }
    placedEl.textContent = placed;
    conflictsEl.textContent = conflicts;
    return { placed: placed, conflicts: conflicts };
  }

  function hot(k) {
    lines.forEach(function (l, j) { l.classList.toggle('hot', j === k); });
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Plan a full solution up front, then replay it so the animation is honest:
  // every square it places already satisfies the constraints.
  function plan() {
    var g = new Array(N).fill(-1), steps = [];
    shuffle(Array.from({ length: N }, function (_, i) { return i; })).forEach(function (i) {
      var taken = neighbors(i).map(function (n) { return g[n]; });
      var free = CROPS.map(function (_, c) { return c; }).filter(function (c) { return taken.indexOf(c) < 0; });
      var c = free[Math.floor(Math.random() * free.length)];
      g[i] = c;
      steps.push([i, c]);
    });
    return steps;
  }

  function stop() { if (timer) { clearInterval(timer); timer = null; } hot(-1); }

  function solve() {
    stop();
    grid.fill(-1);
    for (var i = 0; i < N; i++) paint(i, false);
    var steps = plan();
    if (reduce) {
      steps.forEach(function (s) { grid[s[0]] = s[1]; paint(s[0], false); });
      stats();
      statusEl.textContent = 'optimal';
      return;
    }
    statusEl.textContent = 'solving…';
    var k = 0;
    timer = setInterval(function () {
      if (k >= steps.length) {
        stop();
        stats();
        statusEl.textContent = 'optimal';
        return;
      }
      var s = steps[k++];
      grid[s[0]] = s[1];
      paint(s[0], true);
      hot(k % 3 === 0 ? 0 : (k % 3 === 1 ? 1 : 2));
      stats();
    }, 55);
  }

  function clear() {
    stop();
    grid.fill(-1);
    for (var i = 0; i < N; i++) paint(i, false);
    stats();
    statusEl.textContent = 'ready';
  }

  // Clicking a planted square shows which neighbors it must differ from.
  function onCellClick(e) {
    var i = Number(e.currentTarget.dataset.i);
    if (grid[i] < 0 || timer) return;
    var ns = neighbors(i);
    ns.forEach(function (n) { cells[n].classList.add('flash'); });
    hot(i % W < W - 1 ? 1 : 2);
    statusEl.textContent = CROPS[grid[i]].name + ' differs from ' + ns.length + ' neighbors';
    setTimeout(function () {
      ns.forEach(function (n) { cells[n].classList.remove('flash'); });
      hot(-1);
      if (!timer) statusEl.textContent = 'optimal';
    }, 1200);
  }

  solveBtn.addEventListener('click', solve);
  clearBtn.addEventListener('click', clear);

  // Start solving when the bed scrolls into view (right away on most screens).
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); solve(); }
    }, { threshold: 0.3 });
    io.observe(bed);
  } else {
    solve();
  }
})();
