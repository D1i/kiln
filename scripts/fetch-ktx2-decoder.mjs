// Babylon.js loads its KTX2 decoder and the Basis transcoders from cdn.babylonjs.com by default. The demo serves them
// itself instead (no third-party request, no network jitter in the measurements). The npm package ships no
// binaries, so this copies the files of the installed version from the CDN into public/ktx2.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(root, 'public', 'ktx2');
const { version } = JSON.parse(
  readFileSync(join(root, 'node_modules', '@babylonjs', 'core', 'package.json'), 'utf8')
);

const files = [
  [`https://cdn.babylonjs.com/v${version}/babylon.ktx2Decoder.js`, 'babylon.ktx2Decoder.js'],
  ['https://cdn.babylonjs.com/ktx2Transcoders/1/msc_basis_transcoder.js', 'msc_basis_transcoder.js'],
  ['https://cdn.babylonjs.com/ktx2Transcoders/1/msc_basis_transcoder.wasm', 'msc_basis_transcoder.wasm'],
  ['https://cdn.babylonjs.com/ktx2Transcoders/1/uastc_astc.wasm', 'uastc_astc.wasm'],
  ['https://cdn.babylonjs.com/ktx2Transcoders/1/uastc_bc7.wasm', 'uastc_bc7.wasm'],
  ['https://cdn.babylonjs.com/ktx2Transcoders/1/uastc_r8_unorm.wasm', 'uastc_r8_unorm.wasm'],
  ['https://cdn.babylonjs.com/ktx2Transcoders/1/uastc_rg8_unorm.wasm', 'uastc_rg8_unorm.wasm'],
  ['https://cdn.babylonjs.com/ktx2Transcoders/1/uastc_rgba8_srgb_v2.wasm', 'uastc_rgba8_srgb_v2.wasm'],
  ['https://cdn.babylonjs.com/ktx2Transcoders/1/uastc_rgba8_unorm_v2.wasm', 'uastc_rgba8_unorm_v2.wasm'],
  ['https://cdn.babylonjs.com/zstddec.wasm', 'zstddec.wasm']
];

mkdirSync(outputDirectory, { recursive: true });
for (const [url, fileName] of files) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(join(outputDirectory, fileName), bytes);
  console.log(`${fileName}: ${(bytes.length / 1024).toFixed(0)} KB`);
}
console.log(`KTX2 decoder of Babylon.js ${version} is in public/ktx2`);
