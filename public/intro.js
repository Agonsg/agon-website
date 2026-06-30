/* AGON | COMBAT SPORTS — Intro v4 (matches new clean HTML)
   Video plays fullscreen → ends → shrinks into nav logo position
   Hex canvas (hero background) fades in
   Hero content appears
*/
(function () {
  const overlay    = document.getElementById('introOverlay');
  if (!overlay) return;

  const introVideo = document.getElementById('introVideo');
  const skipBtn    = document.getElementById('introSkip');
  const navLogo    = document.getElementById('navLogo');
  const heroContent= document.getElementById('heroContent');
  const heroCanvas = document.getElementById('heroCanvas');

  // Hide hero content during intro
  if (heroContent) heroContent.style.opacity = '0';
  if (navLogo) navLogo.style.opacity = '0';

  let transitioned = false;

  function startTransition() {
    if (transitioned) return;
    transitioned = true;

    // Nav logo bounding box — video flies there
    const logoRect = navLogo
      ? navLogo.getBoundingClientRect()
      : { left: 16, top: 15, width: 38, height: 38 };

    const vW = overlay.offsetWidth || window.innerWidth;
    const vH = overlay.offsetHeight || window.innerHeight;
    const scale  = logoRect.height / vH;
    const moveX  = logoRect.left + logoRect.width  / 2 - vW / 2;
    const moveY  = logoRect.top  + logoRect.height / 2 - vH / 2;

    // Overlay shrinks to logo position
    overlay.style.transition = 'transform 0.9s cubic-bezier(0.4,0,0.2,1), border-radius 0.9s ease, opacity 0.35s ease 0.65s';
    overlay.style.transformOrigin = 'center center';
    overlay.style.transform  = `translate(${moveX}px, ${moveY}px) scale(${scale})`;
    overlay.style.borderRadius = '50%';
    overlay.style.opacity    = '0';

    // Nav logo appears as video arrives
    setTimeout(() => {
      if (navLogo) {
        navLogo.style.transition = 'opacity 0.5s ease';
        navLogo.style.opacity = '1';
      }
    }, 700);

    // Remove overlay
    setTimeout(() => overlay.style.display = 'none', 1200);

    // Hero content fades in — set inline styles directly (reliable)
    setTimeout(() => {
      if (heroContent) {
        heroContent.style.opacity    = '0';
        heroContent.style.transform  = 'translateY(30px)';
        heroContent.style.transition = 'none';
        // Force reflow then animate
        heroContent.getBoundingClientRect();
        heroContent.style.transition = 'opacity 1s ease, transform 1s ease';
        heroContent.style.opacity    = '1';
        heroContent.style.transform  = 'translateY(0)';
        heroContent.classList.add('visible');
      }
      // Animate counters
      document.querySelectorAll('[data-count]').forEach(el => {
        const target = parseInt(el.dataset.count || '0');
        let start = null;
        const step = ts => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / 1800, 1);
          const e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.floor(e * target).toLocaleString();
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = target.toLocaleString();
        };
        requestAnimationFrame(step);
      });
    }, 800);
  }

  function skipIntro() {
    if (transitioned) return;
    transitioned = true;
    overlay.style.display = 'none';
    if (navLogo) navLogo.style.opacity = '1';
    if (heroContent) {
      heroContent.style.opacity   = '1';
      heroContent.style.transform = 'translateY(0)';
      heroContent.classList.add('visible');
    }
    document.querySelectorAll('[data-count]').forEach(el => {
      el.textContent = parseInt(el.dataset.count || '0').toLocaleString();
    });
  }


  // ── Sound toggle ─────────────────────────────────────────────────
  const soundBtn = document.getElementById('introSound');
  if (introVideo && soundBtn) {
    // Start muted (autoplay policy), user can unmute
    introVideo.muted = true;
    soundBtn.textContent = '🔇 Sound OFF';
    soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      introVideo.muted = !introVideo.muted;
      soundBtn.textContent = introVideo.muted ? '🔇 Sound OFF' : '🔊 Sound ON';
    });
  }

  skipBtn?.addEventListener('click', skipIntro);

  if (introVideo) {
    introVideo.addEventListener('ended', startTransition);
    const safe = setTimeout(startTransition, 7000);
    introVideo.addEventListener('ended', () => clearTimeout(safe));
    introVideo.play().catch(skipIntro);
  } else {
    skipIntro();
  }
})();
