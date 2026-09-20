// Alpha Bot — form field discovery.
//
// Given a Playwright Page, finds the visible text inputs / textareas the bot can
// type into, along with a way to submit each one (its enclosing <form>, or a
// nearby submit button when there is no <form>).

import type { Page, Locator } from "playwright";

/**
 * A form field Alpha Bot can interact with, plus how to submit it.
 */
export interface DiscoveredField {
  /** The input/textarea locator to type into. */
  locator: Locator;
  /** Best-effort human-readable label for logging (name/id/placeholder/type). */
  label: string;
  /**
   * How to submit after typing:
   * - `"enter"` — press Enter in the field (used when no button is found).
   * - a `Locator` — a submit button to click.
   */
  submit: "enter" | Locator;
}

/**
 * Input `type` values that hold typeable text. Non-text inputs (checkbox,
 * radio, file, submit, button, hidden, etc.) are skipped.
 */
const TYPEABLE_INPUT_TYPES = new Set([
  "text",
  "email",
  "password",
  "search",
  "url",
  "tel",
  "number",
  "" // inputs with no explicit type default to "text"
]);

/**
 * Builds a short, human-readable label for a field, for output-channel logs.
 *
 * @param handle - Attribute values read from the element.
 * @returns A label such as `email` / `#login-form-password` / `input[text]`.
 */
function buildLabel(handle: {
  name: string | null;
  id: string | null;
  placeholder: string | null;
  type: string | null;
  tag: string;
}): string {
  if (handle.name) return handle.name;
  if (handle.id) return `#${handle.id}`;
  if (handle.placeholder) return `"${handle.placeholder}"`;
  return `${handle.tag}[${handle.type ?? "text"}]`;
}

/**
 * Discovers the visible, typeable fields on the current page and how to submit
 * each one.
 *
 * For every visible `<textarea>` and every visible typeable `<input>`, resolves
 * a submit strategy: the nearest submit control inside the field's enclosing
 * `<form>`, else a page-level submit button, else pressing Enter.
 *
 * @param page - The Playwright page to inspect.
 * @returns The discovered fields, in DOM order.
 */
export async function discoverFields(page: Page): Promise<DiscoveredField[]> {
  const candidates = page.locator("input, textarea");
  const count = await candidates.count();

  const fields: DiscoveredField[] = [];

  for (let i = 0; i < count; i++) {
    const el = candidates.nth(i);

    // Only visible elements — hidden fields can't be "visibly typed into".
    if (!(await el.isVisible().catch(() => false))) {
      continue;
    }

    const tag = (await el.evaluate((n) => n.tagName.toLowerCase()).catch(() => "input")) as string;

    if (tag === "input") {
      const type = (await el.getAttribute("type"))?.toLowerCase() ?? "";
      if (!TYPEABLE_INPUT_TYPES.has(type)) {
        continue;
      }
    }

    const [name, id, placeholder, type] = await Promise.all([
      el.getAttribute("name"),
      el.getAttribute("id"),
      el.getAttribute("placeholder"),
      el.getAttribute("type")
    ]);

    const label = buildLabel({ name, id, placeholder, type, tag });
    const submit = await resolveSubmit(page, el);

    fields.push({ locator: el, label, submit });
  }

  return fields;
}

/**
 * Resolves how to submit a given field: prefer a submit control within the
 * field's enclosing `<form>`, then any page-level submit button, else Enter.
 *
 * @param page - The page being inspected.
 * @param field - The field locator.
 * @returns A submit strategy: `"enter"` or a button {@link Locator}.
 */
async function resolveSubmit(page: Page, field: Locator): Promise<"enter" | Locator> {
  // A submit control inside the field's own form.
  const inForm = field.locator(
    "xpath=ancestor::form[1]//button[@type='submit'] | " +
      "ancestor::form[1]//input[@type='submit'] | " +
      "ancestor::form[1]//button[not(@type)]"
  );
  if ((await inForm.count().catch(() => 0)) > 0) {
    return inForm.first();
  }

  // No enclosing form (or no submit inside it): try a page-level submit button.
  const pageButton = page.locator(
    "button[type='submit'], input[type='submit'], button:has-text('Log in'), " +
      "button:has-text('Login'), button:has-text('Submit')"
  );
  if ((await pageButton.count().catch(() => 0)) > 0) {
    return pageButton.first();
  }

  return "enter";
}
