import fs from 'fs';
import zlib from 'zlib';

function decodePng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8;
  let idatChunks = [];
  let w = buf.readUInt32BE(16);
  let h = buf.readUInt32BE(20);
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const raw = new Uint8ClampedArray(w * h * 4);
  const bpp = 4;
  const stride = w * bpp;
  let srcOffset = 0;

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }

  for (let y = 0; y < h; y++) {
    const filter = decompressed[srcOffset++];
    const prevRow = y > 0 ? (y - 1) * stride : -1;
    const currRow = y * stride;

    for (let x = 0; x < stride; x++) {
      const rawByte = decompressed[srcOffset++];
      const a = x >= bpp ? raw[currRow + x - bpp] : 0;
      const b = prevRow >= 0 ? raw[prevRow + x] : 0;
      const c = prevRow >= 0 && x >= bpp ? raw[prevRow + x - bpp] : 0;

      let val = 0;
      if (filter === 0) val = rawByte;
      else if (filter === 1) val = (rawByte + a) & 0xFF;
      else if (filter === 2) val = (rawByte + b) & 0xFF;
      else if (filter === 3) val = (rawByte + Math.floor((a + b) / 2)) & 0xFF;
      else if (filter === 4) val = (rawByte + paeth(a, b, c)) & 0xFF;
      raw[currRow + x] = val;
    }
  }
  return { width: w, height: h, naturalWidth: w, naturalHeight: h, complete: true, data: raw };
}

const loadedSkin = decodePng('Assets/model/Escanor-skin-model.png');
const loadedMustache = decodePng('Assets/model/Escanor-model-mustache.png');
const rawWeapon = decodePng('Assets/model/Escanor-Weapon.png');

// Apply stepped pixelated black outline to rawWeapon
const strokedWeaponData = new Uint8ClampedArray(rawWeapon.width * rawWeapon.height * 4);
for (let i = 0; i < rawWeapon.data.length; i++) strokedWeaponData[i] = rawWeapon.data[i];
const strokeR = 3;
const ww = rawWeapon.width;
const wh = rawWeapon.height;
for (let y = 0; y < wh; y++) {
  for (let x = 0; x < ww; x++) {
    const idx = (y * ww + x) * 4;
    if (rawWeapon.data[idx + 3] > 30) continue;

    let hasNeighbor = false;
    for (let dy = -strokeR; dy <= strokeR; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= wh) continue;
      for (let dx = -strokeR; dx <= strokeR; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= ww) continue;
        if (dx * dx + dy * dy <= strokeR * strokeR) {
          const nIdx = (ny * ww + nx) * 4;
          if (rawWeapon.data[nIdx + 3] > 80) {
            hasNeighbor = true;
            break;
          }
        }
      }
      if (hasNeighbor) break;
    }
    if (hasNeighbor) {
      strokedWeaponData[idx + 0] = 15;
      strokedWeaponData[idx + 1] = 15;
      strokedWeaponData[idx + 2] = 20;
      strokedWeaponData[idx + 3] = 255;
    }
  }
}
const strokedWeapon = { width: ww, height: wh, naturalWidth: ww, naturalHeight: wh, complete: true, data: strokedWeaponData };

