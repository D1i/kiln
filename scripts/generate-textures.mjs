// Offline generator for the demo textures: smooth, quantised value-noise images that stay small as PNG.
// Deterministic (fixed seeds), no dependencies besides Node's zlib. Output goes to public/textures.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'textures');

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function paethPredictor(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceUp = Math.abs(estimate - up);
  const distanceUpLeft = Math.abs(estimate - upLeft);
  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) return left;
  return distanceUp <= distanceUpLeft ? up : upLeft;
}

// Picks Sub or Paeth per scanline by the smaller sum of absolute residuals: the cheap heuristic libpng uses.
function filterScanlines(pixels, width, height, channels) {
  const stride = width * channels;
  const output = Buffer.alloc((stride + 1) * height);
  const sub = Buffer.alloc(stride);
  const paeth = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    let subCost = 0;
    let paethCost = 0;
    for (let i = 0; i < stride; i++) {
      const value = pixels[rowStart + i];
      const left = i >= channels ? pixels[rowStart + i - channels] : 0;
      const up = y > 0 ? pixels[rowStart - stride + i] : 0;
      const upLeft = y > 0 && i >= channels ? pixels[rowStart - stride + i - channels] : 0;
      const subResidual = (value - left) & 0xff;
      const paethResidual = (value - paethPredictor(left, up, upLeft)) & 0xff;
      sub[i] = subResidual;
      paeth[i] = paethResidual;
      subCost += subResidual > 127 ? 256 - subResidual : subResidual;
      paethCost += paethResidual > 127 ? 256 - paethResidual : paethResidual;
    }
    const outRow = y * (stride + 1);
    output[outRow] = paethCost < subCost ? 4 : 1;
    (paethCost < subCost ? paeth : sub).copy(output, outRow + 1);
  }
  return output;
}

function encodePng(pixels, width, height, channels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = channels === 3 ? 2 : 6;
  const compressed = deflateSync(filterScanlines(pixels, width, height, channels), { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function createValueNoise(seed) {
  const lattice = (x, y) => {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = smooth(x - xi);
    const fy = smooth(y - yi);
    const a = lattice(xi, yi);
    const b = lattice(xi + 1, yi);
    const c = lattice(xi, yi + 1);
    const d = lattice(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

function createHeightField(seed, baseFrequency, octaves) {
  const noise = createValueNoise(seed);
  return (u, v) => {
    let sum = 0;
    let amplitude = 1;
    let total = 0;
    let frequency = baseFrequency;
    for (let octave = 0; octave < octaves; octave++) {
      sum += noise(u * frequency, v * frequency) * amplitude;
      total += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return sum / total;
  };
}

const quantise = (value, step) => Math.min(255, Math.round(value / step) * step);

// Film grain of +-1: keeps the images from collapsing to a few kilobytes, so the PNG decode cost is realistic.
function createGrain(seed) {
  let state = (seed * 2654435761) >>> 0 || 1;
  return (value) => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return Math.max(0, Math.min(255, value + (state % 3) - 1));
  };
}

function renderAlbedo(size, seed) {
  const height = createHeightField(seed, 3, 4);
  const tint = createHeightField(seed + 100, 2, 2);
  const grain = createGrain(seed);
  const pixels = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const h = height(u, v);
      const t = tint(u, v);
      const checker = (Math.floor(u * 8) + Math.floor(v * 8)) & 1 ? 1 : 0.82;
      const offset = (y * size + x) * 3;
      pixels[offset] = grain(quantise((60 + 170 * h) * checker, 8));
      pixels[offset + 1] = grain(quantise((50 + 150 * (1 - h) * (0.6 + 0.4 * t)) * checker, 8));
      pixels[offset + 2] = grain(quantise((90 + 140 * t) * checker, 8));
    }
  }
  return { pixels, channels: 3 };
}

function renderNormal(size, seed) {
  const height = createHeightField(seed, 4, 3);
  const strength = 6;
  const pixels = new Uint8Array(size * size * 3);
  const step = 1 / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const dx = (height(u + step, v) - height(u - step, v)) * size * strength * 0.25;
      const dy = (height(u, v + step) - height(u, v - step)) * size * strength * 0.25;
      const length = Math.hypot(dx, dy, 1);
      const offset = (y * size + x) * 3;
      pixels[offset] = quantise(((-dx / length) * 0.5 + 0.5) * 255, 2);
      pixels[offset + 1] = quantise(((-dy / length) * 0.5 + 0.5) * 255, 2);
      pixels[offset + 2] = quantise(((1 / length) * 0.5 + 0.5) * 255, 2);
    }
  }
  return { pixels, channels: 3 };
}

// glTF layout: green = roughness, blue = metallic, red is free.
function renderMetalRough(size, seed) {
  const roughness = createHeightField(seed, 3, 3);
  const metal = createHeightField(seed + 50, 2, 2);
  const grain = createGrain(seed);
  const pixels = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const offset = (y * size + x) * 3;
      pixels[offset] = 255;
      pixels[offset + 1] = grain(quantise(70 + 150 * roughness(u, v), 8));
      pixels[offset + 2] = quantise(metal(u, v) > 0.5 ? 255 : 30, 8);
    }
  }
  return { pixels, channels: 3 };
}

const textures = [
  { file: 'diffuse-2048.png', size: 2048, render: () => renderAlbedo(2048, 1) },
  { file: 'diffuse-1024.png', size: 1024, render: () => renderAlbedo(1024, 2) },
  { file: 'normal-1024.png', size: 1024, render: () => renderNormal(1024, 2) },
  { file: 'pbr-albedo-1024.png', size: 1024, render: () => renderAlbedo(1024, 3) },
  { file: 'pbr-metal-rough-1024.png', size: 1024, render: () => renderMetalRough(1024, 4) },
  { file: 'basis-2048.png', size: 2048, render: () => renderAlbedo(2048, 5) },
  { file: 'png-4096.png', size: 4096, render: () => renderAlbedo(4096, 6) }
];

mkdirSync(outputDirectory, { recursive: true });
let totalBytes = 0;
for (const { file, size, render } of textures) {
  const started = performance.now();
  const { pixels, channels } = render();
  writeFileSync(join(outputDirectory, file), encodePng(pixels, size, size, channels));
  const bytes = statSync(join(outputDirectory, file)).size;
  totalBytes += bytes;
  console.log(
    `${file}: ${size}x${size}, ${(bytes / 1048576).toFixed(2)} MB, ${((performance.now() - started) / 1000).toFixed(1)} s`
  );
}
console.log(`total: ${(totalBytes / 1048576).toFixed(2)} MB`);
