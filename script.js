// Canvas and Context
const gameCanvas = document.getElementById('gameCanvas');
const gameCtx = gameCanvas.getContext('2d');
const homeCanvas = document.getElementById('homeCanvas');
const homeCtx = homeCanvas.getContext('2d');
const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas.getContext('2d');

// Game Variables
let gameState = 'home'; // home, playing, gameOver
let birdX = 60;
let birdY = 300;
let birdWidth = 36;
let birdHeight = 36;
let velocity = 0;
let gravity = 0.45;
let flapPower = -9.5;
let maxFallSpeed = 9;   // terminal velocity: stops the plummet after you stop flapping
let maxRiseSpeed = 8;   // caps how fast a single flap can launch the bird
let pipeSpacing = 180; // gap between top and bottom pipe
let pipeDistance = 260; // distance between pipes
let pipeWidth = 80;
let gameSpeed = 5;
let score = 0;
let pipes = [];
let frameCount = 0;
let wingAngle = 0;

// Game Settings with theme and per-difficulty scores
const gameSettings = {
  difficulty: 'normal',
  theme: 'day',
  birdColor: 'yellow-solid'
};

// Flight feel is tuned per difficulty:
//  - flapPower:    how much lift one tap gives (smaller = gentler, more controlled hops)
//  - gravity:      how hard the bird is pulled down
//  - maxFallSpeed: terminal velocity, so letting go never turns into a free-fall plummet
//  - maxRiseSpeed: caps upward speed so a tap can never rocket the bird off-screen
// Easy is forgiving and floaty; hard is snappy and punishing.
// One tap lifts the bird roughly flapPower^2 / (2 * gravity) pixels. That lift is
// deliberately kept below half the pipe gap on every mode, so flapping from the
// middle of a gap can never punt the bird into the top pipe. The ratio of lift to
// half-gap climbs with difficulty (~50% easy, ~70% normal, ~82% hard), which is
// what makes easy feel forgiving and hard feel twitchy.
const difficultySettings = {
  easy:   { gravity: 0.26, speed: 3,   pipeDistance: 300, pipeSpacing: 210, flapPower: -5.2, maxFallSpeed: 6.5,  maxRiseSpeed: 5.2 },
  normal: { gravity: 0.36, speed: 4.5, pipeDistance: 270, pipeSpacing: 185, flapPower: -6.9, maxFallSpeed: 8.5,  maxRiseSpeed: 6.9 },
  hard:   { gravity: 0.52, speed: 6.5, pipeDistance: 245, pipeSpacing: 165, flapPower: -8.4, maxFallSpeed: 11.0, maxRiseSpeed: 8.4 }
};

// Single entry point for flapping so keyboard, mouse and touch all feel identical.
const flap = () => {
  velocity = flapPower;
};

// Per-difficulty highscores
const getHighScore = (difficulty) => {
  return parseInt(localStorage.getItem(`flappyBirdHighscore_${difficulty}`) || '0');
};

const setHighScore = (difficulty, score) => {
  localStorage.setItem(`flappyBirdHighscore_${difficulty}`, score);
};

// Confetti Particle System
class ConfettiParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = Math.random() * -8 - 4;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    this.size = Math.random() * 6 + 4;
    this.life = 1;
    this.decay = Math.random() * 0.015 + 0.015;
    this.color = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'][Math.floor(Math.random() * 5)];
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.3; // gravity
    this.rotation += this.rotationSpeed;
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

let confettiParticles = [];

const createConfetti = () => {
  const centerX = gameCanvas.width / 2;
  const centerY = gameCanvas.height / 3;
  for (let i = 0; i < 50; i++) {
    confettiParticles.push(new ConfettiParticle(centerX, centerY));
  }
};

const updateConfetti = () => {
  confettiParticles = confettiParticles.filter(p => p.life > 0);
  confettiParticles.forEach(p => p.update());
};

const drawConfetti = () => {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles.forEach(p => p.draw(confettiCtx));
};

// Theme System
const initTheme = () => {
  const savedTheme = localStorage.getItem('flappyBirdTheme') || 'day';
  gameSettings.theme = savedTheme;
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.querySelector(`input[name="theme"][value="${savedTheme}"]`).checked = true;
};

const setTheme = (theme) => {
  gameSettings.theme = theme;
  localStorage.setItem('flappyBirdTheme', theme);
  document.documentElement.setAttribute('data-theme', theme);
};

// Load and Save Settings
const loadSettings = () => {
  const saved = localStorage.getItem('flappyBirdSettings');
  if (saved) {
    const settings = JSON.parse(saved);
    gameSettings.difficulty = settings.difficulty || 'normal';
    gameSettings.birdColor = settings.birdColor || 'yellow-solid';
  }
  
  // Load theme
  initTheme();
  
  // Update UI
  document.querySelector(`input[name="difficulty"][value="${gameSettings.difficulty}"]`).checked = true;
  document.querySelector(`input[name="birdColor"][value="${gameSettings.birdColor}"]`).checked = true;
};

const saveSettings = () => {
  localStorage.setItem('flappyBirdSettings', JSON.stringify({
    difficulty: gameSettings.difficulty,
    birdColor: gameSettings.birdColor
  }));
};

