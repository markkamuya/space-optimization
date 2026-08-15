#!/usr/bin/env node
import { readFile, rename, writeFile } from 'node:fs/promises';
import { updateReviewAuthority, verifyReviewAuthority } from '../src/contributions/reviewAuthority.js';

const [command, source, ...args] = process.argv.slice(2);
const option = name => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};

async function atomicWrite(path, value) {
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, path);
}

const registry = JSON.parse(await readFile(source, 'utf8'));
let result;
if (command === 'verify') {
  result = verifyReviewAuthority(registry);
  if (!result.valid) process.exitCode = 1;
} else if (command === 'add') {
  result = updateReviewAuthority(registry, { action: 'add', updatedAt: option('--at'),
    key: JSON.parse(await readFile(option('--key'), 'utf8')) });
} else if (command === 'revoke') {
  result = updateReviewAuthority(registry, { action: 'revoke', updatedAt: option('--at'),
    revokedAt: option('--at'), keyId: option('--key-id') });
} else {
  throw new Error('Usage: review-authority <verify|add|revoke> REGISTRY [options]');
}
if (option('--output')) await atomicWrite(option('--output'), result);
console.log(JSON.stringify(result, null, 2));
