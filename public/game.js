/* ═══════════════════════════════════════════════════════════════════
   AGON ARENA — Anime Fighter Game
   Simple 2D canvas fighting game inspired by classic arcade fighters
══════════════════════════════════════════════════════════════════ */

const gc = document.getElementById('gameCanvas');
if (!gc) { /* skip if not on page */ }
else {
const gctx = gc.getContext('2d');
const GW = 800, GH = 420;

// ── State
let gameState = 'idle'; // idle, fighting, win
let round = 1, timer = 99, timerInterval = null;
let vsAI = false;
let keys = {};
document.addEventListener('keydown', e => { keys[e.key] = true; e.preventDefault?.(); });
document.addEventListener('keyup', e => { keys[e.key] = false; });

// ── Fighter class
class Fighter {
  constructor(x, y, color, name, facing) {
    this.x = x; this.y = y;
    this.w = 48; this.h = 80;
    this.vx = 0; this.vy = 0;
    this.hp = 100; this.maxHp = 100;
    this.color = color;
    this.name = name;
    this.facing = facing; // 1 = right, -1 = left
    this.state = 'idle'; // idle, walk, punch, kick, hurt, block, jump
    this.stateTimer = 0;
    this.onGround = true;
    this.cooldown = 0;
    this.comboCount = 0;
    this.particles = [];
    this.special = 100;
    this.hitEffect = 0;
  }

  get groundY() { return GH - 80 - this.h; }
  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  update(other, inputLeft, inputRight, inputJump, inputPunch, inputKick, inputSpecial) {
    if (this.hp <= 0) { this.state = 'hurt'; return; }
    this.cooldown = Math.max(0, this.cooldown - 1);
    this.hitEffect = Math.max(0, this.hitEffect - 1);
    this.stateTimer = Math.max(0, this.stateTimer - 1);
    this.special = Math.min(100, this.special + 0.08);

    // Face opponent
    this.facing = other.x > this.x ? 1 : -1;

    // Movement
    if (this.stateTimer === 0) {
      this.vx = 0;
      if (inputLeft) { this.vx = -4; this.state = 'walk'; }
      else if (inputRight) { this.vx = 4; this.state = 'walk'; }
      else this.state = 'idle';

      if (inputJump && this.onGround) { this.vy = -14; this.onGround = false; this.state = 'jump'; }

      // Attacks
      if (this.cooldown === 0) {
        if (inputSpecial && this.special >= 80) {
          this.state = 'special'; this.stateTimer = 40; this.cooldown = 50;
          this.special = 0; this._tryHit(other, 25, 180, true);
        } else if (inputKick) {
          this.state = 'kick'; this.stateTimer = 25; this.cooldown = 30;
          this._tryHit(other, 12, 100);
        } else if (inputPunch) {
          this.state = 'punch'; this.stateTimer = 18; this.cooldown = 22;
          this._tryHit(other, 7, 80);
        }
      }
    }

    // Physics
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.7; // gravity
    if (this.y >= this.groundY) { this.y = this.groundY; this.vy = 0; this.onGround = true; }

    // Bounds
    this.x = Math.max(10, Math.min(GW - this.w - 10, this.x));

    // Particles
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life--; p.alpha = p.life / p.maxLife; });
  }

  _tryHit(other, damage, range, isSpecial = false) {
    const dx = Math.abs(this.centerX - other.centerX);
    const dy = Math.abs(this.centerY - other.centerY);
    if (dx < range && dy < 60 && other.hp > 0) {
      const dmg = isSpecial ? damage : Math.floor(damage * (0.8 + Math.random() * 0.4));
      other.hp = Math.max(0, other.hp - dmg);
      other.state = 'hurt'; other.stateTimer = 15;
      other.vx = this.facing * 3; other.hitEffect = 10;
      // Spawn hit particles
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2, speed = 2 + Math.random() * 4;
        other.particles.push({ x: other.centerX, y: other.centerY - 10, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2, life: 20, maxLife: 20, alpha: 1, color: isSpecial ? '#ffdd00' : '#ff3366' });
      }
      this.comboCount++;
      this.special = Math.min(100, this.special + 15);
    }
  }

  draw(ctx) {
    ctx.save();
    const x = this.x, y = this.y, w = this.w, h = this.h;
    const shake = this.hitEffect > 0 ? (Math.random() - 0.5) * 4 : 0;

    // Particles
    this.particles.forEach(p => {
      ctx.save(); ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x + shake, p.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    ctx.translate(x + shake + w / 2, y);
    ctx.scale(this.facing, 1);
    ctx.translate(-w / 2, 0);

    // Special glow
    if (this.state === 'special') {
      ctx.save(); ctx.globalAlpha = 0.4;
      ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 30;
      ctx.fillStyle = '#ffdd00';
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 50, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Body gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    const col = this.hitEffect > 0 ? '#ffffff' : this.color;
    grad.addColorStop(0, col); grad.addColorStop(1, this.color + '88');
    ctx.fillStyle = grad;
    ctx.shadowColor = this.color; ctx.shadowBlur = this.state === 'special' ? 20 : 8;

    // Head
    ctx.beginPath(); ctx.arc(w / 2, 14, 14, 0, Math.PI * 2); ctx.fill();

    // Torso
    ctx.fillRect(w / 2 - 14, 24, 28, 32);

    // Arms based on state
    if (this.state === 'punch' && this.stateTimer > 8) {
      ctx.fillRect(w / 2 + 10, 26, 28, 10); // extended arm
    } else if (this.state === 'kick' && this.stateTimer > 10) {
      ctx.fillRect(w / 2 + 8, 48, 32, 10); // extended leg
    } else {
      ctx.fillRect(w / 2 - 22, 26, 8, 26); // left arm
      ctx.fillRect(w / 2 + 14, 26, 8, 26); // right arm
    }

    // Legs
    const legAnim = this.state === 'walk' ? Math.sin(Date.now() / 100) * 6 : 0;
    ctx.fillRect(w / 2 - 14, 56, 12, 26 + legAnim); // left leg
    ctx.fillRect(w / 2 + 2, 56, 12, 26 - legAnim);  // right leg

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(w / 2 + 4, 12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(w / 2 + 6, 12, 2, 0, Math.PI * 2); ctx.fill();

    // Special: energy aura
    if (this.special >= 80) {
      ctx.save(); ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() / 200);
      ctx.strokeStyle = '#ffdd00'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 38, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}

// ── Draw floor / arena
function drawArena() {
  // Background gradient
  const bg = gctx.createLinearGradient(0, 0, 0, GH);
  bg.addColorStop(0, '#050b18');
  bg.addColorStop(0.7, '#0a1428');
  bg.addColorStop(1, '#0d1830');
  gctx.fillStyle = bg; gctx.fillRect(0, 0, GW, GH);

  // Grid lines
  gctx.strokeStyle = 'rgba(0,200,255,0.04)'; gctx.lineWidth = 1;
  for (let x = 0; x < GW; x += 50) { gctx.beginPath(); gctx.moveTo(x, 0); gctx.lineTo(x, GH); gctx.stroke(); }
  for (let y = 0; y < GH; y += 50) { gctx.beginPath(); gctx.moveTo(0, y); gctx.lineTo(GW, y); gctx.stroke(); }

  // Floor
  const floorY = GH - 80;
  const floor = gctx.createLinearGradient(0, floorY, 0, GH);
  floor.addColorStop(0, 'rgba(0,200,255,0.15)');
  floor.addColorStop(1, 'rgba(0,100,200,0.03)');
  gctx.fillStyle = floor; gctx.fillRect(0, floorY, GW, GH - floorY);

  // Floor line
  gctx.strokeStyle = 'rgba(0,200,255,0.5)'; gctx.lineWidth = 1;
  gctx.beginPath(); gctx.moveTo(0, floorY); gctx.lineTo(GW, floorY); gctx.stroke();

  // AGON logo watermark
  gctx.save(); gctx.globalAlpha = 0.04; gctx.fillStyle = '#00c8ff';
  gctx.font = 'bold 120px "Orbitron", sans-serif'; gctx.textAlign = 'center'; gctx.textBaseline = 'middle';
  gctx.fillText('AGON', GW / 2, GH / 2); gctx.restore();
}

// ── Special move effect
function drawSpecialFlash(p) {
  if (p.state === 'special') {
    gctx.save(); gctx.globalAlpha = 0.15;
    gctx.fillStyle = '#ffdd00'; gctx.fillRect(0, 0, GW, GH);
    gctx.restore();
  }
}

// ── HUD update
function updateHUD(p1, p2) {
  const h1 = document.getElementById('p1Health');
  const h2 = document.getElementById('p2Health');
  const hp1 = document.getElementById('p1Hp');
  const hp2 = document.getElementById('p2Hp');
  if (h1) h1.style.width = p1.hp + '%';
  if (h2) h2.style.width = p2.hp + '%';
  if (hp1) hp1.textContent = Math.max(0, Math.floor(p1.hp));
  if (hp2) hp2.textContent = Math.max(0, Math.floor(p2.hp));
  const roundEl = document.getElementById('roundDisplay');
  if (roundEl) roundEl.textContent = 'RD ' + round;
}

// ── Win screen
function drawWinScreen(winner) {
  gctx.save(); gctx.globalAlpha = 0.7; gctx.fillStyle = '#000'; gctx.fillRect(0, 0, GW, GH); gctx.restore();
  gctx.save();
  gctx.font = 'bold 64px "Orbitron", sans-serif'; gctx.textAlign = 'center'; gctx.textBaseline = 'middle';
  gctx.fillStyle = '#00c8ff'; gctx.shadowColor = '#00c8ff'; gctx.shadowBlur = 30;
  gctx.fillText('KO!', GW / 2, GH / 2 - 40);
  gctx.font = '24px "Orbitron", sans-serif'; gctx.fillStyle = '#fff'; gctx.shadowBlur = 0;
  gctx.fillText(winner + ' WINS', GW / 2, GH / 2 + 20);
  gctx.font = '14px "Space Mono", monospace'; gctx.fillStyle = 'rgba(255,255,255,0.5)';
  gctx.fillText('Press START to play again', GW / 2, GH / 2 + 60);
  gctx.restore();
}

// ── AI input
function getAIInput(ai, player) {
  const dx = player.x - ai.x;
  const dist = Math.abs(dx);
  const keys = { left: false, right: false, jump: false, punch: false, kick: false, special: false };
  if (ai.hp <= 0) return keys;
  if (dx > 0) keys.right = true; else keys.left = true;
  if (dist < 90 && ai.cooldown === 0) {
    if (ai.special >= 80 && Math.random() < 0.05) keys.special = true;
    else if (Math.random() < 0.08) keys.kick = true;
    else if (dist < 70 && Math.random() < 0.15) keys.punch = true;
  }
  if (Math.random() < 0.02) keys.jump = true;
  return keys;
}

// ── Players
let p1, p2;
function initFighters() {
  p1 = new Fighter(150, 100, '#3366ff', 'FIGHTER 1', 1);
  p2 = new Fighter(580, 100, '#ff3344', 'FIGHTER 2', -1);
  p1.hp = p1.maxHp; p2.hp = p2.maxHp;
  if (document.getElementById('p1Name')) document.getElementById('p1Name').textContent = p1.name;
  if (document.getElementById('p2Name')) document.getElementById('p2Name').textContent = vsAI ? 'AI FIGHTER' : p2.name;
  clearInterval(timerInterval);
  timer = 99;
  if (document.getElementById('timerDisplay')) document.getElementById('timerDisplay').textContent = timer;
  timerInterval = setInterval(() => {
    if (gameState !== 'fighting') return;
    timer = Math.max(0, timer - 1);
    if (document.getElementById('timerDisplay')) document.getElementById('timerDisplay').textContent = timer;
    if (timer <= 0) { gameState = 'win'; clearInterval(timerInterval); }
  }, 1000);
}

// ── Main game loop
function gameLoop() {
  requestAnimationFrame(gameLoop);
  if (!p1) { drawArena(); drawIdleScreen(); return; }

  const p1Keys = {
    left: keys['ArrowLeft'], right: keys['ArrowRight'],
    jump: keys['ArrowUp'],
    punch: keys['z'] || keys['Z'],
    kick: keys['x'] || keys['X'],
    special: keys['c'] || keys['C'],
  };
  const p2Keys = vsAI ? getAIInput(p2, p1) : {
    left: keys['a'] || keys['A'], right: keys['d'] || keys['D'],
    jump: keys['w'] || keys['W'],
    punch: keys['j'] || keys['J'],
    kick: keys['k'] || keys['K'],
    special: keys['l'] || keys['L'],
  };

  if (gameState === 'fighting') {
    p1.update(p2, p1Keys.left, p1Keys.right, p1Keys.jump, p1Keys.punch, p1Keys.kick, p1Keys.special);
    p2.update(p1, p2Keys.left, p2Keys.right, p2Keys.jump, p2Keys.punch, p2Keys.kick, p2Keys.special);
    if (p1.hp <= 0 || p2.hp <= 0) { gameState = 'win'; clearInterval(timerInterval); }
  }

  drawArena();
  drawSpecialFlash(p1); drawSpecialFlash(p2);

  if (p1) p1.draw(gctx);
  if (p2) p2.draw(gctx);

  updateHUD(p1, p2);

  if (gameState === 'win') {
    const winner = p1.hp > p2.hp ? p1.name : p2.hp > p1.hp ? (vsAI ? 'AI FIGHTER' : p2.name) : 'DRAW';
    drawWinScreen(winner);
  }
}

function drawIdleScreen() {
  gctx.save();
  gctx.font = 'bold 36px "Orbitron", sans-serif'; gctx.textAlign = 'center'; gctx.textBaseline = 'middle';
  gctx.fillStyle = 'rgba(0,200,255,0.6)'; gctx.shadowColor = '#00c8ff'; gctx.shadowBlur = 20;
  gctx.fillText('AGON ARENA', GW / 2, GH / 2 - 30);
  gctx.font = '16px "Space Mono", sans-serif'; gctx.fillStyle = 'rgba(255,255,255,0.4)'; gctx.shadowBlur = 0;
  gctx.fillText('Press START or VS AI to begin', GW / 2, GH / 2 + 20);
  gctx.restore();
}

// ── Controls
document.getElementById('startBtn')?.addEventListener('click', () => {
  vsAI = false; gameState = 'fighting'; initFighters();
});
document.getElementById('vsAiBtn')?.addEventListener('click', () => {
  vsAI = true; gameState = 'fighting'; initFighters();
});

gameLoop();
}
