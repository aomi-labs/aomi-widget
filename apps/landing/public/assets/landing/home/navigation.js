function createHomeLink(logo) {
  const home = document.createElement("a");
  home.href = "/";
  home.className = "landing-nav-home";
  home.setAttribute("aria-label", "Aomi home");
  home.append(...logo.childNodes);
  logo.replaceWith(home);
}

function createMobileNavigation(nav, primary, actions) {
  const details = document.createElement("details");
  details.className = "landing-mobile-navigation";

  const toggle = document.createElement("summary");
  toggle.className = "landing-mobile-toggle";
  toggle.setAttribute("aria-label", "Navigation menu");
  const toggleMark = document.createElement("span");
  toggleMark.setAttribute("aria-hidden", "true");
  toggle.append(toggleMark);

  const menu = document.createElement("div");
  menu.id = "landing-mobile-menu";
  menu.className = "landing-mobile-menu";

  for (const sourceMenu of nav.querySelectorAll("[data-landing-menu]")) {
    const group = document.createElement("div");
    group.className = "landing-mobile-menu-group";

    const label = document.createElement("span");
    label.className = "landing-mobile-menu-label";
    label.textContent = sourceMenu.dataset.landingMenu;
    group.append(label);

    for (const sourceLink of sourceMenu.querySelectorAll("a")) {
      const link = document.createElement("a");
      link.href = sourceLink.href;
      if (sourceLink.target) link.target = sourceLink.target;
      if (sourceLink.rel) link.rel = sourceLink.rel;

      const text = document.createElement("span");
      text.textContent =
        sourceLink.querySelector(":scope > span")?.textContent?.trim() ??
        sourceLink.textContent.trim();
      const arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      link.append(text, arrow);
      group.append(link);
    }

    menu.append(group);
  }

  const pricing = [...primary.querySelectorAll(":scope > a")].find(
    (link) => link.textContent.trim() === "Pricing",
  );
  if (pricing) {
    const group = document.createElement("div");
    group.className = "landing-mobile-menu-group";
    const link = document.createElement("a");
    link.href = "/pricing";
    link.innerHTML = '<span>Pricing</span><span aria-hidden="true">→</span>';
    group.append(link);
    menu.append(group);
  }

  const actionRow = document.createElement("div");
  actionRow.className = "landing-mobile-menu-actions";
  for (const sourceLink of actions.querySelectorAll("a")) {
    const link = document.createElement("a");
    link.href = sourceLink.href;
    link.textContent = sourceLink.textContent.trim();
    actionRow.append(link);
  }
  menu.append(actionRow);

  const close = () => {
    details.open = false;
  };
  menu.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) close();
  });

  details.append(toggle, menu);
  nav.append(details);
  return { close, details, menu, toggle };
}

function enhanceNavigation() {
  const nav = document.querySelector("nav");
  if (!nav || nav.dataset.landingNavigation === "ready") return;

  const logo = nav.firstElementChild;
  const primary = nav.children[1];
  const actions = nav.children[2];
  if (!logo || !primary || !actions) return;

  nav.dataset.landingNavigation = "ready";
  createHomeLink(logo);
  primary.classList.add("landing-nav-primary");
  actions.classList.add("landing-nav-actions");
  const mobile = createMobileNavigation(nav, primary, actions);

  const closeMenu = ({ restoreFocus = false } = {}) => {
    const expanded = document.querySelector(
      ".landing-nav-trigger[aria-expanded='true']",
    );

    for (const menu of document.querySelectorAll("[data-landing-menu]")) {
      menu.style.display = "none";
      menu.setAttribute("aria-hidden", "true");
    }
    for (const button of document.querySelectorAll(".landing-nav-trigger")) {
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
    const menu = [...document.querySelectorAll("[data-landing-menu]")].find(
      (item) => item.dataset.landingMenu === label,
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
      link.href = "/pricing";
      continue;
    }

    const hasMenu = [...nav.querySelectorAll("[data-landing-menu]")].some(
      (menu) => menu.dataset.landingMenu === label,
    );
    if (!hasMenu) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "landing-nav-trigger";
    button.textContent = label;
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");

    link.replaceWith(button);
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest(".landing-nav-trigger");
    if (button) {
      const open = button.getAttribute("aria-expanded") === "true";
      if (open) closeMenu();
      else openMenu(button, button.textContent.trim());
      return;
    }

    const currentNav = document.querySelector("nav");
    if (!currentNav?.contains(event.target)) {
      closeMenu();
      mobile.close();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu({ restoreFocus: true });
      mobile.close();
      return;
    }

    if (
      event.key === "ArrowDown" &&
      event.target instanceof Element &&
      event.target.matches(".landing-nav-trigger")
    ) {
      event.preventDefault();
      openMenu(event.target, event.target.textContent.trim(), {
        focusFirst: true,
      });
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1159) mobile.close();
    const button = document.querySelector(
      ".landing-nav-trigger[aria-expanded='true']",
    );
    if (!button) return;

    const menu = [...document.querySelectorAll("[data-landing-menu]")].find(
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