// Deterministic pseudo-random in [0, 1) from integer coordinates.
// The city used Math.random() while drawing, so every window re-rolled its lit
// state on every single frame — that is what made the night skyline shimmer and
// look like it was vibrating. This hash gives each window a fixed value instead.
const windowNoise = (a, b, c) => {
  let h = a * 374761393 + b * 668265263 + c * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// ---------------------------------------------------------------------------
// City skyline
//
// The layout is generated once and cached. Every property of every building is
// derived from the deterministic hash above, never Math.random(), so the
// skyline is identical on every frame and cannot shimmer. Two layers scroll at
// different speeds for depth; all drawing coordinates are rounded to whole
// pixels so the windows stay crisp instead of crawling as they scroll.
// ---------------------------------------------------------------------------

const ROOF_STYLES = ['flat', 'parapet', 'stepped', 'antenna', 'watertower', 'spire'];
const WINDOW_STYLES = ['grid', 'bands', 'slits'];

// Build one horizontal strip of buildings wide enough to tile seamlessly.
const buildCityLayer = (seed, cfg, targetWidth) => {
  const buildings = [];
  let x = 0;
  let i = 0;
  while (x < targetWidth) {
    const r = (n) => windowNoise(seed, i, n);
    const w = Math.round(cfg.minW + r(1) * (cfg.maxW - cfg.minW));
    const h = Math.round(cfg.minH + r(2) * (cfg.maxH - cfg.minH));
    buildings.push({
      x,
      w,
      h,
      roof: ROOF_STYLES[Math.floor(r(3) * ROOF_STYLES.length)],
      windows: WINDOW_STYLES[Math.floor(r(4) * WINDOW_STYLES.length)],
      // Per-building window grid so no two towers share a pattern
      cols: 2 + Math.floor(r(5) * 3),
      rowGap: 11 + Math.floor(r(6) * 6),
      tint: r(7),          // slight per-building body colour variation
      litSeed: i,          // stable seed for which windows are lit at night
      beacon: r(8) > 0.5   // antenna beacon light
    });
    x += w + Math.round(cfg.minGap + r(9) * (cfg.maxGap - cfg.minGap));
    i++;
  }
  return { buildings, stripWidth: x };
};

let cityCache = null;

const getCity = () => {
  if (cityCache && cityCache.h === gameCanvas.height && cityCache.w === gameCanvas.width) return cityCache;
  const target = gameCanvas.width * 2;
  cityCache = {
    w: gameCanvas.width,
    h: gameCanvas.height,
    // Far layer: shorter, narrower, hazier, drifts slowly
    far: buildCityLayer(11, { minW: 30, maxW: 58, minH: 60, maxH: 150, minGap: 4, maxGap: 14 }, target),
    // Near layer: the dominant skyline
    near: buildCityLayer(29, { minW: 44, maxW: 88, minH: 105, maxH: 235, minGap: 8, maxGap: 22 }, target)
  };
  return cityCache;
};

// Mix two hex colours; used to tint each building slightly differently.
const mixHex = (a, b, t) => {
  const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
};

// Windows for one building, in whichever grid style it was assigned.
const drawBuildingWindows = (b, bx, by, night, depth) => {
  const pad = 6;
  const litColors = ['#ffe9a3', '#ffd782', '#fff3c4', '#ffc76b'];
  const darkGlass = night ? '#12172b' : '#c8cdd8';

  if (b.windows === 'bands') {
    // Continuous horizontal glazing, modern office block
    for (let row = 0, wy = by + pad; wy < by + b.h - pad - 4; row++, wy += b.rowGap) {
      const lit = night && windowNoise(b.litSeed, row, 0) > 0.45;
      gameCtx.fillStyle = lit ? litColors[Math.floor(windowNoise(b.litSeed, row, 1) * litColors.length)] : darkGlass;
      gameCtx.globalAlpha = lit ? 0.9 : (night ? 0.9 : 0.75);
      gameCtx.fillRect(Math.round(bx + pad), Math.round(wy), Math.round(b.w - pad * 2), 4);
    }
    gameCtx.globalAlpha = 1;
    return;
  }

  const isSlit = b.windows === 'slits';
  const cols = isSlit ? Math.max(2, b.cols + 1) : b.cols;
  const ww = isSlit ? 3 : Math.max(4, Math.floor((b.w - pad * 2) / cols) - 4);
  const wh = isSlit ? Math.max(8, b.rowGap - 4) : 6;
  const stepX = (b.w - pad * 2) / cols;

  for (let row = 0, wy = by + pad; wy < by + b.h - pad - wh; row++, wy += b.rowGap) {
    for (let col = 0; col < cols; col++) {
      const wx = bx + pad + col * stepX + (stepX - ww) / 2;
      const n = windowNoise(b.litSeed, row, col);
      const lit = night && n > 0.42;
      if (lit) {
        // Soft halo instead of a canvas shadow, which used to bleed onto
        // everything drawn afterwards.
        gameCtx.fillStyle = 'rgba(255, 224, 130, 0.16)';
        gameCtx.fillRect(Math.round(wx - 2), Math.round(wy - 2), Math.round(ww + 4), Math.round(wh + 4));
        gameCtx.fillStyle = litColors[Math.floor(n * 997) % litColors.length];
      } else {
        gameCtx.fillStyle = darkGlass;
        gameCtx.globalAlpha = night ? 1 : 0.7;
      }
      gameCtx.fillRect(Math.round(wx), Math.round(wy), Math.round(ww), Math.round(wh));
      gameCtx.globalAlpha = 1;
    }
  }
};

// One building: body, roof treatment, windows.
const drawBuilding = (b, offsetX, groundY, night, layer) => {
  const bx = Math.round(b.x - offsetX);
  const by = Math.round(groundY - b.h);
  if (bx > gameCanvas.width + 40 || bx + b.w < -40) return;

  const base = night
    ? (layer === 'far' ? '#161b30' : '#0e1220')
    : (layer === 'far' ? '#aab4c6' : '#8d97ab');
  const alt = night
    ? (layer === 'far' ? '#1d2340' : '#151a2c')
    : (layer === 'far' ? '#b9c2d1' : '#9aa4b6');

  const body = mixHex(base, alt, b.tint);

  // Body with a vertical face shade so towers aren't flat
  const g = gameCtx.createLinearGradient(bx, 0, bx + b.w, 0);
  g.addColorStop(0, body);
  g.addColorStop(0.75, body);
  g.addColorStop(1, night ? '#080b14' : '#788494');
  gameCtx.fillStyle = g;
  gameCtx.fillRect(bx, by, b.w, b.h);

  // Roof treatments
  gameCtx.fillStyle = night ? '#0a0e1a' : '#6f7b8f';
  if (b.roof === 'parapet') {
    gameCtx.fillRect(bx - 2, by - 4, b.w + 4, 4);
  } else if (b.roof === 'stepped') {
    const w2 = Math.round(b.w * 0.66), h2 = 14;
    gameCtx.fillStyle = body;
    gameCtx.fillRect(bx + (b.w - w2) / 2, by - h2, w2, h2);
    const w3 = Math.round(b.w * 0.36), h3 = 12;
    gameCtx.fillRect(bx + (b.w - w3) / 2, by - h2 - h3, w3, h3);
    gameCtx.fillStyle = night ? '#0a0e1a' : '#6f7b8f';
    gameCtx.fillRect(bx + (b.w - w3) / 2, by - h2 - h3 - 3, w3, 3);
  } else if (b.roof === 'antenna') {
    const mx = Math.round(bx + b.w / 2);
    gameCtx.fillRect(bx - 2, by - 3, b.w + 4, 3);
    gameCtx.fillRect(mx - 1, by - 26, 2, 26);
    if (b.beacon) {
      gameCtx.fillStyle = night ? 'rgba(255, 70, 70, 0.35)' : 'rgba(200, 60, 60, 0.25)';
      gameCtx.beginPath(); gameCtx.arc(mx, by - 27, 4, 0, Math.PI * 2); gameCtx.fill();
      gameCtx.fillStyle = night ? '#ff5252' : '#c0392b';
      gameCtx.beginPath(); gameCtx.arc(mx, by - 27, 1.8, 0, Math.PI * 2); gameCtx.fill();
    }
  } else if (b.roof === 'watertower') {
    const mx = Math.round(bx + b.w / 2);
    gameCtx.fillRect(bx - 2, by - 3, b.w + 4, 3);
    gameCtx.fillRect(mx - 8, by - 10, 2, 8);
    gameCtx.fillRect(mx + 6, by - 10, 2, 8);
    gameCtx.fillRect(mx - 9, by - 20, 18, 10);
    gameCtx.beginPath();
    gameCtx.moveTo(mx - 9, by - 20); gameCtx.lineTo(mx, by - 26); gameCtx.lineTo(mx + 9, by - 20);
    gameCtx.closePath(); gameCtx.fill();
  } else if (b.roof === 'spire') {
    const mx = Math.round(bx + b.w / 2);
    gameCtx.beginPath();
    gameCtx.moveTo(bx + b.w * 0.25, by); gameCtx.lineTo(mx, by - 22); gameCtx.lineTo(bx + b.w * 0.75, by);
    gameCtx.closePath(); gameCtx.fill();
  }

  drawBuildingWindows(b, bx, by, night, layer);

  // Vertical edge shadow to separate neighbours
  gameCtx.fillStyle = night ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.13)';
  gameCtx.fillRect(bx + b.w - 3, by, 3, b.h);
};

