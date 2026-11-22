import { Window } from "happy-dom";

const window = new Window({ url: "http://localhost" });

// Register all DOM globals
const globals = [
  "document",
  "window",
  "HTMLElement",
  "HTMLDivElement",
  "HTMLInputElement",
  "HTMLButtonElement",
  "HTMLFormElement",
  "HTMLAnchorElement",
  "HTMLSelectElement",
  "HTMLTextAreaElement",
  "HTMLTemplateElement",
  "Element",
  "Node",
  "Text",
  "Comment",
  "DocumentFragment",
  "Event",
  "CustomEvent",
  "MouseEvent",
  "KeyboardEvent",
  "MutationObserver",
  "navigator",
  "location",
  "history",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "queueMicrotask",
] as const;

for (const key of globals) {
  if (key in window && !(key in globalThis)) {
    // @ts-expect-error — assigning DOM globals to globalThis
    globalThis[key] = window[key];
  }
}
