// A displayed answer belongs to the submitted question, not later edits.
// Editing must not move focus or leave links to the previous result active.
export function invalidateCompassAnswer(answer, status) {
  if (answer.hidden) return false;
  answer.hidden = true;
  answer.replaceChildren();
  status.textContent = 'Your question changed. Submit it again to see a matching verified answer.';
  return true;
}

export function revealCompassAnswer(answer) {
  answer.hidden = false;
  answer.scrollIntoView({ block: 'start', behavior: 'instant' });
  answer.focus({ preventScroll: true });
}

export function returnToCompassQuestion(form) {
  const control = form.querySelector('select');
  if (!control) return;
  control.scrollIntoView({ block: 'center', behavior: 'instant' });
  control.focus({ preventScroll: true });
}
