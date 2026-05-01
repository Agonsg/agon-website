/* ═══════════════════════════════════════════════════════════════════
   AGON | COMBAT SPORTS — App JS
   Animations, Hex Canvas, Counter, Cursor, Intersection Observer
══════════════════════════════════════════════════════════════════ */

// ── Custom cursor
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');
let cx = 0, cy = 0, tx = 0, ty = 0;
document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; cursorDot.style.left = tx + 'px'; cursorDot.style.top = ty + 'px'; });
function animCursor() {
  cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
  cursor.style.left = cx + 'px'; cursor.style.top = cy + 'px';
  requestAnimationFrame(animCursor);
}
animCursor();
document.querySelectorAll('a, button, .intel-card, .fighter-card').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});

// ── Nav scroll
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 80);
});

// ── Hex particle canvas
const canvas = document.getElementById('hexCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = (Math.random() - 0.5) * 0.3;
      this.alpha = Math.random() * 0.6 + 0.1;
      this.pulse = Math.random() * Math.PI * 2;
    }
    update() {
      this.x += this.vx; this.y += this.vy; this.pulse += 0.02;
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
    }
    draw() {
      const a = this.alpha * (0.7 + 0.3 * Math.sin(this.pulse));
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#00c8ff';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill(); ctx.restore();
    }
  }

  for (let i = 0; i < 120; i++) particles.push(new Particle());

  function drawHexGrid() {
    const s = 40, w = s * Math.sqrt(3), h = s * 2;
    ctx.strokeStyle = 'rgba(0,200,255,0.06)'; ctx.lineWidth = 0.5;
    for (let row = -1; row < canvas.height / (h * 0.75) + 2; row++) {
      for (let col = -1; col < canvas.width / w + 2; col++) {
        const x = col * w + (row % 2) * w / 2;
        const y = row * h * 0.75;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = x + s * Math.cos(angle), py = y + s * Math.sin(angle);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
      }
    }
  }

  // Draw connections between nearby particles
  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.save(); ctx.globalAlpha = (1 - dist / 100) * 0.15;
          ctx.strokeStyle = '#00c8ff'; ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke(); ctx.restore();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawHexGrid();
    drawConnections();
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
}

// ── Intersection observer for animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
document.querySelectorAll('[data-anim]').forEach(el => observer.observe(el));

// ── Counter animation
function animateCounter(el, target, duration = 1800) {
  let start = null;
  const step = timestamp => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(ease * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString();
  };
  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const target = parseInt(e.target.dataset.count);
      animateCounter(e.target, target);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

// ── Lang switcher
document.getElementById('langSwitcher')?.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const lang = btn.dataset.lang;
    document.documentElement.setAttribute('data-lang', lang);
    if (window.i18n) window.i18n.setLang(lang);
  });
});

// ── Search redirect to bot
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
function doSearch() {
  const q = searchInput?.value.trim();
  if (q) { window.open(`https://t.me/agoncombatbot?start=stats_${encodeURIComponent(q)}`, '_blank'); }
}
searchBtn?.addEventListener('click', doSearch);
searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
