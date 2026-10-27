// The texture files are fetched on the loading screen, in both modes, and handed to Babylon.js as buffers.
// So the network is in neither mode's peaks: what "warm-up off" pays on the first frame is the decode, the
// upload and the mip chain, which is the cost the page is about. On localhost this made no difference; on a
// hosted page a 16 MB download landed in the peak of whichever object happened to appear while it arrived.
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

export async function prefetchTextures(
  textureUrl: (fileName: string) => string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  let done = 0;
  await Promise.all(
    TEXTURE_FILES.map(async (fileName) => {
      const response = await fetch(textureUrl(fileName));
      if (!response.ok) throw new Error(`${fileName}: HTTP ${response.status}`);
      buffers.set(fileName, await response.arrayBuffer());
      onProgress?.(++done, TEXTURE_FILES.length);
    })
  );
}

/** The prefetched bytes of a texture file, or undefined when the file was not prefetched. */
export function textureBuffer(fileName: string): ArrayBuffer | undefined {
  return buffers.get(fileName);
}
