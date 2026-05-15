/* ─────────────────────────────────────────
   The Gift of Breath - App Logic
   Scroll observer, phase indicator, cursor animation
───────────────────────────────────────── */

(function () {
  "use strict";

  /* ── Announcement bar ───────────────── */
  const announcementBar = document.getElementById("announcement-bar");
  const announcementDismiss = document.getElementById("announcement-dismiss");

  if (announcementBar && announcementDismiss) {
    if (localStorage.getItem("gob_announcement_luma_dismissed") === "1") {
      announcementBar.classList.add("dismissed");
      document.documentElement.style.setProperty("--bar-height", "0px");
    }
    announcementDismiss.addEventListener("click", () => {
      announcementBar.classList.add("dismissed");
      document.documentElement.style.setProperty("--bar-height", "0px");
      localStorage.setItem("gob_announcement_luma_dismissed", "1");
    });
  }

  /* ── Breath line activation ──────────── */
  const breathLine = document.getElementById("breath-line");
  if (breathLine) {
    window.setTimeout(() => {
      breathLine.classList.add("alive");
    }, 2800);
  }

  /* ── Theme Toggle Logic ──────────────── */
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    const savedTheme = localStorage.getItem("averylake_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);

    themeToggle.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("averylake_theme", newTheme);
    });
  }

  /* ── DOM references (declared early; used by GSAP + site nav) ── */
  const chapters      = Array.from(document.querySelectorAll(".chapter"));
  const siteNavPanels = Array.from(document.querySelectorAll(".site-nav__panel"));

  /* ── Scroll reveal ────────────────────────
     Chapters: GSAP staggered per-element (if GSAP loaded)
     Other sections: IntersectionObserver fallback
  ─────────────────────────────────────────── */

  function initGSAPReveals() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return false;

    gsap.registerPlugin(ScrollTrigger);

    chapters.forEach((chapter) => {
      const content = chapter.querySelector(".chapter-content");
      const visual  = chapter.querySelector(".chapter-visual");

      // Elements to stagger inside .chapter-content, in DOM order
      const items = content
        ? Array.from(content.children)
        : [];

      // Set initial hidden state via GSAP (overrides the CSS opacity:1 fallback)
      gsap.set(items,  { opacity: 0, y: 22 });
      gsap.set(visual, { opacity: 0, y: 14 });

      // Build timeline paused — play it manually so we control the trigger
      const tl = gsap.timeline({ paused: true });

      // Stagger content children: eyebrow → title → meta → excerpt(s) → link → edition note
      tl.to(items, {
        opacity: 1,
        y: 0,
        duration: 0.65,
        ease: "power2.out",
        stagger: 0.11,
      });

      // Artwork trails in slightly after content starts, overlapping
      tl.to(visual, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power2.out",
      }, "-=0.5");

      // Guard so the animation only ever plays once, regardless of scroll direction.
      // onEnterBack catches the case where the user jumps to a lower section (e.g. via
      // the COLLECT anchor) and then scrolls back up past chapters that were never seen.
      let hasPlayed = false;
      const playOnce = () => { if (!hasPlayed) { tl.play(); hasPlayed = true; } };

      ScrollTrigger.create({
        trigger: chapter,
        start: "top 72%",
        onEnter:     playOnce,
        onEnterBack: playOnce,
      });
    });

    return true;
  }

  const gsapActive = initGSAPReveals();

  // Collection section: staggered artifact items via GSAP
  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    const artifactItems = document.querySelectorAll(".artifact-item");
    if (artifactItems.length) {
      gsap.set(artifactItems, { opacity: 0, y: 20 });
      let artifactsPlayed = false;
      const playArtifacts = () => {
        if (!artifactsPlayed) {
          gsap.to(artifactItems, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power2.out",
            stagger: 0.1,
          });
          artifactsPlayed = true;
        }
      };
      ScrollTrigger.create({
        trigger: ".collection-section",
        start: "top 75%",
        onEnter:     playArtifacts,
        onEnterBack: playArtifacts,
      });
    }
  }

  // Non-chapter sections: keep IntersectionObserver (GSAP not wired for these)
  const simpleRevealTargets = document.querySelectorAll(".intro-section, .statement-section, .citation-section, .collection-section, .bio-section");
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  simpleRevealTargets.forEach((el) => revealObserver.observe(el));

  /* ── Site nav: scroll tracking ──────── */
  let currentPhaseIndex = -1;

  function updatePhaseNav() {
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const scrollCenter = scrollY + viewportHeight * 0.45;
    let activeIndex = -1;

    for (let i = chapters.length - 1; i >= 0; i--) {
      const chapterTop = chapters[i].offsetTop;
      if (scrollCenter >= chapterTop) {
        activeIndex = i;
        break;
      }
    }

    if (activeIndex === currentPhaseIndex) return;
    currentPhaseIndex = activeIndex;

    const activeTargetId = activeIndex >= 0 ? chapters[activeIndex].id : "hero";

    siteNavPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.target === activeTargetId);
    });
  }

  /* Site nav: click to scroll to chapter */
  siteNavPanels.forEach((panel) => {
    panel.addEventListener("click", () => {
      const targetId = panel.dataset.target;
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });

  /* Throttled scroll listener */
  let scrollTicking = false;
  window.addEventListener("scroll", () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        updatePhaseNav();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  });

  /* Initial state */
  updatePhaseNav();

  /* ── Lightbox ────────────────────────────── */
  const lightbox        = document.getElementById("lightbox");
  const lightboxImg     = document.getElementById("lightbox-img");
  const lightboxTitle   = document.getElementById("lightbox-title");
  const lightboxSub     = document.getElementById("lightbox-sub");
  const lightboxClose   = document.getElementById("lightbox-close");
  const lightboxBackdrop = document.getElementById("lightbox-backdrop");

  function openLightbox(src, title, sub, alt) {
    lightboxImg.src   = src;
    lightboxImg.alt   = alt || title;
    lightboxTitle.textContent = title || "";
    lightboxSub.textContent   = sub   || "";
    lightbox.hidden   = false;
    document.body.style.overflow = "hidden";
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden  = true;
    lightboxImg.src  = "";
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".artifact-frame[data-lightbox-src]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openLightbox(
        btn.dataset.lightboxSrc,
        btn.dataset.lightboxTitle,
        btn.dataset.lightboxSub,
        btn.querySelector("img")?.alt
      );
    });
  });

  if (lightboxClose)   lightboxClose.addEventListener("click", closeLightbox);
  if (lightboxBackdrop) lightboxBackdrop.addEventListener("click", closeLightbox);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
  });

/* ── Hide scroll hint after first scroll ── */
  const scrollHint = document.querySelector(".hero-scroll-hint");
  if (scrollHint) {
    let hintHidden = false;
    window.addEventListener("scroll", () => {
      if (!hintHidden && window.scrollY > 100) {
        scrollHint.style.opacity = "0";
        scrollHint.style.transition = "opacity 0.8s ease";
        hintHidden = true;
      }
    });
  }


})();