// City Background Drawing
const drawCityBackground = () => {
  const night = gameSettings.theme === 'night';
  const H = gameCanvas.height;
  const W = gameCanvas.width;
  const groundY = H - 80;

  // Sky gradient
  const gradient = gameCtx.createLinearGradient(0, 0, 0, H);
  if (night) {
    gradient.addColorStop(0, '#0b1026');
    gradient.addColorStop(0.55, '#1a1f3a');
    gradient.addColorStop(1, '#39304e');
  } else {
    gradient.addColorStop(0, '#4fb3d9');
    gradient.addColorStop(0.55, '#70c5ce');
    gradient.addColorStop(1, '#b8e6ee');
  }
  gameCtx.fillStyle = gradient;
  gameCtx.fillRect(0, 0, W, H);

  gameCtx.save();

  if (night) {
    // Static star field and moon. Positions come from the hash, so nothing moves.
    for (let s = 0; s < 70; s++) {
      const sx = Math.round(windowNoise(101, s, 0) * W);
      const sy = Math.round(windowNoise(101, s, 1) * (H * 0.55));
      const a = 0.25 + windowNoise(101, s, 2) * 0.6;
      gameCtx.fillStyle = `rgba(255, 255, 255, ${a.toFixed(2)})`;
      gameCtx.fillRect(sx, sy, windowNoise(101, s, 3) > 0.85 ? 2 : 1, windowNoise(101, s, 3) > 0.85 ? 2 : 1);
    }
    gameCtx.fillStyle = 'rgba(255, 250, 220, 0.10)';
    gameCtx.beginPath(); gameCtx.arc(392, 84, 38, 0, Math.PI * 2); gameCtx.fill();
    gameCtx.fillStyle = '#f6f2d8';
    gameCtx.beginPath(); gameCtx.arc(392, 84, 24, 0, Math.PI * 2); gameCtx.fill();
    gameCtx.fillStyle = night ? 'rgba(190, 186, 160, 0.55)' : 'transparent';
    gameCtx.beginPath(); gameCtx.arc(383, 77, 5, 0, Math.PI * 2); gameCtx.fill();
    gameCtx.beginPath(); gameCtx.arc(400, 92, 7, 0, Math.PI * 2); gameCtx.fill();
    gameCtx.beginPath(); gameCtx.arc(399, 72, 3.5, 0, Math.PI * 2); gameCtx.fill();
  } else {
    // Soft clouds, also fixed in place
    gameCtx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    const puff = (cx, cy, s) => {
      gameCtx.beginPath();
      gameCtx.arc(cx, cy, 16 * s, 0, Math.PI * 2);
      gameCtx.arc(cx + 18 * s, cy + 4 * s, 12 * s, 0, Math.PI * 2);
      gameCtx.arc(cx - 18 * s, cy + 5 * s, 11 * s, 0, Math.PI * 2);
      gameCtx.arc(cx + 4 * s, cy - 10 * s, 12 * s, 0, Math.PI * 2);
      gameCtx.fill();
    };
    puff(90, 90, 1); puff(330, 60, 0.8); puff(240, 150, 0.6);
  }

  const city = getCity();
  // Parallax: far layer creeps, near layer drifts. Both are far slower than the
  // pipes, and offsets are whole pixels so nothing shimmers.
  const farOffset = Math.round(frameCount * 0.10) % city.far.stripWidth;
  const nearOffset = Math.round(frameCount * 0.28) % city.near.stripWidth;

  for (let rep = 0; rep <= 1; rep++) {
    city.far.buildings.forEach(b =>
      drawBuilding(b, farOffset - rep * city.far.stripWidth, groundY - 26, night, 'far'));
  }
  // Haze over the far layer pushes it back visually
  gameCtx.fillStyle = night ? 'rgba(11, 16, 38, 0.45)' : 'rgba(150, 205, 220, 0.42)';
  gameCtx.fillRect(0, 0, W, groundY);

  for (let rep = 0; rep <= 1; rep++) {
    city.near.buildings.forEach(b =>
      drawBuilding(b, nearOffset - rep * city.near.stripWidth, groundY, night, 'near'));
  }

  gameCtx.restore();

  // Make sure no shadow or alpha state leaks into the pipes, bird or ground.
  gameCtx.globalAlpha = 1;
  gameCtx.shadowColor = 'transparent';
  gameCtx.shadowBlur = 0;
};

