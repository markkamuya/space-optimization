export function auditDependencyLock(manifest, lock) {
  const errors = [];
  if (lock?.lockfileVersion !== 3) errors.push('LOCKFILE_VERSION_UNSUPPORTED');
  const root = lock?.packages?.[''];
  if (!root) errors.push('LOCKFILE_ROOT_MISSING');
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const expected = manifest?.[section] ?? {};
    const actual = root?.[section] ?? {};
    if (JSON.stringify(expected) !== JSON.stringify(actual)) errors.push(`ROOT_${section.toUpperCase()}_DRIFT`);
  }
  for (const [path, entry] of Object.entries(lock?.packages ?? {})) {
    if (path === '' || entry.link) continue;
    if (typeof entry.version !== 'string') errors.push(`PACKAGE_VERSION_MISSING:${path}`);
    if (typeof entry.resolved !== 'string' || !entry.resolved.startsWith('https://registry.npmjs.org/')) {
      errors.push(`UNTRUSTED_PACKAGE_SOURCE:${path}`);
    }
    if (typeof entry.integrity !== 'string' || !entry.integrity.startsWith('sha512-')) {
      errors.push(`PACKAGE_INTEGRITY_MISSING:${path}`);
    }
  }
  return {
    format: 'triangle-packing-supply-chain-audit/v1',
    valid: errors.length === 0,
    packages: Math.max(0, Object.keys(lock?.packages ?? {}).length - 1),
    lockfileVersion: lock?.lockfileVersion ?? null,
    errors
  };
}
