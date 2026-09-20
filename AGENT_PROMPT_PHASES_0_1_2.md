# Agent Task Prompt — Build "Alpha Bot" (Phases 0, 1, and 2)

Paste this entire document to your coding agent as one task. Do not summarize or
paraphrase it before sending — send it in full.

---

## 0. Project Identity

You are building a VS Code extension whose core feature is an autonomous browser
bot called **Alpha Bot**. Alpha Bot visibly opens a real browser window and types
security-test payloads into a locally running web application's forms, in real
time, to check whether common vulnerabilities are actually exploitable.

**Naming rule:** Every user-facing string, log message, class name, and command
must refer to the bot as "Alpha Bot" — not "the bot," not "the scanner," not any
other name. Examples:
- Extension command title: `Alpha Bot: Run Scan`
- Core class: `AlphaBot`
- Log prefix: `[Alpha Bot]`
- Output channel name: `Alpha Bot`

---

## 1. Operating Rules — apply these for the entire task, every step

These rules override any instinct to move fast or fill a gap with a guess. Follow
them exactly.

### Rule 1 — 81% Confidence Threshold
Before you take any action that involves a decision not fully specified below —
choosing between two valid approaches, interpreting an ambiguous instruction,
picking a library version, structuring a file, naming something not named here —
stop and privately estimate your own confidence that this is the correct action,
as a percentage.

- If your confidence is **80% or below**: STOP. Do not act. Do not guess. Do not
  fill the gap with an assumption "to keep moving." Report to me:
  (a) exactly what decision you're facing,
  (b) why you're not confident — what's ambiguous, missing, or conflicting,
  (c) the options you're weighing, if any.
  Wait for my answer before proceeding.
- If your confidence is **81% or above**: proceed, and briefly note in your
  documentation (see Rule 3) what you decided and why, so the reasoning is
  recorded, not just the outcome.
- This threshold applies to every step, not just big architectural choices —
  including small things like "what should this function be named" or "which
  Playwright API should I use here." When in doubt, check the official
  documentation for the tool in question before deciding; if the docs resolve
  the ambiguity, your confidence should rise accordingly.

### Rule 2 — No Skipped Steps, No Guessed Steps
Every task listed in Sections 3, 4, and 5 below must be completed, in the order
given. Do not skip a step because it seems minor. Do not merge two steps into
one because it seems more efficient. Do not invent a step that isn't listed
without flagging it first under Rule 1. If a listed step seems redundant or
wrong, say so and ask — do not silently skip it or silently "improve" it.

### Rule 3 — Always-On Documentation
You must maintain documentation continuously, not as a final step. Specifically:

- **`README.md`** — setup instructions, prerequisites, how to run the extension
  in the Extension Development Host. Update this the moment setup steps change.
- **`docs/ARCHITECTURE.md`** — a running technical description of every module:
  what it does, what it depends on, how it fits into the pipeline. Add a section
  for each new file you create. Update the relevant section immediately if you
  later change what a module does — never leave it describing old behavior.
- **`CHANGELOG.md`** — one dated entry per phase (and per significant change
  within a phase), describing what was added or changed.
- **Inline documentation** — every exported function/class gets a docstring-style
  comment explaining its purpose, parameters, and return value.

The rule is: **if code changes, the relevant documentation changes in the same
step.** Do not treat documentation as something to catch up on later. Before you
report a phase as complete, explicitly check that README, ARCHITECTURE, and
CHANGELOG all reflect the current state of the code — not the state from when
you started.

### Rule 4 — Sequential Completion, Explicit Reporting
Complete Phase 0 fully, then Phase 1 fully, then Phase 2 fully — in that order.
At the end of each phase, stop and report:
- What you built (files created/changed)
- How it satisfies that phase's "Done when" checklist below
- Any decisions you made under Rule 1 and your reasoning
- Confirmation that documentation (Rule 3) is up to date

Do not begin the next phase until I confirm the current one is accepted.