function createSoftwareCanvas(width, height) {
  const buffer = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = 18;
    buffer[i + 1] = 18;
    buffer[i + 2] = 24;
    buffer[i + 3] = 255;
  }
  let currentFill = [255, 255, 255, 255];
  let matrix = [1, 0, 0, 1, 0, 0];
  const stack = [];

  function parseColor(str) {
    if (str.startsWith('#')) {
      const hex = str.slice(1);
      if (hex.length === 6) {
        return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 255];
      }
    }
    const rgbaMatch = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      return [parseInt(rgbaMatch[1], 10), parseInt(rgbaMatch[2], 10), parseInt(rgbaMatch[3], 10), rgbaMatch[4] !== undefined ? Math.round(parseFloat(rgbaMatch[4]) * 255) : 255];
    }
    return [255, 255, 255, 255];
  }

  function transformPoint(x, y) {
    return {
      x: matrix[0] * x + matrix[2] * y + matrix[4],
      y: matrix[1] * x + matrix[3] * y + matrix[5]
    };
  }

  const ctx = {
    save() { stack.push([...matrix]); },
    restore() { if (stack.length > 0) matrix = stack.pop(); },
    translate(tx, ty) {
      const n4 = matrix[0] * tx + matrix[2] * ty + matrix[4];
      const n5 = matrix[1] * tx + matrix[3] * ty + matrix[5];
      matrix[4] = n4;
      matrix[5] = n5;
    },
    rotate(rad) {
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      const m0 = matrix[0] * c + matrix[2] * s;
      const m1 = matrix[1] * c + matrix[3] * s;
      const m2 = matrix[0] * -s + matrix[2] * c;
      const m3 = matrix[1] * -s + matrix[3] * c;
      matrix[0] = m0; matrix[1] = m1; matrix[2] = m2; matrix[3] = m3;
    },
    scale(sx, sy) {
      matrix[0] *= sx; matrix[1] *= sx;
      matrix[2] *= sy; matrix[3] *= sy;
    },
    set fillStyle(val) { currentFill = parseColor(val); },
    set strokeStyle(val) { currentFill = parseColor(val); },
    set lineWidth(val) {},
    set globalAlpha(val) {},
    set imageSmoothingEnabled(val) {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    arc(cx, cy, r, sa, ea) {
      const minX = Math.floor(cx - r);
      const maxX = Math.ceil(cx + r);
      const minY = Math.floor(cy - r);
      const maxY = Math.ceil(cy + r);
      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const d = Math.hypot(px - cx, py - cy);
          if (d <= r) {
            this.fillRect(px, py, 1, 1);
          }
        }
      }
    },
    fillRect(x, y, w, h) {
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const tp = transformPoint(x + px, y + py);
          const ix = Math.round(tp.x);
          const iy = Math.round(tp.y);
          if (ix >= 0 && ix < width && iy >= 0 && iy < height) {
            const idx = (iy * width + ix) * 4;
            const alpha = currentFill[3] / 255;
            const invAlpha = 1 - alpha;
            buffer[idx + 0] = Math.round(currentFill[0] * alpha + buffer[idx + 0] * invAlpha);
            buffer[idx + 1] = Math.round(currentFill[1] * alpha + buffer[idx + 1] * invAlpha);
            buffer[idx + 2] = Math.round(currentFill[2] * alpha + buffer[idx + 2] * invAlpha);
            buffer[idx + 3] = 255;
          }
        }
      }
    },
    drawImage(img, dx, dy, dw, dh) {
      if (!img || !img.data) return;
      const srcW = img.width;
      const srcH = img.height;
      const dstW = Math.round(dw);
      const dstH = Math.round(dh);
      for (let py = 0; py < dstH; py++) {
        const sy = Math.floor((py / dstH) * srcH);
        for (let px = 0; px < dstW; px++) {
          const sx = Math.floor((px / dstW) * srcW);
          const sIdx = (sy * srcW + sx) * 4;
          const sA = img.data[sIdx + 3] / 255;
          if (sA < 0.05) continue;

          const tp = transformPoint(dx + px, dy + py);
          const ix = Math.round(tp.x);
          const iy = Math.round(tp.y);
          if (ix >= 0 && ix < width && iy >= 0 && iy < height) {
            const dIdx = (iy * width + ix) * 4;
            const invA = 1 - sA;
            buffer[dIdx + 0] = Math.round(img.data[sIdx + 0] * sA + buffer[dIdx + 0] * invA);
            buffer[dIdx + 1] = Math.round(img.data[sIdx + 1] * sA + buffer[dIdx + 1] * invA);
            buffer[dIdx + 2] = Math.round(img.data[sIdx + 2] * sA + buffer[dIdx + 2] * invA);
            buffer[dIdx + 3] = 255;
          }
        }
      }
    }
  };
  return { ctx, buffer, width, height };
}

