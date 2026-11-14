/**
 * A minimal deterministic DOM, evaluated inside the program's context. It yields a function that
 * receives the drawn tree as JSON and the host's error reporter, and defines `document` and `Event`.
 * There are no text nodes: an element has its own text followed by its child elements.
 */
export const DOM_STUB_SOURCE = `(treeJson, hostReportError) => {
  "use strict";
  const internals = new WeakMap();
  const stateOf = (target) => internals.get(target);

  const SELECTOR_PART = /^([a-z][a-z0-9]*)?((?:[#.][\\w-]+)*)$/i;
  const parseSelector = (selector) => String(selector).trim().split(/\\s+/).map((part) => {
    const match = SELECTOR_PART.exec(part);
    if (match === null || part === "") throw new SyntaxError("Unsupported selector: " + selector);
    const qualifiers = match[2].match(/[#.][\\w-]+/g) ?? [];
    return {
      tagName: match[1]?.toUpperCase(),
      id: qualifiers.find((qualifier) => qualifier[0] === "#")?.slice(1),
      classNames: qualifiers.filter((qualifier) => qualifier[0] === ".").map((qualifier) => qualifier.slice(1)),
    };
  });
  const matchesPart = (element, part) =>
    (part.tagName === undefined || element.tagName === part.tagName) &&
    (part.id === undefined || element.id === part.id) &&
    part.classNames.every((className) => element.classList.contains(className));
  const matchesParts = (element, parts) => {
    if (!matchesPart(element, parts[parts.length - 1])) return false;
    let remaining = parts.length - 2;
    for (let ancestor = element.parentElement; ancestor !== null && remaining >= 0; ancestor = ancestor.parentElement) {
      if (matchesPart(ancestor, parts[remaining])) remaining--;
    }
    return remaining < 0;
  };
  const descendantsOf = (element) => stateOf(element).children.flatMap((child) => [child, ...descendantsOf(child)]);
  const selectAll = (candidates, selector) => {
    const parts = parseSelector(selector);
    return new NodeList(candidates.filter((candidate) => matchesParts(candidate, parts)));
  };
  const captures = (options) => (typeof options === "boolean" ? options : Boolean(options?.capture));
  const datasetKey = (attributeName) => attributeName.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

  class HTMLCollection {
    constructor(items) {
      items.forEach((item, index) => { this[index] = item; });
      Object.defineProperty(this, "length", { value: items.length });
    }
    item(index) { return this[index] ?? null; }
    [Symbol.iterator]() { return Array.prototype.values.call(this); }
  }
  class NodeList extends HTMLCollection {
    forEach(callback, thisArgument) { Array.prototype.forEach.call(this, callback, thisArgument); }
  }

  // Only "type" is an own property, so a printed event stays short.
  class Event {
    constructor(type, options) {
      this.type = String(type);
      internals.set(this, {
        bubbles: Boolean(options?.bubbles),
        cancelable: Boolean(options?.cancelable),
        target: null,
        currentTarget: null,
        eventPhase: 0,
        defaultPrevented: false,
        propagationStopped: false,
        immediatePropagationStopped: false,
      });
    }
    get bubbles() { return stateOf(this).bubbles; }
    get cancelable() { return stateOf(this).cancelable; }
    get target() { return stateOf(this).target; }
    get currentTarget() { return stateOf(this).currentTarget; }
    get eventPhase() { return stateOf(this).eventPhase; }
    get defaultPrevented() { return stateOf(this).defaultPrevented; }
    preventDefault() { stateOf(this).defaultPrevented = this.cancelable; }
    stopPropagation() { stateOf(this).propagationStopped = true; }
    stopImmediatePropagation() {
      this.stopPropagation();
      stateOf(this).immediatePropagationStopped = true;
    }
  }

  class EventTarget {
    constructor() { internals.set(this, { listeners: [], children: [], parent: null, text: "", attributes: new Map() }); }
    addEventListener(type, listener, options) {
      const { listeners } = stateOf(this);
      const capture = captures(options);
      const isDuplicate = listeners.some((entry) => entry.type === type && entry.listener === listener && entry.capture === capture);
      if (typeof listener !== "function" || isDuplicate) return;
      listeners.push({ type: String(type), listener, capture, once: Boolean(options?.once), removed: false });
    }
    removeEventListener(type, listener, options) {
      const { listeners } = stateOf(this);
      const capture = captures(options);
      const index = listeners.findIndex((entry) => entry.type === type && entry.listener === listener && entry.capture === capture);
      if (index !== -1) listeners.splice(index, 1)[0].removed = true;
    }
    dispatchEvent(event) {
      const path = [];
      for (let target = this; target !== null; target = target.parentElement ?? (target === document.body ? document : null)) {
        path.push(target);
      }
      const eventState = stateOf(event);
      const invokeListeners = (target, eventPhase, capture) => {
        if (eventState.propagationStopped) return;
        eventState.currentTarget = target;
        eventState.eventPhase = eventPhase;
        for (const entry of [...stateOf(target).listeners]) {
          if (entry.removed || entry.type !== event.type || entry.capture !== capture) continue;
          if (entry.once) target.removeEventListener(entry.type, entry.listener, entry.capture);
          try { entry.listener.call(target, event); } catch (error) { hostReportError(error); }
          if (eventState.immediatePropagationStopped) return;
        }
      };
      eventState.target = this;
      for (let index = path.length - 1; index >= 0; index--) invokeListeners(path[index], index === 0 ? 2 : 1, true);
      const bubblePath = event.bubbles ? path : [this];
      bubblePath.forEach((target, index) => invokeListeners(target, index === 0 ? 2 : 3, false));
      eventState.currentTarget = null;
      eventState.eventPhase = 0;
      return !event.defaultPrevented;
    }
  }

  class Element extends EventTarget {
    constructor(tagName) {
      super();
      this.tagName = String(tagName).toUpperCase();
      this.id = "";
      this.className = "";
      this.dataset = {};
      this.style = {};
    }
    get [Symbol.toStringTag]() { return "HTMLElement"; }
    get classList() {
      const classNames = () => this.className.split(/\\s+/).filter(Boolean);
      const write = (names) => { this.className = [...new Set(names)].join(" "); };
      return {
        contains: (name) => classNames().includes(name),
        add: (...names) => write([...classNames(), ...names]),
        remove: (...names) => write(classNames().filter((name) => !names.includes(name))),
        toggle: (name) => {
          const isPresent = classNames().includes(name);
          write(isPresent ? classNames().filter((present) => present !== name) : [...classNames(), name]);
          return !isPresent;
        },
      };
    }
    get textContent() { return stateOf(this).text + stateOf(this).children.map((child) => child.textContent).join(""); }
    set textContent(text) {
      [...stateOf(this).children].forEach((child) => child.remove());
      stateOf(this).text = String(text);
    }
    get children() { return new HTMLCollection(stateOf(this).children); }
    get parentElement() { return stateOf(this).parent; }
    get firstElementChild() { return stateOf(this).children[0] ?? null; }
    get lastElementChild() { return stateOf(this).children.at(-1) ?? null; }
    get nextElementSibling() {
      const siblings = this.parentElement === null ? [] : stateOf(this.parentElement).children;
      return siblings[siblings.indexOf(this) + 1] ?? null;
    }
    appendChild(child) {
      child.remove();
      stateOf(child).parent = this;
      stateOf(this).children.push(child);
      return child;
    }
    append(...nodes) {
      for (const node of nodes) {
        if (node instanceof Element) this.appendChild(node);
        else stateOf(this).text += String(node);
      }
    }
    prepend(...nodes) {
      for (const node of [...nodes].reverse()) {
        if (node instanceof Element) {
          this.appendChild(node);
          stateOf(this).children.unshift(stateOf(this).children.pop());
        } else {
          stateOf(this).text = String(node) + stateOf(this).text;
        }
      }
    }
    remove() {
      if (this.parentElement === null) return;
      const siblings = stateOf(this.parentElement).children;
      siblings.splice(siblings.indexOf(this), 1);
      stateOf(this).parent = null;
    }
    removeChild(child) {
      if (child.parentElement !== this) {
        const error = new Error("The node to be removed is not a child of this node");
        error.name = "NotFoundError";
        throw error;
      }
      child.remove();
      return child;
    }
    setAttribute(name, value) {
      const attributeName = String(name).toLowerCase();
      if (attributeName === "id") this.id = String(value);
      else if (attributeName === "class") this.className = String(value);
      else if (attributeName.startsWith("data-")) this.dataset[datasetKey(attributeName)] = String(value);
      else stateOf(this).attributes.set(attributeName, String(value));
    }
    getAttribute(name) {
      const attributeName = String(name).toLowerCase();
      if (attributeName === "id") return this.id === "" ? null : this.id;
      if (attributeName === "class") return this.className === "" ? null : this.className;
      if (attributeName.startsWith("data-")) return this.dataset[datasetKey(attributeName)] ?? null;
      return stateOf(this).attributes.get(attributeName) ?? null;
    }
    querySelectorAll(selector) { return selectAll(descendantsOf(this), selector); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
    matches(selector) { return matchesParts(this, parseSelector(selector)); }
    closest(selector) {
      for (let element = this; element !== null; element = element.parentElement) {
        if (element.matches(selector)) return element;
      }
      return null;
    }
    click() { this.dispatchEvent(new Event("click", { bubbles: true, cancelable: true })); }
  }

  class Document extends EventTarget {
    constructor(body) {
      super();
      this.body = body;
    }
    get [Symbol.toStringTag]() { return "HTMLDocument"; }
    createElement(tagName) { return new Element(tagName); }
    getElementById(id) { return [this.body, ...descendantsOf(this.body)].find((element) => element.id === String(id)) ?? null; }
    querySelectorAll(selector) { return selectAll([this.body, ...descendantsOf(this.body)], selector); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  }

  const buildElement = (node) => {
    const element = new Element(node.tag);
    element.id = node.id ?? "";
    element.className = (node.classes ?? []).join(" ");
    stateOf(element).text = node.text ?? "";
    for (const child of node.children ?? []) element.appendChild(buildElement(child));
    return element;
  };
  const root = buildElement(JSON.parse(treeJson));
  const body = root.tagName === "BODY" ? root : new Element("body");
  if (body !== root) body.appendChild(root);
  const document = new Document(body);
  globalThis.document = document;
  globalThis.Event = Event;
}`;
