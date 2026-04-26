import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { buildSelector, findSocialButtons, getHostname, hasLoginForm } from "../src/contents/auto-login"

// ---------------------------------------------------------------------------
// Helper: inject and clean up DOM content for each test
// ---------------------------------------------------------------------------
function setHTML(html: string) {
  document.body.innerHTML = html
}

afterEach(() => {
  document.body.innerHTML = ""
})

// ---------------------------------------------------------------------------
// getHostname
// ---------------------------------------------------------------------------
describe("getHostname", () => {
  it("strips the leading 'www.' prefix", () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "www.example.com", href: "https://www.example.com/" },
      configurable: true,
      writable: true,
    })
    expect(getHostname()).toBe("example.com")
  })

  it("leaves non-www hostnames unchanged", () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "example.com", href: "https://example.com/" },
      configurable: true,
      writable: true,
    })
    expect(getHostname()).toBe("example.com")
  })

  it("only strips the leading 'www.' and not internal occurrences", () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "sub.www.example.com", href: "https://sub.www.example.com/" },
      configurable: true,
      writable: true,
    })
    // Only replaces /^www\./ so interior 'www.' is preserved
    expect(getHostname()).toBe("sub.www.example.com")
  })

  it("handles subdomains without www. correctly", () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "app.github.com", href: "https://app.github.com/" },
      configurable: true,
      writable: true,
    })
    expect(getHostname()).toBe("app.github.com")
  })
})

// ---------------------------------------------------------------------------
// buildSelector
// ---------------------------------------------------------------------------
describe("buildSelector", () => {
  it("returns '#<id>' for an element with an id attribute", () => {
    setHTML('<button id="google-signin">Sign in with Google</button>')
    const el = document.getElementById("google-signin") as HTMLElement
    expect(buildSelector(el)).toBe("#google-signin")
  })

  it("returns '[data-testid=\"...\"]' when the element has a data-testid", () => {
    setHTML('<button data-testid="social-login-btn">Sign in</button>')
    const el = document.querySelector("[data-testid]") as HTMLElement
    expect(buildSelector(el)).toBe('[data-testid="social-login-btn"]')
  })

  it("id takes precedence over data-testid", () => {
    setHTML('<button id="my-id" data-testid="my-testid">Sign in</button>')
    const el = document.getElementById("my-id") as HTMLElement
    expect(buildSelector(el)).toBe("#my-id")
  })

  it("returns 'tagname.class1.class2' when classes are present (no id/testid)", () => {
    setHTML('<button class="btn primary-btn">Sign in</button>')
    const el = document.querySelector("button") as HTMLElement
    const selector = buildSelector(el)
    expect(selector).toBe("button.btn.primary-btn")
  })

  it("filters out classes starting with 'hover'", () => {
    setHTML('<button class="btn hover:bg-blue focus:outline-none">Sign in</button>')
    const el = document.querySelector("button") as HTMLElement
    const selector = buildSelector(el)
    expect(selector).not.toContain("hover")
    expect(selector).not.toContain("focus")
    expect(selector).toContain("btn")
  })

  it("falls back to just the tag name when there is no id, testid, or classes", () => {
    setHTML("<button>Sign in</button>")
    const el = document.querySelector("button") as HTMLElement
    expect(buildSelector(el)).toBe("button")
  })

  it("uses at most 3 class tokens", () => {
    setHTML('<div class="a b c d e">content</div>')
    const el = document.querySelector("div") as HTMLElement
    const selector = buildSelector(el)
    // Should only use first 3 classes
    expect(selector).toBe("div.a.b.c")
  })
})