function savePng(filename, width, height, buffer) {
  function makeCrcTable() {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    return table;
  }
  const crcTable = makeCrcTable();
  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }
  function writeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcVal = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crcVal, 8 + len);
    return buf;
  }

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = writeChunk('IHDR', ihdr);

  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let srcPos = 0;
  let dstPos = 0;
  for (let y = 0; y < height; y++) {
    rawData[dstPos++] = 0;
    for (let x = 0; x < width * 4; x++) {
      rawData[dstPos++] = buffer[srcPos++];
    }
  }
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = writeChunk('IDAT', compressed);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  const finalPng = Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(filename, finalPng);
  console.log(`Saved preview: ${filename}`);
}

const WEAPON_BLUE_GRIP_X = 1525.5;
const WEAPON_BLUE_GRIP_Y = 742.3;
const WEAPON_ROT_ALIGN = 2.722496;
const WEAPON_SHAFT_LEN = 1207.3;

function drawGoldenGauntlet(ctx, cx, cy, radius) {
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((radius + P) / P);

  ctx.fillStyle = '#78350F';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const d = Math.hypot(gx * P, gy * P);
      if (d <= radius + P * 0.85) {
        ctx.fillRect(snap(cx + gx * P), snap(cy + gy * P), P, P);
      }
    }
  }

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const d = Math.hypot(rx, ry);
      if (d > radius) continue;

      const px = snap(cx + rx);
      const py = snap(cy + ry);

      if (ry < -radius * 0.25 && rx > -radius * 0.35) {
        ctx.fillStyle = '#FFF795';
      } else if (ry > radius * 0.40) {
        ctx.fillStyle = '#D97706';
      } else {
        ctx.fillStyle = '#FDC236';
      }
      ctx.fillRect(px, py, P, P);
    }
  }
}

function drawRhittaWeapon(ctx, x, y, angle, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const wieldScale = (r * 4.3) / WEAPON_SHAFT_LEN;
  ctx.rotate(-WEAPON_ROT_ALIGN);
  ctx.scale(wieldScale, -wieldScale);
  ctx.drawImage(
    strokedWeapon,
    -WEAPON_BLUE_GRIP_X,
    -WEAPON_BLUE_GRIP_Y,
    strokedWeapon.width,
    strokedWeapon.height
  );
  ctx.restore();
}

function drawRhittaSlashArcDirect(ctx, r, animPhase) {
  if (animPhase < 0.50 || animPhase > 0.80) return;
  const strokeP = (animPhase - 0.50) / 0.30;
  const startA = -1.25;
  const endA = 1.15;
  const currentEndA = startA + (endA - startA) * strokeP;
  const currentStartA = Math.max(startA, currentEndA - Math.PI * 0.85 * (1.0 - strokeP * 0.35));
  const outerR = r + 115;
  const innerR = r + 35;

  ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
  for (let a = currentStartA; a <= currentEndA; a += 0.05) {
    for (let rad = innerR; rad <= outerR; rad += 4) {
      ctx.fillRect(Math.cos(a) * rad, Math.sin(a) * rad, 3, 3);
    }
  }
  ctx.fillStyle = '#FFFFFF';
  for (let a = currentStartA; a <= currentEndA; a += 0.03) {
    ctx.fillRect(Math.cos(a) * (outerR - 2), Math.sin(a) * (outerR - 2), 3, 3);
  }
}

