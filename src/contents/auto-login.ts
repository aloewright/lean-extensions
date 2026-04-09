import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

interface LoginPreference {
  domain: string
  method: "social"
  provider: string
  selector: string
}

const SOCIAL_PROVIDERS = [
  { name: "Google", patterns: ["google", "goog"], textMatches: ["sign in with google", "continue with google", "log in with google"] },
  { name: "GitHub", patterns: ["github"], textMatches: ["sign in with github", "continue with github", "log in with github"] },
  { name: "Apple", patterns: ["apple"], textMatches: ["sign in with apple", "continue with apple", "log in with apple"] },
  { name: "Microsoft", patterns: ["microsoft", "azure"], textMatches: ["sign in with microsoft", "continue with microsoft"] },
  { name: "Facebook", patterns: ["facebook", "fb"], textMatches: ["sign in with facebook", "continue with facebook", "log in with facebook"] },
  { name: "Twitter", patterns: ["twitter", "x.com"], textMatches: ["sign in with twitter", "continue with twitter", "sign in with x"] },
  { name: "Discord", patterns: ["discord"], textMatches: ["sign in with discord", "continue with discord"] },
  { name: "SSO", patterns: ["sso", "saml", "okta", "auth0"], textMatches: ["single sign-on", "sign in with sso", "enterprise login"] },
]

function getHostname(): string {
  return window.location.hostname.replace(/^www\./, "")
}

// Detect if this page has a login form
function hasLoginForm(): boolean {
  const passwordFields = document.querySelectorAll('input[type="password"]')
  if (passwordFields.length > 0) return true
  const forms = document.querySelectorAll("form")
  for (const form of forms) {
    const action = form.getAttribute("action")?.toLowerCase() || ""
    if (action.includes("login") || action.includes("signin") || action.includes("auth")) return true
  }
  return false
}

// Find social login buttons on the page
function findSocialButtons(): { provider: string; element: HTMLElement; selector: string }[] {
  const results: { provider: string; element: HTMLElement; selector: string }[] = []
  const buttons = document.querySelectorAll('button, a[href], [role="button"], input[type="submit"]')

  for (const btn of buttons) {
    const el = btn as HTMLElement
    const text = (el.textContent || "").toLowerCase().trim()
    const href = (el as HTMLAnchorElement).href?.toLowerCase() || ""
    const ariaLabel = el.getAttribute("aria-label")?.toLowerCase() || ""
    const className = el.className?.toLowerCase() || ""
    const allText = `${text} ${href} ${ariaLabel} ${className}`

    for (const provider of SOCIAL_PROVIDERS) {
      const textMatch = provider.textMatches.some((t) => text.includes(t) || ariaLabel.includes(t))
      const patternMatch = provider.patterns.some((p) => allText.includes(p))
      if (textMatch || (patternMatch && (text.includes("sign") || text.includes("log") || text.includes("continue")))) {
        const selector = buildSelector(el)
        results.push({ provider: provider.name, element: el, selector })
        break
      }
    }
  }
  return results
}

function buildSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`
  if (el.getAttribute("data-testid")) return `[data-testid="${el.getAttribute("data-testid")}"]`
  const classes = el.className?.split?.(" ")?.filter((c) => c && !c.startsWith("hover") && !c.startsWith("focus"))?.slice(0, 3)?.join(".")
  if (classes) return `${el.tagName.toLowerCase()}.${classes}`
  return `${el.tagName.toLowerCase()}`
}

// Focus login fields to trigger password manager autofill
function triggerAutofill() {
  const usernameField = document.querySelector(
    'input[type="email"], input[type="text"][name*="user"], input[type="text"][name*="email"], input[type="text"][autocomplete="username"], input[autocomplete="email"]'
  ) as HTMLInputElement | null

  const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement | null

  if (usernameField) {
    usernameField.focus()
    usernameField.dispatchEvent(new Event("focus", { bubbles: true }))
    usernameField.click()
  }

  // Brief delay then focus password to trigger manager popup
  if (passwordField) {
    setTimeout(() => {
      passwordField.focus()
      passwordField.dispatchEvent(new Event("focus", { bubbles: true }))
      passwordField.click()
    }, 300)
  }

  // Watch for fields to get filled, then auto-submit
  if (passwordField) {
    watchForFill(passwordField)
  }
}

function watchForFill(passwordField: HTMLInputElement) {
  let checks = 0
  const interval = setInterval(() => {
    checks++
    if (checks > 30) { clearInterval(interval); return }
    if (passwordField.value.length > 0) {
      clearInterval(interval)
      // Small delay to let the password manager finish
      setTimeout(() => autoSubmit(passwordField), 500)
    }
  }, 500)
}

function autoSubmit(passwordField: HTMLInputElement) {
  // Find the form and submit it
  const form = passwordField.closest("form")
  if (form) {
    const submitBtn = form.querySelector(
      'button[type="submit"], input[type="submit"], button:not([type="button"])'
    ) as HTMLElement | null
    if (submitBtn) {
      submitBtn.click()
      return
    }
    form.submit()
  }
}

// Load and check saved preferences
async function checkSavedLogin() {
  const hostname = getHostname()

  try {
    const result = await chrome.storage.local.get("loginPreferences")
    const prefs: LoginPreference[] = result.loginPreferences || []
    const pref = prefs.find((p) => p.domain === hostname)

    if (pref && pref.method === "social") {
      // Wait a moment for the page to render
      await new Promise((r) => setTimeout(r, 1500))
      const btn = document.querySelector(pref.selector) as HTMLElement | null
      if (btn) {
        btn.click()
        return
      }
      // Fallback: search for the provider again
      const socials = findSocialButtons()
      const match = socials.find((s) => s.provider === pref.provider)
      if (match) {
        match.element.click()
        return
      }
    }
  } catch {}

  // No saved preference — trigger autofill if login form exists
  if (hasLoginForm()) {
    setTimeout(triggerAutofill, 800)
  }
}

// Listen for social login saves from popup/dashboard
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_LOGIN_INFO") {
    const hostname = getHostname()
    const hasForm = hasLoginForm()
    const socials = findSocialButtons().map((s) => ({ provider: s.provider, selector: s.selector }))
    sendResponse({ hostname, hasForm, socials })
  }

  if (message.type === "SAVE_SOCIAL_LOGIN") {
    // Save and immediately click
    const socials = findSocialButtons()
    const match = socials.find((s) => s.provider === message.provider)
    if (match) match.element.click()
    sendResponse({ ok: true })
  }
})

// Run on page load
checkSavedLogin()
