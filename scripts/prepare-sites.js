import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const server = join(dist, 'server');

async function collect(directory) {
  const result = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (path === server) continue;
    if (entry.isDirectory()) Object.assign(result, await collect(path));
    else result[`/${relative(dist, path)}`] = (await readFile(path)).toString('base64');
  }
  return result;
}

const files = await collect(dist);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

await mkdir(server, { recursive: true });
await writeFile(join(server, 'index.js'), `const files = ${JSON.stringify(files)};
const mimeTypes = ${JSON.stringify(mimeTypes)};

function decode(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const encoded = files[path];
    if (!encoded) return new Response('Not found', { status: 404 });
    const extension = path.includes('.') ? path.slice(path.lastIndexOf('.')) : '';
    return new Response(decode(encoded), {
      headers: {
        'Content-Type': mimeTypes[extension] || 'application/octet-stream',
        'Cache-Control': path === '/index.html'
          ? 'no-store, no-cache, must-revalidate, max-age=0'
          : 'public, max-age=31536000, immutable',
        ...(path === '/index.html' ? { 'Pragma': 'no-cache', 'Expires': '0' } : {})
      }
    });
  }
};
`);
