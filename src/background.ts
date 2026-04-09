import { getLinks, getSettings, setLinks } from "./storage"
import type { CollectedLink } from "./types"

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
  if (url.includes("youtube.com") || url.includes("youtu.be")) tags.push("youtube")
  if (url.includes("github.com")) tags.push("github")
  if (url.includes("arxiv.org")) tags.push("research")
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

export {}
