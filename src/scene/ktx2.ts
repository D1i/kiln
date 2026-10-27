import '@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader';
import { KhronosTextureContainer2 } from '@babylonjs/core/Misc/khronosTextureContainer2';

/**
 * Babylon.js fetches its KTX2 decoder and Basis transcoders from cdn.babylonjs.com unless told otherwise. They are
 * served from `public/ktx2` instead (see scripts/fetch-ktx2-decoder.mjs): no third-party request, and no network
 * time inside a measurement. Must run before the first KTX2 texture is created.
 */
export function useLocalKtx2Decoder(baseUrl: string): void {
  const file = (name: string) => `${baseUrl}ktx2/${name}`;
  KhronosTextureContainer2.URLConfig = {
    jsDecoderModule: file('babylon.ktx2Decoder.js'),
    wasmUASTCToASTC: file('uastc_astc.wasm'),
    wasmUASTCToBC7: file('uastc_bc7.wasm'),
    wasmUASTCToRGBA_UNORM: file('uastc_rgba8_unorm_v2.wasm'),
    wasmUASTCToRGBA_SRGB: file('uastc_rgba8_srgb_v2.wasm'),
    wasmUASTCToR8_UNORM: file('uastc_r8_unorm.wasm'),
    wasmUASTCToRG8_UNORM: file('uastc_rg8_unorm.wasm'),
    jsMSCTranscoder: file('msc_basis_transcoder.js'),
    wasmMSCTranscoder: file('msc_basis_transcoder.wasm'),
    wasmZSTDDecoder: file('zstddec.wasm')
  };
}
