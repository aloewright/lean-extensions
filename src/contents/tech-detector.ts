import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

interface TechDetection {
  name: string
  category: string
  version?: string
  confidence: "high" | "medium" | "low"
}

function detectTechnologies(): TechDetection[] {
  const techs: TechDetection[] = []
  const w = window as any
  const html = document.documentElement.outerHTML

  // Frameworks
  if (w.__NEXT_DATA__ || document.querySelector("#__next")) {
    const ver = w.__NEXT_DATA__?.buildId ? undefined : undefined
    techs.push({ name: "Next.js", category: "Framework", confidence: "high" })
  }
  if (w.__NUXT__ || w.__nuxt__) {
    techs.push({ name: "Nuxt.js", category: "Framework", confidence: "high" })
  }
  if (w.Remix || document.querySelector('[data-remix-run]')) {
    techs.push({ name: "Remix", category: "Framework", confidence: "high" })
  }
  if (w.__GATSBY) {
    techs.push({ name: "Gatsby", category: "Framework", confidence: "high" })
  }
  if (w.Astro || document.querySelector('[data-astro-cid]') || document.querySelector('astro-island')) {
    techs.push({ name: "Astro", category: "Framework", confidence: "high" })
  }
  if (document.querySelector('[data-sveltekit]') || document.querySelector('[data-svelte]')) {
    techs.push({ name: "SvelteKit", category: "Framework", confidence: "high" })
  }

  // UI Libraries
  if (w.React || w.__REACT_DEVTOOLS_GLOBAL_HOOK__ || document.querySelector("[data-reactroot]") || document.querySelector("[data-reactid]")) {
    techs.push({ name: "React", category: "UI Library", confidence: "high" })
  }
  if (w.Vue || document.querySelector("[data-v-]") || document.querySelector("[v-cloak]")) {
    techs.push({ name: "Vue.js", category: "UI Library", confidence: "high" })
  }
  if (w.angular || document.querySelector("[ng-version]") || document.querySelector("[_nghost-]")) {
    const ver = document.querySelector("[ng-version]")?.getAttribute("ng-version")
    techs.push({ name: "Angular", category: "UI Library", version: ver || undefined, confidence: "high" })
  }
  if (w.Svelte || document.querySelector(".svelte-")) {
    techs.push({ name: "Svelte", category: "UI Library", confidence: "medium" })
  }
  if (w.htmx) {
    techs.push({ name: "htmx", category: "UI Library", confidence: "high" })
  }
  if (w.Alpine) {
    techs.push({ name: "Alpine.js", category: "UI Library", confidence: "high" })
  }

  // CSS
  if (document.querySelector('link[href*="tailwind"]') || html.includes("tailwindcss") || checkTailwindClasses()) {
    techs.push({ name: "Tailwind CSS", category: "CSS", confidence: "medium" })
  }
  if (document.querySelector('link[href*="bootstrap"]') || w.bootstrap) {
    techs.push({ name: "Bootstrap", category: "CSS", confidence: "high" })
  }
  if (document.querySelector('[class*="chakra-"]')) {
    techs.push({ name: "Chakra UI", category: "CSS", confidence: "high" })
  }
  if (document.querySelector('[class*="MuiBox"]') || document.querySelector('[class*="css-"][class*="MuiButton"]')) {
    techs.push({ name: "Material UI", category: "CSS", confidence: "high" })
  }

  // State Management
  if (w.__REDUX_DEVTOOLS_EXTENSION__ || w.__REDUX_STORE__) {
    techs.push({ name: "Redux", category: "State", confidence: "medium" })
  }

  // Analytics & Services
  if (w.gtag || w.ga || w.google_tag_manager) {
    techs.push({ name: "Google Analytics", category: "Analytics", confidence: "high" })
  }
  if (w.mixpanel) {
    techs.push({ name: "Mixpanel", category: "Analytics", confidence: "high" })
  }
  if (w.Sentry) {
    techs.push({ name: "Sentry", category: "Monitoring", confidence: "high" })
  }
  if (w.amplitude) {
    techs.push({ name: "Amplitude", category: "Analytics", confidence: "high" })
  }
  if (w.Intercom) {
    techs.push({ name: "Intercom", category: "Support", confidence: "high" })
  }
  if (document.querySelector('[data-nextjs-scroll-focus-boundary]')) {
    techs.push({ name: "Next.js App Router", category: "Framework", confidence: "high" })
  }

  // Hosting / CDN
  if (document.querySelector('meta[name="generator"][content*="WordPress"]') || w.wp) {
    techs.push({ name: "WordPress", category: "CMS", confidence: "high" })
  }
  if (document.querySelector('meta[name="generator"][content*="Shopify"]') || w.Shopify) {
    techs.push({ name: "Shopify", category: "Platform", confidence: "high" })
  }
  if (document.querySelector('meta[name="generator"][content*="Webflow"]')) {
    techs.push({ name: "Webflow", category: "Platform", confidence: "high" })
  }
  if (document.querySelector('meta[name="generator"][content*="Squarespace"]')) {
    techs.push({ name: "Squarespace", category: "Platform", confidence: "high" })
  }
  if (document.querySelector('meta[name="generator"][content*="Wix"]') || w.wixBiSession) {
    techs.push({ name: "Wix", category: "Platform", confidence: "high" })
  }

  // JavaScript Libraries
  if (w.jQuery || w.$?.fn?.jquery) {
    const ver = w.jQuery?.fn?.jquery || w.$?.fn?.jquery
    techs.push({ name: "jQuery", category: "Library", version: ver, confidence: "high" })
  }
  if (w.gsap || w.TweenMax) {
    techs.push({ name: "GSAP", category: "Animation", confidence: "high" })
  }
  if (w.THREE) {
    techs.push({ name: "Three.js", category: "3D", confidence: "high" })
  }
  if (w.d3) {
    techs.push({ name: "D3.js", category: "Visualization", confidence: "high" })
  }

  // Server hints
  const poweredBy = document.querySelector('meta[name="x-powered-by"]')?.getAttribute("content")
  if (poweredBy) {
    techs.push({ name: poweredBy, category: "Server", confidence: "medium" })
  }

  return techs
}

function checkTailwindClasses(): boolean {
  const sample = document.querySelectorAll("[class]")
  let twCount = 0
  const twPattern = /\b(flex|grid|p-\d|m-\d|text-(sm|lg|xl)|bg-|rounded|border|shadow|w-|h-)\b/
  for (let i = 0; i < Math.min(sample.length, 50); i++) {
    if (twPattern.test(sample[i].className)) twCount++
  }
  return twCount > 10
}

// Run detection and send to background
const techs = detectTechnologies()
if (techs.length > 0) {
  chrome.runtime.sendMessage({
    type: "TECH_DETECTED",
    techs,
    url: window.location.href,
    hostname: window.location.hostname
  })
}

// Listen for requests from popup/dashboard
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_TECH") {
    sendResponse({ techs: detectTechnologies() })
  }
})
