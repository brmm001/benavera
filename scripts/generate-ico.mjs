import fs from 'fs';
import path from 'path';

// Generate raw 32x32 32-bit BMP data for ICO
function create32x32BmpIco() {
  const width = 32;
  const height = 32;
  
  // ICO header: 6 bytes
  // ICONDIR
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(1, 4); // 1 Image

  // BITMAPINFOHEADER (40 bytes)
  const biSize = 40;
  const biWidth = width;
  const biHeight = height * 2; // In ICO BMP, height is doubled (image + mask)
  const biPlanes = 1;
  const biBitCount = 32;
  const biCompression = 0;
  const biSizeImage = width * height * 4;
  const biXPelsPerMeter = 0;
  const biYPelsPerMeter = 0;
  const biClrUsed = 0;
  const biClrImportant = 0;

  const bih = Buffer.alloc(40);
  bih.writeUInt32LE(biSize, 0);
  bih.writeInt32LE(biWidth, 4);
  bih.writeInt32LE(biHeight, 8);
  bih.writeUInt16LE(biPlanes, 12);
  bih.writeUInt16LE(biBitCount, 14);
  bih.writeUInt32LE(biCompression, 16);
  bih.writeUInt32LE(biSizeImage, 20);
  bih.writeInt32LE(biXPelsPerMeter, 24);
  bih.writeInt32LE(biYPelsPerMeter, 28);
  bih.writeUInt32LE(biClrUsed, 32);
  bih.writeUInt32LE(biClrImportant, 36);

  // Pixel data: 32x32 pixels, BGRA format, bottom-up
  const pixelData = Buffer.alloc(width * height * 4);

  // Colors:
  // Navy: #2f3181 -> R:47, G:49, B:129
  // Light Navy: #4040ca -> R:64, G:64, B:202
  // Teal: #4db8ab -> R:77, G:184, B:171
  // White: #ffffff -> R:255, G:255, B:255

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Invert Y for bottom-up BMP
      const py = height - 1 - y;
      const px = x;
      const offset = (y * width + x) * 4;

      // Rounded squircle mask (radius ~ 6px)
      const cornerRadius = 6;
      let inBounds = true;
      
      const dx = px < cornerRadius ? cornerRadius - px : (px >= width - cornerRadius ? px - (width - 1 - cornerRadius) : 0);
      const dy = py < cornerRadius ? cornerRadius - py : (py >= height - cornerRadius ? py - (height - 1 - cornerRadius) : 0);
      
      if (dx > 0 && dy > 0) {
        if (Math.hypot(dx, dy) > cornerRadius + 0.5) {
          inBounds = false;
        }
      }

      if (!inBounds) {
        // Transparent
        pixelData[offset] = 0;     // B
        pixelData[offset + 1] = 0; // G
        pixelData[offset + 2] = 0; // R
        pixelData[offset + 3] = 0; // A
        continue;
      }

      // Background gradient (diagonal)
      const gradRatio = (px + py) / ((width + height) * 0.9);
      let bgR = Math.round(47 + (64 - 47) * gradRatio);
      let bgG = Math.round(49 + (64 - 49) * gradRatio);
      let bgB = Math.round(129 + (202 - 129) * gradRatio);

      // Check if pixel is part of "B" monogram:
      // Vertical bar: px 8..12, py 6..25
      const isStem = (px >= 8 && px <= 12 && py >= 6 && py <= 25);
      // Top bar & loop
      const isTopBar = (py >= 6 && py <= 9 && px >= 11 && px <= 20);
      const isTopRight = (px >= 18 && px <= 22 && py >= 8 && py <= 14);
      const isMidBar = (py >= 13 && py <= 16 && px >= 11 && px <= 20);
      // Bottom loop
      const isBotRight = (px >= 19 && px <= 24 && py >= 15 && py <= 23);
      const isBotBar = (py >= 22 && py <= 25 && px >= 11 && px <= 21);

      const isB = isStem || isTopBar || isTopRight || isMidBar || isBotRight || isBotBar;
      
      // Teal dot
      const isTealDot = (px >= 17 && px <= 19 && py >= 14 && py <= 16);

      if (isTealDot) {
        pixelData[offset] = 171;   // B
        pixelData[offset + 1] = 184; // G
        pixelData[offset + 2] = 77;  // R
        pixelData[offset + 3] = 255; // A
      } else if (isB) {
        pixelData[offset] = 255;   // B
        pixelData[offset + 1] = 255; // G
        pixelData[offset + 2] = 255; // R
        pixelData[offset + 3] = 255; // A
      } else {
        pixelData[offset] = bgB;   // B
        pixelData[offset + 1] = bgG; // G
        pixelData[offset + 2] = bgR; // R
        pixelData[offset + 3] = 255; // A
      }
    }
  }

  // AND mask (1 bit per pixel, padded to 32-bit row boundaries)
  // For 32-bit with alpha, AND mask can be all 0s (transparent where alpha=0)
  const maskRowSize = Math.ceil(width / 32) * 4;
  const maskData = Buffer.alloc(maskRowSize * height);

  const imageSize = bih.length + pixelData.length + maskData.length;

  // ICONDIRENTRY (16 bytes)
  const entry = Buffer.alloc(16);
  entry.writeUInt8(width, 0);       // Width
  entry.writeUInt8(height, 1);      // Height
  entry.writeUInt8(0, 2);           // Color count (0 for 256+)
  entry.writeUInt8(0, 3);           // Reserved
  entry.writeUInt16LE(1, 4);        // Color planes
  entry.writeUInt16LE(32, 6);       // Bits per pixel
  entry.writeUInt32LE(imageSize, 8);// Image size in bytes
  entry.writeUInt32LE(6 + 16, 12);  // Offset of image data from start of file

  return Buffer.concat([header, entry, bih, pixelData, maskData]);
}

const icoBuffer = create32x32BmpIco();
const appDir = path.resolve('./src/app');
const publicDir = path.resolve('./public');

fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

console.log('Successfully generated 32x32 Benavera favicon.ico in src/app and public!');
