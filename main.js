/* =========================================================
   Pristine Home Services PSL — landing JS
   - NATIVE browser scroll (no Lenis / no smooth-scroll lib)
   - Hero entrance + section reveals (one-shot fade-up)
   - Nav scroll state + mobile menu
   - Hero scroll-linked dissolve (the ONLY ScrollTrigger scrub)
   - Before/After scrubber (pointer + auto-demo)
   - FAQ accordion, Quote form
   ========================================================= */

// Always load the page at the top so the hero scroll-linked dissolve
// initializes from its start state (video visible, opacity 1).
// Without this, reloading while scrolled past the hero would cause
// ScrollTrigger to bake in the end-state and hide the video.
// Exception: respect explicit deep-links (#pricing, #faq, etc.) so users
// landing on a section anchor still arrive there. We re-scroll on
// DOMContentLoaded because manual scroll restoration ALSO disables the
// browser's default hash-target scroll, which we need to re-implement.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (window.location.hash) {
  const scrollToHash = () => {
    const target = document.querySelector(window.location.hash);
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo(0, top);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scrollToHash);
  } else {
    scrollToHash();
  }
} else {
  window.scrollTo(0, 0);
}

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';

  if (hasGSAP && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ---------- Anchor jumps use native smooth scroll ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 60;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    closeMobileMenu();
  });

  /* ---------- Hero entrance ---------- */
  function playHero() {
    if (!hasGSAP || reduceMotion) {
      document.querySelectorAll('[data-anim="hero"]').forEach((el) => {
        el.style.opacity = 1;
        el.style.transform = 'none';
      });
      return;
    }
    gsap.to('[data-anim="hero"]', {
      opacity: 1,
      y: 0,
      duration: 0.95,
      ease: 'power3.out',
      stagger: 0.09,
      delay: 0.1,
    });
  }

  /* ---------- Section reveals ---------- */
  function wireReveals() {
    if (!hasGSAP || reduceMotion) {
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        el.style.opacity = 1;
        el.style.transform = 'none';
      });
      return;
    }
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          once: true,
        },
      });
    });
  }

  /* ---------- Nav scroll state ---------- */
  function wireNav() {
    const nav = document.getElementById('nav');
    const onScroll = () => {
      if (window.scrollY > 60) nav.classList.add('nav--scrolled');
      else nav.classList.remove('nav--scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Hamburger
    const burger = nav.querySelector('.nav__hamburger');
    burger.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('nav--menu-open');
      document.getElementById('mobile-menu').classList.toggle('is-open', isOpen);
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  function closeMobileMenu() {
    const nav = document.getElementById('nav');
    if (!nav.classList.contains('nav--menu-open')) return;
    nav.classList.remove('nav--menu-open');
    document.getElementById('mobile-menu').classList.remove('is-open');
    nav.querySelector('.nav__hamburger').setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  /* ---------- Hero scroll-linked dissolve ----------
     As the hero scrolls past the viewport top, the video blooms slightly
     (scale up) while fading to zero, and the text drifts up + fades.
     The scrub: 0.4 adds a tiny lag so the effect feels weighty, not jittery.
     Scaling UP (not down) means the video container always covers itself,
     so no background gap shows through during the dissolve.
  */
  function wireHeroScroll() {
    if (!hasGSAP || reduceMotion) return;
    const heroSection = document.querySelector('.hero');
    const heroVideo = document.querySelector('.hero__video');
    const heroContent = document.querySelector('.hero__content');
    const heroFadeBottom = document.querySelector('.hero__fade-bottom');
    if (!heroSection || !heroVideo) return;

    // Pin start state explicitly so the video is always visible on init
    gsap.set(heroVideo, { opacity: 1, scale: 1 });

    gsap.fromTo(heroVideo,
      { opacity: 1, scale: 1 },
      {
        opacity: 0,
        scale: 1.06,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: {
          trigger: heroSection,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.4,
        },
      }
    );

    if (heroFadeBottom) {
      gsap.fromTo(heroFadeBottom,
        { opacity: 1 },
        {
          opacity: 0,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: heroSection,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.4,
          },
        }
      );
    }

    if (heroContent) {
      gsap.fromTo(heroContent,
        { opacity: 1, y: 0 },
        {
          opacity: 0,
          y: -60,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: heroSection,
            start: 'top top',
            end: 'bottom 35%',
            scrub: 0.4,
          },
        }
      );
    }
  }

  /* ---------- Hero video play-once + freeze on last frame ----------
     Video has no `loop` attribute, so it naturally pauses when ended.
     This handler hardens that: removes any controls if a browser added
     them after end, and seeks 0.05s before duration so the displayed
     frame is the LAST visible frame (some browsers show a black frame
     at exactly duration on certain codecs).
  */
  function wireHeroVideo() {
    const video = document.querySelector('.hero__video');
    if (!video) return;
    video.removeAttribute('controls');
    video.addEventListener('ended', () => {
      try {
        const d = video.duration;
        if (isFinite(d) && d > 0) {
          video.currentTime = Math.max(0, d - 0.05);
        }
        video.pause();
      } catch (e) { /* ignore */ }
      video.removeAttribute('controls');
    }, { once: true });
  }

  /* ---------- Hero scroll cue fade-out ---------- */
  function wireScrollCue() {
    const cue = document.querySelector('.hero__scroll-cue');
    if (!cue) return;
    const onScroll = () => {
      cue.style.opacity = window.scrollY > 80 ? '0' : '1';
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* =========================================================
     BEFORE / AFTER scrubber
     ========================================================= */
  function wireBeforeAfter() {
    const stage = document.getElementById('ba-stage');
    if (!stage) return;
    const handle = document.getElementById('ba-handle');
    const beforeVid = stage.querySelector('.ba__video--before');
    const afterVid = stage.querySelector('.ba__video--after');

    // Pause both videos at chosen frames once metadata is loaded.
    function freeze(video, time) {
      const set = () => {
        try { video.pause(); video.currentTime = Math.max(0, Math.min(time, (video.duration || time) - 0.05)); }
        catch (e) { /* swallow — set again on canplay */ }
      };
      if (video.readyState >= 1) set();
      video.addEventListener('loadedmetadata', set, { once: false });
      video.addEventListener('canplay', set, { once: true });
    }
    freeze(beforeVid, 0.5);
    afterVid.addEventListener('loadedmetadata', () => {
      const d = afterVid.duration || 1;
      freeze(afterVid, Math.max(0, d - 0.5));
    }, { once: true });
    // Trigger metadata load
    beforeVid.load();
    afterVid.load();

    let dragging = false;
    let userInteracted = false;
    let autoTween = null;

    function setReveal(pct) {
      const v = Math.max(0, Math.min(100, pct));
      stage.style.setProperty('--reveal', v + '%');
    }

    function pointerToPct(clientX) {
      const rect = stage.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * 100;
    }

    function onDown(e) {
      dragging = true;
      userInteracted = true;
      stopAuto();
      stage.setPointerCapture && e.pointerId != null && stage.setPointerCapture(e.pointerId);
      setReveal(pointerToPct(e.clientX));
    }
    function onMove(e) {
      if (!dragging) return;
      setReveal(pointerToPct(e.clientX));
    }
    function onUp() { dragging = false; }

    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    // Keyboard support on the handle button
    handle.addEventListener('keydown', (e) => {
      const cur = parseFloat(stage.style.getPropertyValue('--reveal')) || 50;
      if (e.key === 'ArrowLeft') { setReveal(cur - 5); userInteracted = true; stopAuto(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setReveal(cur + 5); userInteracted = true; stopAuto(); e.preventDefault(); }
    });

    // Auto-demo: once the section enters view, if no interaction within 4s, animate 0%↔100% softly
    function startAuto() {
      if (!hasGSAP || reduceMotion || userInteracted || autoTween) return;
      const proxy = { v: parseFloat(stage.style.getPropertyValue('--reveal')) || 50 };
      autoTween = gsap.to(proxy, {
        v: 8,
        duration: 2.4,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: -1,
        onUpdate: () => setReveal(proxy.v),
        onRepeat: () => { proxy.v = 92; },
      });
    }
    function stopAuto() {
      if (autoTween) { autoTween.kill(); autoTween = null; }
    }

    if (hasGSAP && !reduceMotion) {
      ScrollTrigger.create({
        trigger: stage,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          setTimeout(() => { if (!userInteracted) startAuto(); }, 4000);
        },
      });
    }
  }

  /* =========================================================
     FAQ accordion
     ========================================================= */
  function wireFAQ() {
    const items = document.querySelectorAll('.faq__item');
    items.forEach((item) => {
      const summary = item.querySelector('.faq__summary');
      const panel = item.querySelector('.faq__panel');
      const inner = item.querySelector('.faq__panel-inner');

      // Set initial heights for items pre-marked open
      const setHeight = (open) => {
        if (open) {
          panel.style.height = inner.scrollHeight + 'px';
          panel.style.opacity = '1';
        } else {
          panel.style.height = '0px';
          panel.style.opacity = '0';
        }
      };
      setHeight(item.dataset.open === 'true');

      summary.addEventListener('click', () => {
        const wasOpen = item.dataset.open === 'true';
        // Close all (single-open behavior)
        items.forEach((other) => {
          if (other !== item) {
            other.dataset.open = 'false';
            const op = other.querySelector('.faq__panel');
            const oi = other.querySelector('.faq__panel-inner');
            if (hasGSAP && !reduceMotion) {
              gsap.to(op, { height: 0, opacity: 0, duration: 0.35, ease: 'power2.inOut' });
            } else {
              op.style.height = '0px'; op.style.opacity = '0';
            }
            other.querySelector('.faq__summary').setAttribute('aria-expanded', 'false');
          }
        });

        item.dataset.open = wasOpen ? 'false' : 'true';
        summary.setAttribute('aria-expanded', wasOpen ? 'false' : 'true');

        if (hasGSAP && !reduceMotion) {
          if (wasOpen) {
            gsap.to(panel, { height: 0, opacity: 0, duration: 0.35, ease: 'power2.inOut' });
          } else {
            gsap.fromTo(panel,
              { height: 0, opacity: 0 },
              { height: inner.scrollHeight, opacity: 1, duration: 0.4, ease: 'power2.inOut',
                onComplete: () => { panel.style.height = 'auto'; }
              });
          }
        } else {
          setHeight(!wasOpen);
        }
      });
    });
  }

  /* =========================================================
     Quote form — AJAX submit + ?service= prefill + pricing CTA wiring
     ========================================================= */
  function wireForm() {
    const form = document.getElementById('quote-form');
    if (!form) return;
    const status = form.querySelector('.form__status');
    const select = form.querySelector('#f-service');

    // Prefill from URL ?service=
    const url = new URL(window.location.href);
    const svc = url.searchParams.get('service');
    if (svc && select) {
      const opt = Array.from(select.options).find(o => o.value.toLowerCase() === svc.toLowerCase());
      if (opt) select.value = opt.value;
    }

    // Pricing CTA → set service + scroll to form
    document.querySelectorAll('[data-cta="quote"][data-service]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const service = btn.getAttribute('data-service');
        if (service && select) {
          const opt = Array.from(select.options).find(o => o.value === service);
          if (opt) select.value = service;
        }
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.classList.remove('is-error', 'is-success');
      status.textContent = '';

      // Native validation
      if (!form.checkValidity()) {
        status.textContent = 'Please fill in the required fields.';
        status.classList.add('is-error');
        form.reportValidity();
        return;
      }

      // Honeypot
      if (form.querySelector('input[name="_gotcha"]').value) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });

        if (res.ok) {
          form.innerHTML = `
            <div class="form__success">
              <h3>Thanks — we'll be in touch.</h3>
              <p>We'll get back within 1 business day. For urgent requests, call <a href="tel:7722370782">772-237-0782</a>.</p>
            </div>`;
        } else {
          // Formspree returned non-200 (rate limit, validation, or outage). Fail gracefully.
          status.textContent = 'Something went wrong. Please call 772-237-0782 or email PristineHomePSL@gmail.com.';
          status.classList.add('is-error');
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
      } catch (err) {
        status.textContent = 'Network error. Please call 772-237-0782 or email PristineHomePSL@gmail.com.';
        status.classList.add('is-error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    wireNav();
    wireHeroVideo();
    wireScrollCue();
    wireReveals();
    wireHeroScroll();
    wireBeforeAfter();
    wireFAQ();
    wireForm();
    playHero();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
