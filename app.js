/**
 * Weather++ Bedrock Studio & Simulation Engine
 */

// -------------------------------------------------------------
// State & Configuration
// -------------------------------------------------------------
const state = {
  rainDensity: 450,
  rainSmoothness: 0.85,
  streakLength: 28,
  fallSpeed: 24,
  splashIntensity: 1.0,
  mistDensity: 0.40,
  thunderFreq: 12,
  thunderBass: 6,
  flashIntensity: 0.80,
  audioEnabled: false,
  preset: 'cinematic'
};

const PRESETS = {
  cinematic: {
    rainDensity: 450,
    rainSmoothness: 0.85,
    streakLength: 28,
    fallSpeed: 24,
    splashIntensity: 1.0,
    mistDensity: 0.40,
    thunderFreq: 12,
    thunderBass: 6,
    flashIntensity: 0.80,
    status: "Storm Status: Cinematic Thunderstorm Active"
  },
  gentle: {
    rainDensity: 160,
    rainSmoothness: 0.95,
    streakLength: 16,
    fallSpeed: 14,
    splashIntensity: 0.4,
    mistDensity: 0.15,
    thunderFreq: 45,
    thunderBass: 2,
    flashIntensity: 0.2,
    status: "Storm Status: Calming Gentle Drizzle"
  },
  heavy: {
    rainDensity: 800,
    rainSmoothness: 0.75,
    streakLength: 42,
    fallSpeed: 32,
    splashIntensity: 1.8,
    mistDensity: 0.70,
    thunderFreq: 7,
    thunderBass: 10,
    flashIntensity: 0.95,
    status: "Storm Status: Severe Torrential Storm"
  },
  mist: {
    rainDensity: 220,
    rainSmoothness: 0.98,
    streakLength: 14,
    fallSpeed: 11,
    splashIntensity: 0.2,
    mistDensity: 0.85,
    thunderFreq: 60,
    thunderBass: 1,
    flashIntensity: 0.1,
    status: "Storm Status: Moody Mountain Mist"
  },
  performance: {
    rainDensity: 120,
    rainSmoothness: 0.80,
    streakLength: 20,
    fallSpeed: 22,
    splashIntensity: 0.5,
    mistDensity: 0.10,
    thunderFreq: 15,
    thunderBass: 5,
    flashIntensity: 0.6,
    status: "Storm Status: Performance Optimized"
  }
};

// -------------------------------------------------------------
// Canvas & Simulation Engine
// -------------------------------------------------------------
const canvas = document.getElementById('weather-canvas');
const ctx = canvas.getContext('2d');

let width, height;
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  width = canvas.width = rect.width;
  height = canvas.height = rect.height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Simulation Entities
const droplets = [];
const splashes = [];
const mistClouds = [];
let lightningBolts = [];
let screenFlashAlpha = 0;
let lastLightningTime = performance.now();

class RainDrop {
  constructor() {
    this.reset(true);
  }

  reset(initial = false) {
    this.x = Math.random() * (width + 200) - 100;
    this.y = initial ? Math.random() * height : -Math.random() * 50;
    this.z = Math.random() * 0.8 + 0.2; // Depth perception
    this.speed = (state.fallSpeed * (0.8 + this.z * 0.4));
    this.wind = -2.5 * this.z;
    this.length = state.streakLength * this.z;
    this.alpha = (0.3 + this.z * 0.6) * state.rainSmoothness;
  }

  update() {
    this.x += this.wind;
    this.y += this.speed;

    // Ground collision height (terrain contour)
    const groundY = getTerrainHeight(this.x);
    if (this.y >= groundY) {
      if (Math.random() < 0.6 * state.splashIntensity * this.z) {
        splashes.push(new Splash(this.x, groundY, this.z));
      }
      this.reset();
    }

    if (this.y > height + 50 || this.x < -150) {
      this.reset();
    }
  }