### Rule 5 — Safety Rule (non-negotiable, applies from Phase 1 onward)
Alpha Bot must refuse to target anything other than `localhost` or `127.0.0.1`.
This check must exist before any browser-launch or attack logic runs, not be
added afterward. There is no confidence threshold on this rule — it is not
optional and not subject to Rule 1 judgment calls.

---

## 2. Pre-Flight Checks — do these before writing any code

1. Confirm Node.js version is 18 or higher (`node -v`). If lower or missing,
   stop and report — do not attempt to work around it.
2. Confirm `npm`, `git`, and VS Code are available.
3. Confirm whether a project already exists in the current directory or if this
   is a fresh start. If there is existing code that conflicts with the scaffold
   in Phase 0, stop and ask how to proceed rather than overwriting anything.
4. Confirm you have a way to test against a locally running vulnerable app
   (e.g., OWASP Juice Shop). If none is running, tell me how to start one and
   wait for confirmation it's up before testing Phase 1/2 behavior against it.

Do not proceed past pre-flight until all four checks pass or are explicitly
resolved with me.

---

## 3. Phase 0 — Environment & Extension Scaffold

**Goal:** A blank, installable VS Code extension that runs, under the identity
"Alpha Bot."

**Tasks, in order:**
1. Scaffold a TypeScript VS Code extension (via `yo code` or manual setup —
   manual is fine if `yo code` is unavailable, but note which you used).
2. Set `package.json` `name`, `displayName` ("Alpha Bot"), and `description` to
   reflect the project identity in Section 0.
