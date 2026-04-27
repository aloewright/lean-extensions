import type { PlasmoCSConfig } from "plasmo"

/**
 * Picture-in-Picture content script.
 *
 * Triggered by the popup button or the Alt+Shift+P command. Picks the best
 * candidate `<video>` on the page (currently playing > largest visible >
 * first found), strips any `disablePictureInPicture` attribute the site
 * has set, and toggles PiP. If the page is already in PiP, exits.
 *
 * Top-frame only — videos inside cross-origin iframes are out of reach
 * without webNavigation + per-frame messaging. Most major sites (YouTube,
 * Twitter, Vimeo on their own domain, news sites) put the video in the
 * top frame.
 */

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
  all_frames: false
}

interface PiPResult {
  ok: boolean
  action: "entered" | "exited" | "none"
  reason?: string
}

function pickBestVideo(): HTMLVideoElement | null {
  const all = Array.from(document.querySelectorAll("video")) as HTMLVideoElement[]
  if (all.length === 0) return null

  // 1. A video that's currently playing wins — that's almost certainly
  //    the one the user is paying attention to.
  const playing = all.find((v) => !v.paused && !v.ended && v.readyState >= 2)
  if (playing) return playing

  // 2. Otherwise, the largest visible video.
  let best: HTMLVideoElement | null = null
  let bestArea = 0
  for (const v of all) {
    const r = v.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) continue
    const area = r.width * r.height
    if (area > bestArea) {
      bestArea = area
      best = v
    }
  }
  if (best) return best

  // 3. Fall back to the first one in the DOM, even if it's not visible —
  //    audio-only or off-screen players still PiP fine.
  return all[0]
}

async function togglePiP(): Promise<PiPResult> {
  // Already in PiP? Exit. This makes the same toggle work as a "close PiP"
  // button when it's already open.
  if (document.pictureInPictureElement) {
    try {
      await document.exitPictureInPicture()
      return { ok: true, action: "exited" }
    } catch (err) {
      return { ok: false, action: "none", reason: (err as Error).message }
    }
  }

  if (!document.pictureInPictureEnabled) {
    return { ok: false, action: "none", reason: "PiP is disabled in this browser" }
  }

  const video = pickBestVideo()
  if (!video) {
    return { ok: false, action: "none", reason: "No video found on this page" }
  }

  // Some sites set disablePictureInPicture as a hostile move. Strip it.
  if (video.disablePictureInPicture) {
    try {
      video.disablePictureInPicture = false
      video.removeAttribute("disablepictureinpicture")
    } catch {
      /* read-only on some custom elements — ignore and try anyway */
    }
  }

  // requestPictureInPicture rejects if the video has no data yet. If we're
  // catching it pre-load (e.g. user clicked the button as the page was
  // loading), wait briefly for HAVE_CURRENT_DATA.
  if (video.readyState < 2) {
    await new Promise<void>((resolve) => {
      const done = () => {
        video.removeEventListener("loadeddata", done)
        resolve()
      }
      video.addEventListener("loadeddata", done)
      setTimeout(done, 1500)
    })
  }

  try {
    await video.requestPictureInPicture()
    return { ok: true, action: "entered" }
  } catch (err) {
    const msg = (err as Error).message || "Could not enter PiP"
    // The most common failure is "Document is not allowed to use Picture-in-
    // Picture", which happens when the site has overridden the API in the
    // page's main world. Keep the raw browser message — it's actionable.
    return { ok: false, action: "none", reason: msg }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "TOGGLE_PIP") {
    togglePiP().then(sendResponse)
    return true // async response
  }
  if (message?.type === "EXIT_PIP") {
    if (!document.pictureInPictureElement) {
      sendResponse({ ok: true, action: "none" } satisfies PiPResult)
      return
    }
    document.exitPictureInPicture().then(
      () => sendResponse({ ok: true, action: "exited" } satisfies PiPResult),
      (err) =>
        sendResponse({
          ok: false,
          action: "none",
          reason: (err as Error).message
        } satisfies PiPResult)
    )
    return true
  }
})
