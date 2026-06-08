const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreLabel = document.getElementById('score');
const messageLabel = document.getElementById('message');
const gameOverModal = document.getElementById('gameOverModal');
const modalOverlay = document.getElementById('modalOverlay');
const finalScoreDisplay = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

const width = canvas.width;
const height = canvas.height;
const gravity = 0.45;
const jumpStrength = -9.5;
const pipeWidth = 80;
const pipeGap = 180;
const pipeDistance = 260;
const groundHeight = 80;

let bird;
let pipes;
let score;
let frameCount;
let running = false;
let gameOver = false;
let wingAngle = 0;

function resetGame() {
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
  messageLabel.textContent = 'Press Space or Click to flap';
  scoreLabel.textContent = 'Score: 0';
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
  messageLabel.textContent = 'Keep going!';
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  // Body (main oval)
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath();
  ctx.ellipse(0, 0, bird.radius, bird.radius * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing animation
  wingAngle = Math.sin(frameCount * 0.1) * 0.3;
  
  // Left Wing
  ctx.fillStyle = '#fdd835';
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

  // Chest/Breast (lighter yellow)
  ctx.fillStyle = '#ffee58';
  ctx.beginPath();
  ctx.ellipse(0, 2, bird.radius * 0.6, bird.radius * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  // Left eye white
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(4, -6, 5, 0, Math.PI * 2);
  ctx.fill();

  // Right eye white
  ctx.beginPath();
  ctx.arc(4, -6, 5, 0, Math.PI * 2);
  ctx.fill();

  // Pupil (looking forward with slight animation)
  ctx.fillStyle = '#000000';
  const pupilOffset = Math.sin(frameCount * 0.05) * 1;
  ctx.beginPath();
  ctx.arc(4 + pupilOffset, -6, 3, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(5 + pupilOffset, -7, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#ff9800';
  ctx.beginPath();
  ctx.moveTo(8, -1);
  ctx.lineTo(14, -1);
  ctx.lineTo(12, 1);
  ctx.closePath();
  ctx.fill();

  // Tail feathers
  ctx.strokeStyle = '#fbc02d';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  // Tail feather 1
  ctx.beginPath();
  ctx.moveTo(-12, 8);
  ctx.quadraticCurveTo(-18, 10, -20, 14);
  ctx.stroke();

  // Tail feather 2
  ctx.beginPath();
  ctx.moveTo(-13, 12);
  ctx.quadraticCurveTo(-19, 15, -21, 20);
  ctx.stroke();

  ctx.restore();
}

function drawPipes() {
  ctx.fillStyle = '#2d9b2b';
  pipes.forEach(pipe => {
    // Top pipe with gradient
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
    
    // Top pipe shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(pipe.x + 2, 5, pipeWidth - 4, 10);
    
    // Bottom pipe
    ctx.fillStyle = '#2d9b2b';
    ctx.fillRect(pipe.x, pipe.top + pipeGap, pipeWidth, height - pipe.top - pipeGap - groundHeight);
    
    // Bottom pipe shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(pipe.x + 2, pipe.top + pipeGap + 5, pipeWidth - 4, 10);
  });
}

function drawGround() {
  ctx.fillStyle = '#dcae5d';
  ctx.fillRect(0, height - groundHeight, width, groundHeight);
  
  // Ground pattern
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
    pipe.x -= 3.8;

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
    messageLabel.textContent = 'Game Over';
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

function showGameOverModal() {
  finalScoreDisplay.textContent = score;
  gameOverModal.classList.remove('hidden');
  modalOverlay.classList.remove('hidden');
}

function hideGameOverModal() {
  gameOverModal.classList.add('hidden');
  modalOverlay.classList.add('hidden');
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// Event listeners
window.addEventListener('keydown', event => {
  if (event.code === 'Space' || event.code === 'ArrowUp') {
    event.preventDefault();
    flap();
  }
});

canvas.addEventListener('mousedown', () => flap());
canvas.addEventListener('touchstart', event => {
  event.preventDefault();
  flap();
});

restartBtn.addEventListener('click', () => {
  flap();
});

modalOverlay.addEventListener('click', () => {
  if (!running && gameOver) {
    flap();
  }
});

resetGame();
requestAnimationFrame(loop);