  draw() {
    const endX = this.x - this.wind * (this.length / this.speed);
    const endY = this.y - this.length;

    // Smooth gradient stroke for silky raindrop appearance
    const grad = ctx.createLinearGradient(endX, endY, this.x, this.y);
    grad.addColorStop(0, `rgba(200, 230, 255, 0)`);
    grad.addColorStop(0.4, `rgba(215, 240, 255, ${this.alpha * 0.4})`);
    grad.addColorStop(1, `rgba(235, 248, 255, ${this.alpha})`);

    ctx.beginPath();
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(1, 1.8 * this.z);
    ctx.lineCap = 'round';
    ctx.moveTo(endX, endY);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
  }
}

class Splash {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.radius = 1;
    this.maxRadius = (4 + Math.random() * 7) * z;
    this.alpha = 0.8 * z;
    this.life = 0;
    this.maxLife = 12 + Math.random() * 8;
  }

  update() {
    this.life++;
    const progress = this.life / this.maxLife;
    this.radius = this.maxRadius * Math.sin(progress * Math.PI * 0.5);
    this.alpha = (1 - progress) * 0.7 * this.z;
  }

  draw() {
    if (this.alpha <= 0.01) return;
    ctx.save();
    ctx.beginPath();
    // Elliptical perspective ripple on Minecraft ground plane
    ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(210, 235, 255, ${this.alpha})`;
    ctx.lineWidth = 1.2 * this.z;
    ctx.stroke();

    // Soft center mist point
    ctx.beginPath();
    ctx.arc(this.x, this.y - 1, 1 * this.z, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(240, 250, 255, ${this.alpha * 0.9})`;
    ctx.fill();
    ctx.restore();
  }
}

// Procedural Minecraft Terrain Contour
function getTerrainHeight(x) {
  const normX = x / width;
  // Blocky stepped terrain heights
  const step = Math.floor(normX * 18);
  const base = height * 0.76;
  const hill = Math.sin(step * 0.4) * 45 + Math.cos(step * 0.8) * 20;
  return base + hill;
}

// Generate Mist clouds
for (let i = 0; i < 7; i++) {
  mistClouds.push({
    x: Math.random() * width,
    y: height * 0.5 + Math.random() * (height * 0.35),
    radius: 120 + Math.random() * 160,
    speed: 0.15 + Math.random() * 0.2,
    alpha: 0.04 + Math.random() * 0.05
  });
}

// -------------------------------------------------------------
// Lightning Generator (Fractal Tree Algorithm)
// -------------------------------------------------------------
function triggerLightningStrike(xPos = null) {
  const startX = xPos !== null ? xPos : Math.random() * (width * 0.7) + width * 0.15;
  const startY = 0;
  const targetX = startX + (Math.random() * 120 - 60);
  const targetY = getTerrainHeight(targetX);

  const segments = [];

  function createBranch(x1, y1, x2, y2, depth = 0) {
    if (depth > 6) {
      segments.push({ x1, y1, x2, y2, depth });
      return;
    }
    const midX = (x1 + x2) / 2 + (Math.random() * 50 - 25) / (depth + 1);
    const midY = (y1 + y2) / 2 + (Math.random() * 20 - 10) / (depth + 1);

    createBranch(x1, y1, midX, midY, depth + 1);
    createBranch(midX, midY, x2, y2, depth + 1);

    // Stochastic Sub-branches
    if (depth < 4 && Math.random() < 0.45) {
      const subEndX = midX + (Math.random() * 140 - 70);
      const subEndY = midY + (Math.random() * 90 + 30);
      createBranch(midX, midY, subEndX, subEndY, depth + 2);
    }
  }

  createBranch(startX, startY, targetX, targetY, 0);

  lightningBolts.push({
    segments,
    life: 0,
    maxLife: 8 + Math.floor(Math.random() * 6),
    color: '#ffffff',
    glowColor: '#7dd3fc'
  });

  screenFlashAlpha = state.flashIntensity * 0.85;

  // Play audio
  if (state.audioEnabled) {
    synthesizeThunderAudio();
  }
}

