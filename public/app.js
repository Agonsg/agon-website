/* AGON | COMBAT SPORTS — App JS */

// ── API base
const _API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '' : 'https://agon-fighter-production.up.railway.app';
const _STATS_API = _API + '/api/stats';
const _ARCHIVE_MANIFEST = '/data/posts/manifest.json';
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
  // Try the live Railway API first so counts don't go stale; the static
  // snapshot is only a fallback for when the API is unreachable.
  for (const url of [_STATS_API, _LOCAL_STATS]) {
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
    _monthOptionsRelabel();
    _cselRelabelDefaults();
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
let _feedDay = '';    // '01'-'31', '' = any day
let _feedMonth = '';  // '01'-'12', '' = any month
let _feedYear = '';   // 'YYYY', '' = any year
let _feedOrg = '';    // organization name, '' = no org filter
let _feedLoading = false;

let _allPosts = null;   // merged posts from all archive pages, newest-first
let _archiveManifest = null;

async function _ensureManifest() {
  if (!_archiveManifest) {
    try {
      const r = await fetch(_ARCHIVE_MANIFEST, { cache: 'no-cache' });
      _archiveManifest = await r.json();
    } catch { _archiveManifest = { pages: [], organizations: [] }; }
  }
  return _archiveManifest;
}

// Posts are split into page-NNNN.json shards (highest index = newest) so no
// single file grows past GitHub's 1MB inline-content limit again. Today's
// archive is small enough to merge fully into memory; once historical posts
// are backfilled and page count grows, this is the place to fetch only the
// pages a given date/org filter actually needs instead of all of them.
async function _ensureAllPosts() {
  if (!_allPosts) {
    const manifest = await _ensureManifest();
    const pages = [...manifest.pages].sort((a, b) => b.index - a.index); // newest page first
    try {
      const chunks = await Promise.all(pages.map(p =>
        fetch('/data/posts/' + p.file, { cache: 'no-cache' }).then(r => r.json())));
      _allPosts = chunks.flatMap(c => c.posts || []);
    } catch { _allPosts = []; }
  }
  return _allPosts;
}

async function _fetchPosts(disc, page, perPage) {
  await _ensureAllPosts();
  let posts = _allPosts;
  // In EN mode: only show posts that have EN translation
  if (_currentLang === 'en') posts = posts.filter(p => p.has_en);
  if (disc === 'analysis' || disc === 'history') {
    posts = posts.filter(p => p.content_category === disc);
  } else if (disc && disc !== 'all') {
    posts = posts.filter(p => p.discipline === disc);
  }
  if (_feedDay || _feedMonth || _feedYear) {
    posts = posts.filter(p => {
      const [y, m, d] = (p.published_at || '').slice(0, 10).split('-');
      if (!y) return false;
      if (_feedYear && y !== _feedYear) return false;
      if (_feedMonth && m !== _feedMonth) return false;
      if (_feedDay && d !== _feedDay) return false;
      return true;
    });
  }
  if (_feedOrg) posts = posts.filter(p => p.organization === _feedOrg);
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

// Boot feeds
_loadFeed(true);
document.getElementById('loadMoreBtn')?.addEventListener('click', () => _loadFeed());

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

function _openModal(postId, { pushUrl = true } = {}) {
  _modal.classList.add('open');
  _modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  _modal.scrollTop = 0;
  if (pushUrl) {
    try { history.pushState({ postId: String(postId) }, '', `/post/${postId}`); } catch (_) {}
  }

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

    const shareUrl = location.origin + '/post/' + postId;
    const shareTitle = useEN ? (post.title_en || post.title) : (post.title_ru || post.title);
    const shareEl = document.getElementById('modalShare');
    if (shareEl) {
      shareEl.style.display = '';
      shareEl.dataset.url = shareUrl;
      const tg = document.getElementById('shareTelegramBtn');
      if (tg) tg.href = 'https://t.me/share/url?url=' + encodeURIComponent(shareUrl) + '&text=' + encodeURIComponent(shareTitle || '');
      const tw = document.getElementById('shareTwitterBtn');
      if (tw) tw.href = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(shareUrl) + '&text=' + encodeURIComponent(shareTitle || '');
      const wa = document.getElementById('shareWhatsappBtn');
      if (wa) wa.href = 'https://wa.me/?text=' + encodeURIComponent((shareTitle || '') + ' ' + shareUrl);
    }
  } else {
    if (modalPhoto) { modalPhoto.classList.add('modal-photo--hidden'); modalPhoto.src = ''; }
    _modalBody.innerHTML = '<p style="color:var(--dim);text-align:center;padding:3rem">Post not found.</p>';
    const shareEl = document.getElementById('modalShare');
    if (shareEl) shareEl.style.display = 'none';
  }
}

document.getElementById('shareCopyBtn')?.addEventListener('click', async () => {
  const url = document.getElementById('modalShare')?.dataset.url;
  if (!url) return;
  const btn = document.getElementById('shareCopyBtn');
  try {
    await navigator.clipboard.writeText(url);
    const original = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = original; }, 1500);
  } catch (_) {}
});

