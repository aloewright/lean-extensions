import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

/**
 * Selection toolbar.
 *
 * Pops up above any text selection with seven actions:
 *   • Speak    — sends text to background → AI Gateway dynamic/audio_gen → plays the returned audio
 *   • Copy     — navigator.clipboard.writeText
 *   • Paste    — reads clipboard, replaces the selection (in editable contexts) or surfaces a toast
 *   • Brave    — opens search.brave.com in a new tab (background handles tabs.create)
 *   • All      — selects every text node in the document
 *   • Pplx     — opens perplexity.ai in a new tab (background handles tabs.create)
 *   • Save     — existing CloudOS highlight save
 *
 * The original v1 was a single "Save to CloudOS" button. This rewrite keeps
 * that capability and adds the rest behind tiny SVG icon buttons. All
 * cross-context work (audio fetch, tab open) is delegated to background;
 * the content script only does selection / clipboard / playback locally.
 */

const TOOLBAR_ID = "lean-ext-selection-toolbar"
const TOAST_ID = "lean-ext-selection-toast"
const HIDDEN_AUDIO_ID = "lean-ext-tts-audio"

const ICON_BTN_STYLE = `
  background: #3b3b3f;
  color: #f1f1f1;
  border: 1px solid #505055;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: system-ui;
  transition: background 80ms ease-out, color 80ms ease-out;
`

const TOOLBAR_STYLE = `
  position: fixed;
  z-index: 999999;
  display: none;
  background: rgba(59, 59, 63, 0.97);
  border: 1px solid #505055;
  padding: 4px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  gap: 4px;
  font-family: system-ui;
`

// Inline SVGs (24×24 viewBox, scaled to 14px).
const SVG_SPEAK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`
const SVG_SPEAK_LOADING = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: lean-ext-spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`
const SVG_COPY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
const SVG_PASTE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`
const SVG_SEARCH = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>`
const SVG_SELECT_ALL = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M4 16v2a2 2 0 0 0 2 2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M16 20h2a2 2 0 0 0 2-2v-2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`
const SVG_PPLX = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 9h8M8 12h6M8 15h4"/></svg>`
const SVG_SAVE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`

interface ToolbarRefs {
  el: HTMLDivElement
}

let toolbarRefs: ToolbarRefs | null = null
let lastSelectedText = ""
let audioEl: HTMLAudioElement | null = null

function ensureToolbar(): ToolbarRefs {
  if (toolbarRefs) return toolbarRefs

  const el = document.createElement("div")
  el.id = TOOLBAR_ID
  el.style.cssText = TOOLBAR_STYLE

  const mkBtn = (svg: string, label: string, action: string) => {
    const btn = document.createElement("button")
    btn.style.cssText = ICON_BTN_STYLE
    btn.title = label
    btn.dataset.action = action
    btn.innerHTML = svg
    btn.addEventListener("mouseenter", () => (btn.style.background = "#5a5a60"))
    btn.addEventListener("mouseleave", () => (btn.style.background = "#3b3b3f"))
    btn.addEventListener("mousedown", (e) => {
      // Preserve the selection across the click — without preventDefault
      // the focus shift to the button collapses the selection.
      e.preventDefault()
      e.stopPropagation()
      void onAction(btn.dataset.action!, btn)
    })
    el.appendChild(btn)
    return btn
  }

  mkBtn(SVG_SPEAK, "Read aloud", "speak")
  mkBtn(SVG_COPY, "Copy", "copy")
  mkBtn(SVG_PASTE, "Paste", "paste")
  mkBtn(SVG_SEARCH, "Search Brave", "brave")
  mkBtn(SVG_SELECT_ALL, "Select all", "selectAll")
  mkBtn(SVG_PPLX, "Ask Perplexity", "perplexity")
  mkBtn(SVG_SAVE, "Save to CloudOS", "save")

  document.body.appendChild(el)
  toolbarRefs = { el }
  return toolbarRefs
}

function showToolbar(x: number, y: number) {
  const refs = ensureToolbar()
  refs.el.style.display = "flex"
  // 7 buttons × 28px + 6 × 4px gap + 8px padding ≈ 232px wide
  refs.el.style.left = `${Math.min(x, window.innerWidth - 240)}px`
  refs.el.style.top = `${Math.max(y - 38, 4)}px`
}

function hideToolbar() {
  if (toolbarRefs) toolbarRefs.el.style.display = "none"
}

function showToast(message: string, tone: "info" | "error" = "info") {
  let el = document.getElementById(TOAST_ID)
  if (!el) {
    el = document.createElement("div")
    el.id = TOAST_ID
    el.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: #3b3b3f;
      border: 1px solid #505055;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-family: system-ui;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: lean-ext-fade-in 0.15s ease-out;
    `
    document.body.appendChild(el)
  }
  el.style.color = tone === "error" ? "#9e5e5e" : "#a7c7e7"
  el.textContent = message
  el.style.display = "block"
  const slot = el as HTMLElement & { _timer?: number }
  window.clearTimeout(slot._timer)
  slot._timer = window.setTimeout(() => {
    el!.style.display = "none"
  }, 2400)
}

