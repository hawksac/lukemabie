// Tiny binary clock for the nav. Fills every <a class="mini-clock"> with six
// columns (HH MM SS, one per digit), rows worth 8/4/2/1 from the top.
// The full version lives at projects/binary-clock/.
(() => {
  const links = document.querySelectorAll('.mini-clock');
  if (!links.length) return;

  const BITS = [2, 4, 3, 4, 3, 4]; // spots each digit can ever need
  const UNIT = ['h', 'h', 'm', 'm', 's', 's'];
  const faces = [...links].map(link => {
    const cols = [];
    const grid = document.createElement('span');
    grid.className = 'mini-clock-grid';
    grid.setAttribute('aria-hidden', 'true');
    BITS.forEach((n, i) => {
      const col = document.createElement('span');
      col.className = 'mc-col mc-' + UNIT[i];
      cols[i] = [];
      for (let b = 3; b >= 0; b--) {
        const d = document.createElement('span');
        d.className = 'mc-dot' + (b >= n ? ' mc-none' : '');
        col.append(d);
        cols[i][b] = d;
      }
      grid.append(col);
    });
    link.append(grid);
    return cols;
  });

  const pad = n => String(n).padStart(2, '0');
  let timer;
  function tick() {
    clearTimeout(timer);
    const now = new Date();
    const digits = [...(pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()))].map(Number);
    for (const cols of faces) {
      digits.forEach((v, i) => {
        for (let b = 0; b < 4; b++) cols[i][b].classList.toggle('on', (v >> b & 1) === 1);
      });
    }
    timer = setTimeout(tick, 1000 - now.getMilliseconds() + 5);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  tick();
})();
