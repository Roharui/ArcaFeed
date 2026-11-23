type Attributes = Record<string, string | number>;

export function setAttributes<T extends Element>(
  element: T,
  attributes: Attributes,
): T {
  for (const [name, value] of Object.entries(attributes))
    element.setAttribute(name, String(value));
  return element;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  { text, ...attributes }: Attributes = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = setAttributes(document.createElement(tag), attributes);
  if (text !== undefined) element.textContent = String(text);
  if (children.length) element.append(...children);
  return element;
}

/** Parse an application-owned template with a single root element. */
export function fromTemplate<T extends Element = HTMLElement>(
  markup: string,
): T {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild as T;
}

export function listen<
  T extends HTMLElement,
  K extends keyof HTMLElementEventMap,
>(
  element: T,
  event: K,
  handler: (event: HTMLElementEventMap[K], element: T) => unknown,
): T {
  element.addEventListener(event, (event) => handler(event, element));
  return element;
}

export function isVisible(element: HTMLElement): boolean {
  return element.getClientRects().length > 0;
}