// -------------------------------------------------------------
// Web Audio API Synthesis Engine
// -------------------------------------------------------------
let audioCtx = null;
let rainGain = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    setupRainAudio();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function setupRainAudio() {
  if (!audioCtx) return;
  
  // Continuous smooth filtered noise buffer
  const bufferSize = audioCtx.sampleRate * 2;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // 3-pole pink noise filter for realistic gentle rainfall
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    output[i] = (b0 + b1 + b2) * 0.12;
  }

  const whiteNoise = audioCtx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;
  whiteNoise.loop = true;

  // Lowpass filter for smooth droplet feel
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;

  rainGain = audioCtx.createGain();
  rainGain.gain.value = state.audioEnabled ? 0.35 : 0.0;

  whiteNoise.connect(filter);
  filter.connect(rainGain);
  rainGain.connect(audioCtx.destination);
  whiteNoise.start();
}

function synthesizeThunderAudio() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  // 1. Initial Sharp Electrical Tear & Snap (0s - 0.25s)
  const crackBuffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.3), audioCtx.sampleRate);
  const crackData = crackBuffer.getChannelData(0);
  for (let i = 0; i < crackBuffer.length; i++) {
    const t = i / audioCtx.sampleRate;
    const tear = Math.sin(2 * Math.PI * (140 + (i % 5) * 50) * t) * (Math.random() > 0.35 ? 1 : -1);
    const snap = (Math.random() * 2 - 1);
    crackData[i] = (snap * 0.75 + tear * 0.25) * Math.exp(-t * 22);
  }
  const crackSource = audioCtx.createBufferSource();
  crackSource.buffer = crackBuffer;

  const crackFilter = audioCtx.createBiquadFilter();
  crackFilter.type = 'highpass';
  crackFilter.frequency.value = 400;

  const crackGain = audioCtx.createGain();
  crackGain.gain.setValueAtTime(0.75, now);
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  crackSource.connect(crackFilter);
  crackFilter.connect(crackGain);
  crackGain.connect(audioCtx.destination);
  crackSource.start(now);

  // 2. Rolling Acoustic Thunder (Multi-tap diffuse noise reverberation)
  const rumbleDuration = 4.5;
  const rumbleBuffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * rumbleDuration), audioCtx.sampleRate);
  const rData = rumbleBuffer.getChannelData(0);
  let lp1 = 0;
  let lp2 = 0;
  for (let i = 0; i < rumbleBuffer.length; i++) {
    const t = i / audioCtx.sampleRate;
    const white = Math.random() * 2 - 1;
    // 2-pole lowpass filter for authentic thunder diffusion
    lp1 += (white - lp1) * 0.032;
    lp2 += (lp1 - lp2) * 0.045;
    
    // Natural acoustic envelope: quick swell into rolling chaotic thunder pockets
    const env = Math.exp(-t * 0.65) * (1 - Math.exp(-t * 14));
    const rollMod = 0.75 + Math.sin(t * 8.5) * 0.15 + Math.sin(t * 15.2) * 0.12;
    rData[i] = lp2 * env * rollMod * 2.2;
  }
  const rumbleSource = audioCtx.createBufferSource();
  rumbleSource.buffer = rumbleBuffer;

  const rumbleFilter = audioCtx.createBiquadFilter();
  rumbleFilter.type = 'lowpass';
  rumbleFilter.frequency.value = 280;

  // Echo delay line for terrain reverberation
  const delay = audioCtx.createDelay();
  delay.delayTime.value = 0.16;
  const feedback = audioCtx.createGain();
  feedback.gain.value = 0.35;

  const rumbleGain = audioCtx.createGain();
  const bassBoost = 1.0 + (state.thunderBass / 12) * 0.6;
  rumbleGain.gain.setValueAtTime(0.9 * bassBoost, now);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + rumbleDuration);

  rumbleSource.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  rumbleGain.connect(audioCtx.destination);

  // Connect echo loop
  rumbleFilter.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(rumbleGain);

  rumbleSource.start(now + 0.04);
}

