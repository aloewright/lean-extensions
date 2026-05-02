// Per-extension policy rules (PDX-89).
//
// Pure evaluator: given a list of policies, an extensionId, and a
// snapshot of the browser context (active tab + open tab urls), decide
// whether the extension should be enabled or disabled. Returning
// `null` means "no opinion" — callers fall through to existing
// behavior (default allow).

import type { ExtensionPolicy, PolicyCondition } from "./types"

export interface PolicyContext {
  // URL of the currently focused tab in the focused window. May be
  // undefined if there is no active tab (service worker startup).
  activeTabUrl?: string
  // URLs of every open tab across all windows. Used by tab-open
  // conditions like "only enable while a NotebookLM tab is open".
  openTabUrls: string[]
}

export type PolicyDecision = "enable" | "disable" | null

// Convert a hostname glob like "*.bank.com" into a RegExp anchored at
// both ends. `*` matches any character run; everything else is taken
// literally (escaped).
export function hostnameGlobToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
  const withWildcard = escaped.replace(/\*/g, ".*")
  return new RegExp(`^${withWildcard}$`, "i")
}

export function hostnameMatches(hostname: string, pattern: string): boolean {
  if (!hostname) return false
  return hostnameGlobToRegExp(pattern).test(hostname)
}

// Convert a Chrome-style url match pattern to a RegExp. Supports `*`
// in scheme, host, and path. The pattern syntax is intentionally a
// small subset — enough to express patterns like
// "*://*.notebooklm.google.com/*" without pulling in a dependency.
export function urlPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
  const withWildcard = escaped.replace(/\*/g, ".*")
  return new RegExp(`^${withWildcard}$`, "i")
}

export function urlMatches(url: string, pattern: string): boolean {
  if (!url) return false
  return urlPatternToRegExp(pattern).test(url)
}

function safeHostname(url?: string): string {
  if (!url) return ""
  try {
    return new URL(url).hostname
  } catch {
    return ""
  }
}

// Returns whether the given condition is currently satisfied by the
// supplied browser snapshot.
export function conditionMatches(
  condition: PolicyCondition,
  ctx: PolicyContext
): boolean {
  switch (condition.kind) {
    case "hostname-match":
      return hostnameMatches(safeHostname(ctx.activeTabUrl), condition.pattern)
    case "tab-open":
      return ctx.openTabUrls.some((u) => urlMatches(u, condition.urlPattern))
    default:
      return false
  }
}

// Decide what to do with a single policy given the current context.
//   - `disable` action: matched -> disable. Not matched -> no opinion.
//   - `enable-only` action: matched -> enable. Not matched -> disable.
function decideForPolicy(
  policy: ExtensionPolicy,
  ctx: PolicyContext
): PolicyDecision {
  const matched = conditionMatches(policy.condition, ctx)
  if (policy.action === "disable") {
    return matched ? "disable" : null
  }
  // enable-only
  return matched ? "enable" : "disable"
}

// Combine all policies for a given extension into a single decision.
// Precedence: any explicit `disable` wins (security-first); otherwise
// any `enable` wins; otherwise null (default allow).
export function evaluatePolicies(
  extensionId: string,
  policies: ExtensionPolicy[],
  ctx: PolicyContext
): PolicyDecision {
  const relevant = policies.filter((p) => p.extensionId === extensionId)
  if (relevant.length === 0) return null

  let sawEnable = false
  for (const policy of relevant) {
    const decision = decideForPolicy(policy, ctx)
    if (decision === "disable") return "disable"
    if (decision === "enable") sawEnable = true
  }
  return sawEnable ? "enable" : null
}

// Given a desired enabled-state for an extension, apply policies and
// return the final enabled-state. `null` from the evaluator means
// "honor the desired value" (default allow).
export function applyPoliciesToToggle(
  extensionId: string,
  desiredEnabled: boolean,
  policies: ExtensionPolicy[],
  ctx: PolicyContext
): boolean {
  const decision = evaluatePolicies(extensionId, policies, ctx)
  if (decision === "disable") return false
  if (decision === "enable") return true
  return desiredEnabled
}
