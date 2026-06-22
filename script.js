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

const difficultySettings = {
  easy: { gravity: 0.4, speed: 3, pipeDistance: 280 },
  normal: { gravity: 0.45, speed: 5, pipeDistance: 260 },
  hard: { gravity: 0.6, speed: 7, pipeDistance: 240 }
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

// City Background Drawing
const drawCityBackground = () => {
  // Sky gradient
  const gradient = gameCtx.createLinearGradient(0, 0, 0, gameCanvas.height);
  if (gameSettings.theme === 'night') {
    gradient.addColorStop(0, '#1a1f3a');
    gradient.addColorStop(1, '#2d2e4a');
  } else {
    gradient.addColorStop(0, '#70c5ce');
    gradient.addColorStop(1, '#90d5e0');
  }
  gameCtx.fillStyle = gradient;
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  // Draw buildings (static, behind game elements)
  const buildingWidth = 70;
  const buildingSpacing = 90;
  const maxBuildingHeight = 200;
  
  for (let i = 0; i < (gameCanvas.width / buildingSpacing) + 2; i++) {
    const x = i * buildingSpacing - 30;
    const height = 100 + Math.sin(i * 0.7) * 60;
    const y = gameCanvas.height - height - 80;
    
    // Building shadow (for depth)
    if (gameSettings.theme === 'night') {
      gameCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    } else {
      gameCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    }
    gameCtx.fillRect(x + 2, y + 2, buildingWidth, height);
    
    // Building body
    if (gameSettings.theme === 'night') {
      gameCtx.fillStyle = '#0f1419';
    } else {
      gameCtx.fillStyle = '#9a9aaa';
    }
    gameCtx.fillRect(x, y, buildingWidth, height);
    
    // Building outline
    gameCtx.strokeStyle = gameSettings.theme === 'night' ? '#333' : '#7a7a8a';
    gameCtx.lineWidth = 2;
    gameCtx.strokeRect(x, y, buildingWidth, height);

    // Windows
    const windowSize = 6;
    const windowSpacing = 12;
    const windowPadding = 6;
    
    for (let row = 0; row < Math.floor((height - windowPadding * 2) / windowSpacing); row++) {
      for (let col = 0; col < 2; col++) {
        const wx = x + windowPadding + col * (buildingWidth / 2 - windowPadding);
        const wy = y + windowPadding + row * windowSpacing;
        
        if (gameSettings.theme === 'night' && Math.random() > 0.4) {
          gameCtx.fillStyle = '#ffeb3b';
          gameCtx.fillRect(wx, wy, windowSize, windowSize);
          // Light glow
          gameCtx.shadowColor = 'rgba(255, 235, 59, 0.5)';
          gameCtx.shadowBlur = 3;
        } else {
          gameCtx.fillStyle = gameSettings.theme === 'night' ? '#1a1f3a' : '#d0d0d0';
          gameCtx.fillRect(wx, wy, windowSize, windowSize);
        }
      }
    }
  }
  
  gameCtx.shadowColor = 'transparent';
};

// Draw Bird with Patterns
const drawBirdWithPattern = () => {
  gameCtx.save();
  gameCtx.translate(birdX + birdWidth / 2, birdY + birdHeight / 2);
  
  // Rotation based on velocity
  const angle = Math.min(velocity * 0.08, 0.5);
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
  
  const angle = Math.min(velocity * 0.08, 0.5);
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
  gameCtx.fillStyle = '#2d9b2b';
  pipes.forEach(pipe => {
    // Top pipe
    gameCtx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
    
    // Top pipe shine
    gameCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    gameCtx.fillRect(pipe.x + 2, 5, pipeWidth - 4, 10);
    
    // Bottom pipe
    gameCtx.fillStyle = '#2d9b2b';
    gameCtx.fillRect(pipe.x, pipe.bottomY, pipeWidth, gameCanvas.height - pipe.bottomY - 80);
    
    // Bottom pipe shine
    gameCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    gameCtx.fillRect(pipe.x + 2, pipe.bottomY + 5, pipeWidth - 4, 10);
  });
};

// Draw Ground
const drawGround = () => {
  gameCtx.fillStyle = '#dcae5d';
  gameCtx.fillRect(0, gameCanvas.height - 80, gameCanvas.width, 80);

  // Ground pattern
  gameCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  gameCtx.lineWidth = 2;
  for (let i = 0; i < gameCanvas.width; i += 40) {
    gameCtx.beginPath();
    gameCtx.moveTo(i, gameCanvas.height - 80);
    gameCtx.lineTo(i + 20, gameCanvas.height - 60);
    gameCtx.stroke();
  }
};

// Initialize Game
const initGame = () => {
  const settings = difficultySettings[gameSettings.difficulty];
  gravity = settings.gravity;
  gameSpeed = settings.speed;
  pipeDistance = settings.pipeDistance;
  
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
  birdY += velocity;

  // Generate pipes
  if (pipes.length === 0 || pipes[pipes.length - 1].x < gameCanvas.width - pipeDistance) {
    const minHeight = 60;
    const maxHeight = gameCanvas.height - pipeSpacing - 120;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
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
};

// Game Over
const endGame = () => {
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
    if (gameState === 'playing') {
      velocity = flapPower;
    } else if (gameState === 'gameOver') {
      hideGameOverModal();
      showGamescreen();
    }
  }
});

// Click on canvas for flap
gameCanvas.addEventListener('click', () => {
  if (gameState === 'playing') {
    velocity = flapPower;
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
