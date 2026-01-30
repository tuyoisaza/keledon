import type { Selector } from "../../background/protocol";

export function resolveSelector(sel: Selector): Element | null {
  if (sel.kind === "css") return document.querySelector(sel.value);
  if (sel.kind === "aria") {
    // muy básico: busca por role + name; luego se mejora
    const candidates = Array.from(document.querySelectorAll(`[role="${sel.role}"]`));
    return candidates.find((el) => (el as HTMLElement).innerText?.trim() === sel.name || el.getAttribute("aria-label") === sel.name) || null;
  }
  return null;
}

export async function click(sel: Selector) {
  const el = resolveSelector(sel) as HTMLElement | null;
  if (!el) throw new Error("element_not_found");
  el.click();
}

export async function fill(sel: Selector, value: string) {
  const el = resolveSelector(sel) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) throw new Error("element_not_found");
  el.focus();
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}
