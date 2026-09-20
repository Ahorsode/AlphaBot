// Alpha Bot — attack sequence orchestration.
//
// For each discovered field, types each payload character-by-character (so it is
// visibly typed, not pasted), submits, and waits briefly for the page to react
// before moving on. Every attempt is logged to the `[Alpha Bot]` output channel.
//
// Phase 2 scope: visibly type + submit + log. It does NOT verify whether a
// payload "worked" — that is Phase 3.

import type { Page } from "playwright";
import { discoverFields, type DiscoveredField } from "./formInteraction";
import { PAYLOADS, type Payload } from "./payloads";

/**
 * Per-character typing delay, in milliseconds.
 *
 * Cosmetic value chosen so typing is visible on screen rather than instant.
 * Tunable after observing a run (per the prompt, this does not require Rule 1).
 */
const TYPING_DELAY_MS = 75;

/**
 * How long to wait for the page to react after submitting, in milliseconds.
 */
const POST_SUBMIT_WAIT_MS = 800;

/**
 * A minimal logger interface so this module does not depend on VS Code directly
 * and stays unit-testable. `extension.ts` passes its `log` helper.
 */
export type LogFn = (message: string) => void;

/**
 * Runs the full attack sequence against the current page.
 *
 * Discovers visible fields, then for each field iterates over every payload:
 * clears the field, types the payload one character at a time, submits (clicks
 * the resolved button or presses Enter), waits briefly, and logs the attempt.
 *
 * All payload categories are applied to all text fields at this phase; narrowing
 * by field type is a later refinement.
 *
 * @param page - The Playwright page to operate on (from `launchBot`).
 * @param log - Logger used for `[Alpha Bot]` output-channel lines.
 * @param payloads - Payloads to use; defaults to the full library.
 * @returns The number of field/payload attempts made.
 */
export async function runAttackSequence(
  page: Page,
  log: LogFn,
  payloads: readonly Payload[] = PAYLOADS
): Promise<number> {
  log("Starting attack sequence: discovering form fields...");

  const fields = await discoverFields(page);
  if (fields.length === 0) {
    log("No visible input or textarea fields found on the page. Nothing to do.");
    return 0;
  }

  log(
    `Discovered ${fields.length} field(s): ${fields.map((f) => f.label).join(", ")}.`
  );
  log(`Will attempt ${payloads.length} payload(s) per field.`);

  let attempt = 0;

  for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex++) {
    const field = fields[fieldIndex];
    log(`--- Field ${fieldIndex + 1}/${fields.length}: ${field.label} ---`);

    for (let payloadIndex = 0; payloadIndex < payloads.length; payloadIndex++) {
      const payload = payloads[payloadIndex];
      attempt++;

      log(
        `Attempt #${attempt} | field="${field.label}" | ` +
          `payload=${payload.id} [${payload.category}] "${payload.value}"`
      );

      try {
        await typeAndSubmit(page, field, payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log(`  ! Attempt #${attempt} error (continuing): ${message}`);
      }
    }
  }

  log(`Attack sequence complete. ${attempt} attempt(s) made across ${fields.length} field(s).`);
  return attempt;
}

/**
 * Types a single payload into a field, character-by-character, then submits and
 * waits briefly for the page to respond.
 *
 * @param page - The page being operated on.
 * @param field - The discovered field (locator + submit strategy).
 * @param payload - The payload to type.
 */
async function typeAndSubmit(page: Page, field: DiscoveredField, payload: Payload): Promise<void> {
  // Focus and clear any prior value so each payload is typed cleanly.
  await field.locator.scrollIntoViewIfNeeded().catch(() => undefined);
  await field.locator.click();
  await field.locator.fill("");

  // pressSequentially types one character at a time with a delay, so the user
  // can watch it being typed rather than pasted instantly.
  await field.locator.pressSequentially(payload.value, { delay: TYPING_DELAY_MS });

  if (field.submit === "enter") {
    await field.locator.press("Enter");
  } else {
    await field.submit.click().catch(async () => {
      // If the button click fails (e.g. detached after navigation), fall back
      // to pressing Enter in the field.
      await field.locator.press("Enter").catch(() => undefined);
    });
  }

  // Give the page a moment to react before the next payload.
  await page.waitForTimeout(POST_SUBMIT_WAIT_MS);
}
