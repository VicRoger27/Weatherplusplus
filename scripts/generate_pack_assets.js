const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT_DIR = path.resolve(__dirname, '..');
const PACK_DIR = path.join(ROOT_DIR, 'Weather++_Pack');

// Helper to ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// -------------------------------------------------------------
// 1. WAVE AUDIO GENERATOR (Pure Node.js 16-bit PCM WAV)
// -------------------------------------------------------------
function generateWavBuffer(sampleRate, durationSeconds, sampleGeneratorFn) {
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const blockAlign = 2; // 16-bit mono
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // 16-bit

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = sampleGeneratorFn(t, i, numSamples);
    // Clamp to -1.0 .. 1.0
    sample = Math.max(-1.0, Math.min(1.0, sample));
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

// Natural acoustic thunder strike (explosive tear/crack + multi-echo rolling rumble)
function createThunderStrikeNear(sampleRate = 44100) {
  const duration = 4.8;
  const numSamples = Math.floor(sampleRate * duration);
  
  // Delay line buffer for realistic acoustic terrain echoes
  const echoDelaySamples = Math.floor(sampleRate * 0.18);
  const echoBuffer = new Float32Array(echoDelaySamples);
  let echoIdx = 0;
  let lp = 0;
  let lp2 = 0;

  return generateWavBuffer(sampleRate, duration, (t, i) => {
    // 1. Initial sharp electrostatic tearing & crack (0s - 0.25s)
    let crack = 0;
    if (t < 0.25) {
      const crackEnv = Math.exp(-t * 22);
      // Rapid staccato tearing impulses
      const tear = Math.sin(2 * Math.PI * (120 + (i % 7) * 45) * t) * (Math.random() > 0.3 ? 1 : -1);
      const snap = (Math.random() * 2 - 1);
      crack = (snap * 0.7 + tear * 0.3) * crackEnv;
    }

    // 2. Secondary explosive body (0.05s - 1.2s) - diffuse low-passed noise burst
    let blast = 0;
    if (t > 0.02 && t < 1.4) {
      const blastEnv = Math.exp(-(t - 0.02) * 3.2) * (1 - Math.exp(-t * 30));
      const n = Math.random() * 2 - 1;
      lp += (n - lp) * 0.08;
      blast = lp * blastEnv * 1.2;
    }

    // 3. Rolling acoustic landscape reverberation & rumbling (0.1s - 4.8s)
    let rumble = 0;
    if (t > 0.08) {
      const rumbleEnv = Math.exp(-(t - 0.08) * 0.65) * (1 - Math.exp(-t * 12));
      const n2 = Math.random() * 2 - 1;
      lp2 += (n2 - lp2) * 0.022; // Deep natural brownian rumble
      // Stochastic rolling amplitude modulation
      const mod = 0.7 + Math.sin(t * 9.5) * 0.15 + Math.sin(t * 17.3) * 0.15;
      rumble = lp2 * rumbleEnv * mod * 1.5;
    }

    // Combine and pass through acoustic echo delay line
    const rawOut = crack * 0.8 + blast * 0.6 + rumble * 0.7;
    const delayed = echoBuffer[echoIdx];
    echoBuffer[echoIdx] = rawOut + delayed * 0.38;
    echoIdx = (echoIdx + 1) % echoDelaySamples;

    return rawOut + delayed * 0.32;
  });
}

// Distant Rolling Thunder (Deep acoustic rolling reverberation across clouds)
function createThunderRumbleFar(sampleRate = 44100) {
  const duration = 5.2;
  let lp = 0;
  let lp2 = 0;
  return generateWavBuffer(sampleRate, duration, (t) => {
    // Smooth swelling envelope
    const env = Math.pow(Math.sin((t / duration) * Math.PI), 1.4);
    const white = Math.random() * 2 - 1;
    lp += (white - lp) * 0.028;
    lp2 += (lp - lp2) * 0.035;

    // Organic rolling turbulence
    const turbulence = 0.75 + Math.sin(t * 4.2) * 0.18 + Math.cos(t * 7.8) * 0.12;
    return lp2 * env * turbulence * 2.2;
  });
}

// Crisp Thunder Snap / Electrical Discharge
function createThunderCrack(sampleRate = 44100) {
  const duration = 2.0;
  let lp = 0;
  return generateWavBuffer(sampleRate, duration, (t) => {
    const crackEnv = Math.exp(-t * 24);
    const snap = (Math.random() * 2 - 1) * crackEnv;
    const tailEnv = Math.exp(-t * 3.5);
    const n = Math.random() * 2 - 1;
    lp += (n - lp) * 0.04;
    return snap * 0.85 + lp * tailEnv * 0.5;
  });
}

// Smooth Rain Ambience Loop (3.5s seamless loop)
function createSmoothRainLoop(sampleRate = 44100) {
  const duration = 3.5;
  let lp = 0;
  let hpPrev = 0;
  return generateWavBuffer(sampleRate, duration, (t) => {
    const white = Math.random() * 2 - 1;
    lp += (white - lp) * 0.12;
    const hp = lp - hpPrev * 0.98;
    hpPrev = lp;
    const dropletPing = Math.sin(2 * Math.PI * (900 + Math.sin(t * 120) * 300) * t) * Math.exp(-((t * 25) % 1) * 20) * 0.03;
    return hp * 0.45 + dropletPing;
  });
}

// -------------------------------------------------------------
// 2. PROCEDURAL PNG GENERATOR (Pure Node.js with zlib)
// -------------------------------------------------------------
function createPNG(width, height, getPixelRGBA) {
  const rowStride = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowStride);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRGBA(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = Math.max(0, Math.min(255, Math.floor(r)));
      rawData[pxOffset + 1] = Math.max(0, Math.min(255, Math.floor(g)));
      rawData[pxOffset + 2] = Math.max(0, Math.min(255, Math.floor(b)));
      rawData[pxOffset + 3] = Math.max(0, Math.min(255, Math.floor(a)));
    }
  }

  const deflated = zlib.deflateSync(rawData);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(typeStr, dataBuffer) {
  const length = dataBuffer.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(typeStr, 4, 4, 'ascii');
  dataBuffer.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeInt32BE(crc, 8 + length);
  return chunk;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (c ^ buf[n]);
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
  }
  return c ^ 0xffffffff;
}

