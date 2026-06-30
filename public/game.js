/* AGON GAME — VS AI Fighter Game
   Controls: Arrow keys = move/jump | SPACE = attack | SHIFT = special
   Click Easy/Medium/Hard to start vs AI
*/
(function() {

const canvas = document.getElementById('gameCanvas');
if (!canvas) return;

const ctx = canvas.getContext('2d');
const W = 800, H = 400, FLOOR = 310;

function resizeGameCanvas() {
  const parentWidth = Math.min(canvas.parentElement.clientWidth, W);
  const height = Math.round(parentWidth * H / W);
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.style.width = parentWidth + 'px';
  canvas.style.height = height + 'px';
  canvas.width = Math.round(parentWidth * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resizeGameCanvas();
window.addEventListener('resize', resizeGameCanvas);

// ── STATE ────────────────────────────────────────────────────────
let state = 'start'; // start | countdown | play | over
let cdNum = 3, cdTimer = null, roundTime = 90, rtTimer = null;
let aiSpeed = 4, aiAttack = 0.10, aiRange = 100;
let keys = {};

document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if ([' ','ArrowLeft','ArrowRight','ArrowUp'].includes(e.key)) e.preventDefault();
  if (state === 'start' || state === 'over') beginGame();
});
document.addEventListener('keyup', e => keys[e.key] = false);

const touchActionMap = { left:'ArrowLeft', right:'ArrowRight', jump:'ArrowUp', attack:' ', special:'Shift' };
document.querySelectorAll('.touch-control-button').forEach(btn => {
  const action = btn.dataset.action;
  const mapped = touchActionMap[action];
  if (!mapped) return;
  const setActive = () => { keys[mapped] = true; btn.classList.add('active'); if (state === 'start' || state === 'over') beginGame(); };
  const clearActive = () => { keys[mapped] = false; btn.classList.remove('active'); };
  btn.addEventListener('pointerdown', e => { e.preventDefault(); setActive(); });
  btn.addEventListener('pointerup', e => { e.preventDefault(); clearActive(); });
  btn.addEventListener('pointercancel', clearActive);
  btn.addEventListener('pointerleave', clearActive);
});

// ── AUDIO ─────────────────────────────────────────────────────────
let ac;
function beep(hz, t, v=0.25) {
  try {
    if (!ac) ac = new (window.AudioContext||window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    const s = ac.currentTime;
    o.frequency.value = hz;
    g.gain.setValueAtTime(v, s);
    g.gain.exponentialRampToValueAtTime(0.001, s+t);
    o.start(s); o.stop(s+t);
  } catch(_){}
}

// ── FIGHTER ───────────────────────────────────────────────────────
class Fighter {
  constructor(x, isHuman) {
    this.x = x; this.y = FLOOR;
    this.vx = 0; this.vy = 0;
    this.w = 50; this.h = 80;
    this.hp = 100;
    this.isHuman = isHuman;
    this.color  = isHuman ? '#4488ff' : '#888899';
    this.accent = isHuman ? '#00ccff' : '#aaddff';
    this.face   = 1;  // which way facing
    this.state  = 'idle';  // idle walk jump punch kick hurt special
    this.stimer = 0;  // state timer
    this.cool   = 0;  // attack cooldown
    this.sp     = 0;  // special charge 0-100
    this.flash  = 0;  // hit flash
    this.sparks = [];
  }

  get cx() { return this.x + this.w/2; }
  get cy() { return this.y + this.h/2; }
  get alive() { return this.hp > 0; }

  step(other, inp) {
    if (!this.alive) { this.state='hurt'; return; }

    // Decay timers
    if (this.stimer > 0) this.stimer--;
    if (this.cool   > 0) this.cool--;
    if (this.flash  > 0) this.flash--;
    this.sp = Math.min(100, this.sp + 0.15);
    this.face = other.x > this.x ? 1 : -1;

    // Update sparks
    this.sparks = this.sparks.filter(s => s.life > 0);
    this.sparks.forEach(s => { s.x+=s.vx; s.y+=s.vy; s.vy+=0.5; s.life--; });

    // Mid-attack: lock movement (but allow physics)
    if (this.stimer > 0) {
      this.x += this.vx * 0.5;
      this._physics();
      return;
    }

    // Movement
    this.vx = 0;
    this.state = 'idle';
    if (inp.left)  { this.vx = -5; this.state = 'walk'; }
    if (inp.right) { this.vx =  5; this.state = 'walk'; }
    if (inp.jump && this.y >= FLOOR) { this.vy = -17; this.state = 'jump'; }

    // Attacks
    if (this.cool === 0) {
      if (inp.special && this.sp >= 80) {
        this.state='special'; this.stimer=42; this.cool=58; this.sp=0;
        this._strike(other, 28, 210, true);
        beep(80,0.4,0.5);
      } else if (inp.attack) {
        if (Math.random()<0.6) {
          this.state='punch'; this.stimer=18; this.cool=24;
          this._strike(other, 10, 100);
          beep(250,0.07,0.3);
        } else {
          this.state='kick'; this.stimer=24; this.cool=32;
          this._strike(other, 14, 118);
          beep(180,0.09,0.3);
        }
      }
    }

    this.x += this.vx;
    this._physics();
  }

  _physics() {
    this.y += this.vy;
    this.vy += 0.9;
    if (this.y >= FLOOR) { this.y = FLOOR; this.vy = 0; }
    this.x = Math.max(8, Math.min(W - this.w - 8, this.x));
  }

  _strike(other, dmg, range, special=false) {
    if (!other.alive) return;
    if (Math.abs(this.cx - other.cx) < range && Math.abs(this.cy - other.cy) < 90) {
      const d = Math.floor(dmg * (0.8 + Math.random()*0.4));
      other.hp = Math.max(0, other.hp - d);
      other.state='hurt'; other.stimer=16;
      other.flash = 10;
      this.sp = Math.min(100, this.sp + 20);
      for (let i=0;i<(special?14:7);i++) {
        const a=Math.random()*Math.PI*2, s=2+Math.random()*5;
        other.sparks.push({x:other.cx,y:other.cy-10,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,life:16,color:special?'#ffee00':this.accent});
      }
      if (!special) beep(160+Math.random()*80,0.08);
    }
  }

  draw() {
    const hx = this.hitFlash > 0 ? (Math.random()-0.5)*4 : 0; // no hitFlash here, use flash
    const fx = this.flash > 0 ? (Math.random()-0.5)*4 : 0;
    const px = Math.round(this.x + fx);
    const py = Math.round(this.y);
    const W2 = this.w, H2 = this.h;

    // Sparks
    this.sparks.forEach(s => {
      const a = s.life / 16;
      ctx.save(); ctx.globalAlpha=a; ctx.fillStyle=s.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 6.28); ctx.fill(); ctx.restore();
    });

    // Special aura
    if (this.state==='special') {
      ctx.save(); ctx.globalAlpha=0.55;
      const rg=ctx.createRadialGradient(px+W2/2,py+H2/2,0,px+W2/2,py+H2/2,65);
      rg.addColorStop(0,'#ffee00'); rg.addColorStop(1,'transparent');
      ctx.fillStyle=rg; ctx.fillRect(px-20,py-20,W2+40,H2+40); ctx.restore();
    }

    // Charge ring
    if (this.sp>=80 && this.state!=='special') {
      ctx.save(); ctx.strokeStyle='rgba(255,230,0,0.7)'; ctx.lineWidth=2.5;
      ctx.shadowColor='#ffee00'; ctx.shadowBlur=12+4*Math.sin(Date.now()/120);
      ctx.beginPath(); ctx.arc(px+W2/2,py+H2/2,42,0,6.28); ctx.stroke(); ctx.restore();
    }

    // Floor shadow
    ctx.save(); ctx.globalAlpha=0.18; ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(px+W2/2,FLOOR+H2+3,24,7,0,0,6.28); ctx.fill(); ctx.restore();

    // Body color
    const bodyCol = this.flash > 0 ? '#ffffff' : this.color;
    const grad = ctx.createLinearGradient(px,py,px,py+H2);
    grad.addColorStop(0, bodyCol + 'ee');
    grad.addColorStop(1, this.color + '66');

    ctx.save();
    ctx.fillStyle = grad;
    ctx.strokeStyle = this.accent;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = this.accent;
    ctx.shadowBlur = this.hp < 25 ? 16 : 8;

    // HEAD
    ctx.beginPath(); ctx.arc(px+W2/2, py+14, 16, 0, 6.28); ctx.fill(); ctx.stroke();

    // TORSO
    ctx.beginPath(); ctx.roundRect(px+W2/2-14,py+27,28,30,4); ctx.fill(); ctx.stroke();

    // ARMS
    const isRight = this.face === 1;
    const armX = isRight ? px+W2/2+12 : px+W2/2-44;
    if (this.state==='punch' && this.stimer>7) {
      ctx.fillRect(armX, py+30, 32, 10); ctx.strokeRect(armX, py+30, 32, 10);
      ctx.save(); ctx.fillStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=18;
      ctx.beginPath(); ctx.arc(armX+(isRight?38:-4), py+35, 9, 0, 6.28); ctx.fill(); ctx.restore();
    } else if (this.state==='kick' && this.stimer>10) {
      const kx = isRight ? px+W2/2 : px+W2/2-40;
      ctx.fillRect(kx, py+56, 40, 11); ctx.strokeRect(kx, py+56, 40, 11);
      ctx.save(); ctx.fillStyle='#ff9900'; ctx.shadowColor='#ff9900'; ctx.shadowBlur=18;
      ctx.beginPath(); ctx.arc(kx+(isRight?46:-6), py+61, 10, 0, 6.28); ctx.fill(); ctx.restore();
    } else {
      // Guard
      ctx.fillRect(px+W2/2-22,py+30,9,24); ctx.strokeRect(px+W2/2-22,py+30,9,24);
      ctx.fillRect(px+W2/2+13,py+30,9,24); ctx.strokeRect(px+W2/2+13,py+30,9,24);
      ctx.beginPath(); ctx.arc(px+W2/2-18, py+27, 8,0,6.28); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(px+W2/2+18, py+27, 8,0,6.28); ctx.fill(); ctx.stroke();
    }

    // LEGS
    const la = this.state==='walk' ? Math.sin(Date.now()/80)*10 : 0;
    ctx.fillRect(px+W2/2-14,py+55,12,26+la); ctx.strokeRect(px+W2/2-14,py+55,12,26+la);
    ctx.fillRect(px+W2/2+2, py+55,12,26-la); ctx.strokeRect(px+W2/2+2, py+55,12,26-la);

    // EYES
    ctx.shadowBlur=0; ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(px+W2/2+5, py+12, 5.5, 0, 6.28); ctx.fill();
    ctx.fillStyle = this.hp<20 ? '#f00' : this.isHuman ? '#001133' : '#334455';
    ctx.beginPath(); ctx.arc(px+W2/2+7, py+12, 3, 0, 6.28); ctx.fill();

    // For AI: robot eye (glowing cyan)
    if (!this.isHuman) {
      ctx.save(); ctx.fillStyle=this.accent; ctx.shadowColor=this.accent; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(px+W2/2+7, py+12, 3, 0, 6.28); ctx.fill(); ctx.restore();
    }

    // Name
    ctx.shadowBlur=0; ctx.fillStyle=this.accent; ctx.globalAlpha=0.95;
    ctx.font='bold 9px Orbitron,sans-serif'; ctx.textAlign='center';
    ctx.fillText(this.isHuman?'YOU':'A.I.', px+W2/2, py-6);

    ctx.restore();
  }
}

// ── ARENA BG ──────────────────────────────────────────────────────
function drawBG() {
  // Sky gradient
  const sky = ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#08042a'); sky.addColorStop(0.7,'#0c0a38'); sky.addColorStop(1,'#1a0a50');
  ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);

  // Corner spotlights
  const spots = [[120,'rgba(0,120,255,0.12)'],[W-120,'rgba(255,50,50,0.10)']];
  spots.forEach(([x,c2]) => {
    const g=ctx.createRadialGradient(x,0,0,x,0,260);
    g.addColorStop(0,c2); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  });

  // Grid
  ctx.strokeStyle='rgba(100,80,255,0.06)'; ctx.lineWidth=1;
  for(let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

  // Floor glow
  const floorGrad=ctx.createLinearGradient(0,FLOOR+80,0,H);
  floorGrad.addColorStop(0,'rgba(60,30,200,0.5)'); floorGrad.addColorStop(1,'rgba(0,0,60,0.05)');
  ctx.fillStyle=floorGrad; ctx.fillRect(0,FLOOR+80,W,H-FLOOR-80);

  // Floor line
  ctx.strokeStyle='#7755ff'; ctx.lineWidth=2.5;
  ctx.shadowColor='#6644ff'; ctx.shadowBlur=14;
  ctx.beginPath(); ctx.moveTo(0,FLOOR+80); ctx.lineTo(W,FLOOR+80); ctx.stroke();
  ctx.shadowBlur=0;

  // Center divider
  ctx.setLineDash([4,10]); ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,FLOOR+80); ctx.stroke();
  ctx.setLineDash([]);

  // AGON watermark
  ctx.save(); ctx.globalAlpha=0.04; ctx.fillStyle='#8866ff';
  ctx.font='bold 88px Orbitron,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('AGON',W/2,H/2); ctx.restore();
}

// ── HUD ───────────────────────────────────────────────────────────
let p1, ai;

function updateHUD() {
  function setBar(id, val) {
    const el=document.getElementById(id); if(!el)return;
    el.style.width=Math.max(0,val)+'%';
    el.style.background=val>50?'linear-gradient(90deg,#00cc44,#44ff88)':val>25?'linear-gradient(90deg,#ff8800,#ffaa33)':'linear-gradient(90deg,#ff2200,#ff5544)';
  }
  setBar('p1Hp', p1?p1.hp:100);
  setBar('p2Hp', ai?ai.hp:100);
  const n1=document.getElementById('p1HpNum'),n2=document.getElementById('p2HpNum');
  if(n1&&p1)n1.textContent=Math.max(0,Math.floor(p1.hp));
  if(n2&&ai)n2.textContent=Math.max(0,Math.floor(ai.hp));
  const tm=document.getElementById('tmDisp');
  if(tm){ tm.textContent=roundTime; tm.style.color=roundTime<=10?'#ff4444':'#00c8ff'; }
  const rd=document.getElementById('rdDisp');
  if(rd&&p1){ const sp=Math.floor(p1.sp); rd.textContent=sp>=80?'⚡READY!':'SP '+sp+'%'; rd.style.color=sp>=80?'#ffee00':'#00c8ff'; }
  const n1e=document.getElementById('p1Name'),n2e=document.getElementById('p2Name');
  if(n1e)n1e.textContent='YOU'; if(n2e)n2e.textContent='A.I.';
}

// ── SCREENS ───────────────────────────────────────────────────────
function drawStart() {
  ctx.save(); ctx.textAlign='center';
  ctx.font='bold 34px Orbitron,sans-serif'; ctx.fillStyle='#00c8ff';
  ctx.shadowColor='#00c8ff'; ctx.shadowBlur=25;
  ctx.fillText('AGON GAME', W/2, H/2-95);

  // Info box
  ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.shadowBlur=0;
  ctx.fillRect(W/2-190,H/2-62,380,118);
  ctx.strokeStyle='rgba(0,200,255,0.3)'; ctx.lineWidth=1;
  ctx.strokeRect(W/2-190,H/2-62,380,118);

  ctx.font='11px Orbitron,monospace'; ctx.fillStyle='#00c8ff';
  ctx.fillText('HOW TO PLAY — VS AI ROBOT', W/2, H/2-44);

  const rows=[['← →','Move left / right'],['↑','Jump'],['SPACE','Attack (punch & kick)'],['SHIFT','Special Attack ⚡ (charge first!)']];
  ctx.font='12px Space Mono,monospace'; ctx.textAlign='left';
  rows.forEach(([k,v],i)=>{
    ctx.fillStyle='#ffe566'; ctx.fillText(k, W/2-175, H/2-20+i*22);
    ctx.fillStyle='#bbddff'; ctx.fillText(v, W/2-95,  H/2-20+i*22);
  });

  const pulse=0.5+0.5*Math.sin(Date.now()/400);
  ctx.textAlign='center'; ctx.font='bold 14px Orbitron,monospace';
  ctx.fillStyle=`rgba(255,255,255,${pulse})`;
  ctx.shadowColor='#00c8ff'; ctx.shadowBlur=14;
  ctx.fillText('▶  Click EASY / MEDIUM / HARD  ◀', W/2, H/2+78);
  ctx.restore();
}

function drawCountdown() {
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font='bold 100px Orbitron,sans-serif';
  ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffaa00'; ctx.shadowBlur=40;
  ctx.fillText(cdNum>0?String(cdNum):'FIGHT!', W/2, H/2);
  ctx.restore();
}

function drawOver() {
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font='bold 68px Orbitron,sans-serif';
  const win = p1&&p1.hp>0;
  ctx.fillStyle=win?'#44ff88':'#ff4444';
  ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=35;
  ctx.fillText('K.O.', W/2, H/2-40);
  ctx.font='bold 22px Orbitron,monospace'; ctx.shadowBlur=0;
  ctx.fillStyle='#fff'; ctx.fillText(win?'🏆 YOU WIN!':'💀 AI WINS', W/2, H/2+18);
  ctx.font='12px Space Mono,monospace'; ctx.fillStyle='rgba(255,255,255,0.5)';
  ctx.fillText('Click a difficulty button to play again', W/2, H/2+55);
  ctx.restore();
}

// ── GAME FLOW ─────────────────────────────────────────────────────
function beginGame(diff) {
  clearInterval(cdTimer); clearInterval(rtTimer);
  const cfg={easy:{s:2.5,a:0.04,r:115},medium:{s:4,a:0.10,r:100},hard:{s:6,a:0.22,r:88}};
  const d=cfg[diff||'medium']||cfg.medium;
  aiSpeed=d.s; aiAttack=d.a; aiRange=d.r;
  // highlight button
  document.querySelectorAll('.ai-btn').forEach(b=>b.classList.toggle('active',b.dataset.level===(diff||'medium')));

  p1 = new Fighter(160, true);
  ai = new Fighter(560, false);

  state='countdown'; cdNum=3; roundTime=90;
  beep(660,0.1);
  cdTimer = setInterval(()=>{
    cdNum--;
    if(cdNum>0){beep(660,0.1);}
    else{
      clearInterval(cdTimer); state='play'; beep(880,0.15);
      rtTimer=setInterval(()=>{ if(state==='play'){roundTime=Math.max(0,roundTime-1); if(!roundTime)state='over';} },1000);
    }
  },1000);
}

// ── MAIN LOOP ─────────────────────────────────────────────────────
let shake=0;
function loop() {
  requestAnimationFrame(loop);

  // Screen shake
  const sx=shake>0?(Math.random()-0.5)*shake:0;
  const sy=shake>0?(Math.random()-0.5)*shake:0;
  shake=Math.max(0,shake-1);
  ctx.save(); ctx.translate(sx,sy);

  drawBG();

  if (state==='start') { drawStart(); updateHUD(); ctx.restore(); return; }
  if (state==='countdown') {
    if(p1)p1.draw(); if(ai)ai.draw();
    drawCountdown(); updateHUD(); ctx.restore(); return;
  }

  if (state==='play') {
    // Player input
    const pi={left:keys['ArrowLeft'],right:keys['ArrowRight'],jump:keys['ArrowUp'],attack:keys[' ']||keys['z']||keys['Z'],special:keys['Shift']||keys['c']||keys['C']};
    // AI input
    const dist=Math.abs(ai.cx-p1.cx);
    const ak={left:false,right:false,jump:false,attack:false,special:false};
    if(dist>aiRange){if(p1.x<ai.x)ak.left=true;else ak.right=true;}
    else{if(p1.x<ai.x)ak.left=true;else ak.right=true;}
    if(ai.cool===0&&dist<aiRange+25){
      if(ai.sp>=80&&Math.random()<aiAttack*0.5)ak.special=true;
      else if(Math.random()<aiAttack)ak.attack=true;
    }
    if(Math.random()<0.015&&ai.y>=FLOOR)ak.jump=true;

    p1.step(ai, pi); ai.step(p1, ak);
    if(p1.hp<=0||ai.hp<=0){ state='over'; clearInterval(rtTimer); shake=15; beep(p1.hp>0?880:110,0.5,0.4); }
  }

  if(p1)p1.draw(); if(ai)ai.draw();
  if(state==='over') drawOver();
  updateHUD();
  ctx.restore();
}

// ── BUTTONS ───────────────────────────────────────────────────────
document.querySelectorAll('.ai-btn').forEach(btn=>{
  btn.addEventListener('click',()=>beginGame(btn.dataset.level));
});
canvas.addEventListener('click',()=>{ if(state==='start'||state==='over')beginGame('medium'); });

// Auto-start on page for better UX
loop();
// Set medium as pre-selected
document.querySelector('.ai-btn[data-level="medium"]')?.classList.add('active');

})();