async function onAction(action: string, btn: HTMLButtonElement) {
  const sel = window.getSelection()
  const text = sel?.toString().trim() ?? ""
  if (!text && action !== "selectAll" && action !== "paste") {
    hideToolbar()
    return
  }
  if (text) lastSelectedText = text

  switch (action) {
    case "speak":
      await playTts(text || lastSelectedText, btn)
      break
    case "copy":
      try {
        await navigator.clipboard.writeText(text)
        showToast("Copied")
      } catch {
        showToast("Clipboard write blocked", "error")
      }
      hideToolbar()
      sel?.removeAllRanges()
      break
    case "paste":
      await pasteFromClipboard()
      break
    case "brave":
      chrome.runtime.sendMessage({ type: "BRAVE_SEARCH", text }, () => {
        void chrome.runtime.lastError
      })
      hideToolbar()
      sel?.removeAllRanges()
      break
    case "selectAll":
      // Select every text node in the body — same as Edit > Select All.
      sel?.selectAllChildren(document.body)
      // Don't hide; user may want to immediately copy / speak the lot.
      break
    case "perplexity":
      chrome.runtime.sendMessage({ type: "PERPLEXITY_SEARCH", text }, () => {
        void chrome.runtime.lastError
      })
      hideToolbar()
      sel?.removeAllRanges()
      break
    case "save":
      chrome.runtime.sendMessage(
        {
          type: "CLOUDOS_SAVE_HIGHLIGHT",
          text,
          url: window.location.href,
          siteName: document.title
        },
        (response) => {
          if (chrome.runtime.lastError) {
            showToast("Save failed", "error")
            return
          }
          showToast(
            response?.ok ? "Saved to CloudOS" : "Save failed — check token",
            response?.ok ? "info" : "error"
          )
        }
      )
      hideToolbar()
      sel?.removeAllRanges()
      break
  }
}

async function playTts(text: string, btn: HTMLButtonElement) {
  if (!text) {
    showToast("No text to read", "error")
    return
  }
  btn.innerHTML = SVG_SPEAK_LOADING
  btn.disabled = true
  try {
    const res: { ok: boolean; dataUrl?: string; error?: string } = await new Promise(
      (resolve) => {
        chrome.runtime.sendMessage(
          { type: "TTS_PLAY", text: text.slice(0, 4000) },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, error: chrome.runtime.lastError.message })
              return
            }
            resolve(response ?? { ok: false, error: "No response" })
          }
        )
      }
    )
    if (!res.ok || !res.dataUrl) {
      showToast(res.error || "TTS failed", "error")
      return
    }
    if (audioEl) {
      audioEl.pause()
      audioEl.remove()
    }
    audioEl = new Audio(res.dataUrl)
    audioEl.id = HIDDEN_AUDIO_ID
    audioEl.style.display = "none"
    document.body.appendChild(audioEl)
    audioEl.addEventListener("ended", () => audioEl?.remove())
    await audioEl.play().catch(() => {
      showToast("Audio playback blocked", "error")
    })
  } finally {
    btn.disabled = false
    btn.innerHTML = SVG_SPEAK
  }
}

async function pasteFromClipboard() {
  let text: string
  try {
    text = await navigator.clipboard.readText()
  } catch {
    showToast("Clipboard read blocked", "error")
    return
  }
  if (!text) {
    showToast("Clipboard empty", "error")
    return
  }

  const active = document.activeElement
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    const start = active.selectionStart ?? active.value.length
    const end = active.selectionEnd ?? active.value.length
    active.value = active.value.slice(0, start) + text + active.value.slice(end)
    active.selectionStart = active.selectionEnd = start + text.length
    active.dispatchEvent(new Event("input", { bubbles: true }))
    showToast("Pasted")
    hideToolbar()
    return
  }

  if (active && (active as HTMLElement).isContentEditable) {
    // execCommand is deprecated but it's still the only way to insert
    // text into a contentEditable in a way that rich-text editors
    // (Notion, Slack, Linear) actually observe.
    document.execCommand("insertText", false, text)
    showToast("Pasted")
    hideToolbar()
    return
  }

  showToast("Click a text field first")
}

document.addEventListener("mouseup", (e) => {
  // Defer briefly so the selection settles after the mouseup processes.
  window.setTimeout(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) {
      hideToolbar()
      return
    }
    const text = sel.toString().trim()
    if (!text) {
      hideToolbar()
      return
    }
    lastSelectedText = text
    showToolbar(e.clientX, e.clientY)
  }, 10)
})

document.addEventListener("mousedown", (e) => {
  if (toolbarRefs && !toolbarRefs.el.contains(e.target as Node)) {
    hideToolbar()
  }
})

// The popup uses GET_PAGE_HTML for "Save page to CloudOS"; keep this
// listener so that path doesn't regress.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_PAGE_HTML") {
    sendResponse({
      html: document.documentElement.outerHTML,
      text: document.body.innerText.slice(0, 50000)
    })
  }
})

const style = document.createElement("style")
style.textContent = `
  @keyframes lean-ext-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes lean-ext-spin { to { transform: rotate(360deg); } }
`
document.head.appendChild(style)