function _closeModal({ pushUrl = true } = {}) {
  _modal.classList.remove('open');
  _modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (pushUrl && /^\/post\//.test(location.pathname)) {
    try { history.pushState({}, '', '/'); } catch (_) {}
  }
}

_modalClose?.addEventListener('click', () => _closeModal());
_modal?.addEventListener('click', e => { if (e.target === _modal) _closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') _closeModal(); });

document.addEventListener('click', e => {
  const card = e.target.closest('.card--clickable');
  if (card && card.dataset.postId) _openModal(card.dataset.postId);
});

window.addEventListener('popstate', () => {
  const m = location.pathname.match(/^\/post\/([^/]+)/);
  if (m) _openModal(m[1], { pushUrl: false });
  else _closeModal({ pushUrl: false });
});

// ── Deep link: /post/<id> opens that post directly (used by Telegram notifications)
(async function _openDeepLinkedPost() {
  const m = location.pathname.match(/^\/post\/([^/]+)/);
  if (!m) return;
  const postId = m[1];
  await _ensureAllPosts();
  _openModal(postId, { pushUrl: false });
})();

// ── Discipline filter
// NOTE: only buttons with a real [data-disc] value participate — Fighters/Date/
// Organization share the .disc-btn class purely for matching visual style, but
// each opens its own panel/section and must NOT reset the feed to "all".
document.querySelectorAll('.disc-btn[data-disc]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.disc-btn[data-disc]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _feedDisc = btn.dataset.disc || 'all';
    _loadFeed(true);
  });
});

// ── Header nav discipline links — same filter, scrolls to #feed too
document.querySelectorAll('.nav-disc-link').forEach(a => {
  a.addEventListener('click', () => {
    const disc = a.dataset.disc || 'all';
    // Discipline lives in the header nav now — the News Feed chip below just
    // reflects "we're browsing the feed" (vs. Analysis/History/Fighters).
    document.querySelectorAll('.disc-btn[data-disc]').forEach(b => b.classList.toggle('active', b.dataset.disc === 'all'));
    _feedDisc = disc;
    _loadFeed(true);
  });
});

// ── Fighters filter chip — jumps to the Fighters search section
document.getElementById('filterFightersBtn')?.addEventListener('click', () => {
  document.getElementById('fighters')?.scrollIntoView({ behavior: 'smooth' });
  document.getElementById('searchInput')?.focus();
});

// ── Custom select — replaces native <select> so the open dropdown matches
// the site's dark theme (a native <select> popup is OS-chrome and can't be
// styled). root = the .csel container; onChange fires with the picked value.
function _cselInit(root, onChange) {
  if (!root) return;
  const btn = root.querySelector('.csel-btn');
  const label = root.querySelector('.csel-label');
  const menu = root.querySelector('.csel-menu');
  btn.addEventListener('click', e => {
    e.stopPropagation();
    document.querySelectorAll('.csel-menu.open').forEach(m => { if (m !== menu) m.classList.remove('open'); });
    menu.classList.toggle('open');
  });
  menu.addEventListener('click', e => {
    const opt = e.target.closest('.csel-opt');
    if (!opt) return;
    const value = opt.dataset.value || '';
    root.dataset.value = value;
    label.textContent = opt.textContent;
    menu.querySelectorAll('.csel-opt').forEach(o => o.classList.toggle('active', o === opt));
    menu.classList.remove('open');
    if (onChange) onChange(value);
  });
}
document.addEventListener('click', () => document.querySelectorAll('.csel-menu.open').forEach(m => m.classList.remove('open')));

function _cselValue(id) { return document.getElementById(id)?.dataset.value || ''; }

function _cselAddOption(id, value, text) {
  document.getElementById(id)?.querySelector('.csel-menu')?.insertAdjacentHTML(
    'beforeend', `<button type="button" class="csel-opt" data-value="${value}">${text}</button>`);
}

function _cselReset(id) {
  const root = document.getElementById(id);
  if (!root) return;
  root.dataset.value = '';
  const defaultOpt = root.querySelector('.csel-opt[data-value=""]');
  root.querySelectorAll('.csel-opt').forEach(o => o.classList.toggle('active', o === defaultOpt));
  const label = root.querySelector('.csel-label');
  if (label && defaultOpt) label.textContent = defaultOpt.textContent;
}

// Re-sync a dropdown's visible label with its (just re-translated) default
// option after a language switch — but only while nothing real is picked.
function _cselRelabelDefaults() {
  document.querySelectorAll('.csel').forEach(root => {
    if (root.dataset.value) return;
    const defaultOpt = root.querySelector('.csel-opt[data-value=""]');
    const label = root.querySelector('.csel-label');
    if (label && defaultOpt) label.textContent = defaultOpt.textContent;
  });
}

