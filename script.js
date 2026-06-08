const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreLabel = document.getElementById('score');
const messageLabel = document.getElementById('message');

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
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath();
  ctx.ellipse(0, 0, bird.radius, bird.radius * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(6, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPipes() {
  ctx.fillStyle = '#2d9b2b';
  pipes.forEach(pipe => {
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
    ctx.fillRect(pipe.x, pipe.top + pipeGap, pipeWidth, height - pipe.top - pipeGap - groundHeight);
  });
}

function drawGround() {
  ctx.fillStyle = '#dcae5d';
  ctx.fillRect(0, height - groundHeight, width, groundHeight);
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
    messageLabel.textContent = 'Game Over — Press Space or Click to restart';
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

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

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

resetGame();
requestAnimationFrame(loop);
