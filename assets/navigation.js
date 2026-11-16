(() => {
  const header = document.querySelector(".site-header");
  const menu = header.querySelector(".site-menu");
  const navigation = header.querySelector(".site-nav");

  header.dataset.enhanced = "true";

  function closeMenu() {
    menu.setAttribute("aria-expanded", "false");
    navigation.dataset.open = "false";
  }

  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    navigation.dataset.open = String(open);
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  header.querySelector(".site-brand").addEventListener("click", closeMenu);

  header.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menu.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu();
      menu.focus();
    }
  });
})();