// Draw Bird with Patterns
const drawBirdWithPattern = () => {
  gameCtx.save();
  gameCtx.translate(birdX + birdWidth / 2, birdY + birdHeight / 2);
  
  // Rotation based on velocity, clamped both ways so the bird never spins vertical
  const angle = Math.max(-0.45, Math.min(velocity * 0.08, 0.5));
  gameCtx.rotate(angle);
  gameCtx.translate(-birdWidth / 2, -birdHeight / 2);

  const [color, pattern] = gameSettings.birdColor.split('-');
  const colors = {
    yellow: '#ffeb3b',
    red: '#ff5252',
    blue: '#2196f3',
    green: '#4caf50',
    purple: '#9c27b0',
    pink: '#ff1493'
  };

  const baseColor = colors[color] || colors.yellow;

  // Body (main oval)
  gameCtx.fillStyle = baseColor;
  gameCtx.beginPath();
  gameCtx.ellipse(birdWidth / 2, birdHeight / 2, birdWidth / 2.2, birdHeight / 2.4, 0, 0, Math.PI * 2);
  gameCtx.fill();

  // Wing animation
  wingAngle = Math.sin(frameCount * 0.1) * 0.3;
  
  // Left Wing
  const leftWingColor = pattern === 'stripe' ? 'rgba(0, 0, 0, 0.2)' : color === 'yellow' ? '#fdd835' : 'rgba(255, 255, 255, 0.3)';
  gameCtx.fillStyle = leftWingColor;
  gameCtx.save();
  gameCtx.translate(birdWidth / 2 - 8, birdHeight / 2 - 2);
  gameCtx.rotate(wingAngle);
  gameCtx.beginPath();
  gameCtx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
  gameCtx.fill();
  gameCtx.restore();

  // Right Wing
  gameCtx.save();
  gameCtx.translate(birdWidth / 2 + 8, birdHeight / 2 - 2);
  gameCtx.rotate(-wingAngle);
  gameCtx.beginPath();
  gameCtx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
  gameCtx.fill();
  gameCtx.restore();

  // Chest/Breast (lighter shade)
  gameCtx.fillStyle = color === 'yellow' ? '#ffee58' : 'rgba(255, 255, 255, 0.2)';
  gameCtx.beginPath();
  gameCtx.ellipse(birdWidth / 2, birdHeight / 2 + 3, birdWidth / 2.8, birdHeight / 2.8, 0, 0, Math.PI * 2);
  gameCtx.fill();

  // Eyes
  // Left eye white
  gameCtx.fillStyle = '#ffffff';
  gameCtx.beginPath();
  gameCtx.arc(birdWidth / 2 + 4, birdHeight / 2 - 6, 5, 0, Math.PI * 2);
  gameCtx.fill();

  // Pupil (looking forward with slight animation)
  gameCtx.fillStyle = '#000000';
  const pupilOffset = Math.sin(frameCount * 0.05) * 1;
  gameCtx.beginPath();
  gameCtx.arc(birdWidth / 2 + 4 + pupilOffset, birdHeight / 2 - 6, 3, 0, Math.PI * 2);
  gameCtx.fill();

  // Eye shine
  gameCtx.fillStyle = '#ffffff';
  gameCtx.beginPath();
  gameCtx.arc(birdWidth / 2 + 5 + pupilOffset, birdHeight / 2 - 7, 1.2, 0, Math.PI * 2);
  gameCtx.fill();

  // Beak
  gameCtx.fillStyle = '#ff9800';
  gameCtx.beginPath();
  gameCtx.moveTo(birdWidth / 2 + 8, birdHeight / 2 - 1);
  gameCtx.lineTo(birdWidth / 2 + 14, birdHeight / 2 - 1);
  gameCtx.lineTo(birdWidth / 2 + 12, birdHeight / 2 + 1);
  gameCtx.closePath();
  gameCtx.fill();

  // Tail feathers
  gameCtx.strokeStyle = color === 'yellow' ? '#fbc02d' : 'rgba(0, 0, 0, 0.2)';
  gameCtx.lineWidth = 2;
  gameCtx.lineCap = 'round';
  
  // Tail feather 1
  gameCtx.beginPath();
  gameCtx.moveTo(birdWidth / 2 - 12, birdHeight / 2 + 8);
  gameCtx.quadraticCurveTo(birdWidth / 2 - 18, birdHeight / 2 + 10, birdWidth / 2 - 20, birdHeight / 2 + 14);
  gameCtx.stroke();

  // Tail feather 2
  gameCtx.beginPath();
  gameCtx.moveTo(birdWidth / 2 - 13, birdHeight / 2 + 12);
  gameCtx.quadraticCurveTo(birdWidth / 2 - 19, birdHeight / 2 + 15, birdWidth / 2 - 21, birdHeight / 2 + 20);
  gameCtx.stroke();

  gameCtx.restore();
};

