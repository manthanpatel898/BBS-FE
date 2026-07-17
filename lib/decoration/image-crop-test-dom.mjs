import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  Node: dom.window.Node,
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  KeyboardEvent: dom.window.KeyboardEvent,
  MouseEvent: dom.window.MouseEvent,
  MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle,
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
dom.window.requestAnimationFrame = callback => {
  callback(Date.now());
  return 1;
};
dom.window.cancelAnimationFrame = () => {};
