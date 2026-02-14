// script.js
(() => {
  /* ------------------------------
     Mobile nav toggle
  ------------------------------ */
  const toggleBtn = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");

  if (toggleBtn && links) {
    toggleBtn.addEventListener("click", () => {
      const isOpen = links.classList.toggle("is-open");
      toggleBtn.setAttribute("aria-expanded", String(isOpen));
    });
  }

  /* ------------------------------
     Smooth scroll for hash links
  ------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });

      // Close mobile menu after click
      if (links && links.classList.contains("is-open")) {
        links.classList.remove("is-open");
        toggleBtn?.setAttribute("aria-expanded", "false");
      }
    });
  });

  /* ------------------------------
   Hero image rotation (slide)
------------------------------ */
const heroA = document.getElementById("hero-a");
const heroB = document.getElementById("hero-b");

if (heroA && heroB) {
  const heroImages = [
    "resources/images/slides/arcanine.webp",
    "resources/images/slides/pikachu.jpg",
    "resources/images/slides/shinx.jpg",
    "resources/images/slides/chimchar.jpg",
  ];

  // Preload to prevent flashes
  heroImages.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  let currentIndex = 0;
  let active = heroA;
  let incoming = heroB;

  // Ensure the active starts correct
  active.src = heroImages[currentIndex];
  active.classList.add("is-active");

  const swap = () => {
    const nextIndex = (currentIndex + 1) % heroImages.length;

    // Set incoming image source first
    incoming.src = heroImages[nextIndex];

    // Start incoming off to the right (visible)
    incoming.classList.add("enter-right");
    incoming.classList.add("is-active");

    // Force a reflow so the browser “applies” the starting transform
    // before we animate to translateX(0)
    incoming.getBoundingClientRect();

    // Animate:
    // incoming slides from right -> center
    // active slides from center -> left and fades
    incoming.classList.remove("enter-right");
    active.classList.add("exit-left");
    active.classList.remove("is-active");

    // After transition, clean up and swap references
    setTimeout(() => {
      active.classList.remove("exit-left");

      currentIndex = nextIndex;
      const temp = active;
      active = incoming;
      incoming = temp;
    }, 750); // slightly > CSS 0.7s
  };

  setInterval(swap, 10000);
}

})();