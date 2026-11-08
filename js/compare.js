// Before/after wipe between raw OCR and the cleaned transcription.
(function () {
  var range = document.getElementById('compare-range');
  var raw = document.getElementById('compare-raw');
  var bar = document.getElementById('compare-bar');
  var box = document.getElementById('compare');
  if (!range || !raw || !bar || !box) return;

  function set(p) {
    p = Math.max(0, Math.min(100, p));
    raw.style.clipPath = 'inset(0 ' + (100 - p) + '% 0 0)';
    bar.style.left = p + '%';
    range.value = p;
  }
  range.addEventListener('input', function () { set(Number(range.value)); });

  // Drag directly on the scan too.
  var dragging = false;
  function fromEvent(e) {
    var r = box.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  }
  box.addEventListener('pointerdown', function (e) { dragging = true; box.setPointerCapture(e.pointerId); fromEvent(e); });
  box.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
  box.addEventListener('pointerup', function () { dragging = false; });
  box.style.cursor = 'ew-resize';
  box.style.touchAction = 'pan-y';

  set(Number(range.value));
})();