// Draw Owl (for night mode)
const drawOwl = () => {
  gameCtx.save();
  gameCtx.translate(birdX + birdWidth / 2, birdY + birdHeight / 2);
  
  const angle = Math.max(-0.45, Math.min(velocity * 0.08, 0.5));
  gameCtx.rotate(angle);
  gameCtx.translate(-birdWidth / 2, -birdHeight / 2);

  const [color] = gameSettings.birdColor.split('-');
  const colors = {
    yellow: '#c4a000',
    red: '#8b0000',
    blue: '#001f3f',
    green: '#2d5016',
    purple: '#4a0e4e',
    pink: '#8b1a3a'
  };
  const baseColor = colors[color] || colors.yellow;

  // Body
  gameCtx.fillStyle = baseColor;
  gameCtx.beginPath();
  gameCtx.ellipse(birdWidth / 2, birdHeight / 2 + 2, birdWidth / 2.2, birdHeight / 2.2, 0, 0, Math.PI * 2);
  gameCtx.fill();

  // Wing flap
  gameCtx.fillStyle = baseColor;
  gameCtx.save();
  gameCtx.translate(birdWidth / 2 - 8, birdHeight / 2 + 1);
  gameCtx.rotate(wingAngle);
  gameCtx.beginPath();
  gameCtx.ellipse(0, 0, 10, 10, 0.2, 0, Math.PI * 2);
  gameCtx.fill();
  gameCtx.restore();

  gameCtx.save();
  gameCtx.translate(birdWidth / 2 + 8, birdHeight / 2 + 1);
  gameCtx.rotate(-wingAngle);
  gameCtx.beginPath();
  gameCtx.ellipse(0, 0, 10, 10, -0.2, 0, Math.PI * 2);
  gameCtx.fill();
  gameCtx.restore();

  // Head
  gameCtx.fillStyle = baseColor;
  gameCtx.beginPath();
  gameCtx.arc(birdWidth / 2, birdHeight / 2 - 4, 9, 0, Math.PI * 2);
  gameCtx.fill();

  // Ear tufts
  gameCtx.beginPath();
  gameCtx.ellipse(birdWidth / 2 - 7, birdHeight / 2 - 12, 3, 7, -0.3, 0, Math.PI * 2);
  gameCtx.fill();
  gameCtx.beginPath();
  gameCtx.ellipse(birdWidth / 2 + 7, birdHeight / 2 - 12, 3, 7, 0.3, 0, Math.PI * 2);
  gameCtx.fill();

  // Left eye
  gameCtx.fillStyle = '#ffd700';
  gameCtx.beginPath();
  gameCtx.arc(birdWidth / 2 - 4, birdHeight / 2 - 6, 5, 0, Math.PI * 2);
  gameCtx.fill();
  gameCtx.fillStyle = '#000';
  gameCtx.beginPath();
  gameCtx.arc(birdWidth / 2 - 4, birdHeight / 2 - 6, 2.5, 0, Math.PI * 2);
  gameCtx.fill();
  gameCtx.fillStyle = '#fff';
  gameCtx.beginPath();
  gameCtx.arc(birdWidth / 2 - 3, birdHeight / 2 - 7, 1.2, 0, Math.PI * 2);
  gameCtx.fill();

  // Right eye
  gameCtx.fillStyle = '#ffd700';
  gameCtx.beginPath();
  gameCtx.arc(birdWidth / 2 + 4, birdHeight / 2 - 6, 5, 0, Math.PI * 2);
  gameCtx.fill();
  gameCtx.fillStyle = '#000';
  gameCtx.beginPath();
  gameCtx.arc(birdWidth / 2 + 4, birdHeight / 2 - 6, 2.5, 0, Math.PI * 2);
  gameCtx.fill();
  gameCtx.fillStyle = '#fff';
  gameCtx.beginPath();
  gameCtx.arc(birdWidth / 2 + 5, birdHeight / 2 - 7, 1.2, 0, Math.PI * 2);
  gameCtx.fill();

  // Beak
  gameCtx.fillStyle = '#ff8c00';
  gameCtx.beginPath();
  gameCtx.moveTo(birdWidth / 2, birdHeight / 2 - 1);
  gameCtx.lineTo(birdWidth / 2 + 4, birdHeight / 2 + 1);
  gameCtx.lineTo(birdWidth / 2, birdHeight / 2 + 3);
  gameCtx.closePath();
  gameCtx.fill();

  gameCtx.restore();
};