// ---------------------------------------------------------------------------
// hasLoginForm
// ---------------------------------------------------------------------------
describe("hasLoginForm", () => {
  beforeEach(() => {
    // Reset window.location to a neutral URL before each test
    Object.defineProperty(window, "location", {
      value: { hostname: "example.com", href: "https://example.com/page" },
      configurable: true,
      writable: true,
    })
    Object.defineProperty(document, "title", {
      value: "Example Page",
      configurable: true,
      writable: true,
    })
  })

  it("returns true when there is a password input field", () => {
    setHTML('<form><input type="password" /></form>')
    expect(hasLoginForm()).toBe(true)
  })

  it("returns true when there is an email input inside a form", () => {
    setHTML('<form><input type="email" placeholder="Email" /></form>')
    expect(hasLoginForm()).toBe(true)
  })

  it("returns true when there is a username autocomplete input inside a form", () => {
    setHTML('<form><input type="text" autocomplete="username" /></form>')
    expect(hasLoginForm()).toBe(true)
  })

  it("returns true when a form action contains 'login'", () => {
    setHTML('<form action="/login"><input type="text" /></form>')
    expect(hasLoginForm()).toBe(true)
  })

  it("returns true when a form id contains 'signin'", () => {
    setHTML('<form id="signinForm"><input type="text" /></form>')
    expect(hasLoginForm()).toBe(true)
  })

  it("returns true when a form className contains 'auth'", () => {
    setHTML('<form class="auth-form"><input type="text" /></form>')
    expect(hasLoginForm()).toBe(true)
  })

  it("returns true when the URL path contains /login", () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "example.com", href: "https://example.com/login" },
      configurable: true,
      writable: true,
    })
    setHTML("<div></div>")
    expect(hasLoginForm()).toBe(true)
  })

  it("returns true when the URL path contains /signin", () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "example.com", href: "https://example.com/signin" },
      configurable: true,
      writable: true,
    })
    setHTML("<div></div>")
    expect(hasLoginForm()).toBe(true)
  })

  it("returns true when the page title contains 'Log In'", () => {
    Object.defineProperty(document, "title", {
      value: "Log In to MyApp",
      configurable: true,
      writable: true,
    })
    setHTML("<div></div>")
    expect(hasLoginForm()).toBe(true)
  })

  it("returns true when the page title contains 'Sign In'", () => {
    Object.defineProperty(document, "title", {
      value: "Sign In — MyService",
      configurable: true,
      writable: true,
    })
    setHTML("<div></div>")
    expect(hasLoginForm()).toBe(true)
  })

  it("returns false for a plain page with no login indicators", () => {
    setHTML("<div><p>Hello world</p></div>")
    expect(hasLoginForm()).toBe(false)
  })

  it("returns false when an email field exists but is NOT inside a form", () => {
    // Email input present, but not inside a <form> element → should NOT trigger
    setHTML('<div><input type="email" placeholder="Newsletter" /></div>')
    expect(hasLoginForm()).toBe(false)
  })

  it("returns false for a search form that contains no login keywords", () => {
    setHTML('<form action="/search"><input type="text" name="q" /></form>')
    expect(hasLoginForm()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// findSocialButtons
// ---------------------------------------------------------------------------
describe("findSocialButtons", () => {
  it("detects a Google sign-in button by text content", () => {
    setHTML('<button>Sign in with Google</button>')
    const results = findSocialButtons()
    expect(results.some((r) => r.provider === "Google")).toBe(true)
  })

  it("detects a GitHub sign-in button by text content", () => {
    setHTML('<button>Sign in with GitHub</button>')
    const results = findSocialButtons()
    expect(results.some((r) => r.provider === "GitHub")).toBe(true)
  })

  it("detects an Apple sign-in button by text content", () => {
    setHTML('<button>Continue with Apple</button>')
    const results = findSocialButtons()
    expect(results.some((r) => r.provider === "Apple")).toBe(true)
  })

  it("detects a Microsoft sign-in button by text content", () => {
    setHTML('<button>Sign in with Microsoft</button>')
    const results = findSocialButtons()
    expect(results.some((r) => r.provider === "Microsoft")).toBe(true)
  })

  it("detects a Discord sign-in button by aria-label", () => {
    setHTML('<button aria-label="Sign in with Discord">discord icon</button>')
    const results = findSocialButtons()
    expect(results.some((r) => r.provider === "Discord")).toBe(true)
  })

  it("returns an empty array when there are no social buttons", () => {
    setHTML('<button>Submit form</button><button>Cancel</button>')
    const results = findSocialButtons()
    expect(results).toHaveLength(0)
  })

  it("returns a selector for each detected button", () => {
    setHTML('<button id="gh-btn">Continue with GitHub</button>')
    const results = findSocialButtons()
    const gh = results.find((r) => r.provider === "GitHub")
    expect(gh).toBeDefined()
    expect(gh!.selector).toBe("#gh-btn")
  })

  it("returns both provider and element reference", () => {
    setHTML('<button>Sign in with Google</button>')
    const results = findSocialButtons()
    expect(results[0].element).toBeInstanceOf(HTMLElement)
    expect(results[0].provider).toBe("Google")
  })

  it("does not duplicate providers when the same button matches multiple patterns", () => {
    // A button whose text matches Google exactly should appear only once
    setHTML('<button class="google-btn">Sign in with Google</button>')
    const results = findSocialButtons()
    const googleResults = results.filter((r) => r.provider === "Google")
    expect(googleResults).toHaveLength(1)
  })
})