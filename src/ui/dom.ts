type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | undefined | null>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Array<Child | Child[]>): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === "class") el.className = String(v);
    else if (k === "style") el.setAttribute("style", String(v));
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  add(el, ...children);
  return el;
}

export function add(el: Element, ...children: Array<Child | Child[]>) {
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
}

export function clear(el: Element) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function fmt(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function bar(value: number, max: number, cls = ""): HTMLElement {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return h("div", { class: `bar ${cls}` }, h("div", { class: "bar-fill", style: `width:${pct}%` }));
}

export interface ModalHandle {
  close(): void;
  body: HTMLElement;
}

export function modal(title: string, content: Node | Node[], opts: { wide?: boolean; closable?: boolean; onClose?: () => void } = {}): ModalHandle {
  const closable = opts.closable ?? true;
  const body = h("div", { class: "modal-body" }, ...(Array.isArray(content) ? content : [content]));
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    opts.onClose?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && closable) close();
  };
  const overlay = h(
    "div",
    { class: "overlay" },
    h(
      "div",
      { class: `modal ${opts.wide ? "wide" : ""}` },
      h("div", { class: "modal-head" }, h("span", {}, title), closable ? h("button", { class: "icon-btn", onclick: close, title: "Close" }, "✕") : null),
      body,
    ),
  );
  document.body.append(overlay);
  document.addEventListener("keydown", onKey);
  return { close, body };
}

export function toast(text: string, kind: "info" | "bad" = "info") {
  let host = document.querySelector(".toasts");
  if (!host) {
    host = h("div", { class: "toasts" });
    document.body.append(host);
  }
  const t = h("div", { class: `toast ${kind}` }, text);
  host.append(t);
  setTimeout(() => t.classList.add("fade"), 2200);
  setTimeout(() => t.remove(), 2800);
}
