// The texture files are fetched on the loading screen, in both modes, and handed to Babylon.js as buffers.
// So the network is in neither mode's peaks: what "warm-up off" pays on the first frame is the decode, the
// upload and the mip chain, which is the cost the page is about. On localhost this made no difference; on a
// hosted page a 16 MB download landed in the peak of whichever object happened to appear while it arrived.
import type { TextureFormat } from './textureFormat';

const buffers = new Map<string, ArrayBuffer>();

export const TEXTURE_FILES = [
  'basis-2048.ktx2',
  'basis-2048.png',
  'diffuse-1024.png',
  'diffuse-2048.png',
  'normal-1024.png',
  'pbr-albedo-1024.png',
  'pbr-metal-rough-1024.png',
  'png-4096.png'
] as const;

/** The files a session needs: guest 11's twin in the other container is never requested. */
export function textureFilesFor(format: TextureFormat): string[] {
  const unused = format === 'ktx2' ? 'basis-2048.png' : 'basis-2048.ktx2';
  return TEXTURE_FILES.filter((fileName) => fileName !== unused);
}

export async function prefetchTextures(
  textureUrl: (fileName: string) => string,
  format: TextureFormat,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const files = textureFilesFor(format);
  let done = 0;
  await Promise.all(
    files.map(async (fileName) => {
      const response = await fetch(textureUrl(fileName));
      if (!response.ok) throw new Error(`${fileName}: HTTP ${response.status}`);
      buffers.set(fileName, await response.arrayBuffer());
      onProgress?.(++done, files.length);
    })
  );
}

/** The prefetched bytes of a texture file, or undefined when the file was not prefetched. */
export function textureBuffer(fileName: string): ArrayBuffer | undefined {
  return buffers.get(fileName);
}
