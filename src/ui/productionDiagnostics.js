export const PRODUCTION_DIAGNOSTICS_FORMAT = 'triangle-packing-atlas-production-diagnostics/v1';

export function runProductionDiagnostics(document, environment = globalThis) {
  const root = document.documentElement;
  const dialog = document.querySelector('#record-dialog');
  const gates = {
    semanticWorkflows: ['research', 'compare', 'contribute'].every(id => document.getElementById(id)?.hasAttribute('aria-labelledby')),
    verifiedRelease: document.querySelector('#research-load-status')?.dataset.releaseTrust === 'verified',
    keyboardFocus: typeof document.querySelector('#research-search')?.focus === 'function' && document.querySelector('.skip-link') !== null,
    dialogSemantics: dialog?.tagName === 'DIALOG' && dialog.hasAttribute('aria-labelledby') && dialog.hasAttribute('aria-describedby'),
    canvasAlternatives: [...document.querySelectorAll('canvas')].every(canvas => canvas.hasAttribute('aria-label')),
    viewportFit: root.scrollWidth <= root.clientWidth,
    integrityPrimitives: typeof environment.crypto?.subtle?.digest === 'function' && typeof environment.TextEncoder === 'function',
    recoveryControls: document.querySelector('[data-retry-release], #offline-readiness-check') !== null
  };
  const failures = Object.entries(gates).filter(([, passed]) => !passed).map(([name]) => name);
  return { format: PRODUCTION_DIAGNOSTICS_FORMAT, passed: failures.length === 0, gates, failures };
}
