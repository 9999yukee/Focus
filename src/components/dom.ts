export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export function button(label: string, action: () => void, className = 'button'): HTMLButtonElement {
  const node = element('button', className, label); node.type = 'button'; node.addEventListener('click', action); return node;
}
export function escape(value: string): string { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }
export function toast(message: string): void {
  document.querySelector('.toast')?.remove();
  const node = element('div', 'toast', message); node.role = 'status'; document.body.append(node);
  setTimeout(() => node.remove(), 6500);
}
