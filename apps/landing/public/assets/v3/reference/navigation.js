function createHomeLink(logo) {
  const home = document.createElement("a");
  home.href = "/v3";
  home.className = "v3-reference-nav-home";
  home.setAttribute("aria-label", "Aomi V3 home");
  home.append(...logo.childNodes);
  logo.replaceWith(home);
}

function enhanceNavigation() {
  const nav = document.querySelector("nav");
  if (!nav || nav.dataset.v3Navigation === "ready") return;

  const logo = nav.firstElementChild;
  const primary = nav.children[1];
  if (!logo || !primary) return;

  nav.dataset.v3Navigation = "ready";
  createHomeLink(logo);

  const closeMenu = ({ restoreFocus = false } = {}) => {
    const expanded = document.querySelector(
      ".v3-reference-nav-trigger[aria-expanded='true']",
    );

    for (const menu of document.querySelectorAll("[data-v3-menu]")) {
      menu.style.display = "none";
      menu.setAttribute("aria-hidden", "true");
    }
    for (const button of document.querySelectorAll(
      ".v3-reference-nav-trigger",
    )) {
      button.setAttribute("aria-expanded", "false");
    }

    if (restoreFocus) expanded?.focus();
  };

  const positionMenu = (button, menu) => {
    const currentNav = button.closest("nav");
    if (!currentNav) return;

    const navRect = currentNav.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const menuWidth = 360;
    const center = buttonRect.left - navRect.left + buttonRect.width / 2;
    const clamped = Math.max(
      menuWidth / 2,
      Math.min(navRect.width - menuWidth / 2, center),
    );
    menu.style.left = `${clamped}px`;
  };

  const openMenu = (button, label, { focusFirst = false } = {}) => {
    const menu = [...document.querySelectorAll("[data-v3-menu]")].find(
      (item) => item.dataset.v3Menu === label,
    );
    if (!menu) return;

    closeMenu();
    positionMenu(button, menu);
    menu.style.display = "block";
    menu.setAttribute("aria-hidden", "false");
    button.setAttribute("aria-expanded", "true");
    if (focusFirst) menu.querySelector("a")?.focus();
  };

  for (const link of [...primary.querySelectorAll(":scope > a")]) {
    const label = link.textContent.trim();

    if (label === "Pricing") {
      link.href = "/v3/pricing";
      continue;
    }

    const hasMenu = [...nav.querySelectorAll("[data-v3-menu]")].some(
      (menu) => menu.dataset.v3Menu === label,
    );
    if (!hasMenu) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "v3-reference-nav-trigger";
    button.textContent = label;
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");

    link.replaceWith(button);
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest(".v3-reference-nav-trigger");
    if (button) {
      const open = button.getAttribute("aria-expanded") === "true";
      if (open) closeMenu();
      else openMenu(button, button.textContent.trim());
      return;
    }

    const currentNav = document.querySelector("nav");
    if (!currentNav?.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu({ restoreFocus: true });
      return;
    }

    if (
      event.key === "ArrowDown" &&
      event.target instanceof Element &&
      event.target.matches(".v3-reference-nav-trigger")
    ) {
      event.preventDefault();
      openMenu(event.target, event.target.textContent.trim(), {
        focusFirst: true,
      });
    }
  });
  window.addEventListener("resize", () => {
    const button = document.querySelector(
      ".v3-reference-nav-trigger[aria-expanded='true']",
    );
    if (!button) return;

    const menu = [...document.querySelectorAll("[data-v3-menu]")].find(
      (item) => item.getAttribute("aria-hidden") === "false",
    );
    if (menu) positionMenu(button, menu);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", enhanceNavigation, {
    once: true,
  });
} else {
  enhanceNavigation();
}
