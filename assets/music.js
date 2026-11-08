(() => {
  "use strict";
  const audio = document.querySelector("#wedding-music");
  const button = document.querySelector(".music-toggle");
  const label = button?.querySelector(".music-toggle__label");
  const status = document.querySelector("[data-music-status]");
  if (!audio || !button || !label) return;
  const tracks = [
    {
      id: "young-and-beautiful",
      title: "Young And Beautiful",
      src: "assets/audio/young-and-beautiful.mp3",
    },
    {
      id: "mai-mai-ben-nhau",
      title: "Mãi Mãi Bên Nhau — Noo Phước Thịnh",
      src: "assets/audio/mai-mai-ben-nhau.mp3",
    },
  ];
  let selectedTrack = null;
  let wanted = false;
  let attempt = 0;
  audio.volume = 0.35;
  button.hidden = false;

  function selectTrack() {
    if (selectedTrack) return;
    // One 50/50 draw per invitation. Pause/resume and retries keep that song.
    selectedTrack = tracks[Math.random() < 0.5 ? 0 : 1];
    audio.src = selectedTrack.src;
    audio.dataset.track = selectedTrack.id;
    button.title = `Nhạc nền: ${selectedTrack.title}`;
  }

  function render(state, message = "") {
    button.dataset.musicState = state;
    const playing = state === "playing";
    button.setAttribute("aria-pressed", String(playing));
    label.textContent =
      state === "loading" ? "Đang tải nhạc" : playing ? "Tắt nhạc" : "Bật nhạc";
    button.setAttribute(
      "aria-label",
      state === "loading"
        ? `Dừng tải nhạc nền ${selectedTrack?.title || ""}`.trim()
        : `${playing ? "Tắt" : "Bật"} nhạc nền${selectedTrack ? " " + selectedTrack.title : ""}`,
    );
    if (status) status.textContent = message;
  }
  function pause() {
    wanted = false;
    attempt++;
    audio.pause();
    render("paused");
  }
  async function play() {
    selectTrack();
    wanted = true;
    const current = ++attempt;
    render("loading");
    try {
      if (audio.error) audio.load();
      await audio.play();
      if (current !== attempt || !wanted) {
        if (!wanted) audio.pause();
        return;
      }
      render("playing");
    } catch (error) {
      if (current !== attempt) return;
      wanted = false;
      render(
        "paused",
        error.name === "NotAllowedError"
          ? `Chạm vào nút nhạc để phát ${selectedTrack.title}.`
          : "Nhạc chưa phát được. Bạn có thể chạm nút nhạc để thử lại.",
      );
    }
  }
  button.addEventListener("click", () => (wanted ? pause() : void play()));
  document
    .querySelector("[data-open-invitation]")
    ?.addEventListener("click", () => void play(), { once: true });
  audio.addEventListener("playing", () => {
    if (wanted) render("playing");
    else audio.pause();
  });
  audio.addEventListener("pause", () => {
    if (!wanted) render("paused");
  });
  audio.addEventListener("error", () => {
    wanted = false;
    render("paused", "Nhạc chưa tải được. Chạm nút nhạc để thử lại.");
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });
  window.addEventListener("pagehide", pause);
  render("paused");
})();
