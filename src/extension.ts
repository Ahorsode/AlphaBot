// Alpha Bot — VS Code extension entry point.
//
// Registers the `alphaBot.runScan` command and owns the shared "Alpha Bot"
// output channel used for all `[Alpha Bot]` log messages across the extension.
//
// Phase 0 scope: activation, command registration, and a readiness message.
// Later phases wire `alphaBot.runScan` to target validation, browser launch,
// and the attack sequence.

import * as vscode from "vscode";
import { launchBot } from "./bot/launchBot";
import { runAttackSequence } from "./bot/runAttackSequence";

/**
 * The shared output channel for Alpha Bot. All bot activity is logged here so
 * the user can follow along in real time. Created lazily on activation.
 */
let outputChannel: vscode.OutputChannel | undefined;

/**
 * Returns the shared "Alpha Bot" output channel, creating it on first use.
 *
 * @returns The extension's dedicated {@link vscode.OutputChannel}.
 */
export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel("Alpha Bot");
  }
  return outputChannel;
}

/**
 * Writes a line to the Alpha Bot output channel, prefixed with `[Alpha Bot]`.
 *
 * @param message - The message to log.
 */
export function log(message: string): void {
  getOutputChannel().appendLine(`[Alpha Bot] ${message}`);
}

/**
 * Extension activation hook. Called by VS Code the first time one of the
 * extension's contributed commands is invoked.
 *
 * Registers `alphaBot.runScan` and stores its disposable on the extension
 * context so it is cleaned up automatically on deactivation.
 *
 * @param context - The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext): void {
  log("Alpha Bot activated.");

  const runScan = vscode.commands.registerCommand("alphaBot.runScan", async () => {
    log("Alpha Bot: Run Scan invoked.");

    const target = await vscode.window.showInputBox({
      title: "Alpha Bot: Run Scan",
      prompt: "Enter the local target URL to scan (localhost or 127.0.0.1 only).",
      placeHolder: "http://localhost:3000",
      value: "http://localhost:3000",
      ignoreFocusOut: true
    });

    if (target === undefined) {
      log("Scan cancelled: no target entered.");
      return;
    }

    getOutputChannel().show(true);

    const session = await launchBot(target);
    if (!session) {
      // launchBot already surfaced an error message and logged the reason.
      return;
    }

    vscode.window.showInformationMessage(
      `Alpha Bot opened ${session.targetUrl}. Typing payloads into forms...`
    );

    try {
      const attempts = await runAttackSequence(session.page, log);
      vscode.window.showInformationMessage(
        `Alpha Bot finished: ${attempts} payload attempt(s) made. See the Alpha Bot output channel.`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`Attack sequence failed: ${message}`);
      vscode.window.showErrorMessage(`Alpha Bot: attack sequence failed — ${message}`);
    }
  });

  context.subscriptions.push(runScan);
}

/**
 * Extension deactivation hook. Called by VS Code when the extension is being
 * shut down. Disposes the output channel if it was created.
 */
export function deactivate(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}
