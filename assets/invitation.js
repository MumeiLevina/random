(() => {
  "use strict";
  const body = document.body;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const gate = document.querySelector(".invitation-gate");
  const main = document.querySelector("main");
  const footer = document.querySelector("footer");
  const openButton = gate?.querySelector("[data-open-invitation]");
  let state = "closed";
  let heroTimer;
  let releaseTimer;
  let revealObserver;
  let previousScrollRestoration;
  let deferredHash = "";

  function restoreNavigationDefaults() {
    if (previousScrollRestoration !== undefined)
      history.scrollRestoration = previousScrollRestoration;
    // replaceState restores the shared URL without navigating to its fragment.
    // A link chosen by the guest after opening takes precedence.
    if (deferredHash && !location.hash)
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search + deferredHash,
      );
    deferredHash = "";
  }
  function prepareOpeningViewport() {
    previousScrollRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    deferredHash = location.hash;
    if (deferredHash)
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search,
      );
    document.documentElement.classList.add("invitation-locked");
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  function revealAll() {
    document
      .querySelectorAll(".reveal")
      .forEach((element) => element.classList.add("is-visible"));
  }
  function finishOpening() {
    if (state === "open") return;
    state = "open";
    clearTimeout(heroTimer);
    clearTimeout(releaseTimer);
    body.dataset.invitationState = state;
    body.classList.remove("gate-active");
    body.classList.add("invitation-open", "hero-entered");
    main.inert = false;
    if (footer) footer.inert = false;
    gate?.remove();
    if (revealObserver)
      document
        .querySelectorAll(".reveal")
        .forEach((element) => revealObserver.observe(element));
    else revealAll();
    document.querySelector("#hero-title")?.focus({ preventScroll: true });
    // Cancel restored positions and pending smooth anchor scrolling before the
    // envelope disappears. This runs once; guest scrolling is never intercepted.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.classList.remove("invitation-locked");
    if (document.readyState === "complete") restoreNavigationDefaults();
    else
      window.addEventListener(
        "load",
        () => requestAnimationFrame(restoreNavigationDefaults),
        { once: true },
      );
    if (!motion.matches && body.dataset.particles === "true") celebrate();
  }
  function openInvitation() {
    if (state !== "closed") return;
    state = "opening";
    body.dataset.invitationState = state;
    // Install release before CSS starts: canceled/unsupported animations cannot trap the page.
    releaseTimer = setTimeout(finishOpening, motion.matches ? 0 : 3000);
    if (motion.matches) return finishOpening();
    openButton.disabled = true;
    openButton.querySelector("span").textContent = "Đang mở thiệp…";
    gate.querySelector("[data-gate-status]").textContent =
      "Đang mở thiệp cưới. Xin chờ trong giây lát.";
    gate.dataset.state = state;
    gate.classList.add("is-opening");
    heroTimer = setTimeout(() => body.classList.add("hero-entered"), 2050);
  }
  function celebrate() {
    const layer = document.createElement("div");
    layer.className = "celebration-layer";
    layer.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 8; index++) {
      const petal = document.createElement("span");
      petal.style.setProperty("--i", index);
      layer.append(petal);
    }
    body.append(layer);
    setTimeout(() => layer.remove(), 6000);
  }
  function recoverInvitation() {
    body.classList.remove("motion-ready", "gate-active");
    finishOpening();
    document.documentElement.classList.remove("invitation-locked");
    revealAll();
  }
  window.addEventListener("error", recoverInvitation);
  window.addEventListener("unhandledrejection", recoverInvitation);

  try {
    document.querySelectorAll("section").forEach((section) => {
      section
        .querySelectorAll(".reveal")
        .forEach((element, index) =>
          element.style.setProperty("--reveal-order", index % 3),
        );
    });
    if ("IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          }),
        { threshold: 0.08 },
      );
    }
    const photos = [...document.querySelectorAll("[data-photo]")];
    const photoDialog = document.createElement("dialog");
    photoDialog.className = "photo-dialog";
    photoDialog.setAttribute("aria-label", "Ảnh cưới Quốc Hảo và Thùy Trang");
    photoDialog.innerHTML =
      '<button type="button" class="photo-close">Đóng ảnh ×</button><img alt="">' +
      '<div class="photo-caption"><button type="button" class="photo-nav photo-prev" aria-label="Ảnh trước">←</button><p aria-live="polite"></p>' +
      '<button type="button" class="photo-nav photo-next" aria-label="Ảnh tiếp theo">→</button></div><p class="photo-counter" aria-live="polite"></p>';
    body.append(photoDialog);
    let photoIndex = 0;
    let photoOpener;
    function showPhoto(index) {
      photoIndex = (index + photos.length) % photos.length;
      const button = photos[photoIndex];
      const image = photoDialog.querySelector("img");
      image.src = button.dataset.photo;
      image.alt = button.querySelector("img").alt;
      photoDialog.querySelector(".photo-caption p").textContent =
        button.querySelector("span").textContent;
      photoDialog.querySelector(".photo-counter").textContent =
        `${photoIndex + 1} / ${photos.length} · Quốc Hảo & Thùy Trang`;
    }
    photos.forEach((button, index) =>
      button.addEventListener("click", () => {
        photoOpener = button;
        showPhoto(index);
        photoDialog.showModal();
        photoDialog
          .querySelector(".photo-close")
          .focus({ preventScroll: true });
      }),
    );
    photoDialog
      .querySelector(".photo-close")
      .addEventListener("click", () => photoDialog.close());
    photoDialog
      .querySelector(".photo-prev")
      .addEventListener("click", () => showPhoto(photoIndex - 1));
    photoDialog
      .querySelector(".photo-next")
      .addEventListener("click", () => showPhoto(photoIndex + 1));
    photoDialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        showPhoto(photoIndex + (event.key === "ArrowLeft" ? -1 : 1));
      }
    });
    photoDialog.addEventListener("close", () =>
      photoOpener?.focus({ preventScroll: true }),
    );

    const rsvp = document.querySelector(".rsvp-dialog");
    if (rsvp) {
      let rsvpOpener;
      document.querySelectorAll(".rsvp-trigger").forEach((button) =>
        button.addEventListener("click", () => {
          rsvpOpener = button;
          rsvp.showModal();
        }),
      );
      rsvp
        .querySelector(".rsvp-close")
        .addEventListener("click", () => rsvp.close());
      rsvp.addEventListener("close", () =>
        rsvpOpener?.focus({ preventScroll: true }),
      );
    }
    [photoDialog, rsvp].filter(Boolean).forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        const bounds = dialog.getBoundingClientRect();
        if (
          event.target === dialog &&
          (event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom)
        )
          dialog.close();
      });
    });
    const finale = document.querySelector(".story-finale");
    if (finale && "IntersectionObserver" in window && !motion.matches) {
      const finaleObserver = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          finaleObserver.disconnect();
          const petals = document.createElement("div");
          petals.className = "finale-petals";
          petals.setAttribute("aria-hidden", "true");
          for (let index = 0; index < 5; index++) {
            const petal = document.createElement("span");
            petal.style.setProperty("--i", index);
            petals.append(petal);
          }
          finale.append(petals);
          finale.classList.add("finale-seen");
          setTimeout(() => petals.remove(), 6200);
        },
        { threshold: 0.25 },
      );
      finaleObserver.observe(finale);
    }
    openButton?.addEventListener("click", openInvitation);
    document
      .querySelector(".skip-link")
      ?.addEventListener("click", finishOpening);
    document.addEventListener("keydown", (event) => {
      if (state !== "open" && event.key === "Tab") {
        event.preventDefault();
        if (state === "closed") openButton?.focus({ preventScroll: true });
      }
    });
    motion.addEventListener("change", () => {
      if (motion.matches && state === "opening") finishOpening();
    });
    // Activate only after handlers and recovery paths exist. Without JS content stays visible.
    if (gate && openButton) {
      prepareOpeningViewport();
      gate.setAttribute("aria-modal", "true");
      main.inert = true;
      if (footer) footer.inert = true;
      body.classList.add("gate-active", "motion-ready");
      body.dataset.invitationState = state;
      openButton.focus({ preventScroll: true });
      window.addEventListener("pageshow", () => {
        if (state !== "open")
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      });
    } else finishOpening();
  } catch (error) {
    recoverInvitation();
    console.error("Invitation recovered:", error);
  }
})();
