import { gzipSync } from 'node:zlib';

const BLOCK_SIZE = 512;

function writeText(header, offset, length, value) {
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.length > length) throw new Error(`USTAR field is too long: ${value}`);
  bytes.copy(header, offset);
}

function writeOctal(header, offset, length, value) {
  const encoded = value.toString(8).padStart(length - 1, '0');
  if (encoded.length >= length) throw new Error(`USTAR numeric field is too large: ${value}`);
  writeText(header, offset, length, `${encoded}\0`);
}

function headerFor(path, size) {
  if (!path || Buffer.byteLength(path) > 100) {
    throw new Error(`USTAR path must be between 1 and 100 bytes: ${path}`);
  }
  const header = Buffer.alloc(BLOCK_SIZE);
  writeText(header, 0, 100, path);
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  header[156] = '0'.charCodeAt(0);
  writeText(header, 257, 6, 'ustar\0');
  writeText(header, 263, 2, '00');
  writeText(header, 265, 32, 'root');
  writeText(header, 297, 32, 'root');
  writeOctal(header, 329, 8, 0);
  writeOctal(header, 337, 8, 0);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeText(header, 148, 8, `${checksum.toString(8).padStart(6, '0')}\0 `);
  return header;
}

export function buildDeterministicTarGzip(entries) {
  const chunks = [];
  for (const [path, payload] of entries) {
    const content = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    chunks.push(headerFor(path, content.length), content);
    const padding = (BLOCK_SIZE - (content.length % BLOCK_SIZE)) % BLOCK_SIZE;
    if (padding) chunks.push(Buffer.alloc(padding));
  }
  chunks.push(Buffer.alloc(BLOCK_SIZE * 2));
  return gzipSync(Buffer.concat(chunks), { level: 9, mtime: 0 });
}