// Smooth Rain Weather Texture
function generateSmoothRainTexture(width = 128, height = 128) {
  return createPNG(width, height, (x, y) => {
    let alpha = 0;
    const numColumns = 16;
    for (let c = 0; c < numColumns; c++) {
      const colX = ((c * 37 + 13) % width);
      const streakLength = 22 + (c % 7) * 5;
      const yOffset = (c * 29) % height;
      
      const distY = (y - yOffset + height) % height;
      if (distY < streakLength) {
        const distX = Math.abs(x - colX);
        if (distX < 2.5) {
          const horizTaper = Math.exp(-Math.pow(distX / 1.1, 2));
          const vertTaper = Math.pow(distY / streakLength, 1.4) * (1 - (distY / streakLength) * 0.25);
          alpha += horizTaper * vertTaper * 190;
        }
      }
    }

    const mist = (Math.sin(x * 0.15) * Math.cos(y * 0.12) * 0.5 + 0.5) * 22;
    alpha = Math.min(255, alpha + mist);

    return [210, 235, 255, alpha];
  });
}

// Splash Texture for Particles
function generateSplashParticleTexture(width = 64, height = 64) {
  return createPNG(width, height, (x, y) => {
    const cx = width / 2;
    const cy = height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const ringDist = Math.abs(dist - 16);
    const ringAlpha = Math.exp(-ringDist * 0.8) * 200;
    const centerAlpha = Math.exp(-dist * 0.35) * 160;
    const totalAlpha = Math.min(255, ringAlpha + centerAlpha);

    return [215, 240, 255, totalAlpha];
  });
}

// -------------------------------------------------------------
// 3. ZIP ARCHIVE PACKAGER (Pure JS ZIP creator for .mcpack)
// -------------------------------------------------------------
class SimpleZip {
  constructor() {
    this.files = [];
  }

  addFile(filePath, buffer) {
    this.files.push({
      path: filePath.replace(/\\/g, '/'),
      data: buffer
    });
  }