3. Register one command: `alphaBot.runScan`, with title `Alpha Bot: Run Scan`.
4. Configure esbuild (or the scaffold's default bundler) for bundling.
5. Set up `.vscode/launch.json` so pressing F5 opens an Extension Development
   Host.
6. Initialize git. Create `.gitignore` covering `node_modules/`, `out/`,
   `dist/`, `*.vsix`.
7. Create the initial `README.md`, `docs/ARCHITECTURE.md`, and `CHANGELOG.md`
   per Rule 3, even though there isn't much to document yet — establish the
   files now so every later phase edits them rather than creating them late.

**Files/modules:**
- `src/extension.ts` (activate/deactivate, registers `alphaBot.runScan`)
- `package.json`, `tsconfig.json`, `.vscode/launch.json`
- `README.md`, `docs/ARCHITECTURE.md`, `CHANGELOG.md`

**Done when:**
- Pressing F5 opens a working Extension Development Host.
- Running `Alpha Bot: Run Scan` from the Command Palette shows an info message
  (e.g., "Alpha Bot is ready.").
- `README.md` explains how to run it; `CHANGELOG.md` has a Phase 0 entry.

---

## 4. Phase 1 — Core Bot: Launch a Visible Browser (Safely)

**Goal:** Running the command opens a real, visible Chromium window navigated to
a local target URL — and refuses to run against anything that isn't localhost.

**Tasks, in order:**
1. Add Playwright as a project dependency. Run whatever one-time browser install
   step Playwright requires (document the exact command in `README.md`).
2. Create `src/bot/targetValidation.ts`, exporting a function that takes a URL
   string and returns whether it is valid. Valid means: the hostname is exactly
   `localhost` or `127.0.0.1` (and, if you support a configurable port, that the
   port is numeric). Anything else — including `0.0.0.0`, any other IP, any
   domain name — must be rejected. Write this function's logic explicitly and
   test it against at least: `http://localhost:3000` (valid),
   `http://127.0.0.1:8080` (valid), `http://example.com` (rejected), and
   `http://192.168.1.5:3000` (rejected). If you are below 81% confident about
   an edge case (e.g., IPv6 loopback `::1`), apply Rule 1 and ask rather than
   guessing which way to resolve it.
3. Add a way for the user to specify the target (a VS Code input box prompting
   for a URL when the command runs is sufficient for this phase; a settings.json
   entry is also acceptable — pick one, document which and why, under Rule 1 if
   you're unsure which fits better here).
4. Create `src/bot/launchBot.ts`, exporting a function that:
   - Calls the Phase 1 validation function first.
   - If invalid, aborts with a clear VS Code error message and does not launch
     any browser.
   - If valid, launches Chromium via Playwright with `headless: false`, and
     navigates to the target URL.
5. Wire `alphaBot.runScan` in `src/extension.ts` to prompt for the target and
   call `launchBot`.
6. Update `docs/ARCHITECTURE.md` with a section describing `targetValidation.ts`
   and `launchBot.ts` — what each does and why the validation step exists.
   Update `CHANGELOG.md` with a Phase 1 entry.

**Files/modules:**
- `src/bot/targetValidation.ts`
- `src/bot/launchBot.ts`
- Updated `src/extension.ts`

**Done when:**
- Running the command against a locally running test app (e.g., Juice Shop on
  `http://localhost:3000`) opens a visible Chromium window navigated to it.
- Running it against a non-localhost URL is refused, with a clear message, and
  no browser window opens.
- `docs/ARCHITECTURE.md` and `CHANGELOG.md` reflect this phase's work.

---

## 5. Phase 2 — Attack Payload Library & Form Interaction

**Goal:** Alpha Bot finds form fields on the current page and visibly types
payloads into them, one at a time, in view of the user.

**Tasks, in order:**
1. Create `src/bot/payloads.ts`. Define a `Payload` type with at least these
   fields: `id` (string), `category` (`"sqli" | "xss" | "authBypass"`), `value`
   (the actual payload string), `description` (human-readable, for later
   reporting/documentation). Populate it with a representative set for each
   category — at minimum 3 SQL injection payloads, 3 XSS payloads, and 2
   authentication-bypass payloads, covering well-known, widely-documented
   examples for each category. Do not invent exotic or obscure payloads; use
   standard, widely-known examples appropriate for testing against a
   deliberately vulnerable app like Juice Shop.
2. Create `src/bot/formInteraction.ts`, exporting a function that, given a
   Playwright `Page`, finds visible `input` and `textarea` elements and any
   enclosing `form` (or nearby submit button if there's no `<form>` tag) on the
   current page.
3. Implement typing using Playwright's typing API with a per-character delay
   (roughly 50–100ms) so it is visibly typed, not instantly pasted. If you are
   unsure what delay value looks best on screen, pick a reasonable default,
   note it in documentation, and flag it as something we can tune after seeing
   it run — this is a case where a reasonable default is fine without invoking
   Rule 1, since it's a cosmetic parameter, not a correctness decision.
4. Create `src/bot/runAttackSequence.ts` that orchestrates: for each discovered
   field, for each payload relevant to that field (you may apply all payload
   categories to all text fields at this phase — narrowing by field type is a
   later refinement, not required here), type the payload, submit the form (or
   click the associated button), and briefly wait for the page to respond
   before moving to the next payload. Log each attempt via the `[Alpha Bot]`
   output channel: which field, which payload, in what order.
5. Do not implement result verification yet (whether the payload "worked") —
   that is Phase 3, out of scope here. This phase only needs to visibly type
   and submit; simply log that each attempt was made.
6. Update `docs/ARCHITECTURE.md` with sections for `payloads.ts`,
   `formInteraction.ts`, and `runAttackSequence.ts`. Update `CHANGELOG.md` with
   a Phase 2 entry, including the exact payload list used (for the eventual
   project report's reproducibility).

**Files/modules:**
- `src/bot/payloads.ts`
- `src/bot/formInteraction.ts`
- `src/bot/runAttackSequence.ts`

**Done when:**
- Pointed at a known vulnerable form (e.g., Juice Shop's login page), Alpha Bot
  visibly types at least one payload into a field, character by character, and
  submits it, on screen, without crashing.
- The output channel shows a clear log of every field/payload combination
  attempted, in order.
- All three new files are documented in `docs/ARCHITECTURE.md`; `CHANGELOG.md`
  has a Phase 2 entry listing the payload set used.

---

## 6. Final Reminder

Re-read Section 1 (Operating Rules) before you start, and again before you
report each phase complete. The confidence threshold, the no-guessing rule, and
the documentation rule apply throughout — not just where explicitly repeated
above. If anything in this prompt conflicts with itself or with what you find
in the existing project, stop and ask rather than resolving it silently.
