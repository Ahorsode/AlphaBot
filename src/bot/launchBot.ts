// Alpha Bot — browser launch.
//
// Launches a real, visible Chromium window (via Playwright) navigated to a
// validated localhost target. The Rule 5 safety guard (targetValidation) runs
// first: if the target is not permitted, NO browser is launched.

import * as vscode from "vscode";
import { chromium, type Browser, type Page } from "playwright";
import { validateTarget } from "./targetValidation";
import { log } from "../extension";

/**
 * The live browser session produced by a successful launch. Returned so that
 * later phases (form interaction, attack sequence) can drive the same page.
 */
export interface BotSession {
  /** The Playwright Browser instance. Caller is responsible for closing it. */
  browser: Browser;
  /** The active page navigated to the validated target. */
  page: Page;
  /** The normalized target URL that was navigated to. */
  targetUrl: string;
}

/**
 * Validates the target and, if permitted, launches a visible Chromium window
 * navigated to it.
 *
 * The validation step (Rule 5) always runs first. On rejection this shows a
 * VS Code error message, logs the reason, and returns `undefined` WITHOUT
 * launching any browser.
 *
 * @param rawUrl - The candidate target URL supplied by the user.
 * @returns A {@link BotSession} on success, or `undefined` if the target was
 *          rejected or the browser failed to launch/navigate.
 */
export async function launchBot(rawUrl: string): Promise<BotSession | undefined> {
  // --- Safety guard (Rule 5): validate BEFORE any browser work. ---
  const result = validateTarget(rawUrl);
  if (!result.valid || !result.normalizedUrl) {
    log(`Target rejected: ${result.reason}`);
    vscode.window.showErrorMessage(`Alpha Bot: ${result.reason}`);
    return undefined;
  }

  const targetUrl = result.normalizedUrl;
  log(`Target accepted: ${targetUrl}`);

  let browser: Browser | undefined;
  try {
    log("Launching visible Chromium window...");
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    log(`Navigating to ${targetUrl} ...`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    log(`Navigation complete: ${targetUrl}`);

    return { browser, page, targetUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`Browser launch/navigation failed: ${message}`);
    vscode.window.showErrorMessage(`Alpha Bot: failed to launch browser — ${message}`);
    // Clean up a partially-launched browser so we don't leak a process.
    await browser?.close().catch(() => undefined);
    return undefined;
  }
}