// -------------------------------------------------------------
// Render Loop
// -------------------------------------------------------------
function render() {
  const now = performance.now();

  // Adjust droplet count
  while (droplets.length < state.rainDensity) {
    droplets.push(new RainDrop());
  }
  while (droplets.length > state.rainDensity) {
    droplets.pop();
  }

  // Automatic Thunder Interval Check
  if (now - lastLightningTime > state.thunderFreq * 1000) {
    if (Math.random() < 0.8) {
      triggerLightningStrike();
    }
    lastLightningTime = now;
  }

  // 1. Draw Sky Background & Storm Atmosphere
  ctx.fillStyle = '#0a0f1d';
  ctx.fillRect(0, 0, width, height);

  // Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0, '#060a14');
  skyGrad.addColorStop(0.6, '#0f172a');
  skyGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Draw Distant Minecraft Mountains & Terrain Silhouette
  drawMinecraftScene();

  // 3. Draw Atmospheric Mist Layers
  if (state.mistDensity > 0.01) {
    ctx.save();
    for (const cloud of mistClouds) {
      cloud.x -= cloud.speed;
      if (cloud.x < -cloud.radius) cloud.x = width + cloud.radius;

      const mGrad = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.radius);
      mGrad.addColorStop(0, `rgba(180, 210, 240, ${cloud.alpha * state.mistDensity})`);
      mGrad.addColorStop(1, 'rgba(180, 210, 240, 0)');
      ctx.fillStyle = mGrad;
      ctx.fillRect(cloud.x - cloud.radius, cloud.y - cloud.radius, cloud.radius * 2, cloud.radius * 2);
    }
    ctx.restore();
  }

  // 4. Update & Draw Rain Droplets
  for (const drop of droplets) {
    drop.update();
    drop.draw();
  }

  // 5. Update & Draw Splashes
  for (let i = splashes.length - 1; i >= 0; i--) {
    const s = splashes[i];
    s.update();
    s.draw();
    if (s.life >= s.maxLife) {
      splashes.splice(i, 1);
    }
  }

  // 6. Draw Lightning Bolts
  for (let i = lightningBolts.length - 1; i >= 0; i--) {
    const bolt = lightningBolts[i];
    bolt.life++;

    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#38bdf8';

    for (const seg of bolt.segments) {
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, 4 - seg.depth * 0.5);
      ctx.lineCap = 'round';
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
    ctx.restore();

    if (bolt.life >= bolt.maxLife) {
      lightningBolts.splice(i, 1);
    }
  }

  // 7. Screen Flash Strobe
  if (screenFlashAlpha > 0.005) {
    ctx.fillStyle = `rgba(240, 248, 255, ${screenFlashAlpha})`;
    ctx.fillRect(0, 0, width, height);
    screenFlashAlpha *= 0.82; // exponential decay
  }

  requestAnimationFrame(render);
}

// Draw Blocky Minecraft Landscape
function drawMinecraftScene() {
  ctx.save();

  // Distant Mountain Silhouette
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width; x += 30) {
    const my = height * 0.62 + Math.sin(x * 0.005) * 50 + Math.cos(x * 0.012) * 25;
    ctx.lineTo(x, my);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  // Midground Hills (Stepped Blocks)
  ctx.fillStyle = '#162238';
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width; x += 24) {
    const gy = getTerrainHeight(x);
    ctx.lineTo(x, gy);
    ctx.lineTo(x + 24, gy);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  // Blocky Pine Trees
  drawPixelPineTree(width * 0.2, getTerrainHeight(width * 0.2));
  drawPixelPineTree(width * 0.45, getTerrainHeight(width * 0.45));
  drawPixelPineTree(width * 0.78, getTerrainHeight(width * 0.78));

  // Glowing Minecraft Cabin
  drawPixelCabin(width * 0.6, getTerrainHeight(width * 0.6));

  ctx.restore();
}

