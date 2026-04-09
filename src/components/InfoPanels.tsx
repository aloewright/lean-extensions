import { useState, useEffect } from "react"

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
}

interface SiteIpInfo {
  ip: string
  hostname: string
  city?: string
  region?: string
  country?: string
  org?: string
}

interface FeedInfo {
  url: string
  title: string
  type: "rss" | "atom" | "json"
}

interface LoginInfo {
  hostname: string
  hasForm: boolean
  socials: { provider: string; selector: string }[]
  savedProvider?: string
}

type Panel = "network" | "tech" | "rss" | "login" | null

export function useInfoPanels() {
  const [techs, setTechs] = useState<TechInfo[]>([])
  const [userIp, setUserIp] = useState<IpInfo | null>(null)
  const [siteIp, setSiteIp] = useState<SiteIpInfo | null>(null)
  const [feeds, setFeeds] = useState<FeedInfo[]>([])
  const [loginInfo, setLoginInfo] = useState<LoginInfo | null>(null)
  const [activePanel, setActivePanel] = useState<Panel>(null)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.id) return

      // Tech detection
      chrome.tabs.sendMessage(tab.id, { type: "GET_TECH" }, (response) => {
        if (chrome.runtime.lastError) return
        if (response?.techs) setTechs(response.techs)
      })

      // RSS feed detection
      chrome.tabs.sendMessage(tab.id, { type: "GET_FEEDS" }, (response) => {
        if (chrome.runtime.lastError) return
        if (response?.feeds) setFeeds(response.feeds)
      })

      // Login detection
      chrome.tabs.sendMessage(tab.id, { type: "GET_LOGIN_INFO" }, (response) => {
        if (chrome.runtime.lastError) return
        if (response) {
          chrome.runtime.sendMessage({ type: "GET_LOGIN_PREFS" }, (prefsResponse) => {
            if (chrome.runtime.lastError) return
            const prefs = prefsResponse?.prefs || []
            const saved = prefs.find((p: any) => p.domain === response.hostname)
            setLoginInfo({
              hostname: response.hostname,
              hasForm: response.hasForm,
              socials: response.socials,
              savedProvider: saved?.provider
            })
          })
        }
      })

      // Site IP + geo
      if (tab.url) {
        try {
          const hostname = new URL(tab.url).hostname
          if (hostname) {
            chrome.runtime.sendMessage({ type: "RESOLVE_IP", hostname }, (response) => {
              if (chrome.runtime.lastError || !response?.ip) return
              const ip = response.ip
              setSiteIp({ ip, hostname })
              // Fetch geo info for the site IP
              fetch(`https://ipinfo.io/${ip}/json?token=`)
                .then((r) => r.json())
                .then((data) => {
                  setSiteIp({ ip, hostname, city: data.city, region: data.region, country: data.country, org: data.org })
                })
                .catch(() => {})
            })
          }
        } catch {}
      }
    })

    // User IP
    fetch("https://ipinfo.io/json?token=")
      .then((r) => r.json())
      .then((data) => setUserIp(data))
      .catch(() => {
        fetch("https://api.ipify.org?format=json")
          .then((r) => r.json())
          .then((data) => setUserIp({ ip: data.ip }))
          .catch(() => {})
      })
  }, [])

  const toggle = (panel: Panel) => {
    setActivePanel((cur) => (cur === panel ? null : panel))
  }

  return { techs, userIp, siteIp, feeds, loginInfo, setLoginInfo, activePanel, toggle }
}

// --- Icon Buttons ---

