async function mountDemo() {
  const container = document.getElementById("demo-player");
  if (!container) return;

  try {
    const response = await fetch("https://asciinema.org/a/rUMjTcI719Be9326.cast");
    if (!response.ok) throw new Error("Recording could not be loaded");
    const [headerLine, ...eventLines] = (await response.text()).trim().split("\n");
    const header = JSON.parse(headerLine);
    // v3 timestamps are deltas. End before typing /exit begins at 56.013s.
    const endAt = 55.5;
    let elapsed = 0;
    const trimmed = [headerLine];
    for (const line of eventLines) {
      const event = JSON.parse(line);
      if (elapsed + event[0] >= endAt) break;
      elapsed += event[0];
      trimmed.push(line);
    }
    // Keep the finished response on screen briefly before restarting.
    trimmed.push(JSON.stringify([Number((endAt - elapsed).toFixed(3)), "o", ""]));
    const url = URL.createObjectURL(new Blob([trimmed.join("\n") + "\n"], { type: "text/plain" }));
    const player = AsciinemaPlayer.create(url, container, {
      autoplay: true,
      preload: true,
      loop: true,
      speed: 2,
      controls: false,
      fit: "both",
      cols: header.term.cols,
      rows: header.term.rows,
    });
    player.addEventListener("playing", () => URL.revokeObjectURL(url));
  } catch (error) {
    console.error("Could not load jig demo:", error);
    const link = document.createElement("a");
    link.href = "https://asciinema.org/a/rUMjTcI719Be9326";
    link.textContent = "Watch jig in action ↗";
    container.removeAttribute("aria-hidden");
    container.removeAttribute("inert");
    container.replaceChildren(link);
  }
}

mountDemo();

document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;

    try {
      await navigator.clipboard.writeText(target.textContent);
      const label = button.querySelector(".copy-label");
      if (!label) return;
      label.textContent = "Copied";
      button.querySelector(".copy-icon").textContent = "✓";
      button.classList.add("is-copied");
      window.setTimeout(() => {
        label.textContent = "Copy";
        button.querySelector(".copy-icon").textContent = "⧉";
        button.classList.remove("is-copied");
      }, 1600);
    } catch {
      button.querySelector(".copy-label").textContent = "Select to copy";
    }
  });
});