function drawPixelPineTree(x, y) {
  ctx.fillStyle = '#0b1320';
  // Trunk
  ctx.fillRect(x - 4, y - 36, 8, 36);
  // Foliage blocks
  ctx.fillRect(x - 22, y - 48, 44, 14);
  ctx.fillRect(x - 16, y - 62, 32, 14);
  ctx.fillRect(x - 10, y - 76, 20, 14);
  ctx.fillRect(x - 4, y - 84, 8, 8);
}

function drawPixelCabin(x, y) {
  // Cabin Wall
  ctx.fillStyle = '#1e1b18';
  ctx.fillRect(x - 28, y - 40, 56, 40);
  
  // Roof
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(x - 34, y - 40);
  ctx.lineTo(x, y - 62);
  ctx.lineTo(x + 34, y - 40);
  ctx.closePath();
  ctx.fill();

  // Cozy Glowing Warm Window
  ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 18;
  ctx.fillRect(x - 12, y - 26, 12, 14);
  ctx.fillRect(x + 4, y - 26, 12, 14);

  // Door
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#111827';
  ctx.fillRect(x - 5, y - 18, 10, 18);
}

// -------------------------------------------------------------
// UI Control Binding
// -------------------------------------------------------------
const elDensity = document.getElementById('rain-density');
const elSmoothness = document.getElementById('rain-smoothness');
const elLength = document.getElementById('rain-length');
const elSpeed = document.getElementById('rain-speed');
const elSplash = document.getElementById('splash-intensity');
const elMist = document.getElementById('mist-density');
const elFreq = document.getElementById('thunder-frequency');
const elBass = document.getElementById('thunder-bass');
const elFlash = document.getElementById('flash-intensity');

const valDensity = document.getElementById('val-density');
const valSmoothness = document.getElementById('val-smoothness');
const valLength = document.getElementById('val-length');
const valSpeed = document.getElementById('val-speed');
const valSplash = document.getElementById('val-splash');
const valMist = document.getElementById('val-mist');
const valFreq = document.getElementById('val-freq');
const valBass = document.getElementById('val-bass');
const valFlash = document.getElementById('val-flash');

function updateUIValues() {
  valDensity.textContent = `${state.rainDensity} drops`;
  valSmoothness.textContent = `${Math.round(state.rainSmoothness * 100)}%`;
  valLength.textContent = `${state.streakLength} px`;
  valSpeed.textContent = `${state.fallSpeed} px/frame`;
  valSplash.textContent = `${state.splashIntensity.toFixed(1)}x`;
  valMist.textContent = `${Math.round(state.mistDensity * 100)}%`;
  valFreq.textContent = `${state.thunderFreq}s interval`;
  valBass.textContent = `+${state.thunderBass} dB`;
  valFlash.textContent = `${Math.round(state.flashIntensity * 100)}%`;

  elDensity.value = state.rainDensity;
  elSmoothness.value = state.rainSmoothness * 100;
  elLength.value = state.streakLength;
  elSpeed.value = state.fallSpeed;
  elSplash.value = state.splashIntensity;
  elMist.value = state.mistDensity * 100;
  elFreq.value = state.thunderFreq;
  elBass.value = state.thunderBass;
  elFlash.value = state.flashIntensity * 100;
}

