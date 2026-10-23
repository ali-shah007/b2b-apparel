(() => {
      const rail = document.querySelector('[data-cr-video-rail]');
      const previous = document.querySelector('[data-cr-video-prev]');
      const next = document.querySelector('[data-cr-video-next]');
      const section = rail?.closest('.cr-video-reviews');
      if (!rail || !previous || !next || !section) return;

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let autoScrollTimer = null;
      let resumeTimer = null;
      let isInView = false;
      let isHovered = false;
      let hasFocus = false;

      const cardStep = () => {
        const card = rail.querySelector('.cr-video-card');
        if (!card) return rail.clientWidth;
        const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
        return card.getBoundingClientRect().width + gap;
      };
      const updateControls = () => {
        const end = rail.scrollWidth - rail.clientWidth;
        previous.disabled = rail.scrollLeft <= 2;
        next.disabled = rail.scrollLeft >= end - 2;
      };
      const move = direction => rail.scrollBy({
        left: cardStep() * direction,
        behavior: reducedMotion.matches ? 'auto' : 'smooth'
      });
      const stopAutoScroll = () => {
        window.clearInterval(autoScrollTimer);
        autoScrollTimer = null;
      };
      const advance = () => {
        const end = rail.scrollWidth - rail.clientWidth;
        if (rail.scrollLeft >= end - 2) {
          rail.scrollTo({ left: 0, behavior: 'smooth' });
          return;
        }
        move(1);
      };
      const startAutoScroll = () => {
        stopAutoScroll();
        if (!isInView || isHovered || hasFocus || document.hidden || reducedMotion.matches) return;
        autoScrollTimer = window.setInterval(advance, 4200);
      };
      const resumeAfterInteraction = () => {
        window.clearTimeout(resumeTimer);
        resumeTimer = window.setTimeout(startAutoScroll, 6000);
      };

      previous.addEventListener('click', () => {
        stopAutoScroll();
        move(-1);
        resumeAfterInteraction();
      });
      next.addEventListener('click', () => {
        stopAutoScroll();
        move(1);
        resumeAfterInteraction();
      });
      rail.addEventListener('scroll', updateControls, { passive: true });
      rail.addEventListener('pointerdown', stopAutoScroll, { passive: true });
      rail.addEventListener('pointerup', resumeAfterInteraction, { passive: true });
      section.addEventListener('mouseenter', () => {
        isHovered = true;
        stopAutoScroll();
      });
      section.addEventListener('mouseleave', () => {
        isHovered = false;
        startAutoScroll();
      });
      section.addEventListener('focusin', () => {
        hasFocus = true;
        stopAutoScroll();
      });
      section.addEventListener('focusout', () => {
        window.setTimeout(() => {
          hasFocus = section.contains(document.activeElement);
          startAutoScroll();
        }, 0);
      });
      document.addEventListener('visibilitychange', startAutoScroll);
      reducedMotion.addEventListener?.('change', startAutoScroll);
      window.addEventListener('resize', () => {
        updateControls();
        startAutoScroll();
      });

      new IntersectionObserver(entries => {
        isInView = entries[0]?.isIntersecting ?? false;
        if (isInView) startAutoScroll();
        else stopAutoScroll();
      }, { threshold: 0.2 }).observe(section);

      updateControls();
    })();