export function NetworkButton({ active, hasData, onClick }: { active: boolean; hasData: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title="Network info"
      className={`p-1.5 rounded transition-colors relative ${active ? "bg-chart-3/20 text-chart-3" : "text-fg/60 hover:text-fg hover:bg-accent"}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    </button>
  )
}

export function TechButton({ active, count, onClick }: { active: boolean; count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} title="Detect technologies"
      className={`p-1.5 rounded transition-colors relative ${active ? "bg-chart-5/20 text-chart-5" : count > 0 ? "text-chart-5/60 hover:text-chart-5 hover:bg-accent" : "text-fg/60 hover:text-fg hover:bg-accent"}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <circle cx="9" cy="16" r="1" fill="currentColor" /><circle cx="15" cy="16" r="1" fill="currentColor" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      {count > 0 && !active && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-chart-5" />}
    </button>
  )
}

export function RssButton({ active, count, onClick }: { active: boolean; count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} title="RSS feeds"
      className={`p-1.5 rounded transition-colors relative ${active ? "bg-orange-500/20 text-orange-400" : count > 0 ? "text-orange-400/60 hover:text-orange-400 hover:bg-accent" : "text-fg/60 hover:text-fg hover:bg-accent"}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" />
        <circle cx="5" cy="19" r="1" fill="currentColor" />
      </svg>
      {count > 0 && !active && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-400" />}
    </button>
  )
}

// --- Panels ---

export function NetworkPanel({ userIp, siteIp, onCopy }: { userIp: IpInfo | null; siteIp: SiteIpInfo | null; onCopy: (text: string, label: string) => void }) {
  return (
    <div className="border-b border-border px-3 py-2.5 space-y-2">
      <p className="text-[10px] text-fg/30 uppercase tracking-wider">Network</p>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-fg/40">Your IP</span>
        {userIp ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-fg font-mono">{userIp.ip}</span>
            <CopyBtn onClick={() => onCopy(userIp.ip, "IP copied")} />
          </div>
        ) : (
          <span className="text-[11px] text-fg/20">loading...</span>
        )}
      </div>
      {userIp?.city && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-fg/40">Location</span>
          <span className="text-xs text-fg/60">{[userIp.city, userIp.region, userIp.country].filter(Boolean).join(", ")}</span>
        </div>
      )}
      {userIp?.org && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-fg/40">ISP</span>
          <span className="text-xs text-fg/60 truncate max-w-[200px]">{userIp.org}</span>
        </div>
      )}
      {siteIp && (
        <>
          <div className="border-t border-border/50 my-1" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-fg/40">Site IP</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-fg font-mono">{siteIp.ip}</span>
              <CopyBtn onClick={() => onCopy(siteIp.ip, "Site IP copied")} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-fg/40">Host</span>
            <span className="text-xs text-fg/60 font-mono">{siteIp.hostname}</span>
          </div>
          {siteIp.city && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-fg/40">Site Location</span>
              <span className="text-xs text-fg/60">{[siteIp.city, siteIp.region, siteIp.country].filter(Boolean).join(", ")}</span>
            </div>
          )}
          {siteIp.org && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-fg/40">Site ISP</span>
              <span className="text-xs text-fg/60 truncate max-w-[200px]">{siteIp.org}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function TechPanel({ techs }: { techs: TechInfo[] }) {
  return (
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
        <div className="px-3 py-3 text-xs text-fg/30 text-center">No technologies detected on this page</div>
      )}
    </div>
  )
}

export function RssPanel({ feeds, onCopy }: { feeds: FeedInfo[]; onCopy: (text: string, label: string) => void }) {
  return (
    <div className="border-b border-border">
      {feeds.length > 0 ? (
        <div className="px-3 py-2 space-y-1.5 max-h-[160px] overflow-y-auto">
          <p className="text-[10px] text-fg/30 uppercase tracking-wider mb-1">RSS / Atom Feeds</p>
          {feeds.map((f, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5 group">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 uppercase font-medium flex-shrink-0">{f.type}</span>
              <span className="text-xs text-fg truncate flex-1" title={f.title}>{f.title || f.url}</span>
              <CopyBtn onClick={() => onCopy(f.url, "Feed URL copied")} />
              <a
                href={f.url}
                target="_blank"
                rel="noopener"
                className="text-fg/20 hover:text-chart-1 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-3 py-3 text-xs text-fg/30 text-center">No RSS/Atom feeds found on this page</div>
      )}
    </div>
  )
}

export function LoginButton({ active, hasLogin, onClick }: { active: boolean; hasLogin: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title="Auto-login"
      className={`p-1.5 rounded transition-colors relative ${active ? "bg-chart-2/20 text-chart-2" : hasLogin ? "text-chart-2/60 hover:text-chart-2 hover:bg-accent" : "text-fg/60 hover:text-fg hover:bg-accent"}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
      {hasLogin && !active && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-chart-2" />}
    </button>
  )
}

export function LoginPanel({ loginInfo, onSave, onRemove }: {
  loginInfo: LoginInfo | null
  onSave: (provider: string, selector: string) => void
  onRemove: () => void
}) {
  if (!loginInfo) {
    return (
      <div className="border-b border-border px-3 py-3 text-xs text-fg/30 text-center">
        No login form detected on this page
      </div>
    )
  }

  return (
    <div className="border-b border-border px-3 py-2.5 space-y-2">
      <p className="text-[10px] text-fg/30 uppercase tracking-wider">Auto-Login · {loginInfo.hostname}</p>

      {loginInfo.savedProvider && (
        <div className="flex items-center justify-between p-2 rounded bg-chart-2/10 border border-chart-2/20">
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-chart-2/20 text-chart-2 font-medium">SAVED</span>
            <span className="text-xs text-fg">Auto-signs in with {loginInfo.savedProvider}</span>
          </div>
          <button onClick={onRemove} className="text-[10px] text-fg/30 hover:text-destructive transition-colors">Remove</button>
        </div>
      )}

      {loginInfo.socials.length > 0 && (
        <div>
          <p className="text-[11px] text-fg/40 mb-1.5">{loginInfo.savedProvider ? "Other options" : "Social sign-in detected"}:</p>
          <div className="space-y-1">
            {loginInfo.socials.map((s, i) => (
              <button
                key={i}
                onClick={() => onSave(s.provider, s.selector)}
                className={`w-full flex items-center justify-between p-2 rounded text-left transition-colors ${
                  loginInfo.savedProvider === s.provider ? "bg-card border border-chart-2/30" : "bg-card/50 hover:bg-card border border-border"
                }`}>
                <span className="text-xs text-fg">{s.provider}</span>
                <span className="text-[10px] text-fg/30">
                  {loginInfo.savedProvider === s.provider ? "Active" : "Remember & sign in"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loginInfo.hasForm && !loginInfo.socials.length && !loginInfo.savedProvider && (
        <p className="text-xs text-fg/40">Login form detected — password manager autofill will trigger automatically.</p>
      )}

      {!loginInfo.hasForm && !loginInfo.socials.length && (
        <p className="text-xs text-fg/30">No login options detected on this page.</p>
      )}
    </div>
  )
}

function CopyBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-fg/20 hover:text-fg/50 transition-colors flex-shrink-0">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  )
}