// Month names are language-dependent (mon01..mon12 in i18n.js) — re-render
// every option's text (values '01'-'12' stay the same) after a language switch.
function _monthOptionsRelabel() {
  if (!window.i18n) return;
  const root = document.getElementById('dateFilterMonth');
  root?.querySelectorAll('.csel-opt[data-value]').forEach(opt => {
    if (!opt.dataset.value) return;
    opt.textContent = window.i18n.t('mon' + opt.dataset.value);
  });
  if (root?.dataset.value) {
    const label = root.querySelector('.csel-label');
    const active = root.querySelector('.csel-opt.active');
    if (label && active) label.textContent = active.textContent;
  }
}

// Populate day (01-31) and month (01-12) once at boot — fixed ranges, no data dependency.
for (let d = 1; d <= 31; d++) { const v = String(d).padStart(2, '0'); _cselAddOption('dateFilterDay', v, v); }
for (let m = 1; m <= 12; m++) {
  const v = String(m).padStart(2, '0');
  _cselAddOption('dateFilterMonth', v, window.i18n ? window.i18n.t('mon' + v) : v);
}

// ── Date filter — day/month/year are independently optional, so you can
// search by day alone, month alone, year alone, or any combination.
const dateFilterPanel = document.getElementById('dateFilterPanel');
const orgFilterPanel = document.getElementById('orgFilterPanel');
_cselInit(document.getElementById('dateFilterDay'));
_cselInit(document.getElementById('dateFilterMonth'));
_cselInit(document.getElementById('dateFilterYear'));
document.getElementById('filterDateBtn')?.addEventListener('click', async () => {
  orgFilterPanel?.setAttribute('hidden', '');
  dateFilterPanel?.toggleAttribute('hidden');
  const yearMenu = document.getElementById('dateFilterYear')?.querySelector('.csel-menu');
  if (yearMenu && yearMenu.children.length <= 1) {
    const manifest = await _ensureManifest();
    const yearSet = new Set();
    manifest.pages.forEach(p => {
      const lo = parseInt((p.min_date || '').slice(0, 4), 10);
      const hi = parseInt((p.max_date || '').slice(0, 4), 10);
      if (lo && hi) for (let y = lo; y <= hi; y++) yearSet.add(String(y));
    });
    [...yearSet].sort().reverse().forEach(y => _cselAddOption('dateFilterYear', y, y));
  }
});
document.getElementById('dateFilterApply')?.addEventListener('click', () => {
  _feedDay = _cselValue('dateFilterDay');
  _feedMonth = _cselValue('dateFilterMonth');
  _feedYear = _cselValue('dateFilterYear');
  _loadFeed(true);
});
document.getElementById('dateFilterClear')?.addEventListener('click', () => {
  _feedDay = _feedMonth = _feedYear = '';
  ['dateFilterDay', 'dateFilterMonth', 'dateFilterYear'].forEach(_cselReset);
  _loadFeed(true);
});

// ── Organisation filter — applies immediately on pick (no separate Apply button)
_cselInit(document.getElementById('orgFilterSelect'), value => {
  _feedOrg = value;
  _loadFeed(true);
});
document.getElementById('filterOrgBtn')?.addEventListener('click', async () => {
  dateFilterPanel?.setAttribute('hidden', '');
  orgFilterPanel?.toggleAttribute('hidden');
  const menu = document.getElementById('orgFilterSelect')?.querySelector('.csel-menu');
  if (menu && menu.children.length <= 1) {
    const manifest = await _ensureManifest();
    manifest.organizations.forEach(org => _cselAddOption('orgFilterSelect', org, org));
  }
});
document.getElementById('orgFilterClear')?.addEventListener('click', () => {
  _feedOrg = '';
  _cselReset('orgFilterSelect');
  _loadFeed(true);
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
    await _ensureAllPosts();
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


const paypalBtn = document.getElementById('paypalBtn');
if (paypalBtn) paypalBtn.href = 'https://paypal.me/cepinoga';

const tonCopyBtn = document.getElementById('tonCopyBtn');
tonCopyBtn?.addEventListener('click', async () => {
  const address = document.getElementById('tonAddress')?.textContent || '';
  try {
    await navigator.clipboard.writeText(address);
    const original = tonCopyBtn.textContent;
    tonCopyBtn.textContent = window.i18n.t('support_ton_copied');
    setTimeout(() => { tonCopyBtn.textContent = original; }, 1800);
  } catch (err) { /* clipboard unavailable — address is still visible to copy manually */ }
});

// ── Contact form → /api/contact → Telegram (owner) ─────────────────────────
const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const submitBtn = document.getElementById('contactSubmit');
  const status = document.getElementById('contactStatus');
  const name = document.getElementById('contactName').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const message = document.getElementById('contactMessage').value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = window.i18n.t('contact_sending');
  status.className = 'contact-status';
  status.textContent = '';

  try {
    const r = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    });
    const data = await r.json();
    if (data.ok) {
      status.className = 'contact-status ok';
      status.textContent = window.i18n.t('contact_success');
      contactForm.reset();
    } else {
      status.className = 'contact-status err';
      status.textContent = window.i18n.t('contact_error');
    }
  } catch (err) {
    status.className = 'contact-status err';
    status.textContent = window.i18n.t('contact_error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = window.i18n.t('contact_submit');
  }
});
