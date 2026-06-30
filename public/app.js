/* AGON | COMBAT SPORTS — App JS */

// ── API base
const _API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '' : 'https://agon-fighter-production.up.railway.app';
const _STATS_API = _API + '/api/stats';
const _LOCAL_POSTS = '/data/posts.json';
const _LOCAL_STATS = '/data/stats.json';

// ── Current language (set by i18n switcher)
let _currentLang = 'en';

// ── Clean HTML artifacts (```html code fences GPT sometimes adds)
function _cleanText(html) {
  return (html || '')
    .replace(/```html\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}
const _STAT_MAP = {
  'stat-posts':       'posts_published',
  'stat-sources':     'sources_monitored',
  'stat-promotions':  'promotions_covered',
  'stat-countries':   'countries_monitored',
};

function _animateCount(el, target) {
  let start = null;
  (function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / 1800, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(e * target).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString();
  })(performance.now());
}

(async function loadLiveStats() {
  // Try local static data first, then Railway API
  for (const url of [_LOCAL_STATS, _STATS_API]) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) continue;
      const data = await res.json();
      for (const [id, key] of Object.entries(_STAT_MAP)) {
        const el = document.getElementById(id);
        if (el && data[key] != null) {
          el.dataset.count = data[key];
          _animateCount(el, data[key]);
        }
      }
      break;
    } catch (_) {}
  }
})();

// ── Page animation trigger (called by intro.js)
window._triggerPageAnims = function () {
  const content = document.getElementById('heroContent');
  if (content) content.classList.add('visible');
  // Counter animation — only runs if live fetch hasn't already animated them
  document.querySelectorAll('[data-count]').forEach(el => {
    const t = parseInt(el.dataset.count || '0');
    let s = null;
    (function step(ts) {
      if (!s) s = ts;
      const p = Math.min((ts - s) / 1800, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(e * t).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = t.toLocaleString();
    })(performance.now());
  });
};

// ══════════════════════════════════════════════════════════
// GLOBAL HEX — Premium 3D Background
// 3 layers: glass fill + edge shimmer wave + depth vignette
// ══════════════════════════════════════════════════════════
(function() {
  const canvas = document.getElementById('globalCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const S=50, HW=S*Math.sqrt(3), HH=S*2;

  // Pre-compute hex centers + edge data
  let hexes = [], edges = [];
  function build() {
    hexes = []; edges = [];
    for (let row=-1; row<H/(HH*.75)+2; row++) {
      for (let col=-1; col<W/HW+2; col++) {
        const cx=col*HW+(row%2)*HW/2, cy=row*HH*.75;
        if (cx<-80||cx>W+80||cy<-80||cy>H+80) continue;
        hexes.push({cx,cy});
        for (let i=0;i<6;i++) {
          const a1=(Math.PI/3)*i-Math.PI/6, a2=(Math.PI/3)*(i+1)-Math.PI/6;
          const x1=cx+S*Math.cos(a1), y1=cy+S*Math.sin(a1);
          const x2=cx+S*Math.cos(a2), y2=cy+S*Math.sin(a2);
          edges.push({x1,y1,x2,y2,mx:(x1+x2)/2,my:(y1+y2)/2});
        }
      }
    }
  }
  function resize() { W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; build(); }
  resize(); window.addEventListener('resize',resize);

  let t=0;

  (function draw(){
    requestAnimationFrame(draw);
    t += 0.005;
    ctx.clearRect(0,0,W,H);

    // ── LAYER 1: Ambient deep glow (drifts slowly) ──────────────────
    const gx=W*.5+Math.cos(t*.4)*W*.13, gy=H*.38+Math.sin(t*.28)*H*.09;
    const amb=ctx.createRadialGradient(gx,gy,0,gx,gy,Math.min(W,H)*.52);
    amb.addColorStop(0,'rgba(0,50,160,0.28)');
    amb.addColorStop(.6,'rgba(0,16,65,0.10)');
    amb.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=amb; ctx.fillRect(0,0,W,H);

    // ── LAYER 2: Hex inner fills — dark glass panel (3D volume) ──────
    // Each hex gets a radial gradient fill: lighter top-center, darker edges
    // This creates the illusion of concave glass tiles
    for (let h=0; h<hexes.length; h++) {
      const {cx,cy} = hexes[h];
      // Distance from screen center → depth cue
      const dx=(cx/W-.5), dy=(cy/H-.45);
      const dist=Math.sqrt(dx*dx+dy*dy*.6);
      // Vary fill intensity with depth: center slightly lighter (foreground)
      const baseOpacity = 0.035 + dist*0.07;

      // Radial gradient inside hex: bright top → dark edges (convex highlight)
      const fillR = ctx.createRadialGradient(cx, cy-S*.2, 0, cx, cy, S*.92);
      fillR.addColorStop(0, `rgba(5,35,95,${(baseOpacity*1.8).toFixed(3)})`);
      fillR.addColorStop(0.6,`rgba(0,18,55,${(baseOpacity*1.2).toFixed(3)})`);
      fillR.addColorStop(1, `rgba(0,5,20,${(baseOpacity*0.6).toFixed(3)})`);

      ctx.save();
      ctx.fillStyle = fillR;
      ctx.beginPath();
      for (let i=0;i<6;i++) {
        const a=(Math.PI/3)*i-Math.PI/6;
        const px=cx+(S-.8)*Math.cos(a), py=cy+(S-.8)*Math.sin(a);
        i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // ── LAYER 3: Edge shimmer wave ────────────────────────────────────
    const baseAlpha = 0.10;
    for (let i=0; i<edges.length; i++) {
      const e = edges[i];
      // Diagonal wave traveling across screen
      const phase = (e.mx/W)*6 - (e.my/H)*3 + t;
      const wave = (Math.sin(phase)+1)/2;
      const shimmer = Math.pow(Math.max(0,wave-0.55)/0.45, 2.5);
      const totalAlpha = baseAlpha + shimmer*0.24;
      if (totalAlpha < 0.03) continue;
      const lineW = 0.75 + shimmer*1.5;
      const glow  = shimmer*9;
      ctx.save();
      ctx.globalAlpha = Math.min(1,totalAlpha);
      ctx.strokeStyle = shimmer>0.3 ? '#44ccff' : '#1a6699';
      ctx.lineWidth = lineW;
      if (glow>0.5) { ctx.shadowColor='#00c8ff'; ctx.shadowBlur=glow; }
      ctx.beginPath(); ctx.moveTo(e.x1,e.y1); ctx.lineTo(e.x2,e.y2); ctx.stroke();
      ctx.restore();
    }

    // ── LAYER 4: Vignette — depth at screen edges ─────────────────────
    const vig=ctx.createRadialGradient(W*.5,H*.45,H*.18,W*.5,H*.45,Math.max(W,H)*.78);
    vig.addColorStop(0,'rgba(0,0,0,0)');
    vig.addColorStop(0.65,'rgba(0,0,10,0.06)');
    vig.addColorStop(1,'rgba(0,0,25,0.32)');
    ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);

    // ── LAYER 5: Top darkness — sky depth ─────────────────────────────
    const topDark=ctx.createLinearGradient(0,0,0,H*.3);
    topDark.addColorStop(0,'rgba(0,0,15,0.20)');
    topDark.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=topDark; ctx.fillRect(0,0,W,H*.3);
  })();
})();

// ── Custom cursor
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');
let cx = 0, cy = 0, tx = 0, ty = 0;
document.addEventListener('mousemove', e => {
  tx = e.clientX; ty = e.clientY;
  cursorDot.style.left = tx + 'px'; cursorDot.style.top = ty + 'px';
});
(function animCursor() {
  cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
  cursor.style.left = cx + 'px'; cursor.style.top = cy + 'px';
  requestAnimationFrame(animCursor);
})();

// ── Nav scroll
window.addEventListener('scroll', () => {
  document.getElementById('nav')?.classList.toggle('scrolled', window.scrollY > 60);
});

// ── Language dropdown
const langBtn = document.getElementById('langBtn');
const langMenu = document.getElementById('langMenu');
langBtn?.addEventListener('click', e => { e.stopPropagation(); langMenu?.classList.toggle('open'); });
document.addEventListener('click', () => langMenu?.classList.remove('open'));
document.querySelectorAll('#langMenu button').forEach(btn => {
  btn.addEventListener('click', () => {
    const lang = btn.dataset.lang, flag = btn.dataset.flag || '';
    if (langBtn) langBtn.textContent = flag + ' ' + lang.toUpperCase() + ' ▾';
    langMenu?.classList.remove('open');
    document.documentElement.setAttribute('data-lang', lang);
    if (window.i18n) window.i18n.setLang(lang);
    _currentLang = lang;
    // Update JOIN CHANNEL href based on language
    const joinBtn = document.getElementById('joinChannelBtn');
    if (joinBtn) joinBtn.href = joinBtn.dataset['href' + lang] || joinBtn.href;
    // Reload feed with new language (cards will show EN or RU text)
    _feedDisc = 'all';
    _loadFeed(true);
  });
});

// ── Mobile performance: disable heavy canvas animations on small screens ──────
// globalCanvas hex animation is beautiful but GPU-intensive — skip on mobile
if (window.innerWidth < 768 || /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent)) {
  const gc = document.getElementById('globalCanvas');
  if (gc) gc.style.display = 'none';
  // Also disable custom cursor on touch devices
  const cur = document.getElementById('cursor');
  const curD = document.getElementById('cursorDot');
  if (cur) cur.style.display = 'none';
  if (curD) curD.style.display = 'none';
}

// ── Card builder ─────────────────────────────────────────────────────────────
const _DISC_EMOJI = {
  mma: '🥋', boxing: '🥊', kickboxing: '🦵',
  muaythai: '💪', bareknuckle: '👊', grappling: '🤼',
};
const _DISC_LABEL = {
  mma: 'MMA', boxing: 'Boxing', kickboxing: 'Kickboxing',
  muaythai: 'Muay Thai', bareknuckle: 'Bare Knuckle', grappling: 'Grappling',
};

function _buildCard(post, featured = false) {
  const disc = post.discipline || 'other';
  const emoji = _DISC_EMOJI[disc] || '';
  const label = _DISC_LABEL[disc] || disc;
  const photo = post.photo_url
    ? `<div class="card-photo"><img src="${post.photo_url}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
    : '';
  // Language-aware title and preview
  const useEN = _currentLang === 'en' && post.has_en;
  const rawTitle = useEN ? (post.title_en || post.title) : (post.title_ru || post.title);
  const rawHtml = _cleanText(useEN ? (post.text_html_en || post.text_html) : (post.text_html_ru || post.text_html));
  const title = rawTitle || '';
  const preview = rawHtml.replace(/<[^>]+>/g, '').slice(0, 160);
  const dateStr = (post.published_at || '').replace('T', ' ').slice(0, 16);
  return `
    <article class="card${featured ? ' featured' : ''} card--clickable"
             data-disc="${disc}" data-post-id="${post.id}">
      ${photo}
      <div class="card-disc">${emoji} ${label}</div>
      <div class="card-event">${dateStr}</div>
      <h3>${title}</h3>
      <p>${preview}${preview.length >= 160 ? '…' : ''}</p>
      <div class="card-foot"><span class="card-read">Read →</span></div>
    </article>`;
}

// ── Live feed loader ──────────────────────────────────────────────────────────
let _feedPage = 1;
let _feedDisc = 'all';
let _feedLoading = false;

let _allPosts = null;  // cached from local JSON

async function _fetchPosts(disc, page, perPage) {
  // 1. Use local static JSON (always works, no Railway needed)
  if (!_allPosts) {
    try {
      const r = await fetch(_LOCAL_POSTS, { cache: 'no-cache' });
      const d = await r.json();
      _allPosts = d.posts || [];
    } catch { _allPosts = []; }
  }
  let posts = _allPosts;
  if (disc && disc !== 'all') posts = posts.filter(p => p.discipline === disc);
  const start = (page - 1) * perPage;
  return posts.slice(start, start + perPage);
}

async function _loadFeed(reset = false) {
  if (_feedLoading) return;
  _feedLoading = true;
  if (reset) { _feedPage = 1; _allPosts = null; }
  const container = document.getElementById('feed-cards');
  if (!container) { _feedLoading = false; return; }
  if (reset) container.innerHTML = '<div class="feed-loading">Loading...</div>';
  try {
    const posts = await _fetchPosts(_feedDisc, _feedPage, 6);
    if (reset) container.innerHTML = '';
    if (!posts.length) {
      if (reset) container.innerHTML = '<div class="feed-loading">No posts found.</div>';
      _feedLoading = false; return;
    }
    const html = posts.map((p, i) => _buildCard(p, i === 0 && _feedPage === 1)).join('');
    container.insertAdjacentHTML('beforeend', html);
    _feedPage++;
  } catch(e) {
    if (reset) container.innerHTML = `<div class="feed-loading">Error: ${e.message}</div>`;
  } finally { _feedLoading = false; }
}

// ── Analysis feed loader ──────────────────────────────────────────────────────
async function _loadAnalysis() {
  const container = document.getElementById('analysis-cards');
  if (!container) return;
  try {
    if (!_allPosts) {
      const r = await fetch(_LOCAL_POSTS, { cache: 'no-cache' });
      const d = await r.json();
      _allPosts = d.posts || [];
    }
    const posts = _allPosts.slice(0, 3);
    if (!posts.length) return;
    container.innerHTML = posts.map(p => _buildCard(p)).join('');
  } catch { /* keep */ }
}

// Boot feeds
_loadFeed(true);
_loadAnalysis();
document.getElementById('loadMoreBtn')?.addEventListener('click', () => _loadFeed());
document.getElementById('loadMoreAnalysisBtn')?.addEventListener('click', () => _loadAnalysis());

// ── Article modal ────────────────────────────────────────────────────────────
const _modal = document.getElementById('articleModal');
const _modalBody = document.getElementById('modalBody');
const _modalMeta = document.getElementById('modalMeta');
const _modalClose = document.getElementById('modalClose');

const _PLACEHOLDER_POSTS = {
  'placeholder-1': {
    meta: '🦵 Kickboxing · ONE SAMURAI 1 · Tokyo · Apr 29, 2026',
    body: '<b>Takeru stopped Rodtang in the fifth. And left as champion.</b>\n\nInterim ONE Flyweight Kickboxing World Title. TKO Round 5, 2:22.\n\nThe final fight of Takeru Segawa\'s career became one of the most talked-about moments in kickboxing in 2026. He came in as a legend, faced the most dangerous opponent in his division, and left with the belt.\n\nRodtang pushed forward from the first seconds, but Takeru\'s timing was flawless. He absorbed the pressure, stayed composed, and found the finish in round five. The crowd at Ariake Arena witnessed history.\n\n<b>AGON | COMBAT SPORTS</b>\nhttps://t.me/agoncombat',
  },
  'placeholder-2': {
    meta: '🥋 MMA · ONE SAMURAI 1 · Tokyo · Apr 29, 2026',
    body: '<b>One elbow. One moment. A new flyweight MMA champion.</b>\n\nAvazbek Kholmirzaev became the new ONE Flyweight MMA Champion, stopping Yuya Wakamatsu with a spinning back elbow.\n\nIt was the kind of finish that ends up in highlight reels for decades. Kholmirzaev threw the spinning back elbow from a clinch break — clean, precise, devastating. Wakamatsu went down immediately.\n\nThe Uzbekistan native now sits at the top of ONE\'s flyweight division. He called out the pound-for-pound rankings after the win.\n\n<b>AGON | COMBAT SPORTS</b>\nhttps://t.me/agoncombat',
  },
  'placeholder-3': {
    meta: '👁 Analysis · AGON View · June 2026',
    body: '<b>Alex Pereira is chasing a third belt. If he gets it — the GOAT debate becomes inevitable.</b>\n\n13-3 · Former UFC MW Champion · Two-time UFC LHW Champion · GLORY double champion.\n\nAt 36, Pereira is doing something no one in UFC history has done: actively campaigning for a third simultaneous division. His record in title fights — 4 wins, 1 loss — speaks for itself.\n\nThe question is not whether he can win a third belt. The question is what that would mean for his place in history. Jon Jones has the argument of longevity. GSP has the argument of dominance. Pereira has the argument of raw results.\n\nIf he walks out of a heavyweight title fight with the belt, the conversation changes permanently.\n\n<b>AGON | COMBAT SPORTS</b>\nhttps://t.me/agoncombat',
  },
};

function _openModal(postId) {
  _modal.classList.add('open');
  _modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  _modal.scrollTop = 0;

  const post = (_allPosts || []).find(p => p.id === String(postId));
  const modalPhoto = document.getElementById('modalPhoto');

  if (post) {
    _modalMeta.textContent = (post.published_at || '').replace('T', ' ').slice(0, 16);

    // Show photo
    if (post.photo_url && modalPhoto) {
      modalPhoto.src = post.photo_url;
      modalPhoto.classList.remove('modal-photo--hidden');
    } else if (modalPhoto) {
      modalPhoto.classList.add('modal-photo--hidden');
      modalPhoto.src = '';
    }

    // Language-aware body text
    const useEN = _currentLang === 'en' && post.has_en;
    const raw = _cleanText(useEN ? (post.text_html_en || post.text_html) : (post.text_html_ru || post.text_html));
    const body = raw
      .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
      .replace(/\n/g, '<br>');
    _modalBody.innerHTML = body;
  } else {
    if (modalPhoto) { modalPhoto.classList.add('modal-photo--hidden'); modalPhoto.src = ''; }
    _modalBody.innerHTML = '<p style="color:var(--dim);text-align:center;padding:3rem">Post not found.</p>';
  }
}

function _closeModal() {
  _modal.classList.remove('open');
  _modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

_modalClose?.addEventListener('click', _closeModal);
_modal?.addEventListener('click', e => { if (e.target === _modal) _closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') _closeModal(); });

document.addEventListener('click', e => {
  const card = e.target.closest('.card--clickable');
  if (card && card.dataset.postId) _openModal(card.dataset.postId);
});

// ── Discipline filter
document.querySelectorAll('.disc-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.disc-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _feedDisc = btn.dataset.disc || 'all';
    _loadFeed(true);
  });
});

// ── Fighter search — shows AGON posts about this fighter on-site
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');

function _renderPostList(posts, fighterName) {
  if (!posts.length) {
    return `<p style="color:var(--dim);padding:2rem 0;text-align:center">No posts found for <b style="color:var(--white)">${fighterName}</b>.</p>`;
  }
  return posts.map(p => {
    const useEN = _currentLang === 'en' && p.has_en;
    const t = useEN ? (p.title_en || p.title) : (p.title_ru || p.title);
    const preview = _cleanText(useEN ? (p.text_html_en || p.text_html) : (p.text_html_ru || p.text_html))
      .replace(/<[^>]+>/g,'').slice(0,160);
    const photo = p.photo_url ? `<img src="${p.photo_url}" style="width:80px;height:60px;object-fit:cover;border-radius:2px;float:right;margin-left:1rem" loading="lazy">` : '';
    return `<div class="search-result-item" data-post-id="${p.id}">
      ${photo}
      <div class="sri-date">${(p.published_at||'').slice(0,10)}</div>
      <div class="sri-title">${t}</div>
      <div class="sri-preview">${preview}…</div>
      <div class="sri-read">Read →</div>
    </div>`;
  }).join('');
}

async function doSearch(fighterName) {
  const q = (fighterName || searchInput?.value || '').trim();
  if (!q) return;
  _modalMeta.textContent = `AGON coverage: ${q}`;
  _modalBody.innerHTML = '<p style="color:var(--dim);text-align:center;padding:2rem 0">Searching...</p>';
  _modal.classList.add('open');
  _modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  try {
    if (!_allPosts) {
      const r = await fetch(_LOCAL_POSTS, { cache: 'no-cache' });
      const d = await r.json();
      _allPosts = d.posts || [];
    }
    const qLow = q.toLowerCase();
    const found = _allPosts.filter(p => {
      const haystack = [
        p.title_ru, p.title_en, p.text_html_ru, p.text_html_en,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(qLow);
    }).slice(0, 20);
    _modalBody.innerHTML = _renderPostList(found, q);
    _modalBody.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => _openModal(el.dataset.postId));
    });
  } catch(e) {
    _modalBody.innerHTML = `<p style="color:var(--dim);text-align:center;padding:2rem 0">Error loading results.</p>`;
  }
}

searchBtn?.addEventListener('click', () => doSearch());
searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

// Fighter card clicks
document.addEventListener('click', e => {
  const fc = e.target.closest('.f-card--clickable');
  if (fc) doSearch(fc.dataset.fighter);
});
