import { Point, SuitState } from '../types';

export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
};

/**
 * Draws the visible area of the image in the cropper to a canvas
 * and returns the base64 string.
 */
export const getCroppedImg = async (
  imageSrc: string,
  cropOffset: Point,
  zoom: number,
  containerWidth: number,
  containerHeight: number
): Promise<string> => {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  
  // High resolution output for quality (3x4 aspect ratio)
  // Standard ID photo at 300dpi is roughly 354x472 pixels. 
  // Let's go double that for quality: 708x944.
  const OUTPUT_WIDTH = 708;
  const OUTPUT_HEIGHT = 944;
  
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Calculate scaling
  const scaleX = containerWidth / image.naturalWidth;
  const scaleY = containerHeight / image.naturalHeight;
  const baseScale = Math.max(scaleX, scaleY); // 'cover' behavior
  
  const currentScale = baseScale * zoom;
  
  const displayedWidth = image.naturalWidth * currentScale;
  const displayedHeight = image.naturalHeight * currentScale;
  
  // Center of container
  const cx = containerWidth / 2;
  const cy = containerHeight / 2;
  
  const imageCenterX = cx + cropOffset.x;
  const imageCenterY = cy + cropOffset.y;
  
  const imageX = imageCenterX - displayedWidth / 2;
  const imageY = imageCenterY - displayedHeight / 2;
  
  const renderScale = OUTPUT_WIDTH / containerWidth;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.drawImage(
    image,
    imageX * renderScale,
    imageY * renderScale,
    displayedWidth * renderScale,
    displayedHeight * renderScale
  );

  return canvas.toDataURL('image/jpeg', 0.95);
};

/**
 * Generates a printable sheet (10x15cm / 4x6 inch) with 8 copies of the photo.
 */
export const generateTiledImage = async (base64Image: string): Promise<string> => {
  const img = await loadImage(base64Image);
  const canvas = document.createElement('canvas');
  
  const DPI = 300;
  const W_CM = 15;
  const H_CM = 10;
  const CANVAS_WIDTH = Math.round((W_CM / 2.54) * DPI);
  const CANVAS_HEIGHT = Math.round((H_CM / 2.54) * DPI);
  
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if(!ctx) throw new Error('No context');

  // Fill with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0, canvas.width, canvas.height);

  // Photo size 3x4 cm at 300 DPI
  const PHOTO_W = Math.round((3 / 2.54) * DPI); // ~354 px
  const PHOTO_H = Math.round((4 / 2.54) * DPI); // ~472 px

  // Grid configuration: 4 columns x 2 rows = 8 photos
  const cols = 4;
  const rows = 2;
  
  const gap = 20; // pixels
  
  const gridWidth = cols * PHOTO_W + (cols - 1) * gap;
  const gridHeight = rows * PHOTO_H + (rows - 1) * gap;
  
  const startX = (CANVAS_WIDTH - gridWidth) / 2;
  const startY = (CANVAS_HEIGHT - gridHeight) / 2;

  for(let r=0; r<rows; r++) {
    for(let c=0; c<cols; c++) {
        const drawX = startX + c * (PHOTO_W + gap);
        const drawY = startY + r * (PHOTO_H + gap);
        
        ctx.drawImage(img, drawX, drawY, PHOTO_W, PHOTO_H);
        
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, drawY, PHOTO_W, PHOTO_H);
    }
  }
  
  return canvas.toDataURL('image/jpeg', 0.95);
};

/**
 * Merges a suit overlay onto the base image and applies brightness.
 */
export const composeFinalImage = async (
  baseImageSrc: string,
  brightness: number,
  suitSrc?: string,
  suitState?: SuitState
): Promise<string> => {
  const baseImg = await loadImage(baseImageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = baseImg.width;
  canvas.height = baseImg.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No context');

  // 1. Draw Background (White)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Draw Base Image with Filter
  ctx.filter = `brightness(${brightness}%)`;
  ctx.drawImage(baseImg, 0, 0);
  ctx.filter = 'none';

  // 3. Draw Suit if exists
  if (suitSrc && suitState) {
    const suitImg = await loadImage(suitSrc);
    
    // Calculate suit position relative to canvas
    // suitState.scale is multiplier (1 = fit width)
    // suitState.x, suitState.y are percentage offsets
    
    const suitWidth = canvas.width * suitState.scale;
    const aspectRatio = suitImg.naturalHeight / suitImg.naturalWidth;
    const suitHeight = suitWidth * aspectRatio;
    
    // Center base
    const centerX = canvas.width / 2;
    const bottomY = canvas.height; 
    
    // Apply user offsets (pixels relative to canvas size)
    // x: 0 is center.
    const drawX = centerX - (suitWidth / 2) + (suitState.x * canvas.width / 100);
    const drawY = bottomY - suitHeight + (suitState.y * canvas.height / 100);

    ctx.drawImage(suitImg, drawX, drawY, suitWidth, suitHeight);
  }

  return canvas.toDataURL('image/jpeg', 0.95);
};