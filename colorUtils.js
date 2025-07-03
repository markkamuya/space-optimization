// colorUtils.js
export function changeColor(targetObject, newColor, onChangeCallback) {
  if (!targetObject || typeof targetObject !== 'object') return;
  if (!('color' in targetObject)) {
    console.warn('Target object has no color property');
    return;
  }
  targetObject.color = newColor;
  if (typeof onChangeCallback === 'function') {
    onChangeCallback();
  }
}
