import { getLinks, getSettings, setLinks, setSettings, touchExtension } from "./storage"
import type { CollectedLink } from "./types"

// In-memory cache for tech detections per hostname
const cachedTech = new Map<string, { techs: any[]; url: string; timestamp: number }>()

// Badge: show enabled extension count
async function updateBadge() {
  const all = await chrome.management.getAll()
  const count = all.filter(
    (e) => e.type === "extension" && e.id !== chrome.runtime.id && e.enabled
  ).length
  chrome.action.setBadgeText({ text: String(count) })
  chrome.action.setBadgeBackgroundColor({ color: "#505055" })
  chrome.action.setBadgeTextColor({ color: "#f1f1f1" })
}

updateBadge()

// Context menu: right-click to save links
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-link",
    title: "Save link to Lean Extensions",
    contexts: ["link"]
  })
  chrome.contextMenus.create({
    id: "save-page",
    title: "Save page to Lean Extensions",
    contexts: ["page"]
  })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-link" && info.linkUrl) {
    await saveLink(info.linkUrl, info.linkUrl)
  }
  if (info.menuItemId === "save-page" && tab?.url && tab?.title) {
    await saveLink(tab.url, tab.title)
  }
})

chrome.management.onEnabled.addListener((info) => { updateBadge(); touchExtension(info.id) })
chrome.management.onDisabled.addListener((info) => { updateBadge(); touchExtension(info.id) })
chrome.management.onInstalled.addListener((info) => { updateBadge(); touchExtension(info.id) })
chrome.management.onUninstalled.addListener(updateBadge)

// Handle messages from popup and dashboard
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CAPTURE_PDF") {
    capturePdf(message.tabId)
    sendResponse({ ok: true })
  }

  if (message.type === "SAVE_LINK") {
    saveLink(message.url, message.title).then(() => sendResponse({ ok: true }))
    return true
  }

  if (message.type === "SEND_TO_NOTEBOOK") {
    sendToNotebook(message.links).then(() => sendResponse({ ok: true }))
    return true
  }

  if (message.type === "SWITCH_PROFILE") {
    switchProfile(message.extensionIds, message.alwaysEnabled).then(() =>
      sendResponse({ ok: true })
    )
    return true
  }

  if (message.type === "TECH_DETECTED") {
    // Store latest tech detection for the current tab
    cachedTech.set(message.hostname, { techs: message.techs, url: message.url, timestamp: Date.now() })
    sendResponse({ ok: true })
  }

  if (message.type === "GET_CACHED_TECH") {
    const entry = cachedTech.get(message.hostname)
    sendResponse({ techs: entry?.techs || [] })
  }

  if (message.type === "RESOLVE_IP") {
    resolveHostname(message.hostname).then((ip) => sendResponse({ ip }))
    return true
  }

  if (message.type === "UPDATE_SETTING") {
    getSettings().then(async (s) => {
      const next = { ...s, [message.key]: message.value }
      await setSettings(next)
      sendResponse({ ok: true })
    })
    return true
  }
})

async function saveLink(url: string, title: string) {
  const links = await getLinks()
  const link: CollectedLink = {
    id: crypto.randomUUID(),
    url,
    title,
    tags: detectTags(url),
    date: new Date().toISOString()
  }
  await setLinks([link, ...links])
}

function detectTags(url: string): string[] {
  const tags: string[] = []
  const u = url.toLowerCase()
  if (u.includes("youtube.com") || u.includes("youtu.be")) tags.push("youtube")
  if (u.includes("github.com")) tags.push("github")
  if (u.includes("arxiv.org") || u.includes("scholar.google")) tags.push("research")
  if (u.includes("stackoverflow.com") || u.includes("stackexchange.com")) tags.push("stackoverflow")
  if (u.includes("docs.google.com") || u.includes("notion.so")) tags.push("docs")
  if (u.includes("twitter.com") || u.includes("x.com") || u.includes("bsky.app")) tags.push("social")
  if (u.includes("reddit.com")) tags.push("reddit")
  if (u.includes("medium.com") || u.includes("dev.to") || u.includes("hashnode.dev")) tags.push("blog")
  if (u.includes("npmjs.com") || u.includes("pypi.org") || u.includes("crates.io")) tags.push("package")
  return tags
}

async function capturePdf(tabId: number) {
  try {
    await chrome.debugger.attach({ tabId }, "1.3")
    const result = await chrome.debugger.sendCommand({ tabId }, "Page.printToPDF", {
      printBackground: true,
      paperWidth: 8.5,
      paperHeight: 11,
      marginTop: 0.4,
      marginBottom: 0.4,
      marginLeft: 0.4,
      marginRight: 0.4
    })
    await chrome.debugger.detach({ tabId })

    const byteCharacters = atob((result as { data: string }).data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)

    await chrome.downloads.download({
      url,
      filename: `page-${Date.now()}.pdf`,
      saveAs: true
    })
  } catch (err) {
    console.error("PDF capture failed:", err)
  }
}

async function sendToNotebook(links: CollectedLink[]) {
  const settings = await getSettings()
  const urls = links.map((l) => l.url)

  const tab = await chrome.tabs.create({
    url: "https://notebooklm.google.com/",
    active: false
  })

  // Wait for the tab to load, then inject
  chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (tabId === tab.id && info.status === "complete") {
      chrome.tabs.onUpdated.removeListener(listener)
      chrome.tabs.sendMessage(tabId, {
        type: "INJECT_NOTEBOOK_LINKS",
        urls,
        mode: settings.notebookMode,
        lastNotebookUrl: settings.lastNotebookUrl
      })
    }
  })
}

async function switchProfile(extensionIds: string[], alwaysEnabled: string[]) {
  const all = await chrome.management.getAll()
  const exts = all.filter(
    (e) => e.type === "extension" && e.id !== chrome.runtime.id && e.mayDisable
  )

  // Disable all except always-enabled
  const disablePromises = exts
    .filter((e) => !alwaysEnabled.includes(e.id) && e.enabled)
    .map((e) => chrome.management.setEnabled(e.id, false))
  await Promise.all(disablePromises)

  // Enable profile extensions
  const enablePromises = extensionIds.map((id) =>
    chrome.management.setEnabled(id, true).catch(() => {})
  )
  await Promise.all(enablePromises)
}

// DNS resolution via public DNS-over-HTTPS
async function resolveHostname(hostname: string): Promise<string | null> {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`)
    const data = await res.json()
    const answer = data.Answer?.find((a: any) => a.type === 1)
    return answer?.data || null
  } catch {
    return null
  }
}

// Keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-all-off") {
    const settings = await getSettings()
    const all = await chrome.management.getAll()
    const exts = all.filter(
      (e) => e.type === "extension" && e.id !== chrome.runtime.id && e.mayDisable
    )
    await Promise.all(
      exts
        .filter((e) => !settings.alwaysEnabled.includes(e.id) && e.enabled)
        .map((e) => chrome.management.setEnabled(e.id, false))
    )
  }

  if (command === "toggle-all-on") {
    const all = await chrome.management.getAll()
    const exts = all.filter(
      (e) => e.type === "extension" && e.id !== chrome.runtime.id && e.mayDisable
    )
    await Promise.all(exts.map((e) => chrome.management.setEnabled(e.id, true)))
  }

  if (command === "save-link") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.url && tab?.title) {
      await saveLink(tab.url, tab.title)
    }
  }

  if (command === "open-dashboard") {
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/dashboard.html"), pinned: true })
  }
})

export {}
