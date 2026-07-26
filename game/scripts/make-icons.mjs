// Draws the app icon procedurally and writes real PNGs, so the repo carries no
// binary art and the icon can never drift from the in-game palette.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour + alpha
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** An unlit eye: void field, crimson iris ring, a single cold pupil. */
function drawIcon(size, inset) {
  const buf = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const R = (size / 2) * inset;

  const put = (i, r, g, b, a) => {
    // Straight "over" blend against whatever is already there.
    const sa = a;
    const da = buf[i + 3] / 255;
    const out = sa + da * (1 - sa);
    if (out <= 0) return;
    buf[i] = (r * sa + buf[i] * da * (1 - sa)) / out;
    buf[i + 1] = (g * sa + buf[i + 1] * da * (1 - sa)) / out;
    buf[i + 2] = (b * sa + buf[i + 2] * da * (1 - sa)) / out;
    buf[i + 3] = out * 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - c;
      const dy = y - c;
      const d = Math.hypot(dx, dy);

      // Background field, darkening toward the edge.
      const t = Math.min(1, d / (size / 2));
      put(i, 16 - t * 11, 20 - t * 14, 27 - t * 20, 1);

      if (d > R) continue;

      // Iris ring.
      const ring = Math.abs(d - R * 0.74);
      if (ring < R * 0.1) {
        const a = 1 - ring / (R * 0.1);
        put(i, 177, 38, 58, a * 0.95);
      }

      // Lens glow.
      if (d < R * 0.62) {
        const a = Math.pow(1 - d / (R * 0.62), 2.2) * 0.5;
        put(i, 177, 38, 58, a);
      }

      // Pupil — a vertical slit, because a round one reads as friendly.
      const slit = Math.abs(dx) < R * 0.1 && Math.abs(dy) < R * 0.42;
      if (slit) {
        const edge = 1 - Math.max(Math.abs(dx) / (R * 0.1), Math.abs(dy) / (R * 0.42));
        put(i, 216, 210, 196, Math.min(1, edge * 4));
      }
    }
  }
  return buf;
}

mkdirSync(OUT, { recursive: true });

for (const [size, inset, name] of [
  [192, 0.82, 'icon-192.png'],
  [512, 0.82, 'icon-512.png'],
  [512, 0.6, 'icon-maskable.png'],
]) {
  writeFileSync(join(OUT, name), png(size, size, drawIcon(size, inset)));
  console.log('wrote', name);
}

// Android launcher icons, one per density bucket. Drawn at native size rather
// than downscaled so the pupil stays crisp on low-density screens.
const ANDROID = join(dirname(fileURLToPath(import.meta.url)), '..', 'android', 'res');
for (const [bucket, size] of [
  ['mdpi', 48],
  ['hdpi', 72],
  ['xhdpi', 96],
  ['xxhdpi', 144],
  ['xxxhdpi', 192],
]) {
  const dir = join(ANDROID, `mipmap-${bucket}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'ic_launcher.png'), png(size, size, drawIcon(size, 0.82)));
}
console.log('wrote android mipmaps');
