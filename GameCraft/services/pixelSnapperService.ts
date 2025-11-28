/**
 * Pixel Snapper Service
 *
 * This service wraps the SpriteFusion Pixel Snapper WASM module to snap
 * AI-generated pixel art to a perfect grid. It fixes common issues like:
 * - Inconsistent pixel sizes
 * - Drifting grid resolution
 * - Colors not tied to a strict palette
 */

import { PixelGridSize } from '../types';

/**
 * Calculate appropriate kColors (color palette size) based on pixel grid size.
 * Larger pixel art typically has more detail and needs more colors.
 *
 * @param pixelSize - The pixel grid size (8, 16, 32, 64, 128, 320, 640)
 * @returns The recommended number of colors for k-means quantization
 */
export function getKColorsForPixelSize(pixelSize?: PixelGridSize): number {
  if (!pixelSize) return 16; // Default fallback

  if (pixelSize <= 32) {
    // Small pixel art: simple, iconic designs with limited palette
    return 16;
  } else if (pixelSize <= 128) {
    // Medium pixel art: moderate detail, more colors
    return 32;
  } else {
    // Large pixel art (320, 640): highly detailed with rich color palette
    return 64;
  }
}

// Type definitions for the WASM module
interface PixelSnapperModule {
  process_image: (input_bytes: Uint8Array, k_colors?: number | null) => Uint8Array;
}

interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly process_image: (a: number, b: number, c: number) => [number, number, number, number];
}

type InitFunction = (module_or_path?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module) => Promise<InitOutput>;

let wasmModule: PixelSnapperModule | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the WASM module
 * This should be called once when the application starts
 */
export async function initPixelSnapper(): Promise<void> {
  if (wasmModule) return;

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;

  initPromise = (async () => {
    try {
      // Dynamic import of the WASM module
      const wasm = await import('../pixel-snap/pkg/spritefusion_pixel_snapper.js');

      // Initialize the WASM module
      const init = wasm.default as InitFunction;
      await init();

      // Store the module reference
      wasmModule = {
        process_image: wasm.process_image,
      };

      console.log('✅ Pixel Snapper WASM module initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Pixel Snapper WASM module:', error);
      throw new Error('Failed to initialize pixel snapper. Make sure the WASM module is built.');
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

/**
 * Check if the pixel snapper is ready
 */
export function isPixelSnapperReady(): boolean {
  return wasmModule !== null;
}

/**
 * Snap pixels in an image to a perfect grid
 *
 * @param imageUrl - The URL or base64 data URL of the image to process
 * @param kColors - Number of colors in the palette (default: 16)
 * @returns Promise<string> - Base64 data URL of the processed image
 */
export async function snapPixels(imageUrl: string, kColors: number = 16): Promise<string> {
  // Ensure WASM module is initialized
  if (!wasmModule) {
    await initPixelSnapper();
  }

  if (!wasmModule) {
    throw new Error('Pixel Snapper WASM module not available');
  }

  try {
    // Convert image URL to bytes
    const imageBytes = await imageUrlToBytes(imageUrl);

    // Process the image
    console.log(`🔧 Snapping pixels with ${kColors} colors...`);
    const resultBytes = wasmModule.process_image(imageBytes, kColors);

    // Convert result bytes back to base64 data URL
    const base64 = bytesToBase64(resultBytes);
    const dataUrl = `data:image/png;base64,${base64}`;

    console.log('✅ Pixel snapping complete');
    return dataUrl;
  } catch (error) {
    console.error('❌ Pixel snapping failed:', error);
    throw new Error(
      error instanceof Error
        ? `Pixel snapping failed: ${error.message}`
        : 'Pixel snapping failed with unknown error'
    );
  }
}

/**
 * Convert an image URL (or base64 data URL) to Uint8Array bytes
 */
async function imageUrlToBytes(imageUrl: string): Promise<Uint8Array> {
  // If it's a base64 data URL, decode it directly
  if (imageUrl.startsWith('data:')) {
    const base64 = imageUrl.split(',')[1];
    return base64ToBytes(base64);
  }

  // If it's a blob URL or regular URL, fetch it
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert Uint8Array to base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
