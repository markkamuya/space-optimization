const FIELD_LABELS = { x: 'X coordinate', y: 'Y coordinate', angle: 'Angle' };

export function validateWorkshopCoordinateInput(input) {
  const values = {};
  const issues = [];
  for (const field of ['x', 'y', 'angle']) {
    const raw = String(input?.[field] ?? '').trim();
    const value = raw === '' ? Number.NaN : Number(raw);
    if (!Number.isFinite(value)) {
      issues.push({ field, message: `${FIELD_LABELS[field]} must be a finite number.` });
    } else {
      values[field] = value;
    }
  }
  return {
    valid: issues.length === 0,
    issues,
    values: issues.length ? null : { ...values, reflect: input?.reflect === true }
  };
}