elDensity.addEventListener('input', (e) => {
  state.rainDensity = parseInt(e.target.value);
  valDensity.textContent = `${state.rainDensity} drops`;
});
elSmoothness.addEventListener('input', (e) => {
  state.rainSmoothness = parseInt(e.target.value) / 100;
  valSmoothness.textContent = `${Math.round(state.rainSmoothness * 100)}%`;
});
elLength.addEventListener('input', (e) => {
  state.streakLength = parseInt(e.target.value);
  valLength.textContent = `${state.streakLength} px`;
});
elSpeed.addEventListener('input', (e) => {
  state.fallSpeed = parseInt(e.target.value);
  valSpeed.textContent = `${state.fallSpeed} px/frame`;
});
elSplash.addEventListener('input', (e) => {
  state.splashIntensity = parseFloat(e.target.value);
  valSplash.textContent = `${state.splashIntensity.toFixed(1)}x`;
});
elMist.addEventListener('input', (e) => {
  state.mistDensity = parseInt(e.target.value) / 100;
  valMist.textContent = `${Math.round(state.mistDensity * 100)}%`;
});
elFreq.addEventListener('input', (e) => {
  state.thunderFreq = parseInt(e.target.value);
  valFreq.textContent = `${state.thunderFreq}s interval`;
});
elBass.addEventListener('input', (e) => {
  state.thunderBass = parseInt(e.target.value);
  valBass.textContent = `+${state.thunderBass} dB`;
});
elFlash.addEventListener('input', (e) => {
  state.flashIntensity = parseInt(e.target.value) / 100;
  valFlash.textContent = `${Math.round(state.flashIntensity * 100)}%`;
});

// Presets
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const pKey = btn.dataset.preset;
    if (PRESETS[pKey]) {
      Object.assign(state, PRESETS[pKey]);
      document.getElementById('weather-status-text').textContent = PRESETS[pKey].status;
      updateUIValues();
    }
  });
});

// Quick Strike Button
document.getElementById('btn-quick-strike').addEventListener('click', () => {
  initAudio();
  triggerLightningStrike();
});

// Canvas Click to Strike
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  initAudio();
  triggerLightningStrike(clickX);
});

// Audio Toggle
const btnAudio = document.getElementById('btn-audio-toggle');
const audioIcon = document.getElementById('audio-icon');
const audioLabel = document.getElementById('audio-label');

btnAudio.addEventListener('click', () => {
  initAudio();
  state.audioEnabled = !state.audioEnabled;
  if (state.audioEnabled) {
    audioIcon.textContent = '🔊';
    audioLabel.textContent = 'Mute Audio';
    btnAudio.classList.add('btn-primary');
    btnAudio.classList.remove('btn-secondary');
    if (rainGain) rainGain.gain.setTargetAtTime(0.35, audioCtx.currentTime, 0.1);
  } else {
    audioIcon.textContent = '🔇';
    audioLabel.textContent = 'Enable Audio';
    btnAudio.classList.remove('btn-primary');
    btnAudio.classList.add('btn-secondary');
    if (rainGain) rainGain.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.1);
  }
});

// Soundboard triggers
document.getElementById('sample-near-thunder').addEventListener('click', () => {
  initAudio();
  synthesizeThunderAudio();
});
document.getElementById('sample-far-thunder').addEventListener('click', () => {
  initAudio();
  // Play rolling thunder synthesis
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const rumbleBuffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 5.0), audioCtx.sampleRate);
  const rData = rumbleBuffer.getChannelData(0);
  let lp1 = 0, lp2 = 0;
  for (let i = 0; i < rumbleBuffer.length; i++) {
    const t = i / audioCtx.sampleRate;
    const white = Math.random() * 2 - 1;
    lp1 += (white - lp1) * 0.028;
    lp2 += (lp1 - lp2) * 0.038;
    const env = Math.pow(Math.sin((t / 5.0) * Math.PI), 1.3);
    const mod = 0.75 + Math.sin(t * 4.5) * 0.15 + Math.cos(t * 8.2) * 0.1;
    rData[i] = lp2 * env * mod * 2.5;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = rumbleBuffer;
  source.connect(audioCtx.destination);
  source.start(now);
});
document.getElementById('sample-rain-loop').addEventListener('click', () => {
  initAudio();
  if (rainGain) {
    rainGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    setTimeout(() => {
      if (!state.audioEnabled) rainGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    }, 4000);
  }
});