// Draw Pipes
const drawPipes = () => {
  const night = gameSettings.theme === 'night';

  // Palette for the moulded-plastic look. The gradient across the width is what
  // sells the cylinder; a flat fill always reads as a rectangle.
  const pal = night
    ? { lightest: '#4f8f3e', light: '#39762c', mid: '#256b1f', dark: '#14430f', outline: '#0c2a09' }
    : { lightest: '#8fd96a', light: '#5cbf3f', mid: '#33a02c', dark: '#1d6b18', outline: '#12490f' };

  // Horizontal gradient shared by body and rim: dark edge, bright highlight just
  // off the left edge, mid tone through the middle, deep shadow on the right.
  const shadeGradient = (x, w) => {
    const g = gameCtx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0,    pal.dark);
    g.addColorStop(0.10, pal.light);
    g.addColorStop(0.22, pal.lightest);
    g.addColorStop(0.42, pal.mid);
    g.addColorStop(0.78, pal.mid);
    g.addColorStop(0.92, pal.dark);
    g.addColorStop(1,    pal.outline);
    return g;
  };

  const RIM_H = 26;      // height of the lip at the open end
  const RIM_OVER = 6;    // how far the lip overhangs each side of the shaft

  // The shaft: gradient body, subtle horizontal seams for texture, hard outline.
  const drawShaft = (x, y, w, h) => {
    if (h <= 0) return;
    gameCtx.fillStyle = shadeGradient(x, w);
    gameCtx.fillRect(x, y, w, h);

    // Moulding seams every 26px so long runs of pipe aren't a blank slab.
    gameCtx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
    gameCtx.lineWidth = 1;
    for (let sy = y + 13; sy < y + h; sy += 26) {
      gameCtx.beginPath();
      gameCtx.moveTo(x + 3, sy + 0.5);
      gameCtx.lineTo(x + w - 3, sy + 0.5);
      gameCtx.stroke();
    }

    // Specular streak down the highlight band
    gameCtx.fillStyle = 'rgba(255, 255, 255, 0.13)';
    gameCtx.fillRect(x + w * 0.17, y, w * 0.07, h);

    gameCtx.strokeStyle = pal.outline;
    gameCtx.lineWidth = 2;
    gameCtx.strokeRect(x + 1, y - 1, w - 2, h + 2);
  };

  // The lip at the open end, drawn wider than the shaft so it reads as a collar.
  const drawRim = (x, y, w) => {
    const rx = x - RIM_OVER;
    const rw = w + RIM_OVER * 2;

    gameCtx.fillStyle = shadeGradient(rx, rw);
    gameCtx.fillRect(rx, y, rw, RIM_H);

    // Bright top bevel and dark bottom bevel give the collar thickness
    gameCtx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    gameCtx.fillRect(rx + 2, y + 2, rw - 4, 3);
    gameCtx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    gameCtx.fillRect(rx + 2, y + RIM_H - 5, rw - 4, 3);

    // Specular streak, aligned with the shaft's
    gameCtx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    gameCtx.fillRect(rx + rw * 0.17, y, rw * 0.07, RIM_H);

    gameCtx.strokeStyle = pal.outline;
    gameCtx.lineWidth = 2;
    gameCtx.strokeRect(rx + 1, y + 1, rw - 2, RIM_H - 2);
  };

  gameCtx.save();
  // Every shape sets its own fill explicitly. A shared fill set once outside the
  // loop was what previously produced the near-invisible "ghost pipe".
  pipes.forEach(pipe => {
    const bottomHeight = gameCanvas.height - pipe.bottomY - 80;

    // Top pipe: shaft hangs from the ceiling, rim sits at its lower (open) end
    drawShaft(pipe.x, 0, pipeWidth, pipe.topHeight - RIM_H);
    drawRim(pipe.x, pipe.topHeight - RIM_H, pipeWidth);

    // Bottom pipe: rim at its upper (open) end, shaft runs down to the ground
    drawRim(pipe.x, pipe.bottomY, pipeWidth);
    drawShaft(pipe.x, pipe.bottomY + RIM_H, pipeWidth, bottomHeight - RIM_H);
  });
  gameCtx.restore();
};

