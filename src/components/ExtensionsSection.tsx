import { useState } from "react"
import type { ExtensionInfo, Settings } from "../types"

interface Props {
  extensions: ExtensionInfo[]
  loading: boolean
  settings: Settings
  onToggle: (id: string, enabled: boolean) => void
  onUninstall: (id: string) => void
  onToggleAll: (enabled: boolean, alwaysEnabled: string[]) => void
  onUpdateSettings: (u: Partial<Settings>) => void
}

export function ExtensionsSection({
  extensions, loading, settings, onToggle, onUninstall, onToggleAll, onUpdateSettings
}: Props) {
  const [search, setSearch] = useState("")
  const filtered = extensions.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.description.toLowerCase().includes(search.toLowerCase())
  )
  const enabledCount = extensions.filter((e) => e.enabled).length

  const exportAs = (format: "json" | "csv") => {
    const data = extensions.map((e) => ({
      name: e.name, id: e.id, version: e.version, enabled: e.enabled, description: e.description
    }))

    let content: string, mime: string, ext: string
    if (format === "json") {
      content = JSON.stringify(data, null, 2)
      mime = "application/json"
      ext = "json"
    } else {
      const header = "name,id,version,enabled,description"
      const rows = data.map((d) =>
        `"${d.name}","${d.id}","${d.version}",${d.enabled},"${d.description.replace(/"/g, '""')}"`
      )
      content = [header, ...rows].join("\n")
      mime = "text/csv"
      ext = "csv"
    }

    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `extensions-${Date.now()}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Extensions</h2>
          <p className="text-xs text-fg/40 mt-0.5">{enabledCount} of {extensions.length} enabled</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onToggleAll(true, settings.alwaysEnabled)} className="text-xs py-1.5 px-3 rounded bg-accent hover:bg-accent/80 transition-colors">Enable All</button>
          <button onClick={() => onToggleAll(false, settings.alwaysEnabled)} className="text-xs py-1.5 px-3 rounded bg-accent hover:bg-accent/80 transition-colors">Disable All</button>
          <button onClick={() => exportAs("json")} className="text-xs py-1.5 px-3 rounded bg-accent hover:bg-accent/80 transition-colors">Export JSON</button>
          <button onClick={() => exportAs("csv")} className="text-xs py-1.5 px-3 rounded bg-accent hover:bg-accent/80 transition-colors">Export CSV</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search installed extensions..."
          className="flex-1 text-sm py-2 px-3 rounded bg-card border border-border text-fg placeholder-fg/30 outline-none focus:border-primary/50 transition-colors"
        />
        <button
          onClick={() => {
            const q = search || ""
            chrome.tabs.create({ url: `https://chromewebstore.google.com/search/${encodeURIComponent(q)}` })
          }}
          className="text-xs py-2 px-4 rounded bg-chart-1/20 text-chart-1 hover:bg-chart-1/30 transition-colors whitespace-nowrap">
          Search Web Store
        </button>
      </div>

      {loading ? (
        <div className="text-fg/40 text-sm">Loading...</div>
      ) : (
        <div className="grid gap-1">
          {filtered.map((ext) => {
            const iconUrl = ext.icons?.length ? ext.icons[ext.icons.length - 1].url : undefined
            const isPinned = settings.alwaysEnabled?.includes(ext.id)
            return (
              <div key={ext.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-card/50 transition-colors group">
                {iconUrl ? (
                  <img src={iconUrl} alt="" className="w-8 h-8 rounded flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-accent flex-shrink-0 flex items-center justify-center text-sm text-fg/50">{ext.name[0]}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium truncate cursor-pointer hover:underline ${ext.enabled ? "text-fg" : "text-fg/40"}`}
                      onClick={() => chrome.tabs.create({ url: `https://chromewebstore.google.com/detail/${ext.id}` })}>
                      {ext.name}
                    </span>
                    <span className="text-[10px] text-fg/30">v{ext.version}</span>
                  </div>
                  <p className="text-xs text-fg/30 truncate">{ext.description}</p>
                </div>
                <button
                  onClick={() => {
                    const next = isPinned
                      ? settings.alwaysEnabled.filter((id) => id !== ext.id)
                      : [...(settings.alwaysEnabled || []), ext.id]
                    onUpdateSettings({ alwaysEnabled: next })
                  }}
                  title={isPinned ? "Unpin" : "Always enabled"}
                  className={`p-1.5 rounded transition-all ${isPinned ? "text-chart-4" : "text-fg/20 opacity-0 group-hover:opacity-100 hover:text-fg/50"}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => { if (confirm(`Uninstall ${ext.name}?`)) onUninstall(ext.id) }}
                  className="p-1.5 rounded text-fg/20 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input type="checkbox" checked={ext.enabled} onChange={() => onToggle(ext.id, !ext.enabled)} disabled={!ext.mayDisable} className="sr-only peer" />
                  <div className="w-9 h-5 bg-secondary rounded-full peer peer-checked:bg-chart-1 peer-disabled:opacity-30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fg after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                </label>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
