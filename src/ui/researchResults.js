// Retain DOM identity only for an explicit continuation of the same ordered
// results. Normal renders (filters, release refresh, recovery) always replace.
export function renderResearchRows(container, records, { append = false, renderRow, openRecord }) {
  const previous = Array.from(container.querySelectorAll('[data-record]'));
  const retain = append && previous.length > 0 && previous.length <= records.length
    && previous.every((button, index) => button.dataset.record === records[index].id);
  const start = retain ? previous.length : 0;
  const html = records.slice(start).map(renderRow).join('');
  if (retain) container.insertAdjacentHTML('beforeend', html);
  else container.innerHTML = html;
  const buttons = Array.from(container.querySelectorAll('[data-record]'));
  for (let index = start; index < buttons.length; index++) {
    const record = records[index];
    buttons[index].addEventListener('click', () => openRecord(record));
  }
  return { retained: start, added: records.length - start, firstAdded: buttons[start] ?? null };
}

// Called only for an explicit Show more action, never for typing or refresh.
export function revealResearchContinuation(result, status) {
  if (!result?.firstAdded || result.added === 0) return false;
  const end = result.retained + result.added;
  status.textContent = `Added records ${result.retained + 1}–${end}. Showing ${end} of ${result.total} matching records.`;
  result.firstAdded.scrollIntoView({ block: 'center', behavior: 'instant' });
  result.firstAdded.focus({ preventScroll: true });
  return true;
}