  generate() {
    const localHeaders = [];
    const centralHeaders = [];
    let offset = 0;

    for (const file of this.files) {
      const fileNameBuffer = Buffer.from(file.path, 'utf8');
      const deflated = zlib.deflateRawSync(file.data);
      const crc = crc32(file.data);
      const uncompressedSize = file.data.length;
      const compressedSize = deflated.length;

      const localHeader = Buffer.alloc(30 + fileNameBuffer.length);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(8, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeInt32LE(crc, 14);
      localHeader.writeUInt32LE(compressedSize, 18);
      localHeader.writeUInt32LE(uncompressedSize, 22);
      localHeader.writeUInt16LE(fileNameBuffer.length, 26);
      localHeader.writeUInt16LE(0, 28);
      fileNameBuffer.copy(localHeader, 30);

      localHeaders.push(localHeader, deflated);

      const centralHeader = Buffer.alloc(46 + fileNameBuffer.length);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0, 8);
      centralHeader.writeUInt16LE(8, 10);
      centralHeader.writeUInt16LE(0, 12);
      centralHeader.writeUInt16LE(0, 14);
      centralHeader.writeInt32LE(crc, 16);
      centralHeader.writeUInt32LE(compressedSize, 20);
      centralHeader.writeUInt32LE(uncompressedSize, 24);
      centralHeader.writeUInt16LE(fileNameBuffer.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);
      fileNameBuffer.copy(centralHeader, 46);

      centralHeaders.push(centralHeader);

      offset += localHeader.length + deflated.length;
    }

    const centralDirOffset = offset;
    const centralDirSize = centralHeaders.reduce((acc, b) => acc + b.length, 0);

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(this.files.length, 8);
    eocd.writeUInt16LE(this.files.length, 10);
    eocd.writeUInt32LE(centralDirSize, 12);
    eocd.writeUInt32LE(centralDirOffset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
  }
}

// -------------------------------------------------------------
// 4. MAIN PACK BUILDER
// -------------------------------------------------------------
async function buildWeatherPack() {
  console.log('⚡ Building Weather++ Minecraft Bedrock Resource Pack...');

  ensureDir(PACK_DIR);
  ensureDir(path.join(PACK_DIR, 'textures', 'environment'));
  ensureDir(path.join(PACK_DIR, 'textures', 'particle'));
  ensureDir(path.join(PACK_DIR, 'particles'));
  ensureDir(path.join(PACK_DIR, 'sounds', 'ambient', 'weather'));
  ensureDir(path.join(PACK_DIR, 'fogs'));

  // 1. Manifest.json
  const manifest = {
    format_version: 2,
    header: {
      name: "Weather++ (Smooth Rain & Enhanced Thunder)",
      description: "Smooth silky rain droplets, realistic splash particles, cinematic multi-layered thunder rumbles & atmospheric storm fog for Minecraft Bedrock!",
      uuid: "d8f3b145-6712-4c28-98e5-3921b6d081e7",
      version: [1, 0, 0],
      min_engine_version: [1, 20, 0]
    },
    modules: [
      {
        description: "Weather++ Resource Pack Module",
        type: "resources",
        uuid: "4c9e88d1-1256-4299-bb6e-71cb992b4512",
        version: [1, 0, 0]
      }
    ],
    metadata: {
      authors: ["Weather++ Team"],
      license: "MIT",
      url: "https://weatherplusplus.bedrock"
    }
  };
  fs.writeFileSync(path.join(PACK_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // 2. Textures
  console.log('💧 Generating smooth rain & particle textures...');
  const weatherTex = generateSmoothRainTexture(128, 128);
  fs.writeFileSync(path.join(PACK_DIR, 'textures', 'environment', 'weather.png'), weatherTex);
  fs.writeFileSync(path.join(PACK_DIR, 'textures', 'environment', 'rain.png'), weatherTex);
  
  const splashTex = generateSplashParticleTexture(64, 64);
  fs.writeFileSync(path.join(PACK_DIR, 'textures', 'particle', 'weather_plus_splash.png'), splashTex);

  // Copy icon if available
  const iconArtifactPath = path.join('C:', 'Users', 'kosti', '.gemini', 'antigravity-ide', 'brain', '7d9933e8-4337-467b-8a9e-c819c18f363e');
  let iconWritten = false;
  if (fs.existsSync(iconArtifactPath)) {
    const files = fs.readdirSync(iconArtifactPath).filter(f => f.startsWith('pack_icon') && (f.endsWith('.jpg') || f.endsWith('.png')));
    if (files.length > 0) {
      const srcIcon = path.join(iconArtifactPath, files[0]);
      fs.copyFileSync(srcIcon, path.join(PACK_DIR, 'pack_icon.png'));
      iconWritten = true;
    }
  }
  if (!iconWritten) {
    const fallbackIcon = createPNG(128, 128, (x, y) => {
      const dist = Math.sqrt(Math.pow(x - 64, 2) + Math.pow(y - 64, 2));
      return [25, 45, 80 + Math.floor(dist), 255];
    });
    fs.writeFileSync(path.join(PACK_DIR, 'pack_icon.png'), fallbackIcon);
  }

  // 3. Particles
  console.log('✨ Creating Bedrock particle definitions...');
  const rainSplashParticle = {
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
          num_particles: 3
        },
        "minecraft:emitter_lifetime_once": {
          active_time: 0.15
        },
        "minecraft:emitter_shape_disc": {
          radius: 0.25,
          plane_normal: [0, 1, 0]
        },
        "minecraft:particle_lifetime_expression": {
          max_lifetime: "Math.random(0.18, 0.28)"
        },
        "minecraft:particle_appearance_billboard": {
          size: ["0.22 * (1.0 + v.particle_age * 1.5)", "0.22 * (1.0 + v.particle_age * 1.5)"],
          facing_camera_mode: "lookat_xyz",
          uv: {
            texture_width: 64,
            texture_height: 64,
            uv: [0, 0],
            uv_size: [64, 64]
          }
        },
        "minecraft:particle_appearance_tinting": {
          color: [0.85, 0.92, 1.0, "1.0 - (v.particle_age / v.particle_lifetime)"]
        }
      }
    }
  };
  fs.writeFileSync(path.join(PACK_DIR, 'particles', 'weather_plus_rain_splash.json'), JSON.stringify(rainSplashParticle, null, 2));

