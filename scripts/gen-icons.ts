import { createCanvas } from 'node:canvas';
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function makePNG(size: number, r: number, g: number, b: number): Buffer {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type: string, data: Buffer): Buffer {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = crc32(Buffer.concat([t, data]));
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, t, data, c]);
  }

  // CRC32
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  function crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // IDAT: raw scanlines (filter byte 0 + RGB pixels)
  const rawRows: number[] = [];
  for (let y = 0; y < size; y++) {
    rawRows.push(0); // filter type
    for (let x = 0; x < size; x++) {
      rawRows.push(r, g, b);
    }
  }
  const raw = Buffer.from(rawRows);
  const compressed = deflateSync(raw);

  const iend = Buffer.alloc(0);

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', iend)]);
}

const icons = [
  { size: 128, file: 'static/icons/icon-128.png' },
  { size: 192, file: 'static/icons/icon-192.png' },
  { size: 512, file: 'static/icons/icon-512.png' },
];

for (const { size, file } of icons) {
  writeFileSync(file, makePNG(size, 26, 26, 46)); // #1a1a2e
  console.log(`Generated ${file} (${size}x${size})`);
}
