// Alpha Bot — target URL validation.
//
// Safety-critical (Operating Rule 5): Alpha Bot must refuse to target anything
// other than localhost / 127.0.0.1. This guard runs BEFORE any browser-launch
// or attack logic. There is no confidence threshold on this rule.

/**
 * The only hostnames Alpha Bot is permitted to target.
 *
 * Decision (Rule 1, confirmed): the IPv6 loopback `::1` is intentionally NOT
 * included. Only the literal hostnames `localhost` and `127.0.0.1` are allowed.
 */
const ALLOWED_HOSTNAMES: ReadonlySet<string> = new Set(["localhost", "127.0.0.1"]);

/**
 * The result of validating a candidate target URL.
 */
export interface TargetValidationResult {
  /** Whether the URL is a permitted Alpha Bot target. */
  valid: boolean;
  /** Human-readable reason, suitable for showing to the user. */
  reason: string;
  /** The parsed, normalized URL when valid; otherwise undefined. */
  normalizedUrl?: string;
}

/**
 * Validates whether a URL is a permitted Alpha Bot target.
 *
 * A URL is valid only when ALL of the following hold:
 *  - it parses as a URL with an `http:` or `https:` scheme;
 *  - its hostname is EXACTLY `localhost` or `127.0.0.1`;
 *  - if a port is present, it is numeric and in the valid range (1-65535).
 *
 * Everything else is rejected, including `0.0.0.0`, the IPv6 loopback `::1`,
 * any other IP address, and any domain name.
 *
 * @param rawUrl - The candidate target URL string.
 * @returns A {@link TargetValidationResult} describing validity and the reason.
 */
export function validateTarget(rawUrl: string): TargetValidationResult {
  const trimmed = (rawUrl ?? "").trim();

  if (trimmed.length === 0) {
    return { valid: false, reason: "No URL was provided." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      reason: `"${trimmed}" is not a valid URL. Include a scheme, e.g. http://localhost:3000.`
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      valid: false,
      reason: `Unsupported scheme "${parsed.protocol}". Only http and https are allowed.`
    };
  }

  // URL normalizes the hostname to lower case. For IPv6 the hostname is wrapped
  // in brackets in the original string but `parsed.hostname` strips them, so
  // `::1` would appear here as "[::1]" — which is not in the allow-list anyway.
  const hostname = parsed.hostname;

  if (!ALLOWED_HOSTNAMES.has(hostname)) {
    return {
      valid: false,
      reason:
        `Alpha Bot refuses to target "${hostname}". ` +
        `Only localhost and 127.0.0.1 are permitted.`
    };
  }

  // `parsed.port` is "" when no explicit port is given (that's allowed). When
  // present, the URL parser guarantees it is a numeric string in 0-65535, but
  // we re-check explicitly to keep the rule self-contained and auditable.
  if (parsed.port !== "") {
    const port = Number(parsed.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return {
        valid: false,
        reason: `Invalid port "${parsed.port}". Ports must be numeric (1-65535).`
      };
    }
  }

  return {
    valid: true,
    reason: `Target ${parsed.href} is a permitted localhost target.`,
    normalizedUrl: parsed.href
  };
}