// -------------------------------------------------------------
// Dynamic Custom .MCPACK Exporter (JSZip)
// -------------------------------------------------------------
document.getElementById('btn-export-custom-pack').addEventListener('click', async () => {
  const btn = document.getElementById('btn-export-custom-pack');
  const origText = btn.innerHTML;
  btn.innerHTML = `<span class="btn-icon">⏳</span> Building Custom .mcpack...`;
  btn.disabled = true;

  try {
    const zip = new JSZip();

    // 1. Manifest
    const manifest = {
      format_version: 2,
      header: {
        name: `Weather++ (${Math.round(state.rainSmoothness * 100)}% Smooth Rain & Enhanced Thunder)`,
        description: `Custom Weather++ preset: Density ${state.rainDensity}, Streak ${state.streakLength}px, Thunder Bass +${state.thunderBass}dB`,
        uuid: generateUUID(),
        version: [1, 0, 0],
        min_engine_version: [1, 20, 0]
      },
      modules: [
        {
          description: "Weather++ Custom Resource Module",
          type: "resources",
          uuid: generateUUID(),
          version: [1, 0, 0]
        }
      ]
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // 2. Sound Definitions
    const soundDefs = {
      format_version: "1.14.0",
      sound_definitions: {
        "ambient.weather.thunder": {
          category: "weather",
          min_distance: 64.0,
          sounds: [
            {
              name: "sounds/ambient/weather/thunder_strike_near",
              volume: (1.0 + state.thunderBass * 0.05),
              pitch: 1.0,
              weight: 35
            },
            {
              name: "sounds/ambient/weather/thunder_rumble_far",
              volume: 0.9,
              pitch: 0.95,
              weight: 45
            }
          ]
        },
        "ambient.weather.rain": {
          category: "weather",
          min_distance: 16.0,
          sounds: [
            {
              name: "sounds/ambient/weather/rain_smooth_loop",
              volume: (state.rainDensity / 500) * 0.75,
              pitch: 1.0,
              stream: true
            }
          ]
        }
      }
    };
    zip.file('sounds/sound_definitions.json', JSON.stringify(soundDefs, null, 2));

    // 3. Particle Definitions
    const splashParticle = {
      format_version: "1.10.0",
      particle_effect: {
        description: {
          identifier: "weather_plus:rain_splash",
          basic_render_parameters: {
            material: "particles_alpha",
            texture: "textures/particle/weather_plus_splash"
          }
        },
        components: {
          "minecraft:emitter_rate_instant": {
            num_particles: Math.max(1, Math.round(3 * state.splashIntensity))
          },
          "minecraft:emitter_lifetime_once": {
            active_time: 0.15
          },
          "minecraft:emitter_shape_disc": {
            radius: 0.25 * state.splashIntensity,
            plane_normal: [0, 1, 0]
          },
          "minecraft:particle_appearance_billboard": {
            size: ["0.22 * (1.0 + v.particle_age * 1.5)", "0.22 * (1.0 + v.particle_age * 1.5)"],
            facing_camera_mode: "lookat_xyz"
          }
        }
      }
    };
    zip.file('particles/weather_plus_rain_splash.json', JSON.stringify(splashParticle, null, 2));

    // Generate and download zip blob
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `Weather++_Custom_${Date.now()}.mcpack`);

    btn.innerHTML = `<span class="btn-icon">✅</span> Exported!`;
    setTimeout(() => {
      btn.innerHTML = origText;
      btn.disabled = false;
    }, 2500);
  } catch (err) {
    console.error('Failed to export .mcpack:', err);
    btn.innerHTML = `<span class="btn-icon">❌</span> Error`;
    setTimeout(() => {
      btn.innerHTML = origText;
      btn.disabled = false;
    }, 2000);
  }
});

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Start simulation
updateUIValues();
requestAnimationFrame(render);
