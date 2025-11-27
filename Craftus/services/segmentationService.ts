import { InteractiveSegmenter, FilesetResolver, InteractiveSegmenterResult } from "@mediapipe/tasks-vision";

let segmenter: InteractiveSegmenter | null = null;
let isInitializing = false;

export const initSegmenter = async () => {
  if (segmenter) return segmenter;
  if (isInitializing) {
      // Simple wait loop if already initializing
      while (isInitializing) {
          await new Promise(r => setTimeout(r, 100));
          if (segmenter) return segmenter;
      }
  }

  isInitializing = true;
  try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );

      segmenter = await InteractiveSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite",
          delegate: "GPU",
        },
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
      return segmenter;
  } catch (error) {
      console.error("Failed to initialize MediaPipe Interactive Segmenter:", error);
      return null;
  } finally {
      isInitializing = false;
  }
};

export interface SegmentationResult {
    uint8Array: Uint8Array;
    width: number;
    height: number;
}

/**
 * Flood fill algorithm to find connected regions
 */
function floodFill(
  maskData: Uint8Array,
  visited: Uint8Array,
  startIndex: number,
  width: number,
  height: number
): number[] {
  const region: number[] = [];
  const stack: number[] = [startIndex];
  
  while (stack.length > 0) {
    const index = stack.pop()!;
    if (visited[index] || maskData[index] === 0) continue;
    
    visited[index] = 1;
    region.push(index);
    
    const x = index % width;
    const y = Math.floor(index / width);
    
    // Check 4 neighbors
    if (x > 0) stack.push(index - 1); // left
    if (x < width - 1) stack.push(index + 1); // right
    if (y > 0) stack.push(index - width); // up
    if (y < height - 1) stack.push(index + width); // down
  }
  
  return region;
}

/**
 * Filters mask to keep only the largest connected region
 * This removes small disconnected areas (like parts of a display stand)
 */
export const filterLargestRegion = (
  maskData: Uint8Array,
  width: number,
  height: number
): Uint8Array => {
  const visited = new Uint8Array(maskData.length);
  const regions: number[][] = [];
  
  // Find all connected regions
  for (let i = 0; i < maskData.length; i++) {
    if (maskData[i] > 0 && !visited[i]) {
      const region = floodFill(maskData, visited, i, width, height);
      regions.push(region);
    }
  }
  
  if (regions.length === 0) return maskData;
  
  // Find largest region
  const largestRegion = regions.reduce((max, region) => 
    region.length > max.length ? region : max
  );
  
  // Create new mask with only largest region
  const newMask = new Uint8Array(maskData.length);
  largestRegion.forEach(index => newMask[index] = 255);
  
  return newMask;
};

/**
 * Extracts the selected object from the image with transparent background
 * Returns base64 image of just the selected object
 */
export const extractSelectedObject = async (
  image: HTMLImageElement,
  maskData: Uint8Array,
  maskWidth: number,
  maskHeight: number,
  expandPixels: number = 20 // Expand selection to capture more context
): Promise<string> => {
  // Create canvas to extract the object
  const canvas = document.createElement('canvas');
  canvas.width = maskWidth;
  canvas.height = maskHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  // Draw the original image
  ctx.drawImage(image, 0, 0, maskWidth, maskHeight);
  const imageData = ctx.getImageData(0, 0, maskWidth, maskHeight);
  const pixels = imageData.data;

  // Find bounding box of selected object
  let minX = maskWidth, minY = maskHeight, maxX = 0, maxY = 0;

  for (let y = 0; y < maskHeight; y++) {
    for (let x = 0; x < maskWidth; x++) {
      const maskIndex = y * maskWidth + x;
      if (maskData[maskIndex] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Expand bounding box to capture more context (in case user clicked small part)
  minX = Math.max(0, minX - expandPixels);
  minY = Math.max(0, minY - expandPixels);
  maxX = Math.min(maskWidth - 1, maxX + expandPixels);
  maxY = Math.min(maskHeight - 1, maxY + expandPixels);

  // Apply mask - make non-selected pixels transparent
  for (let y = 0; y < maskHeight; y++) {
    for (let x = 0; x < maskWidth; x++) {
      const maskIndex = y * maskWidth + x;
      const pixelIndex = maskIndex * 4;

      if (maskData[maskIndex] === 0) {
        // Make background transparent
        pixels[pixelIndex + 3] = 0;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Crop to bounding box
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) throw new Error('Could not get cropped canvas context');

  croppedCtx.drawImage(
    canvas,
    minX, minY, cropWidth, cropHeight,
    0, 0, cropWidth, cropHeight
  );

  return croppedCanvas.toDataURL('image/png');
};

export const segmentImage = async (
  event: React.MouseEvent,
  image: HTMLImageElement
): Promise<SegmentationResult | null> => {
  const seg = await initSegmenter();
  if (!seg) return null;

  // MediaPipe expects normalized coordinates relative to the image
  const rect = image.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  // Region of interest: Point
  const roi = { keypoint: { x, y } };

  return new Promise((resolve) => {
    seg.segment(image, roi, (result: InteractiveSegmenterResult) => {
      if (result.categoryMask) {
          const uint8Array = result.categoryMask.getAsUint8Array();
          const { width, height } = result.categoryMask;
          resolve({ uint8Array, width, height });
      } else {
        resolve(null);
      }
    });
  });
};