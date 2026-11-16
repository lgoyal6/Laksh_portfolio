(() => {
  const portfolio = document.getElementById("laksh-studio");
  const filters = [...portfolio.querySelectorAll("[data-filter]")];
  const projects = [...portfolio.querySelectorAll("[data-category]")];
  const video = portfolio.querySelector("video");
  const filmButton = portfolio.querySelector("[data-play]");
  const filmPoster = portfolio.querySelector(
    'img[src="assets/leaf-search.jpg"]',
  );
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function selectFilter(filter) {
    filters.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === filter),
      );
    });
    projects.forEach((project) => {
      project.hidden = filter !== "all" && project.dataset.category !== filter;
    });
    const visibleCount = projects.filter((project) => !project.hidden).length;
    portfolio.querySelector("#project-status").textContent =
      `Showing ${visibleCount} of ${projects.length} projects`;
    if (portfolio.querySelector("#leaf").hidden) video.pause();
  }

  portfolio.querySelector(".filters").hidden = false;
  filters.forEach((button) => {
    button.addEventListener("click", () => {
      selectFilter(button.dataset.filter);
      if (!reducedMotion.matches) {
        portfolio.querySelector("#studio-projects").animate(
          [
            { opacity: 0.55, transform: "translateY(7px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 230, easing: "ease-out" },
        );
      }
    });
  });

  portfolio.querySelectorAll(".explore").forEach((button) => {
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    button.hidden = false;
    panel.hidden = true;
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
      if (open && !reducedMotion.matches) {
        panel.animate(
          [
            { opacity: 0, transform: "translateY(-9px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 250, easing: "ease-out" },
        );
      }
    });
  });

  filmButton.hidden = false;
  video.hidden = true;
  filmPoster.hidden = false;
  filmButton.addEventListener("click", () => {
    const showFilm = video.hidden;
    video.hidden = !showFilm;
    filmPoster.hidden = showFilm;
    filmButton.querySelector("span:last-child").textContent = showFilm
      ? "Close product film"
      : "Play product film";
    filmButton.setAttribute(
      "aria-label",
      showFilm ? "Close Leaf product film" : "Play Leaf product film",
    );
    if (showFilm) video.play().catch(() => {});
    else video.pause();
  });

  function revealHashTarget() {
    const target = document.getElementById(location.hash.slice(1));
    if (!target?.closest("[data-category]")) return;
    selectFilter("all");
    if (target.classList.contains("engineering")) {
      target.hidden = false;
      portfolio
        .querySelector(`[aria-controls="${target.id}"]`)
        .setAttribute("aria-expanded", "true");
    }
    target.scrollIntoView({ block: "start" });
  }

  window.addEventListener("hashchange", revealHashTarget);
  revealHashTarget();
})();
