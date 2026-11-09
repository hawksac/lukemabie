// B-sides tape deck. Every .tape on the page is an album; its track buttons
// carry data-src. One shared <audio> plays them, and a deck slides up from the
// bottom of the screen with the controls. Playback runs through the album and
// stops at the end. Streaming only: there are no download links, though like
// any web audio a determined listener can still save the files.
(() => {
  const tapes = [...document.querySelectorAll(".tape")];
  if (!tapes.length) return;

  const audio = new Audio();
  audio.preload = "none";

  const deck = document.createElement("div");
  deck.className = "deck";
  deck.hidden = true;
  deck.setAttribute("role", "region");
  deck.setAttribute("aria-label", "Tape deck");
  deck.innerHTML = `
    <span class="deck-reels" aria-hidden="true"><span></span><span></span></span>
    <div class="deck-info">
      <b class="deck-title" aria-live="polite"></b>
      <span class="deck-sub"></span>
      <div class="deck-bar">
        <span class="deck-time">0:00</span>
        <input type="range" class="deck-seek" min="0" max="0" step="1" value="0" aria-label="Seek">
        <span class="deck-dur">0:00</span>
      </div>
    </div>
    <div class="deck-btns">
      <button type="button" class="deck-prev" aria-label="Previous song">${icon("prev")}</button>
      <button type="button" class="deck-toggle" aria-label="Pause">${icon("pause")}</button>
      <button type="button" class="deck-next" aria-label="Next song">${icon("next")}</button>
      <button type="button" class="deck-close" aria-label="Stop and close the deck">${icon("close")}</button>
    </div>`;
  document.body.append(deck);
  deck.addEventListener("contextmenu", e => e.preventDefault());

  const $ = sel => deck.querySelector(sel);
  const title = $(".deck-title"), sub = $(".deck-sub"), seek = $(".deck-seek");
  const time = $(".deck-time"), dur = $(".deck-dur"), toggle = $(".deck-toggle");

  let tape = null;   // current .tape element
  let tracks = [];   // its track buttons
  let index = -1;
  let seeking = false;

  function icon(name) {
    const paths = {
      play: "M8 5v14l11-7z",
      pause: "M7 5h4v14H7zM13 5h4v14h-4z",
      prev: "M7 6h2v12H7zM10 12l9 6V6z",
      next: "M15 6h2v12h-2zM5 6v12l9-6z",
      close: "M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z",
    };
    return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="${paths[name]}"/></svg>`;
  }
  const fmt = s => {
    s = Math.max(0, Math.floor(s || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const trackTitle = btn => btn.querySelector(".tt").textContent;

  function load(t, i, autoplay = true) {
    tracks[index]?.removeAttribute("aria-current");
    if (tape !== t) {
      tape?.classList.remove("is-current", "is-playing");
      tape = t;
      tracks = [...t.querySelectorAll(".tape-tracks button")];
      t.classList.add("is-current");
      // the deck takes the color of the section the tape lives in
      const tone = t.closest('[class*="tone-"]')?.className.match(/tone-\w+/)?.[0];
      deck.className = "deck" + (tone ? " " + tone : "") + (audio.paused ? "" : " is-playing");
    }
    index = i;
    const btn = tracks[i];
    btn.setAttribute("aria-current", "true");

    audio.src = btn.dataset.src;
    title.textContent = trackTitle(btn);
    sub.textContent = `${t.dataset.artist} · ${t.dataset.album}`;
    seek.value = 0; seek.max = 0; time.textContent = "0:00";
    dur.textContent = btn.querySelector(".td").textContent;

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: trackTitle(btn), artist: t.dataset.artist, album: t.dataset.album,
      });
    }
    showDeck();
    if (autoplay) play();
  }

  function play() {
    audio.play().catch(() => { /* blocked or failed; the error handler covers real failures */ });
  }
  function next() { if (index < tracks.length - 1) load(tape, index + 1); }
  function prev() {
    if (audio.currentTime > 3 || index === 0) { audio.currentTime = 0; return; }
    load(tape, index - 1);
  }
  function showDeck() {
    if (!deck.hidden) return;
    deck.hidden = false;
    document.body.classList.add("has-deck");
  }
  function closeDeck() {
    audio.pause();
    audio.removeAttribute("src"); audio.load();
    tracks[index]?.removeAttribute("aria-current");
    tape?.classList.remove("is-current", "is-playing");
    tape = null; tracks = []; index = -1;
    deck.hidden = true;
    document.body.classList.remove("has-deck");
    syncPlaying();
  }

  function syncPlaying() {
    const playing = !audio.paused;
    deck.classList.toggle("is-playing", playing);
    tape?.classList.toggle("is-playing", playing);
    toggle.innerHTML = icon(playing ? "pause" : "play");
    toggle.setAttribute("aria-label", playing ? "Pause" : "Play");
    for (const t of tapes) {
      const b = t.querySelector(".tape-play");
      const on = t === tape && playing;
      b.textContent = on ? "Pause" : "Play";
      b.setAttribute("aria-label", `${on ? "Pause" : "Play"} ${t.dataset.album}`);
    }
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }

  // wire the tapes
  for (const t of tapes) {
    t.querySelectorAll(".tape-tracks button").forEach((btn, i) => {
      btn.addEventListener("click", () => {
        if (tape === t && index === i) { audio.paused ? play() : audio.pause(); }
        else load(t, i);
      });
    });
    t.querySelector(".tape-play").addEventListener("click", () => {
      if (tape === t) { audio.paused ? play() : audio.pause(); }
      else load(t, 0);
    });
  }

  // deck controls
  toggle.addEventListener("click", () => (audio.paused ? play() : audio.pause()));
  $(".deck-next").addEventListener("click", next);
  $(".deck-prev").addEventListener("click", prev);
  $(".deck-close").addEventListener("click", closeDeck);
  seek.addEventListener("input", () => { seeking = true; time.textContent = fmt(seek.value); });
  seek.addEventListener("change", () => { audio.currentTime = Number(seek.value); seeking = false; });

  // audio events
  audio.addEventListener("play", syncPlaying);
  audio.addEventListener("pause", syncPlaying);
  audio.addEventListener("loadedmetadata", () => {
    seek.max = Math.floor(audio.duration);
    dur.textContent = fmt(audio.duration);
  });
  audio.addEventListener("timeupdate", () => {
    if (seeking) return;
    seek.value = Math.floor(audio.currentTime);
    time.textContent = fmt(audio.currentTime);
    if ("mediaSession" in navigator && audio.duration && navigator.mediaSession.setPositionState) {
      try {
        navigator.mediaSession.setPositionState({ duration: audio.duration, position: audio.currentTime, playbackRate: 1 });
      } catch { /* some browsers reject mid-load */ }
    }
  });
  audio.addEventListener("ended", () => {
    if (index < tracks.length - 1) next();
    else { audio.currentTime = 0; syncPlaying(); }
  });
  audio.addEventListener("error", () => {
    if (!audio.getAttribute("src")) return;
    sub.textContent = "Couldn't load this song. Try another one.";
    syncPlaying();
  });

  // lock screen / headphone buttons
  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession;
    const set = (a, fn) => { try { ms.setActionHandler(a, fn); } catch { /* unsupported action */ } };
    set("play", play);
    set("pause", () => audio.pause());
    set("previoustrack", prev);
    set("nexttrack", next);
    set("seekto", d => { audio.currentTime = d.seekTime; });
  }
})();
