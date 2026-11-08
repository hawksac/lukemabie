// B-sides: click-to-play YouTube embeds and the lazer button.

// Each .yt shows a thumbnail button; the player only loads (from
// youtube-nocookie.com) when someone clicks, so the page stays fast.
document.querySelectorAll(".yt[data-id]").forEach(box => {
  const id = box.dataset.id;
  const title = box.dataset.title || "video";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "yt-play";
  btn.setAttribute("aria-label", "Play " + title);
  btn.innerHTML = `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy"><span class="yt-icon" aria-hidden="true"></span>`;
  btn.addEventListener("click", () => {
    const frame = document.createElement("iframe");
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    frame.title = title;
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    box.replaceChildren(frame);
  });
  box.appendChild(btn);
});

// The Lazer Squad, on demand.
const fire = document.getElementById("fire");
if (fire) {
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  const colors = ["#ff2d55", "#39ff14", "#00e5ff", "#ff00ff", "#ffea00"];
  fire.addEventListener("click", () => {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const beam = document.createElement("div");
      beam.className = "lazer" + (calm.matches ? " still" : "");
      beam.setAttribute("aria-hidden", "true");
      beam.style.top = Math.round(Math.random() * 100) + "vh";
      beam.style.setProperty("--angle", Math.round(Math.random() * 60 - 30) + "deg");
      beam.style.setProperty("--color", colors[i % colors.length]);
      beam.style.setProperty("--dir", Math.random() < 0.5 ? 1 : -1);
      beam.style.animationDelay = (i * 45) + "ms";
      document.body.appendChild(beam);
      beam.addEventListener("animationend", () => beam.remove());
    }
    fire.textContent = ["Pew pew", "Again!", "Lazer squad assembled", "Fire the lazers"][Math.floor(Math.random() * 4)];
  });
}
