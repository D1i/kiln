export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const element = el('button', className, label);
  element.type = 'button';
  element.addEventListener('click', onClick);
  return element;
}
