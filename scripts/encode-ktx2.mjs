// Encodes the 2048² texture of guest 11 into KTX2 (Basis UASTC, Zstandard, full mip chain) with KTX-Software's toktx.
// The PNG twin stays in public/textures, so the demo can switch between the two containers of the same picture.
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const texturesDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'textures');
const source = join(texturesDirectory, 'basis-2048.png');
const target = join(texturesDirectory, 'basis-2048.ktx2');

const result = spawnSync(
  'toktx',
  [
    '--t2',
    '--encode',
    'uastc',
    '--uastc_quality',
    '2',
    '--zcmp',
    '19',
    '--genmipmap',
    '--assign_oetf',
    'srgb',
    target,
    source
  ],
  { stdio: 'inherit' }
);

if (result.error || result.status !== 0) {
  console.error(
    'toktx failed. Install KTX-Software (https://github.com/KhronosGroup/KTX-Software) and put toktx on PATH.'
  );
  process.exit(1);
}
console.log(`basis-2048.ktx2: ${(statSync(target).size / 1048576).toFixed(2)} MB`);
