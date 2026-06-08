// DOM Elements
const homescreen = document.getElementById('homescreen');
const gamescreen = document.getElementById('gamescreen');
const homeCanvas = document.getElementById('homeCanvas');
const homeCtx = homeCanvas.getContext('2d');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreLabel = document.getElementById('score');
const difficultyLabel = document.getElementById('difficulty');
const playBtn = document.getElementById('playBtn');
const settingsBtn = document.getElementById('settingsBtn');
const homeBtn = document.getElementById('homeBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const gameOverModal = document.getElementById('gameOverModal');
const modalOverlay = document.getElementById('modalOverlay');
const finalScoreDisplay = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const homeFromGameBtn = document.getElementById('homeFromGameBtn');

// Game Constants
const width = canvas.width;
const height = canvas.height;
const homeCanvasWidth = homeCanvas.width;
const homeCanvasHeight = homeCanvas.height;

// Game Settings
let gameSettings = {
  difficulty: 'normal',
  birdColor: 'yellow'
};

// Difficulty configurations
const difficultySettings = {
  easy: {
    gravity: 0.35,
    jumpStrength: -9,
    pipeGap: 220,
    pipeDistance: 280,
    pipeSpeed: 3
  },
  normal: {
    gravity: 0.45,
    jumpStrength: -9.5,
    pipeGap: 180,
    pipeDistance: 260,
    pipeSpeed: 3.8
  },
  hard: {
    gravity: 0.55,
    jumpStrength: -10,
    pipeGap: 150,
    pipeDistance: 240,
    pipeSpeed: 4.5
  }
};

// Bird color configurations
const birdColors = {
  yellow: { main: '#ffeb3b', secondary: '#fdd835', accent: '#ff9800' },
  red: { main: '#ff6b6b', secondary: '#ff5252', accent: '#ff1744' },
  blue: { main: '#4d96ff', secondary: '#2979f0', accent: '#1565c0' },
  green: { main: '#6bcf7f', secondary: '#43a047', accent: '#2e7d32' },
  purple: { main: '#b469d4', secondary: '#9c27b0', accent: '#6a1b9a' },
  pink: { main: '#ff69b4', secondary: '#ec407a', accent: '#c2185b' }
};

// Game Variables
let bird;
let pipes;
let score;
let frameCount;
let running = false;
let gameOver = false;
let wingAngle = 0;
let gravity = difficultySettings.normal.gravity;
let jumpStrength = difficultySettings.normal.jumpStrength;
let pipeGap = difficultySettings.normal.pipeGap;
let pipeDistance = difficultySettings.normal.pipeDistance;
let pipeSpeed = difficultySettings.normal.pipeSpeed;

const groundHeight = 80;
const pipeWidth = 80;

// Parallax Background Variables
let cloudOffset = 0;
let mountainOffset = 0;

// ===== Homescreen Functions =====
function drawHomescreen() {
  // Sky gradient
  const gradient = homeCtx.createLinearGradient(0, 0, 0, homeCanvasHeight);
  gradient.addColorStop(0, '#87ceeb');
  gradient.addColorStop(1, '#e0f6ff');
  homeCtx.fillStyle = gradient;
  homeCtx.fillRect(0, 0, homeCanvasWidth, homeCanvasHeight);

  // Draw clouds (parallax)
  cloudOffset = (cloudOffset + 0.3) % homeCanvasWidth;
  drawClouds(cloudOffset);
  drawClouds(cloudOffset - homeCanvasWidth);

  // Draw mountains
  drawMountains();

  // Draw birds flying across screen
  drawFlyingBirds(frameCount);
}

function drawClouds(offset) {
  homeCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  
  // Cloud 1
  drawCloud(offset + 80, 80, 50);
  
  // Cloud 2
  drawCloud(offset + 250, 120, 40);
  
  // Cloud 3
  drawCloud(offset + 420, 150, 60);
}

function drawCloud(x, y, size) {
  homeCtx.beginPath();
  homeCtx.arc(x, y, size * 0.6, 0, Math.PI * 2);
  homeCtx.arc(x + size * 0.5, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
  homeCtx.arc(x + size, y, size * 0.6, 0, Math.PI * 2);
  homeCtx.fill();
}

function drawMountains() {
  homeCtx.fillStyle = '#7cb342';
  homeCtx.beginPath();
  homeCtx.moveTo(0, homeCanvasHeight * 0.6);
  homeCtx.lineTo(100, homeCanvasHeight * 0.35);
  homeCtx.lineTo(200, homeCanvasHeight * 0.6);
  homeCtx.fill();

  homeCtx.fillStyle = '#558b2f';
  homeCtx.beginPath();
  homeCtx.moveTo(180, homeCanvasHeight * 0.6);
  homeCtx.lineTo(280, homeCanvasHeight * 0.3);
  homeCtx.lineTo(380, homeCanvasHeight * 0.6);
  homeCtx.fill();

  homeCtx.fillStyle = '#7cb342';
  homeCtx.beginPath();
  homeCtx.moveTo(350, homeCanvasHeight * 0.6);
  homeCtx.lineTo(450, homeCanvasHeight * 0.4);
  homeCtx.lineTo(550, homeCanvasHeight * 0.6);
  homeCtx.fill();

  // Ground
  homeCtx.fillStyle = '#9ccc65';
  homeCtx.fillRect(0, homeCanvasHeight * 0.6, homeCanvasWidth, homeCanvasHeight * 0.4);

  // Ground pattern
  homeCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  homeCtx.lineWidth = 2;
  for (let i = 0; i < homeCanvasWidth; i += 60) {
    homeCtx.beginPath();
    homeCtx.moveTo(i, homeCanvasHeight * 0.6);
    homeCtx.lineTo(i + 30, homeCanvasHeight * 0.6 + 20);
    homeCtx.stroke();
  }
}

function drawFlyingBirds(frame) {
  const colors = Object.values(birdColors);
  
  for (let i = 0; i < 3; i++) {
    const x = ((frame * 1.5 + i * 150) % (homeCanvasWidth + 100)) - 50;
    const y = 200 + Math.sin(frame * 0.02 + i) * 40;
    const color = colors[i];
    
    homeCtx.save();
    homeCtx.translate(x, y);
    
    // Body
    homeCtx.fillStyle = color.main;
    homeCtx.beginPath();
    homeCtx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2);
    homeCtx.fill();
    
    // Wing
    const wingFlap = Math.sin(frame * 0.1) * 0.3;
    homeCtx.fillStyle = color.secondary;
    homeCtx.save();
    homeCtx.rotate(wingFlap);
    homeCtx.beginPath();
    homeCtx.ellipse(-6, 0, 10, 6, 0, 0, Math.PI * 2);
    homeCtx.fill();
    homeCtx.restore();
    
    // Eye
    homeCtx.fillStyle = '#fff';
    homeCtx.beginPath();
    homeCtx.arc(4, -4, 3, 0, Math.PI * 2);
    homeCtx.fill();
    
    homeCtx.fillStyle = '#000';
    homeCtx.beginPath();
    homeCtx.arc(5, -4, 1.5, 0, Math.PI * 2);
    homeCtx.fill();
    
    homeCtx.restore();
  }
}

// ===== Game Functions =====
function resetGame() {
  // Apply difficulty settings
  const settings = difficultySettings[gameSettings.difficulty];
  gravity = settings.gravity;
  jumpStrength = settings.jumpStrength;
  pipeGap = settings.pipeGap;
  pipeDistance = settings.pipeDistance;
  pipeSpeed = settings.pipeSpeed;

  bird = {
    x: width * 0.22,
    y: height * 0.4,
    radius: 18,
    velocity: 0,
    rotation: 0,
  };

  pipes = [];
  score = 0;
  frameCount = 0;
  running = true;
  gameOver = false;
  scoreLabel.textContent = 'Score: 0';
  difficultyLabel.textContent = `Difficulty: ${gameSettings.difficulty.charAt(0).toUpperCase() + gameSettings.difficulty.slice(1)}`;
  hideGameOverModal();
}

function createPipe() {
  const topHeight = Math.random() * (height - pipeGap - groundHeight - 120) + 60;
  pipes.push({ x: width, top: topHeight, passed: false });
}

function flap() {
  if (!running) {
    resetGame();
  }

  if (gameOver) {
    resetGame();
    return;
  }

  bird.velocity = jumpStrength;
}

function drawBird() {
  const birdColorSet = birdColors[gameSettings.birdColor];
  
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  // Body
  ctx.fillStyle = birdColorSet.main;
  ctx.beginPath();
  ctx.ellipse(0, 0, bird.radius, bird.radius * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing animation
  wingAngle = Math.sin(frameCount * 0.1) * 0.3;
  
  // Left Wing
  ctx.fillStyle = birdColorSet.secondary;
  ctx.save();
  ctx.rotate(wingAngle);
  ctx.beginPath();
  ctx.ellipse(-8, -2, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right Wing
  ctx.save();
  ctx.rotate(-wingAngle);
  ctx.beginPath();
  ctx.ellipse(8, -2, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Chest
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 2, bird.radius * 0.6, bird.radius * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(4, -6, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000000';
  const pupilOffset = Math.sin(frameCount * 0.05) * 1;
  ctx.beginPath();
  ctx.arc(4 + pupilOffset, -6, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(5 + pupilOffset, -7, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = birdColorSet.accent;
  ctx.beginPath();
  ctx.moveTo(8, -1);
  ctx.lineTo(14, -1);
  ctx.lineTo(12, 1);
  ctx.closePath();
  ctx.fill();

  // Tail feathers
  ctx.strokeStyle = birdColorSet.secondary;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  ctx.moveTo(-12, 8);
  ctx.quadraticCurveTo(-18, 10, -20, 14);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-13, 12);
  ctx.quadraticCurveTo(-19, 15, -21, 20);
  ctx.stroke();

  ctx.restore();
}

function drawPipes() {
  ctx.fillStyle = '#2d9b2b';
  pipes.forEach(pipe => {
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
    ctx.fillRect(pipe.x, pipe.top + pipeGap, pipeWidth, height - pipe.top - pipeGap - groundHeight);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(pipe.x + 2, 5, pipeWidth - 4, 10);
    ctx.fillRect(pipe.x + 2, pipe.top + pipeGap + 5, pipeWidth - 4, 10);
    
    ctx.fillStyle = '#2d9b2b';
  });
}

function drawGround() {
  ctx.fillStyle = '#dcae5d';
  ctx.fillRect(0, height - groundHeight, width, groundHeight);
  
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 2;
  for (let i = 0; i < width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, height - groundHeight);
    ctx.lineTo(i + 20, height - groundHeight + 10);
    ctx.stroke();
  }
}

function detectCollision(pipe) {
  const birdLeft = bird.x - bird.radius;
  const birdRight = bird.x + bird.radius;
  const birdTop = bird.y - bird.radius;
  const birdBottom = bird.y + bird.radius;

  if (birdBottom >= height - groundHeight) return true;
  if (birdTop <= 0) return true;

  const pipeRight = pipe.x + pipeWidth;
  const pipeBottomTop = pipe.top;
  const pipeTopBottom = pipe.top + pipeGap;

  if (birdRight > pipe.x && birdLeft < pipeRight) {
    if (birdTop < pipeBottomTop || birdBottom > pipeTopBottom) {
      return true;
    }
  }

  return false;
}

function update() {
  if (!running) return;

  bird.velocity += gravity;
  bird.y += bird.velocity;
  bird.rotation = Math.min(Math.max(bird.velocity * 0.04, -0.5), 0.9);

  if (frameCount % 100 === 0) {
    createPipe();
  }

  pipes.forEach(pipe => {
    pipe.x -= pipeSpeed;

    if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
      pipe.passed = true;
      score += 1;
      scoreLabel.textContent = `Score: ${score}`;
    }
  });

  if (pipes.length && pipes[0].x + pipeWidth < 0) {
    pipes.shift();
  }

  if (pipes.some(detectCollision) || bird.y + bird.radius >= height - groundHeight) {
    running = false;
    gameOver = true;
    showGameOverModal();
  }

  frameCount += 1;
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#70c5ce';
  ctx.fillRect(0, 0, width, height);

  drawPipes();
  drawGround();
  drawBird();
}

function gameLoop() {
  if (gamescreen.classList.contains('active')) {
    update();
    draw();
  } else {
    homeCtx.clearRect(0, 0, homeCanvasWidth, homeCanvasHeight);
    drawHomescreen();
  }
  requestAnimationFrame(gameLoop);
}

function showGameOverModal() {
  finalScoreDisplay.textContent = score;
  gameOverModal.classList.remove('hidden');
  modalOverlay.classList.remove('hidden');
}

function hideGameOverModal() {
  gameOverModal.classList.add('hidden');
  modalOverlay.classList.add('hidden');
}

function switchToGame() {
  homescreen.classList.remove('active');
  gamescreen.classList.add('active');
  resetGame();
}

function switchToHome() {
  gamescreen.classList.remove('active');
  homescreen.classList.add('active');
  running = false;
  gameOver = false;
}

function showSettings() {
  settingsModal.classList.remove('hidden');
  modalOverlay.classList.remove('hidden');
  
  // Load current settings
  document.querySelector(`input[name="difficulty"][value="${gameSettings.difficulty}"]`).checked = true;
  document.querySelector(`input[name="birdColor"][value="${gameSettings.birdColor}"]`).checked = true;
}

function hideSettings() {
  // Save settings
  gameSettings.difficulty = document.querySelector('input[name="difficulty"]:checked').value;
  gameSettings.birdColor = document.querySelector('input[name="birdColor"]:checked').value;
  
  settingsModal.classList.add('hidden');
  modalOverlay.classList.add('hidden');
}

// ===== Event Listeners =====
playBtn.addEventListener('click', switchToGame);
settingsBtn.addEventListener('click', showSettings);
closeSettingsBtn.addEventListener('click', hideSettings);
homeBtn.addEventListener('click', switchToHome);
homeFromGameBtn.addEventListener('click', switchToHome);

restartBtn.addEventListener('click', () => {
  hideGameOverModal();
  resetGame();
});

window.addEventListener('keydown', event => {
  if (event.code === 'Space' || event.code === 'ArrowUp') {
    event.preventDefault();
    if (gameOver && gamescreen.classList.contains('active')) {
      flap();
    } else if (running) {
      flap();
    }
  }
});

canvas.addEventListener('mousedown', () => {
  if (gamescreen.classList.contains('active')) {
    flap();
  }
});

canvas.addEventListener('touchstart', event => {
  event.preventDefault();
  if (gamescreen.classList.contains('active')) {
    flap();
  }
});

modalOverlay.addEventListener('click', () => {
  if (!settingsModal.classList.contains('hidden')) {
    hideSettings();
  } else if (gameOver && gamescreen.classList.contains('active')) {
    flap();
  }
});

// Initialize game loop
frameCount = 0;
gameLoop();