  // 4. Sounds & Sound Definitions
  console.log('🔊 Synthesizing realistic thunder & smooth rain audio...');
  const strikeNear = createThunderStrikeNear();
  const rumbleFar = createThunderRumbleFar();
  const thunderCrack = createThunderCrack();
  const rainLoop = createSmoothRainLoop();

  fs.writeFileSync(path.join(PACK_DIR, 'sounds', 'ambient', 'weather', 'thunder_strike_near.wav'), strikeNear);
  fs.writeFileSync(path.join(PACK_DIR, 'sounds', 'ambient', 'weather', 'thunder_rumble_far.wav'), rumbleFar);
  fs.writeFileSync(path.join(PACK_DIR, 'sounds', 'ambient', 'weather', 'thunder_crack.wav'), thunderCrack);
  fs.writeFileSync(path.join(PACK_DIR, 'sounds', 'ambient', 'weather', 'rain_smooth_loop.wav'), rainLoop);

  const soundDefinitions = {
    format_version: "1.14.0",
    sound_definitions: {
      "ambient.weather.thunder": {
        category: "weather",
        min_distance: 64.0,
        sounds: [
          {
            name: "sounds/ambient/weather/thunder_strike_near",
            volume: 1.0,
            pitch: 1.0,
            weight: 35
          },
          {
            name: "sounds/ambient/weather/thunder_rumble_far",
            volume: 0.9,
            pitch: 0.95,
            weight: 45
          },
          {
            name: "sounds/ambient/weather/thunder_crack",
            volume: 1.0,
            pitch: 1.05,
            weight: 20
          }
        ]
      },
      "ambient.weather.rain": {
        category: "weather",
        min_distance: 16.0,
        sounds: [
          {
            name: "sounds/ambient/weather/rain_smooth_loop",
            volume: 0.75,
            pitch: 1.0,
            stream: true
          }
        ]
      },
      "ambient.weather.lightning.impact": {
        category: "weather",
        sounds: [
          {
            name: "sounds/ambient/weather/thunder_crack",
            volume: 1.0,
            pitch: 0.9
          }
        ]
      }
    }
  };
  fs.writeFileSync(path.join(PACK_DIR, 'sounds', 'sound_definitions.json'), JSON.stringify(soundDefinitions, null, 2));

  // 5. Fog Definitions for Atmospheric Storms
  console.log('🌫️ Creating atmospheric storm fog configs...');
  const stormFog = {
    format_version: "1.8.0",
    "minecraft:fog_settings": {
      description: {
        identifier: "weather_plus:storm_fog"
      },
      distance: {
        air: {
          fog_start: 12.0,
          fog_end: 72.0,
          fog_color: "#18202c",
          render_distance_type: "fixed"
        },
        weather: {
          fog_start: 8.0,
          fog_end: 48.0,
          fog_color: "#0f1722",
          render_distance_type: "fixed"
        }
      }
    }
  };
  fs.writeFileSync(path.join(PACK_DIR, 'fogs', 'weather_storm_fog.json'), JSON.stringify(stormFog, null, 2));

  // 6. Zip everything into Weather++.mcpack
  console.log('📦 Compiling Weather++_Bedrock_Edition.mcpack...');
  const zip = new SimpleZip();

  function addFolderToZip(folderPath, zipPrefix = '') {
    const items = fs.readdirSync(folderPath);
    for (const item of items) {
      const fullPath = path.join(folderPath, item);
      const relativeZipPath = zipPrefix ? `${zipPrefix}/${item}` : item;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        addFolderToZip(fullPath, relativeZipPath);
      } else {
        zip.addFile(relativeZipPath, fs.readFileSync(fullPath));
      }
    }
  }

  addFolderToZip(PACK_DIR);
  const mcpackBuffer = zip.generate();
  const mcpackPath = path.join(ROOT_DIR, 'Weather++_Bedrock_Edition.mcpack');
  fs.writeFileSync(mcpackPath, mcpackBuffer);

  console.log(`✅ Successfully created:`);
  console.log(`   - Pack Directory: ${PACK_DIR}`);
  console.log(`   - Direct Import File: ${mcpackPath} (${(mcpackBuffer.length / 1024).toFixed(1)} KB)`);
}

buildWeatherPack().catch(console.error);
