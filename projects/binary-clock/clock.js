// Binary Clock. Two layouts:
//   bcd  - six columns, one per digit of HH:MM:SS, rows worth 8/4/2/1
//   pure - three rows (hours, minutes, seconds), each a plain base-two number
(() => {
  const clock = document.getElementById('clock');
  const readout = document.getElementById('readout');
  const hints = document.getElementById('hints');
  const face = clock.closest('.face');

  const store = {
    get(k, d) { try { return localStorage.getItem('binclock.' + k) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('binclock.' + k, v); } catch { /* private mode */ } },
  };
  let mode = store.get('mode', 'bcd');
  let hours24 = store.get('h', '24') === '24';
  hints.checked = store.get('hints', '1') === '1';

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // How many bits each BCD digit can ever need (from the top of 8/4/2/1).
  // 24h: tens-of-hours max 2 -> 2 bits. 12h: max 1 -> 1 bit. Ones-of-hours always 4.
  const bcdBits = () => [hours24 ? 2 : 1, 4, 3, 4, 3, 4];
  const UNIT = ['h', 'h', 'm', 'm', 's', 's'];

  let dots = []; // dots[i][bit] for the current layout
  let labels = [];

  function build() {
    clock.replaceChildren();
    clock.className = 'clock ' + mode;
    dots = []; labels = [];

    if (mode === 'bcd') {
      const weights = el('div', 'weights');
      for (const w of [8, 4, 2, 1]) weights.append(el('span', '', w));
      weights.append(el('span', 'label', ''));
      clock.append(weights);

      const bits = bcdBits();
      for (let g = 0; g < 3; g++) {
        const group = el('div', 'group ' + UNIT[g * 2]);
        for (let c = 0; c < 2; c++) {
          const i = g * 2 + c;
          const col = el('div', 'col');
          dots[i] = [];
          for (let b = 3; b >= 0; b--) {
            const d = el('span', 'dot' + (b >= bits[i] ? ' none' : ''));
            col.append(d);
            dots[i][b] = d;
          }
          labels[i] = el('span', 'label');
          col.append(labels[i]);
          group.append(col);
        }
        clock.append(group);
      }
    } else {
      const width = [hours24 ? 5 : 4, 6, 6];
      const head = el('div', 'bit-weights');
      head.append(el('span'));
      const hb = el('div', 'bits');
      for (let b = 5; b >= 0; b--) hb.append(el('span', '', 2 ** b));
      head.append(hb, el('span'));
      clock.append(head);

      ['hours', 'minutes', 'seconds'].forEach((name, i) => {
        const row = el('div', 'row ' + 'hms'[i]);
        row.append(el('span', 'unit', name));
        const bitsEl = el('div', 'bits');
        dots[i] = [];
        for (let b = 5; b >= 0; b--) {
          const d = el('span', 'dot' + (b >= width[i] ? ' none' : ''));
          bitsEl.append(d);
          dots[i][b] = d;
        }
        labels[i] = el('span', 'label');
        row.append(bitsEl, labels[i]);
        clock.append(row);
      });
    }
    sync();
    tick();
  }

  const pad = n => String(n).padStart(2, '0');

  function render(now) {
    let h = now.getHours();
    const m = now.getMinutes(), s = now.getSeconds();
    let suffix = '';
    if (!hours24) { suffix = h < 12 ? ' am' : ' pm'; h = h % 12 || 12; }

    readout.textContent = `${pad(h)}:${pad(m)}:${pad(s)}${suffix}`;
    readout.dateTime = `${pad(now.getHours())}:${pad(m)}:${pad(s)}`;

    if (mode === 'bcd') {
      const digits = [...(pad(h) + pad(m) + pad(s))].map(Number);
      digits.forEach((v, i) => {
        for (let b = 0; b < 4; b++) dots[i][b].classList.toggle('on', (v >> b & 1) === 1);
        labels[i].replaceChildren(el('b', '', v));
      });
    } else {
      [h, m, s].forEach((v, i) => {
        for (let b = 0; b < 6; b++) dots[i][b].classList.toggle('on', (v >> b & 1) === 1);
        const parts = [];
        for (let b = 5; b >= 0; b--) if (v >> b & 1) parts.push(2 ** b);
        const math = el('span', 'math', (parts.length > 1 ? parts.join('+') : '') + (parts.length > 1 ? ' = ' : ''));
        labels[i].replaceChildren(math, el('b', '', v));
      });
    }
  }

  // Line ticks up with the start of each real second so the lights don't drift.
  let timer;
  function tick() {
    clearTimeout(timer);
    const now = new Date();
    render(now);
    timer = setTimeout(tick, 1000 - now.getMilliseconds() + 5);
  }

  function sync() {
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
    document.querySelectorAll('[data-h]').forEach(b => b.setAttribute('aria-pressed', (b.dataset.h === '24') === hours24));
    face.classList.toggle('no-hints', !hints.checked);
  }

  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode; store.set('mode', mode); build();
  }));
  document.querySelectorAll('[data-h]').forEach(b => b.addEventListener('click', () => {
    hours24 = b.dataset.h === '24'; store.set('h', b.dataset.h); build();
  }));
  hints.addEventListener('change', () => { store.set('hints', hints.checked ? '1' : '0'); sync(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

  build();
})();
