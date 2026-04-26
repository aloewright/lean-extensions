import { useState } from "react"
import "./style.css"
import { useExtensions } from "./hooks/useExtensions"
import { useSettings, useProfiles } from "./hooks/useStorage"
import { FuzzySearchInput } from "./components/FuzzySearchInput"
import { useInfoPanels, NetworkButton, TechButton, RssButton, NetworkPanel, TechPanel, RssPanel } from "./components/InfoPanels"
import { RecordButton } from "./components/RecordPanel"
import { fuzzySearch } from "./utils/fuzzy"
import type { Profile } from "./types"

function Popup() {
  const { extensions, loading, toggleExtension, toggleAll } = useExtensions()
  const { settings, update } = useSettings()
  const { profiles } = useProfiles()
  const [search, setSearch] = useState("")
  const [toast, setToast] = useState<string | null>(null)
  const info = useInfoPanels()

  const baseList = settings.leanMode
    ? extensions.filter((e) => settings.alwaysEnabled.includes(e.id))
    : extensions
  const fuzzyResults = fuzzySearch(baseList, search, [(e) => e.name])
  const filtered = fuzzyResults.map((r) => r.item)
  const suggestions = search.trim() ? fuzzyResults.slice(0, 5).map((r) => r.item.name) : []
  const enabledCount = extensions.filter((e) => e.enabled).length

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const copyAndToast = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    showToast(label)
  }

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/dashboard.html"), pinned: true })
  }

  const captureScreenshot = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: "png" })
    // Save locally
    const link = document.createElement("a")
    link.href = dataUrl
    link.download = `screenshot-${Date.now()}.png`
    link.click()
    // Also upload to CloudOS R2 if configured
    const base64 = dataUrl.split(",")[1]
    if (base64) {
      chrome.runtime.sendMessage({
        type: "CLOUDOS_UPLOAD_MEDIA",
        base64,
        mimeType: "image/png",
        filename: `screenshot-${Date.now()}.png`,
      })
    }
    showToast("Screenshot saved")
  }

  const captureAsPdf = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    chrome.runtime.sendMessage({ type: "CAPTURE_PDF", tabId: tab.id })
    showToast("Saving PDF...")
  }

  const saveCurrentLink = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.url || !tab?.title) return
    chrome.runtime.sendMessage({ type: "SAVE_LINK", url: tab.url, title: tab.title })
    showToast("Link saved")
  }

  const switchProfile = (profile: Profile) => {
    chrome.runtime.sendMessage({
      type: "SWITCH_PROFILE",
      extensionIds: profile.extensionIds,
      alwaysEnabled: settings.alwaysEnabled || []
    })
    update({ activeProfileId: profile.id })
    showToast(`Switched to ${profile.name}`)
  }

  if (loading) {
    return (
      <div className="w-[360px] min-h-[200px] bg-bg flex items-center justify-center">
        <div className="text-fg/50 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-[360px] max-h-[520px] bg-bg text-fg font-sans overflow-hidden flex flex-col relative">
      {toast && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 text-[11px] py-1 px-3 rounded bg-chart-1/20 text-chart-1 animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-2 py-2 border-b border-border flex items-center gap-1">
        <span className="text-[10px] text-fg/30 mr-auto">{enabledCount}/{extensions.length}</span>
          <NetworkButton active={info.activePanel === "network"} hasData={!!info.userIp} onClick={() => info.toggle("network")} />
          <TechButton active={info.activePanel === "tech"} count={info.techs.length} onClick={() => info.toggle("tech")} />
          <RssButton active={info.activePanel === "rss"} count={info.feeds.length} onClick={() => info.toggle("rss")} />
          <RecordButton onClick={() => {
            chrome.tabs.create({ url: chrome.runtime.getURL("tabs/recorder.html") })
            window.close()
          }} />
          <button onClick={saveCurrentLink} title="Save link"
            className="p-1.5 rounded hover:bg-accent text-fg/60 hover:text-fg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
          <button onClick={async () => {
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
              if (!tab?.id || !tab?.title) return
              // Get page HTML from the content script
              chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_HTML" }, (response) => {
                if (chrome.runtime.lastError || !response) {
                  showToast("Could not read page")
                  return
                }
                chrome.runtime.sendMessage({
                  type: "CLOUDOS_SAVE_PAGE",
                  title: tab.title,
                  html: response.html,
                  text: response.text,
                }, (result) => {
                  showToast(result?.ok ? "Saved to CloudOS" : "Failed — check CloudOS settings")
                })
              })
            }} title="Save page to CloudOS"
            className="p-1.5 rounded hover:bg-accent text-fg/60 hover:text-fg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
          </button>
          <button onClick={captureScreenshot} title="Screenshot visible area"
            className="p-1.5 rounded hover:bg-accent text-fg/60 hover:text-fg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <button onClick={captureAsPdf} title="Save as PDF"
            className="p-1.5 rounded hover:bg-accent text-fg/60 hover:text-fg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </button>
          <button onClick={openDashboard} title="Open dashboard"
            className="p-1.5 rounded hover:bg-accent text-fg/60 hover:text-fg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>
      </div>

      {/* Info Panels */}
      {info.activePanel === "network" && <NetworkPanel userIp={info.userIp} siteIp={info.siteIp} onCopy={copyAndToast} />}
      {info.activePanel === "tech" && <TechPanel techs={info.techs} />}
      {info.activePanel === "rss" && <RssPanel feeds={info.feeds} onCopy={copyAndToast} onSaveFeed={(f) => {
        chrome.runtime.sendMessage({ type: "CLOUDOS_SAVE_FEED", url: f.url, title: f.title, type_: f.type }, (res) => {
          showToast(res?.ok ? `Saved ${f.title || 'feed'}` : "Save failed")
        })
      }} />}
      {/* Profile Switcher */}
      {profiles.length > 0 && (
        <div className="px-3 py-2 border-b border-border flex items-center gap-2">
          <span className="text-[10px] text-fg/30 uppercase tracking-wider">Profile</span>
          <div className="flex gap-1 flex-1 overflow-x-auto">
            {profiles.map((p) => (
              <button key={p.id} onClick={() => switchProfile(p)}
                className={`text-[11px] py-1 px-2.5 rounded whitespace-nowrap transition-colors ${
                  settings.activeProfileId === p.id ? "bg-chart-1/20 text-chart-1" : "bg-accent/50 text-fg/50 hover:text-fg hover:bg-accent"
                }`}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-3 py-2 border-b border-border flex gap-2">
        <button onClick={() => { toggleAll(true, settings.alwaysEnabled); update({ leanMode: false }) }}
          className="flex-1 text-xs py-1.5 px-3 rounded bg-accent hover:bg-accent/80 text-fg transition-colors">Enable All</button>
        <button onClick={() => { toggleAll(false, settings.alwaysEnabled) }}
          className="flex-1 text-xs py-1.5 px-3 rounded bg-accent hover:bg-accent/80 text-fg transition-colors">Disable All</button>
        <button onClick={() => update({ leanMode: !settings.leanMode })}
          title={settings.leanMode ? "Show all extensions" : "Show only favorites"}
          className={`text-xs py-1.5 px-3 rounded whitespace-nowrap transition-colors ${
            settings.leanMode ? "bg-chart-4/30 text-chart-4 ring-1 ring-chart-4/40" : "bg-chart-4/20 text-chart-4 hover:bg-chart-4/30"
          }`}>Lean</button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <FuzzySearchInput value={search} onChange={setSearch} suggestions={suggestions}
          placeholder="Search extensions..."
          className="w-full text-xs py-1.5 px-3 rounded bg-card border border-border text-fg placeholder-fg/30 outline-none focus:border-primary/50 transition-colors" />
      </div>

      {/* Extension List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((ext) => {
          const iconUrl = ext.icons?.length ? ext.icons[ext.icons.length - 1].url : undefined
          const isPinned = settings.alwaysEnabled.includes(ext.id)
          return (
            <div key={ext.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-card/50 transition-colors group">
              {iconUrl ? (
                <img src={iconUrl} alt="" className="w-5 h-5 rounded-sm flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-sm bg-accent flex-shrink-0 flex items-center justify-center text-[10px] text-fg/50">{ext.name[0]}</div>
              )}
              <span className={`flex-1 text-xs truncate cursor-pointer hover:underline ${ext.enabled ? "text-fg" : "text-fg/40"}`}
                onClick={() => chrome.tabs.create({ url: `https://chromewebstore.google.com/detail/${ext.id}` })}>
                {ext.name}
              </span>
              <button onClick={() => {
                  const next = isPinned ? settings.alwaysEnabled.filter((id) => id !== ext.id) : [...settings.alwaysEnabled, ext.id]
                  update({ alwaysEnabled: next })
                }}
                title={isPinned ? "Unpin" : "Pin as always enabled"}
                className={`p-1 rounded transition-opacity ${isPinned ? "text-chart-4 opacity-100" : "text-fg/30 hover:text-fg/60 opacity-0 group-hover:opacity-100"}`}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M12 17v5M9 2h6l1 7h2l-1 4H7L6 9h2l1-7z" />
                </svg>
              </button>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" checked={ext.enabled} onChange={() => toggleExtension(ext.id, !ext.enabled)} disabled={!ext.mayDisable} className="sr-only peer" />
                <div className="w-7 h-4 bg-secondary rounded-full peer peer-checked:bg-chart-1 peer-disabled:opacity-30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fg after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-3" />
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Popup
