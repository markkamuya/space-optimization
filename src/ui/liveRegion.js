export function setLiveRegionText(element, value) {
  const text = String(value ?? '');
  if (!element || element.textContent === text) return false;
  element.textContent = text;
  return true;
}

export function setLiveRegionHtml(element, value) {
  const html = String(value ?? '');
  if (!element || element.innerHTML === html) return false;
  element.innerHTML = html;
  return true;
}

export function setLiveRegionMode(elements, active) {
  for (const element of elements) if (element) element.setAttribute('aria-live', active ? 'polite' : 'off');
}
