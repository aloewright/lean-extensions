import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

let tooltip: HTMLDivElement | null = null

function createTooltip() {
  if (tooltip) return tooltip
  tooltip = document.createElement("div")
  tooltip.id = "lean-ext-highlight-tooltip"
  tooltip.innerHTML = `
    <button id="lean-ext-save-highlight" style="
      background: #3b3b3f; color: #f1f1f1; border: 1px solid #505055;
      padding: 4px 10px; border-radius: 6px; font-size: 12px;
      cursor: pointer; font-family: system-ui; display: flex;
      align-items: center; gap: 5px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    ">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      Save to CloudOS
    </button>
  `
  tooltip.style.cssText = "position:fixed;z-index:999999;display:none;"
  document.body.appendChild(tooltip)

  tooltip.querySelector("#lean-ext-save-highlight")!.addEventListener("mousedown", (e) => {
    e.preventDefault()
    e.stopPropagation()
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const text = selection.toString().trim()
    if (!text) return

    chrome.runtime.sendMessage({
      type: "CLOUDOS_SAVE_HIGHLIGHT",
      text,
      url: window.location.href,
      siteName: document.title,
    }, (response) => {
      if (response?.ok) {
        showFeedback("Saved to CloudOS")
      } else {
        showFeedback("Failed — check CloudOS token in settings")
      }
    })

    hideTooltip()
    selection.removeAllRanges()
  })

  return tooltip
}

function showTooltip(x: number, y: number) {
  const el = createTooltip()
  el.style.display = "block"
  el.style.left = `${Math.min(x, window.innerWidth - 160)}px`
  el.style.top = `${Math.max(y - 40, 4)}px`
}

function hideTooltip() {
  if (tooltip) tooltip.style.display = "none"
}

function showFeedback(msg: string) {
  const el = document.createElement("div")
  el.textContent = msg
  el.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 999999;
    background: #3b3b3f; color: #a7c7e7; border: 1px solid #505055;
    padding: 8px 16px; border-radius: 8px; font-size: 12px;
    font-family: system-ui; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: lean-fade-in 0.15s ease-out;
  `
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2500)
}

// Show tooltip on text selection
document.addEventListener("mouseup", (e) => {
  setTimeout(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      hideTooltip()
      return
    }
    showTooltip(e.clientX, e.clientY)
  }, 10)
})

document.addEventListener("mousedown", (e) => {
  if (tooltip && !tooltip.contains(e.target as Node)) {
    hideTooltip()
  }
})

// Handle page HTML requests from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_PAGE_HTML") {
    sendResponse({
      html: document.documentElement.outerHTML,
      text: document.body.innerText.slice(0, 50000),
    })
  }
})

// Add animation keyframes
const style = document.createElement("style")
style.textContent = `@keyframes lean-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`
document.head.appendChild(style)
