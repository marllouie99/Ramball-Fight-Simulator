import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, rgbaBuffer) {
  const signature = Buffer.from([138, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineLength);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0;
    rgbaBuffer.copy(rawData, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressedData = zlib.deflateSync(rawData);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    crc32.table = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Let's decode the reference image
function decodePng(buffer) {
  let pos = 8;
  let width, height, bitDepth, colorType;
  const idatChunks = [];

  while (pos < buffer.length) {
    const len = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    const data = buffer.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    }
  }

  const compressed = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(compressed);
  const bytesPerPixel = (colorType === 6) ? 4 : (colorType === 2 ? 3 : 1);
  const scanlineLength = width * bytesPerPixel + 1;
  const rawRgba = Buffer.alloc(width * height * 4);
  let prevScanline = Buffer.alloc(width * bytesPerPixel);

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[y * scanlineLength];
    const currentScanline = decompressed.subarray(y * scanlineLength + 1, (y + 1) * scanlineLength);
    const uncompressedScanline = Buffer.alloc(width * bytesPerPixel);

    for (let x = 0; x < width * bytesPerPixel; x++) {
      const left = (x >= bytesPerPixel) ? uncompressedScanline[x - bytesPerPixel] : 0;
      const up = prevScanline[x];
      const upLeft = (x >= bytesPerPixel) ? prevScanline[x - bytesPerPixel] : 0;
      let val = currentScanline[x];
      if (filterType === 1) val = (val + left) & 0xff;
      else if (filterType === 2) val = (val + up) & 0xff;
      else if (filterType === 3) val = (val + Math.floor((left + up) / 2)) & 0xff;
      else if (filterType === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
        let pr = (pa <= pb && pa <= pc) ? left : (pb <= pc ? up : upLeft);
        val = (val + pr) & 0xff;
      }
      uncompressedScanline[x] = val;
    }
    prevScanline = uncompressedScanline;

    for (let x = 0; x < width; x++) {
      const srcIdx = x * bytesPerPixel;
      const dstIdx = (y * width + x) * 4;
      rawRgba[dstIdx] = uncompressedScanline[srcIdx];
      rawRgba[dstIdx + 1] = uncompressedScanline[srcIdx + 1];
      rawRgba[dstIdx + 2] = uncompressedScanline[srcIdx + 2];
      rawRgba[dstIdx + 3] = (bytesPerPixel === 4) ? uncompressedScanline[srcIdx + 3] : 255;
    }
  }

  return { width, height, rawRgba };
}

const refImg = decodePng(fs.readFileSync('C:/Users/asus/.gemini/antigravity-ide/brain/1ae39e73-259c-457d-aa56-0fa6b2db6447/.user_uploaded/media_1789204020785.png'));

// Let's create a 56x56 pixel sprite matrix with center CX=28, CY=28, Circle radius R=18
const W = 56;
const H = 56;
const CX = 28;
const CY = 28;
const R = 18.0;

const outRgba = Buffer.alloc(W * H * 4);

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const idx = (y * W + x) * 4;
  outRgba[idx] = r;
  outRgba[idx + 1] = g;
  outRgba[idx + 2] = b;
  outRgba[idx + 3] = a;
}

function hexToRgb(hex) {
  const c = parseInt(hex.replace('#', ''), 16);
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
}

function setPixelHex(x, y, hex, a = 255) {
  const [r, g, b] = hexToRgb(hex);
  setPixel(x, y, r, g, b, a);
}

// Sample hair and forehead from refImg
// In refImg (435x319):
// Bounding box of character: minX=22, maxX=427 (width 406), minY=18, maxY=318 (height 301)
// Head width across hair is ~380px.
// In our 56x56 sprite, head width across hair is ~44px (gx = -22..+22).
// Scale ratio: 380 / 44 ≈ 8.64 ref pixels per sprite pixel!
// Center of head in refImg: X ≈ 224, Y of top of hair ≈ 18, Y of eyebrows/eyes ≈ 240, Y of scar ≈ 180..220