function drawEscanorFrame(ctx, cx, cy, r, animPhase, label) {
  ctx.save();
  ctx.translate(cx, cy);

  // Label
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(-60, -r * 2.8, 120, 2);

  // Back hand
  let backX = r * 0.55;
  let backY = -r * 0.15;
  if (animPhase < 0.18) {
    const p = animPhase / 0.18;
    const ease = p * (2 - p);
    backX = r * 0.55 - ease * (r * 0.30);
    backY = -r * 0.15 - ease * (r * 0.35);
  } else if (animPhase < 0.52) {
    backX = r * 0.25;
    backY = -r * 0.50;
  } else if (animPhase < 0.78) {
    const p = (animPhase - 0.52) / 0.26;
    const ease = 1 - Math.pow(1 - p, 2);
    backX = r * 0.25 + ease * (r * 0.35);
    backY = -r * 0.50 + ease * (r * 0.35);
  } else {
    const p = (animPhase - 0.78) / 0.22;
    const ease = p * (2 - p);
    backX = (r * 0.60) + (r * 0.55 - (r * 0.60)) * ease;
    backY = -r * 0.15;
  }
  drawGoldenGauntlet(ctx, backX, backY, r * 0.22);

  // Body
  const scale = r / 140.0;
  ctx.drawImage(loadedSkin, -245.0 * scale, -275.0 * scale, 500.0 * scale, 500.0 * scale);
  const mustacheW = r * 1.05;
  const mustacheH = mustacheW / 2.0;
  ctx.drawImage(loadedMustache, -mustacheW / 2.0, -r * 0.32, mustacheW, mustacheH);

  // Front hand & Rhitta
  let frontX = -r * 0.75;
  let frontY = r * 0.28;
  let axeAngle = 0.46;

  if (animPhase < 0.18) {
    const p = animPhase / 0.18;
    const ease = p * (2 - p);
    axeAngle = 0.46 + (-1.35 - 0.46) * ease;
    frontX = -r * 0.75 + ease * (r * 0.35);
    frontY = r * 0.28 - ease * (r * 0.65);
  } else if (animPhase < 0.52) {
    // Poised HOLD in overhead chop position
    const holdP = (animPhase - 0.18) / 0.34;
    const tensionTremor = Math.sin(holdP * Math.PI * 4) * 0.02;
    axeAngle = -1.35 + tensionTremor;
    frontX = -r * 0.40;
    frontY = -r * 0.37 + Math.sin(holdP * Math.PI * 2) * 0.8;
  } else if (animPhase < 0.78) {
    // Explosive downward chop strike
    const p = (animPhase - 0.52) / 0.26;
    const ease = 1 - Math.pow(1 - p, 3);
    axeAngle = -1.35 + (1.15 - (-1.35)) * ease;
    frontX = -r * 0.40 + ease * (r * 0.85);
    frontY = -r * 0.37 + ease * (r * 0.75);
  } else {
    // Recovery to resting guard
    const p = (animPhase - 0.78) / 0.22;
    const ease = p * (2 - p);
    axeAngle = 1.15 + (0.46 - 1.15) * ease;
    frontX = (r * 0.45) + (-r * 0.75 - (r * 0.45)) * ease;
    frontY = (r * 0.38) + (r * 0.28 - (r * 0.38)) * ease;
  }

  drawRhittaWeapon(ctx, frontX, frontY, axeAngle, r);
  drawGoldenGauntlet(ctx, frontX, frontY, r * 0.24);

  // Slash arc
  drawRhittaSlashArcDirect(ctx, r, animPhase);

  ctx.restore();
}

// Create composite canvas: 4 frames showcasing the chop sequence
const fullCanvas = createSoftwareCanvas(1200, 360);
const r = 25;

// Frame 1: Overhead Lift (0.12)
drawEscanorFrame(fullCanvas.ctx, 150, 180, r, 0.12, '1. Overhead Lift');

// Frame 2: Poised Overhead HOLD Window (0.36 - Missable Telegraph)
drawEscanorFrame(fullCanvas.ctx, 450, 180, r, 0.36, '2. Poised Overhead HOLD (~0.35s)');

// Frame 3: Downward Chop Impact (0.65 - Missable Hit Check Point)
drawEscanorFrame(fullCanvas.ctx, 750, 180, r, 0.65, '3. Downward Chop Impact');

// Frame 4: Recovery (0.90)
drawEscanorFrame(fullCanvas.ctx, 1050, 180, r, 0.90, '4. Recovery to Idle');

const outPath = 'C:/Users/asus/.gemini/antigravity-ide/brain/e77f8700-68fe-4492-a1de-881b34b23000/escanor_chop_sequence.png';
savePng(outPath, fullCanvas.width, fullCanvas.height, fullCanvas.buffer);