// Draw Ground
const drawGround = () => {
  const night = gameSettings.theme === 'night';
  const top = gameCanvas.height - 80;

  // The ground used a single daytime sand colour in both themes, which left a
  // bright strip glowing under the night skyline.
  const g = gameCtx.createLinearGradient(0, top, 0, gameCanvas.height);
  if (night) {
    g.addColorStop(0, '#6b5636');
    g.addColorStop(1, '#4a3a24');
  } else {
    g.addColorStop(0, '#e8be6f');
    g.addColorStop(1, '#cf9d4c');
  }
  gameCtx.fillStyle = g;
  gameCtx.fillRect(0, top, gameCanvas.width, 80);

  // Grass lip along the top edge
  gameCtx.fillStyle = night ? '#2f5a2c' : '#5cbf3f';
  gameCtx.fillRect(0, top, gameCanvas.width, 6);
  gameCtx.fillStyle = night ? 'rgba(255,255,255,0.06)' : 'rgba(255, 255, 255, 0.25)';
  gameCtx.fillRect(0, top, gameCanvas.width, 2);

  // Ground pattern
  gameCtx.strokeStyle = night ? 'rgba(0, 0, 0, 0.22)' : 'rgba(0, 0, 0, 0.1)';
  gameCtx.lineWidth = 2;
  for (let i = 0; i < gameCanvas.width; i += 40) {
    gameCtx.beginPath();
    gameCtx.moveTo(i, top + 8);
    gameCtx.lineTo(i + 20, top + 28);
    gameCtx.stroke();
  }
};

// Initialize Game
const initGame = () => {
  const settings = difficultySettings[gameSettings.difficulty] || difficultySettings.normal;
  gravity = settings.gravity;
  gameSpeed = settings.speed;
  pipeDistance = settings.pipeDistance;
  pipeSpacing = settings.pipeSpacing;
  flapPower = settings.flapPower;
  maxFallSpeed = settings.maxFallSpeed;
  maxRiseSpeed = settings.maxRiseSpeed;

  birdX = 60;
  birdY = 300;
  velocity = 0;
  score = 0;
  frameCount = 0;
  pipes = [];
  confettiParticles = [];
  
  // Set canvas sizes for confetti
  confettiCanvas.width = gameCanvas.width;
  confettiCanvas.height = gameCanvas.height;
};

// Update Game State
const updateGame = () => {
  if (gameState !== 'playing') return;

  frameCount++;
  velocity += gravity;

  // Clamp vertical speed in both directions. Without a terminal velocity the bird
  // accelerates without limit and the descent becomes impossible to recover from.
  if (velocity > maxFallSpeed) velocity = maxFallSpeed;
  if (velocity < -maxRiseSpeed) velocity = -maxRiseSpeed;

  birdY += velocity;

  // Generate pipes
  if (pipes.length === 0 || pipes[pipes.length - 1].x < gameCanvas.width - pipeDistance) {
    const minHeight = 60;
    const maxHeight = gameCanvas.height - pipeSpacing - 120;
    let topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

    // Fairness clamp: placement was fully random, so two consecutive gaps could sit
    // further apart vertically than the bird can physically travel in the time it
    // takes to reach them — an unavoidable death. Limit the step to what is
    // actually climbable at this difficulty.
    if (pipes.length > 0) {
      const previous = pipes[pipes.length - 1];
      // The bird only has from clearing the previous pipe to reaching the next one
      // to change altitude, so the window excludes the pipe's own width.
      const reactionFrames = (pipeDistance - pipeWidth) / gameSpeed;
      const maxStep = reactionFrames * maxRiseSpeed * 0.35;
      topHeight = Math.max(previous.topHeight - maxStep, Math.min(previous.topHeight + maxStep, topHeight));
      topHeight = Math.max(minHeight, Math.min(maxHeight, topHeight));
    }

    pipes.push({
      x: gameCanvas.width,
      topHeight: topHeight,
      bottomY: topHeight + pipeSpacing,
      scored: false
    });
  }

  // Move pipes
  pipes = pipes.filter(pipe => {
    pipe.x -= gameSpeed;
    
    // Scoring
    if (!pipe.scored && pipe.x + pipeWidth < birdX) {
      pipe.scored = true;
      score++;
    }
    
    return pipe.x + pipeWidth > 0;
  });

  // Collision detection
  pipes.forEach(pipe => {
    if (
      birdX < pipe.x + pipeWidth &&
      birdX + birdWidth > pipe.x &&
      (birdY < pipe.topHeight || birdY + birdHeight > pipe.bottomY)
    ) {
      endGame();
    }
  });

  // Ground collision
  if (birdY + birdHeight >= gameCanvas.height - 80) {
    endGame();
  }

  // Ceiling collision
  if (birdY < 0) {
    endGame();
  }
};

// Draw Game
const drawGame = () => {
  drawCityBackground();
  drawPipes();
  drawGround();
  
  if (gameSettings.theme === 'night') {
    drawOwl();
  } else {
    drawBirdWithPattern();
  }

  // HUD
  gameCtx.fillStyle = '#fff';
  gameCtx.font = 'bold 24px Arial';
  gameCtx.fillText(`Score: ${score}`, 20, 40);

  // Keep the score readout under the canvas in sync (it was never updated).
  const scoreEl = document.getElementById('score');
  if (scoreEl && scoreEl.textContent !== `Score: ${score}`) {
    scoreEl.textContent = `Score: ${score}`;
  }
};

// Game Over
const endGame = () => {
  // Collision checks can trigger more than once in a single frame; without this
  // guard the game-over modal and confetti could fire twice.
  if (gameState !== 'playing') return;
  gameState = 'gameOver';
  const currentHighScore = getHighScore(gameSettings.difficulty);
  const isNewHighScore = score > currentHighScore;
  
  if (isNewHighScore) {
    setHighScore(gameSettings.difficulty, score);
    createConfetti();
  }

  showGameOverModal(isNewHighScore);
};