const refCenterX = 224;
const refTopY = 18;
const refEyeY = 245;

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const gx = x - CX;
    const gy = y - CY;
    const dist = Math.hypot(gx, gy);

    // Map (gx, gy) to refImg coordinates
    // When gx = 0, gy = -20 (top of hair) -> refX = 224, refY = 18
    // When gx = 0, gy = 0 (upper face / forehead) -> refX = 224, refY = 180
    // When gx = 0, gy = 3 (mid face) -> refX = 224, refY = 220
    const sampleRefX = Math.round(refCenterX + gx * 8.6);
    const sampleRefY = Math.round(180 + gy * 8.6);

    let isHairOrFaceSample = false;
    let sampledR = 0, sampledG = 0, sampledB = 0;

    if (sampleRefX >= 0 && sampleRefX < refImg.width && sampleRefY >= 0 && sampleRefY < refImg.height) {
      const sIdx = (sampleRefY * refImg.width + sampleRefX) * 4;
      sampledR = refImg.rawRgba[sIdx];
      sampledG = refImg.rawRgba[sIdx+1];
      sampledB = refImg.rawRgba[sIdx+2];

      const isBg = (sampledR > 225 && sampledG > 225 && sampledB > 225 && Math.abs(sampledR - sampledB) < 15);
      if (!isBg) {
        isHairOrFaceSample = true;
      }
    }

    // Is it in the upper region (hair, forehead, scar, ears)?
    if (gy <= 3) {
      if (isHairOrFaceSample) {
        // Classify sample:
        // 1. Hair pixel: strong reddish/burgundy/wine/dark tone
        const isHairTone = (sampledR > 30 && sampledG < 60 && sampledB < 80) || (sampledR < 50 && sampledG < 50 && sampledB < 50);
        // 2. Scar pixel: deep crimson red on forehead
        const isScarTone = (sampledR > 100 && sampledG < 45 && sampledB < 50);
        // 3. Eye / eyebrow pixel in reference (we must replace with clean skin per Rule 19!)
        const isEyePixel = (sampleRefY >= 235 && (sampledR < 80 || (sampledR > 200 && sampledG > 200 && sampledB > 200 && Math.abs(sampledR - sampledB) < 10)));
        // 4. Skin tone
        const isSkinTone = (sampledR > 180 && sampledG > 140 && sampledB > 110);

        if (isHairTone) {
          setPixel(x, y, sampledR, sampledG, sampledB, 255);
          continue;
        } else if (isScarTone) {
          setPixel(x, y, sampledR, sampledG, sampledB, 255);
          continue;
        } else if (isEyePixel) {
          // Replace with smooth face skin!
          setPixelHex(x, y, (gy <= 0) ? '#FFF1E8' : '#FED7AA');
          continue;
        } else if (isSkinTone) {
          setPixel(x, y, sampledR, sampledG, sampledB, 255);
          continue;
        } else {
          setPixel(x, y, sampledR, sampledG, sampledB, 255);
          continue;
        }
      } else if (dist <= R) {
        // Inside circle upper face fallback
        setPixelHex(x, y, '#FED7AA');
        continue;
      }
    }

    // Lower half: gy >= 4 (Checkered Haori, Uniform collar, Belt, Earrings)
    if (dist <= R) {
      // Stepped dark circle border
      if (dist >= R - 1.2) {
        setPixelHex(x, y, '#18181B');
        continue;
      }

      const isCollarWhite = (Math.abs(gx) <= 3 && gy >= 4 && gy <= 7);
      const isCollarInnerBlack = (Math.abs(gx) <= 1 && gy >= 4 && gy <= 5);
      const isGoldButton = (gx === 0 && gy === 7);

      const isBeltWhite = (gy >= 12 && gy <= 14 && Math.abs(gx) <= 12);
      const isBeltBuckle = isBeltWhite && (Math.abs(gx) <= 2);

      if (isCollarInnerBlack) {
        setPixelHex(x, y, '#18181B');
      } else if (isCollarWhite) {
        setPixelHex(x, y, '#FFFFFF');
      } else if (isGoldButton) {
        setPixelHex(x, y, '#F59E0B');
      } else if (isBeltBuckle) {
        setPixelHex(x, y, '#94A3B8');
      } else if (isBeltWhite) {
        setPixelHex(x, y, '#F1F5F9');
      } else {
        // Emerald Green (#059669) & Charcoal Black (#18181B) Checkered Haori
        const tileX = Math.floor((gx + 20) / 4);
        const tileY = Math.floor((gy - 4) / 3);
        const isGreenTile = ((tileX + tileY) % 2 === 0);

        if (isGreenTile) {
          const isHighlight = (gx % 4 === 1 && gy % 3 === 1);
          setPixelHex(x, y, isHighlight ? '#10B981' : '#059669');
        } else {
          setPixelHex(x, y, '#18181B');
        }
      }
      continue;
    }

    // Earrings on the sides outside circle (gx = ±14..±16, gy = 5..11)
    const isLeftEarring = (gx >= -17 && gx <= -15 && gy >= 6 && gy <= 12);
    const isRightEarring = (gx >= 15 && gx <= 17 && gy >= 6 && gy <= 12);

    if (isLeftEarring || isRightEarring) {
      const ey = gy - 6;
      if (ey === 0 || ey === 6 || gx === -17 || gx === -15 || gx === 15 || gx === 17) {
        setPixelHex(x, y, '#18181B');
      } else if (ey >= 2 && ey <= 4) {
        setPixelHex(x, y, '#EF4444'); // Red rising sun
      } else {
        setPixelHex(x, y, '#FFFFFF'); // White card
      }
    }
  }
}

// Generate PNG
const pngBuffer = createPng(W, H, outRgba);
fs.writeFileSync('Assets/model/Tanjiro-PIXEL-SKIN.png', pngBuffer);
console.log('Generated Assets/model/Tanjiro-PIXEL-SKIN.png (', pngBuffer.length, 'bytes )');

// Also update HTML preview
const base64 = pngBuffer.toString('base64');
const html = `<!DOCTYPE html>
<html>
<head>
<style>
body { background: #11111b; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; }
.row { display: flex; gap: 30px; align-items: center; }
.card { background: #1e1e2e; padding: 20px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; }
img { image-rendering: pixelated; margin: 10px; }
</style>
</head>
<body>
<h1>Tanjiro Authentic 1:1 Pixel Skin</h1>
<div class="row">
  <div class="card">
    <h3>Sprite 1x (56x56)</h3>
    <img src="data:image/png;base64,${base64}" width="56" height="56">
  </div>
  <div class="card">
    <h3>In-Game Size (r=25 -> 78px)</h3>
    <img src="data:image/png;base64,${base64}" width="78" height="78">
  </div>
  <div class="card">
    <h3>Zoomed 4x (224x224)</h3>
    <img src="data:image/png;base64,${base64}" width="224" height="224">
  </div>
  <div class="card">
    <h3>Zoomed 8x (448x448)</h3>
    <img src="data:image/png;base64,${base64}" width="448" height="448">
  </div>
</div>
</body>
</html>`;
fs.writeFileSync('tanjiro_preview.html', html);
console.log('Updated tanjiro_preview.html');
