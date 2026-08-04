/**
 * Maxwell Automatic — Animation & Interaction Utilities
 * Version: 1.0.0
 *
 * Modules:
 *  1. ScrollReveal    — Intersection Observer for [data-animate] elements
 *  2. CounterAnimation — Animated number counters
 *  3. ScrollProgress  — Scroll progress bar
 *  4. StickyHeader    — Transparent → solid header on scroll
 *  5. MobileMenu      — Hamburger drawer open/close
 *  6. MegaMenu        — Desktop mega menu hover/keyboard
 *  7. SearchOverlay   — Search slide-in/out
 *  8. AnnouncementBar — Dismiss and remember via sessionStorage
 *  9. HeroTyping      — Animated hero headline word reveal
 * 10. ParallaxLight   — Subtle CSS transform parallax (no layout thrash)
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
   MODULE 1 — Scroll Reveal (Intersection Observer)
   Watches [data-animate] elements and adds .is-visible when they enter view.
───────────────────────────────────────────────────────────────────────────── */

const ScrollReveal = {
  init() {
    // Bail out for users who prefer reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('[data-animate]').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // Once revealed, stop observing to save resources
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -64px 0px', // trigger slightly before element fully enters
        threshold: 0.1,
      }
    );

    document.querySelectorAll('[data-animate]').forEach(el => {
      observer.observe(el);
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   MODULE 2 — Counter Animation
   Usage: <span data-counter="500" data-suffix="+" data-duration="2000">0</span>
───────────────────────────────────────────────────────────────────────────── */

const CounterAnimation = {
  init() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach(counter => observer.observe(counter));
  },

  animateCounter(el) {
    const target = parseInt(el.dataset.counter, 10);
    const suffix = el.dataset.suffix || '';
    const duration = parseInt(el.dataset.duration, 10) || 2000;
    const start = performance.now();
    const startVal = 0;

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const current = Math.round(startVal + (target - startVal) * easedProgress);
      el.textContent = current.toLocaleString('en-IN') + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   MODULE 3 — Scroll Progress Bar
   Updates .scroll-progress width based on page scroll position.
───────────────────────────────────────────────────────────────────────────── */

const ScrollProgress = {
  init() {
    const bar = document.querySelector('.scroll-progress');
    if (!bar) return;

    let ticking = false;

    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = `${Math.min(percent, 100)}%`;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   MODULE 4 — Sticky Header (Transparent → Solid)
   Adds .header--scrolled when page scrolls past threshold.
   Adds .header--transparent removed when scrolled.
───────────────────────────────────────────────────────────────────────────── */

const StickyHeader = {
  threshold: 80, // px before header becomes solid

  init() {
    this.header = document.querySelector('.site-header');
    if (!this.header) return;

    let lastScrollY = 0;
    let ticking = false;

    const update = () => {
      const scrollY = window.scrollY;

      // Toggle scrolled state
      this.header.classList.toggle('header--scrolled', scrollY > this.threshold);

      // Hide header on scroll down, show on scroll up (for mobile UX)
      if (scrollY > 300) {
        if (scrollY > lastScrollY) {
          this.header.classList.add('header--hidden');
        } else {
          this.header.classList.remove('header--hidden');
        }
      } else {
        this.header.classList.remove('header--hidden');
      }

      lastScrollY = scrollY;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    // Run on init
    update();
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   MODULE 5 — Mobile Menu Drawer
   Handles hamburger button → drawer open, close, overlay, focus trap, escape.
───────────────────────────────────────────────────────────────────────────── */

const MobileMenu = {
  init() {
    this.toggle = document.querySelector('[data-mobile-menu-toggle]');
    this.menu   = document.querySelector('[data-mobile-menu]');
    this.overlay = document.querySelector('[data-mobile-overlay]');
    this.closeBtn = document.querySelector('[data-mobile-menu-close]');
    this.accordionToggles = document.querySelectorAll('[data-mobile-accordion]');

    if (!this.toggle || !this.menu) return;

    this.toggle.addEventListener('click', () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());

    // Escape key closes menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });

    // Mobile accordion nav items
    this.accordionToggles.forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = document.querySelector(`#${btn.getAttribute('aria-controls')}`);
        const isExpanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!isExpanded));
        panel?.classList.toggle('is-open', !isExpanded);
      });
    });
  },

  open() {
    this.isOpen = true;
    this.menu.classList.add('is-open');
    this.overlay?.classList.add('is-active');
    document.body.classList.add('scroll-locked');
    this.toggle.setAttribute('aria-expanded', 'true');
    this.menu.setAttribute('aria-hidden', 'false');

    // Focus first focusable element
    const firstFocusable = this.menu.querySelector('a, button');
    firstFocusable?.focus();
  },

  close() {
    this.isOpen = false;
    this.menu.classList.remove('is-open');
    this.overlay?.classList.remove('is-active');
    document.body.classList.remove('scroll-locked');
    this.toggle.setAttribute('aria-expanded', 'false');
    this.menu.setAttribute('aria-hidden', 'true');
    this.toggle.focus();
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   MODULE 6 — Mega Menu (Desktop Keyboard & Hover)
   Supports arrow key navigation within dropdowns.
───────────────────────────────────────────────────────────────────────────── */

const MegaMenu = {
  init() {
    this.navItems = document.querySelectorAll('[data-mega-menu-item]');
    if (!this.navItems.length) return;

    this.navItems.forEach(item => {
      const trigger = item.querySelector('[data-mega-menu-trigger]');
      const panel   = item.querySelector('[data-mega-menu-panel]');
      if (!trigger || !panel) return;

      let closeTimer;

      // Open on mouse enter (with small delay to avoid flicker)
      item.addEventListener('mouseenter', () => {
        clearTimeout(closeTimer);
        this.closeAll();
        this.open(item, trigger, panel);
      });

      // Close on mouse leave (with delay for smooth UX)
      item.addEventListener('mouseleave', () => {
        closeTimer = setTimeout(() => this.close(item, trigger, panel), 150);
      });

      // Keyboard: Enter/Space opens, Escape closes
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const isOpen = item.classList.contains('is-open');
          this.closeAll();
          if (!isOpen) this.open(item, trigger, panel);
        }
        if (e.key === 'Escape') {
          this.close(item, trigger, panel);
          trigger.focus();
        }
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-mega-menu-item]')) {
        this.closeAll();
      }
    });
  },

  open(item, trigger, panel) {
    item.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');
  },

  close(item, trigger, panel) {
    item.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
  },

  closeAll() {
    this.navItems.forEach(item => {
      const trigger = item.querySelector('[data-mega-menu-trigger]');
      const panel   = item.querySelector('[data-mega-menu-panel]');
      if (trigger && panel) this.close(item, trigger, panel);
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   MODULE 7 — Search Overlay
───────────────────────────────────────────────────────────────────────────── */

const SearchOverlay = {
  init() {
    this.openBtn  = document.querySelector('[data-search-open]');
    this.closeBtn = document.querySelector('[data-search-close]');
    this.overlay  = document.querySelector('[data-search-overlay]');
    this.input    = document.querySelector('[data-search-input]');

    if (!this.openBtn || !this.overlay) return;

    this.openBtn.addEventListener('click', () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });

    // Close on backdrop click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  },

  open() {
    this.overlay.classList.add('is-active');
    document.body.classList.add('scroll-locked');
    setTimeout(() => this.input?.focus(), 100);
  },

  close() {
    this.overlay.classList.remove('is-active');
    document.body.classList.remove('scroll-locked');
    this.openBtn?.focus();
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   MODULE 8 — Announcement Bar Dismiss
   Stores dismissed state in sessionStorage so it stays hidden per session.
───────────────────────────────────────────────────────────────────────────── */

const AnnouncementBar = {
  STORAGE_KEY: 'maxwell_announcement_dismissed',

  init() {
    const bar = document.querySelector('[data-announcement-bar]');
    if (!bar) return;

    // Hide if already dismissed this session
    if (sessionStorage.getItem(this.STORAGE_KEY)) {
      bar.remove();
      return;
    }

    const dismissBtn = bar.querySelector('[data-announcement-dismiss]');
    dismissBtn?.addEventListener('click', () => {
      bar.classList.add('is-dismissed');
      sessionStorage.setItem(this.STORAGE_KEY, '1');
      // Remove from DOM after transition
      bar.addEventListener('transitionend', () => bar.remove(), { once: true });
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   MODULE 9 — Hero Headline Word Reveal
   Splits h1 into individual word spans and animates them sequentially.
───────────────────────────────────────────────────────────────────────────── */

const HeroTyping = {
  init() {
    const headline = document.querySelector('[data-hero-headline]');
    if (!headline) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const words = headline.textContent.trim().split(' ');
    headline.innerHTML = words
      .map((word, i) =>
        `<span class="hero-word" style="animation-delay:${i * 0.1}s">${word}</span>`
      )
      .join(' ');
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   MODULE 10 — Light Parallax (CSS transform, no layout thrash)
   Usage: <div data-parallax data-parallax-speed="0.3">
───────────────────────────────────────────────────────────────────────────── */

const ParallaxLight = {
  init() {
    this.elements = document.querySelectorAll('[data-parallax]');
    if (!this.elements.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 768) return; // Disable on mobile

    let ticking = false;

    const update = () => {
      this.elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const speed = parseFloat(el.dataset.parallaxSpeed) || 0.2;
        const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
        el.style.transform = `translateY(${offset}px)`;
      });
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   BOOTSTRAP — Initialize all modules when DOM is ready
───────────────────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  ScrollReveal.init();
  CounterAnimation.init();
  ScrollProgress.init();
  StickyHeader.init();
  MobileMenu.init();
  MegaMenu.init();
  SearchOverlay.init();
  AnnouncementBar.init();
  HeroTyping.init();
  ParallaxLight.init();
});
