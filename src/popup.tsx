import { useState } from "react"
import "./style.css"
import { useExtensions } from "./hooks/useExtensions"
import { useSettings, useProfiles } from "./hooks/useStorage"
import { FuzzySearchInput } from "./components/FuzzySearchInput"
import { fuzzySearch } from "./utils/fuzzy"
import type { Profile } from "./types"

interface TechInfo {
  name: string
  category: string
  version?: string
  confidence: string
}

interface IpInfo {
  ip: string
  city?: string
  region?: string
  country?: string
  org?: string
  loc?: string
}

interface SiteIpInfo {
  ip: string
  hostname: string
}

function Popup() {
  const { extensions, loading, toggleExtension, toggleAll } = useExtensions()
  const { settings, update } = useSettings()
  const { profiles } = useProfiles()
  const [search, setSearch] = useState("")
  const [toast, setToast] = useState<string | null>(null)
  const [techs, setTechs] = useState<TechInfo[]>([])
  const [showTech, setShowTech] = useState(false)
  const [userIp, setUserIp] = useState<IpInfo | null>(null)
  const [siteIp, setSiteIp] = useState<SiteIpInfo | null>(null)
  const [showNetwork, setShowNetwork] = useState(false)

  // Detect tech on current tab
  useState(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.id) return
      chrome.tabs.sendMessage(tab.id, { type: "GET_TECH" }, (response) => {
        if (chrome.runtime.lastError) return
        if (response?.techs) setTechs(response.techs)
      })
      // Get site IP from background
      if (tab.url) {
        try {
          const hostname = new URL(tab.url).hostname
          if (hostname) {
            chrome.runtime.sendMessage({ type: "RESOLVE_IP", hostname }, (response) => {
              if (chrome.runtime.lastError) return
              if (response?.ip) setSiteIp({ ip: response.ip, hostname })
            })
          }
        } catch {}
      }
    })
    // Get user's IP
    fetch("https://ipinfo.io/json?token=")
      .then((r) => r.json())
      .then((data) => setUserIp(data))
      .catch(() => {
        // Fallback to a simpler API
        fetch("https://api.ipify.org?format=json")
          .then((r) => r.json())
          .then((data) => setUserIp({ ip: data.ip }))
          .catch(() => {})
      })
  })

  const fuzzyResults = fuzzySearch(extensions, search, [(e) => e.name])
  const filtered = fuzzyResults.map((r) => r.item)
  const suggestions = search.trim() ? fuzzyResults.slice(0, 5).map((r) => r.item.name) : []

  const enabledCount = extensions.filter((e) => e.enabled).length

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/dashboard.html"), pinned: true })
  }

  const captureScreenshot = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: "png" })
    const link = document.createElement("a")
    link.href = dataUrl
    link.download = `screenshot-${Date.now()}.png`
    link.click()
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
    chrome.runtime.sendMessage({
      type: "SAVE_LINK",
      url: tab.url,
      title: tab.title
    })
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
      {/* Toast */}
      {toast && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 text-[11px] py-1 px-3 rounded bg-chart-1/20 text-chart-1 animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold tracking-tight">Lean Extensions</h1>
          <span className="text-xs text-fg/40">{enabledCount}/{extensions.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setShowNetwork(!showNetwork); if (showTech) setShowTech(false) }}
            title="Network info"
            className={`p-1.5 rounded transition-colors relative ${
              showNetwork ? "bg-chart-3/20 text-chart-3" : "text-fg/60 hover:text-fg hover:bg-accent"
            }`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </button>
          <button
            onClick={() => { setShowTech(!showTech); if (showNetwork) setShowNetwork(false) }}
            title="Detect technologies"
            className={`p-1.5 rounded transition-colors relative ${
              showTech ? "bg-chart-5/20 text-chart-5" : techs.length > 0 ? "text-chart-5/60 hover:text-chart-5 hover:bg-accent" : "text-fg/60 hover:text-fg hover:bg-accent"
            }`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <circle cx="9" cy="16" r="1" fill="currentColor" />
              <circle cx="15" cy="16" r="1" fill="currentColor" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            {techs.length > 0 && !showTech && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-chart-5" />
            )}
          </button>
          <button
            onClick={saveCurrentLink}
            title="Save current page link"
            className="p-1.5 rounded hover:bg-accent text-fg/60 hover:text-fg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            onClick={captureScreenshot}
            title="Screenshot visible area"
            className="p-1.5 rounded hover:bg-accent text-fg/60 hover:text-fg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <button
            onClick={captureAsPdf}
            title="Save as PDF"
            className="p-1.5 rounded hover:bg-accent text-fg/60 hover:text-fg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </button>
          <button
            onClick={openDashboard}
            title="Open dashboard"
            className="p-1.5 rounded hover:bg-accent text-fg/60 hover:text-fg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Network Info Panel */}
      {showNetwork && (
        <div className="border-b border-border px-3 py-2.5 space-y-2">
          <p className="text-[10px] text-fg/30 uppercase tracking-wider">Network</p>

          {/* Your IP */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-fg/40">Your IP</span>
            {userIp ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-fg font-mono">{userIp.ip}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(userIp.ip); showToast("IP copied") }}
                  className="text-fg/20 hover:text-fg/50 transition-colors">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-fg/20">loading...</span>
            )}
          </div>

          {/* Location */}
          {userIp?.city && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-fg/40">Location</span>
              <span className="text-xs text-fg/60">
                {[userIp.city, userIp.region, userIp.country].filter(Boolean).join(", ")}
              </span>
            </div>
          )}

          {/* ISP */}
          {userIp?.org && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-fg/40">ISP</span>
              <span className="text-xs text-fg/60 truncate max-w-[200px]">{userIp.org}</span>
            </div>
          )}

          {/* Site IP */}
          {siteIp && (
            <>
              <div className="border-t border-border/50 my-1" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-fg/40">Site IP</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-fg font-mono">{siteIp.ip}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(siteIp.ip); showToast("Site IP copied") }}
                    className="text-fg/20 hover:text-fg/50 transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-fg/40">Host</span>
                <span className="text-xs text-fg/60 font-mono">{siteIp.hostname}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tech Detection Panel */}
      {showTech && (
        <div className="border-b border-border">
          {techs.length > 0 ? (
            <div className="px-3 py-2 space-y-1 max-h-[160px] overflow-y-auto">
              <p className="text-[10px] text-fg/30 uppercase tracking-wider mb-1">Detected Technologies</p>
              {techs.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-fg">{t.name}</span>
                    {t.version && <span className="text-[10px] text-fg/30">v{t.version}</span>}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-fg/40">{t.category}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-3 text-xs text-fg/30 text-center">
              No technologies detected on this page
            </div>
          )}
        </div>
      )}

      {/* Profile Switcher */}
      {profiles.length > 0 && (
        <div className="px-3 py-2 border-b border-border flex items-center gap-2">
          <span className="text-[10px] text-fg/30 uppercase tracking-wider">Profile</span>
          <div className="flex gap-1 flex-1 overflow-x-auto">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => switchProfile(p)}
                className={`text-[11px] py-1 px-2.5 rounded whitespace-nowrap transition-colors ${
                  settings.activeProfileId === p.id
                    ? "bg-chart-1/20 text-chart-1"
                    : "bg-accent/50 text-fg/50 hover:text-fg hover:bg-accent"
                }`}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lean Mode Banner */}
      {settings.leanMode && (
        <div className="px-3 py-2 bg-chart-2/10 border-b border-chart-2/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-chart-2 animate-pulse" />
            <span className="text-[11px] text-chart-2 font-medium">Lean Mode Active</span>
            <span className="text-[10px] text-fg/30">Only pinned extensions running</span>
          </div>
          <button
            onClick={() => { toggleAll(true, settings.alwaysEnabled); update({ leanMode: false }); showToast("All extensions restored") }}
            className="text-[11px] py-0.5 px-2 rounded bg-chart-2/20 text-chart-2 hover:bg-chart-2/30 transition-colors">
            Restore
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-3 py-2 border-b border-border flex gap-2">
        <button
          onClick={() => { toggleAll(true, settings.alwaysEnabled); update({ leanMode: false }); showToast("All enabled") }}
          className="flex-1 text-xs py-1.5 px-3 rounded bg-accent hover:bg-accent/80 text-fg transition-colors">
          Enable All
        </button>
        <button
          onClick={() => { toggleAll(false, settings.alwaysEnabled); showToast("All disabled (pinned kept)") }}
          className="flex-1 text-xs py-1.5 px-3 rounded bg-accent hover:bg-accent/80 text-fg transition-colors">
          Disable All
        </button>
        <button
          onClick={() => { toggleAll(false, settings.alwaysEnabled); update({ leanMode: true }); showToast("Lean mode on") }}
          title="Disable everything except pinned extensions"
          className={`text-xs py-1.5 px-3 rounded whitespace-nowrap transition-colors ${
            settings.leanMode
              ? "bg-chart-2/30 text-chart-2 ring-1 ring-chart-2/40"
              : "bg-chart-2/20 text-chart-2 hover:bg-chart-2/30"
          }`}>
          Lean
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <FuzzySearchInput
          value={search}
          onChange={setSearch}
          suggestions={suggestions}
          placeholder="Search extensions..."
          className="w-full text-xs py-1.5 px-3 rounded bg-card border border-border text-fg placeholder-fg/30 outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Extension List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((ext) => {
          const iconUrl = ext.icons?.length
            ? ext.icons[ext.icons.length - 1].url
            : undefined
          const isPinned = settings.alwaysEnabled.includes(ext.id)

          return (
            <div
              key={ext.id}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-card/50 transition-colors group">
              {iconUrl ? (
                <img src={iconUrl} alt="" className="w-5 h-5 rounded-sm flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-sm bg-accent flex-shrink-0 flex items-center justify-center text-[10px] text-fg/50">
                  {ext.name[0]}
                </div>
              )}
              <span
                className={`flex-1 text-xs truncate cursor-pointer hover:underline ${
                  ext.enabled ? "text-fg" : "text-fg/40"
                }`}
                onClick={() => {
                  const storeUrl = `https://chromewebstore.google.com/detail/${ext.id}`
                  chrome.tabs.create({ url: storeUrl })
                }}>
                {ext.name}
              </span>
              <button
                onClick={() => {
                  const next = isPinned
                    ? settings.alwaysEnabled.filter((id) => id !== ext.id)
                    : [...settings.alwaysEnabled, ext.id]
                  update({ alwaysEnabled: next })
                }}
                title={isPinned ? "Unpin" : "Pin as always enabled"}
                className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                  isPinned ? "text-chart-4 opacity-100" : "text-fg/30 hover:text-fg/60"
                }`}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={ext.enabled}
                  onChange={() => toggleExtension(ext.id, !ext.enabled)}
                  disabled={!ext.mayDisable}
                  className="sr-only peer"
                />
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