// Show Game Over Modal
const showGameOverModal = (isNewHighScore) => {
  const finalScore = score;
  const currentHighScore = getHighScore(gameSettings.difficulty);
  
  document.getElementById('finalScore').textContent = finalScore;
  document.getElementById('gameOverHighScore').textContent = currentHighScore;
  
  const newHighscoreMsg = document.getElementById('newHighscoreMessage');
  if (isNewHighScore) {
    newHighscoreMsg.classList.remove('hidden');
  } else {
    newHighscoreMsg.classList.add('hidden');
  }

  document.getElementById('gameOverModal').classList.remove('hidden');
  document.getElementById('modalOverlay').classList.remove('hidden');
  
  if (isNewHighScore) {
    confettiCanvas.style.display = 'block';
  }
};

// Hide Game Over Modal
const hideGameOverModal = () => {
  document.getElementById('gameOverModal').classList.add('hidden');
  document.getElementById('modalOverlay').classList.add('hidden');
  confettiCanvas.style.display = 'none';
};

// Draw Home Screen
const drawHomescreen = () => {
  const gradient = homeCtx.createLinearGradient(0, 0, 0, homeCanvas.height);
  gradient.addColorStop(0, '#87ceeb');
  gradient.addColorStop(1, '#e0f6ff');
  homeCtx.fillStyle = gradient;
  homeCtx.fillRect(0, 0, homeCanvas.width, homeCanvas.height);

  // Draw simple city on homescreen
  const buildingWidth = 50;
  const spacing = 70;
  for (let i = 0; i < homeCanvas.width / spacing + 1; i++) {
    const x = i * spacing;
    const height = 100 + (Math.sin(i * 0.5) * 50);
    const y = homeCanvas.height - height - 100;
    
    homeCtx.fillStyle = '#8b8b9a';
    homeCtx.fillRect(x, y, buildingWidth, height);
    homeCtx.strokeStyle = '#666';
    homeCtx.lineWidth = 2;
    homeCtx.strokeRect(x, y, buildingWidth, height);

    // Windows
    for (let row = 0; row < Math.floor(height / 14) - 1; row++) {
      for (let col = 0; col < 2; col++) {
        homeCtx.fillStyle = '#d0d0d0';
        homeCtx.fillRect(x + 8 + col * 14, y + 12 + row * 14, 8, 8);
      }
    }
  }

  // Ground
  homeCtx.fillStyle = '#dcae5d';
  homeCtx.fillRect(0, homeCanvas.height - 100, homeCanvas.width, 100);
};

// Animation Loop
const gameLoop = () => {
  if (gameState === 'playing') {
    updateGame();
    drawGame();
  }

  if (confettiParticles.length > 0) {
    updateConfetti();
    drawConfetti();
  }

  requestAnimationFrame(gameLoop);
};

// Show Settings Modal
const showSettingsModal = () => {
  document.getElementById('settingsModal').classList.remove('hidden');
  document.getElementById('modalOverlay').classList.remove('hidden');
};

// Hide Settings Modal
const hideSettingsModal = () => {
  document.getElementById('settingsModal').classList.add('hidden');
  document.getElementById('modalOverlay').classList.add('hidden');
};

// Show Home Screen
const showHomescreen = () => {
  gameState = 'home';
  document.getElementById('homescreen').classList.add('active');
  document.getElementById('gamescreen').classList.remove('active');
  drawHomescreen();
};

// Show Game Screen
const showGamescreen = () => {
  document.getElementById('homescreen').classList.remove('active');
  document.getElementById('gamescreen').classList.add('active');
  gameState = 'playing';
  initGame();
};

// Update HUD
const updateHUD = () => {
  document.getElementById('difficulty').textContent = `Difficulty: ${gameSettings.difficulty.charAt(0).toUpperCase() + gameSettings.difficulty.slice(1)}`;
  document.getElementById('highscore').textContent = `High Score: ${getHighScore(gameSettings.difficulty)}`;
};

// Event Listeners
document.getElementById('playBtn').addEventListener('click', () => {
  showGamescreen();
});

document.getElementById('settingsBtn').addEventListener('click', () => {
  showSettingsModal();
});

document.getElementById('closeSettingsBtn').addEventListener('click', () => {
  saveSettings();
  updateHUD();
  hideSettingsModal();
  drawHomescreen();
});

document.getElementById('restartBtn').addEventListener('click', () => {
  hideGameOverModal();
  showGamescreen();
});

document.getElementById('homeFromGameBtn').addEventListener('click', () => {
  hideGameOverModal();
  showHomescreen();
});

document.getElementById('homeBtn').addEventListener('click', () => {
  gameState = 'home';
  showHomescreen();
});

// Settings Form Changes
document.querySelectorAll('input[name="difficulty"]').forEach(input => {
  input.addEventListener('change', (e) => {
    gameSettings.difficulty = e.target.value;
    updateHUD();
  });
});

document.querySelectorAll('input[name="theme"]').forEach(input => {
  input.addEventListener('change', (e) => {
    setTheme(e.target.value);
    drawHomescreen();
  });
});

document.querySelectorAll('input[name="birdColor"]').forEach(input => {
  input.addEventListener('change', (e) => {
    gameSettings.birdColor = e.target.value;
  });
});

// Keyboard Controls
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    // Ignore auto-repeat: holding space used to fire a flap every frame.
    if (e.repeat) return;
    if (gameState === 'playing') {
      flap();
    } else if (gameState === 'gameOver') {
      hideGameOverModal();
      showGamescreen();
    }
  }
});

// Pointer on canvas for flap (covers mouse and touch, and fires on press
// rather than release so the response feels immediate)
gameCanvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (gameState === 'playing') {
    flap();
  }
});

homeCanvas.addEventListener('click', () => {
  if (gameState === 'home') {
    showSettingsModal();
  }
});

// Initialize
loadSettings();
updateHUD();
drawHomescreen();
gameLoop();
