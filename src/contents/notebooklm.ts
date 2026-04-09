import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://notebooklm.google.com/*"],
  run_at: "document_idle"
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "INJECT_NOTEBOOK_LINKS") {
    handleInject(message.urls, message.mode, message.lastNotebookUrl)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }
})

async function handleInject(
  urls: string[],
  mode: "append" | "new",
  lastNotebookUrl?: string
) {
  // Wait for the page to fully render
  await waitFor(3000)

  if (mode === "append" && lastNotebookUrl) {
    // Try to navigate to the last notebook
    const notebookLinks = document.querySelectorAll('a[href*="/notebook/"]')
    const target = Array.from(notebookLinks).find(
      (a) => (a as HTMLAnchorElement).href === lastNotebookUrl
    ) as HTMLAnchorElement | undefined

    if (target) {
      target.click()
      await waitFor(2000)
    }
  }

  // Try to add each URL as a source
  for (const url of urls) {
    await addSource(url)
    await waitFor(1000)
  }

  // Store the current notebook URL for future appends
  chrome.runtime.sendMessage({
    type: "UPDATE_SETTING",
    key: "lastNotebookUrl",
    value: window.location.href
  })
}

async function addSource(url: string) {
  // Look for the "Add source" or "+" button
  const addButtons = document.querySelectorAll('button, [role="button"]')
  const addBtn = Array.from(addButtons).find((btn) => {
    const text = btn.textContent?.toLowerCase() || ""
    const ariaLabel = btn.getAttribute("aria-label")?.toLowerCase() || ""
    return (
      text.includes("add source") ||
      text.includes("add") ||
      ariaLabel.includes("add source") ||
      ariaLabel.includes("upload")
    )
  }) as HTMLElement | undefined

  if (!addBtn) {
    console.warn("[Lean Extensions] Could not find add source button")
    return
  }

  addBtn.click()
  await waitFor(1000)

  // Look for URL/link input option
  const linkOptions = document.querySelectorAll('button, [role="menuitem"], [role="option"]')
  const linkOpt = Array.from(linkOptions).find((el) => {
    const text = el.textContent?.toLowerCase() || ""
    return text.includes("website") || text.includes("link") || text.includes("url")
  }) as HTMLElement | undefined

  if (linkOpt) {
    linkOpt.click()
    await waitFor(500)
  }

  // Find the URL input and paste
  const inputs = document.querySelectorAll('input[type="text"], input[type="url"], textarea')
  const urlInput = Array.from(inputs).find((input) => {
    const placeholder = (input as HTMLInputElement).placeholder?.toLowerCase() || ""
    const ariaLabel = input.getAttribute("aria-label")?.toLowerCase() || ""
    return (
      placeholder.includes("url") ||
      placeholder.includes("link") ||
      placeholder.includes("paste") ||
      ariaLabel.includes("url") ||
      ariaLabel.includes("source")
    )
  }) as HTMLInputElement | undefined

  if (urlInput) {
    urlInput.focus()
    urlInput.value = url
    urlInput.dispatchEvent(new Event("input", { bubbles: true }))
    urlInput.dispatchEvent(new Event("change", { bubbles: true }))
    await waitFor(500)

    // Try to submit
    const submitBtns = document.querySelectorAll('button[type="submit"], button')
    const submitBtn = Array.from(submitBtns).find((btn) => {
      const text = btn.textContent?.toLowerCase() || ""
      return text.includes("insert") || text.includes("add") || text.includes("submit")
    }) as HTMLElement | undefined

    if (submitBtn) {
      submitBtn.click()
    }
  } else {
    console.warn("[Lean Extensions] Could not find URL input field")
  }
}

function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
