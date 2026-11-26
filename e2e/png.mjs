import { inflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Pure-Node PNG decoder supporting 8-bit RGB (colorType 2) and RGBA (colorType 6),
 * non-interlaced, across all 5 PNG scanline filter modes (0..4).
 */
export function decodePng(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(buffer);
  }
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Invalid PNG signature');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks = [];

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) {
      throw new Error(`Truncated PNG chunk: ${type}`);
    }
    const data = buffer.subarray(dataStart, dataEnd);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      const compression = data[10];
      const filter = data[11];
      interlace = data[12];
      if (bitDepth !== 8) {
        throw new Error(`Unsupported PNG bit depth: ${bitDepth} (expected 8)`);
      }
      if (colorType !== 2 && colorType !== 6) {
        throw new Error(`Unsupported PNG colorType: ${colorType} (expected 2 RGB or 6 RGBA)`);
      }
      if (compression !== 0 || filter !== 0) {
        throw new Error(`Unsupported PNG compression/filter method: ${compression}/${filter}`);
      }
      if (interlace !== 0) {
        throw new Error('Interlaced PNG is not supported');
      }
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4; // skip 4-byte CRC
  }

  if (width <= 0 || height <= 0 || idatChunks.length === 0) {
    throw new Error('Incomplete PNG: missing IHDR or IDAT chunks');
  }

  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idatChunks));
  const expectedLength = height * (stride + 1);
  if (raw.length < expectedLength) {
    throw new Error(`Inflated PNG data too short: ${raw.length} < ${expectedLength}`);
  }

  const unfiltered = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    const filterType = raw[rowStart];
    const outStart = y * stride;
    const prevStart = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const val = raw[rowStart + 1 + x];
      const a = x >= bpp ? unfiltered[outStart + x - bpp] : 0;
      const b = y > 0 ? unfiltered[prevStart + x] : 0;
      const c = y > 0 && x >= bpp ? unfiltered[prevStart + x - bpp] : 0;

      let recon;
      switch (filterType) {
        case 0:
          recon = val;
          break;
        case 1:
          recon = (val + a) & 0xff;
          break;
        case 2:
          recon = (val + b) & 0xff;
          break;
        case 3:
          recon = (val + ((a + b) >> 1)) & 0xff;
          break;
        case 4:
          recon = (val + paethPredictor(a, b, c)) & 0xff;
          break;
        default:
          throw new Error(`Unknown PNG scanline filter type: ${filterType}`);
      }
      unfiltered[outStart + x] = recon;
    }
  }

  let rgba;
  if (bpp === 4) {
    rgba = unfiltered;
  } else {
    rgba = new Uint8Array(width * height * 4);
    for (let i = 0, j = 0; i < unfiltered.length; i += 3, j += 4) {
      rgba[j] = unfiltered[i];
      rgba[j + 1] = unfiltered[i + 1];
      rgba[j + 2] = unfiltered[i + 2];
      rgba[j + 3] = 255;
    }
  }

  return { width, height, colorType, rgba };
}

function clampRect(img, rect, dpr = 1) {
  const rx = rect ? Math.floor((rect.x ?? rect.left ?? 0) * dpr) : 0;
  const ry = rect ? Math.floor((rect.y ?? rect.top ?? 0) * dpr) : 0;
  const rw = rect ? Math.floor((rect.width ?? img.width) * dpr) : img.width;
  const rh = rect ? Math.floor((rect.height ?? img.height) * dpr) : img.height;

  const x0 = Math.max(0, Math.min(img.width, rx));
  const y0 = Math.max(0, Math.min(img.height, ry));
  const x1 = Math.max(x0, Math.min(img.width, rx + rw));
  const y1 = Math.max(y0, Math.min(img.height, ry + rh));

  return { x0, y0, x1, y1, width: x1 - x0, height: y1 - y0 };
}

/**
 * Crops an RGBA sub-region from a decoded PNG image using CSS rect & deviceScaleFactor.
 */
export function cropRgba(img, rect, dpr = 1) {
  const { x0, y0, width, height } = clampRect(img, rect, dpr);
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const srcOffset = ((y0 + y) * img.width + x0) * 4;
    const dstOffset = y * width * 4;
    out.set(img.rgba.subarray(srcOffset, srcOffset + width * 4), dstOffset);
  }
  return { width, height, rgba: out };
}

/**
 * Computes pixel difference metrics between two decoded PNGs in a given CSS rect.
 */
export function diffRegion(imgA, imgB, rect, dpr = 1, threshold = 4) {
  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    throw new Error(
      `Image dimensions mismatch in diffRegion: ${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height}`
    );
  }

  const { x0, y0, x1, y1, width, height } = clampRect(imgA, rect, dpr);
  const pixelCount = width * height;
  if (pixelCount === 0) {
    return { meanAbsDiff: 0, changedPixelRatio: 0, maxDelta: 0, pixelCount: 0 };
  }

  let totalAbsDiff = 0;
  let changedPixels = 0;
  let maxDelta = 0;

  for (let y = y0; y < y1; y++) {
    const rowBase = y * imgA.width * 4;
    for (let x = x0; x < x1; x++) {
      const idx = rowBase + x * 4;
      const dr = Math.abs(imgA.rgba[idx] - imgB.rgba[idx]);
      const dg = Math.abs(imgA.rgba[idx + 1] - imgB.rgba[idx + 1]);
      const db = Math.abs(imgA.rgba[idx + 2] - imgB.rgba[idx + 2]);
      const pixelMax = Math.max(dr, dg, db);
      totalAbsDiff += (dr + dg + db) / 3;
      if (pixelMax > threshold) changedPixels++;
      if (pixelMax > maxDelta) maxDelta = pixelMax;
    }
  }

  return {
    meanAbsDiff: totalAbsDiff / pixelCount,
    changedPixelRatio: changedPixels / pixelCount,
    maxDelta,
    pixelCount,
  };
}

/**
 * Computes luminance, RGB channel averages, color dispersion, and stdDev inside a CSS rect.
 */
export function regionStats(img, rect, dpr = 1) {
  const { x0, y0, x1, y1, width, height } = clampRect(img, rect, dpr);
  const pixelCount = width * height;
  if (pixelCount === 0) {
    return {
      meanLuminance: 0,
      maxLuminance: 0,
      stdDev: 0,
      meanR: 0,
      meanG: 0,
      meanB: 0,
      meanRbDivergence: 0,
      pixelCount: 0,
    };
  }

  let sumLum = 0;
  let sumLumSq = 0;
  let maxLum = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumRbDiff = 0;

  for (let y = y0; y < y1; y++) {
    const rowBase = y * img.width * 4;
    for (let x = x0; x < x1; x++) {
      const idx = rowBase + x * 4;
      const r = img.rgba[idx];
      const g = img.rgba[idx + 1];
      const b = img.rgba[idx + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sumLum += lum;
      sumLumSq += lum * lum;
      if (lum > maxLum) maxLum = lum;
      sumR += r;
      sumG += g;
      sumB += b;
      sumRbDiff += Math.abs(r - b);
    }
  }

  const meanLuminance = sumLum / pixelCount;
  const variance = Math.max(0, sumLumSq / pixelCount - meanLuminance * meanLuminance);

  return {
    meanLuminance,
    maxLuminance: maxLum,
    stdDev: Math.sqrt(variance),
    meanR: sumR / pixelCount,
    meanG: sumG / pixelCount,
    meanB: sumB / pixelCount,
    meanRbDivergence: sumRbDiff / pixelCount,
    pixelCount,
  };
}
