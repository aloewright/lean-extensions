import { useState } from "react"
import "../style.css"
import { useExtensions } from "../hooks/useExtensions"
import { useGroups, useLinks, useProfiles, useSettings } from "../hooks/useStorage"
import type { CollectedLink, ExtensionInfo } from "../types"

type Section = "extensions" | "profiles" | "groups" | "links" | "capture" | "settings"

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: "extensions", label: "Extensions", icon: "M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4z" },
  { id: "profiles", label: "Profiles", icon: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" },
  { id: "groups", label: "Groups", icon: "M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h18v2H3v-2z" },
  { id: "links", label: "Links", icon: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" },
  { id: "capture", label: "Capture", icon: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" },
  { id: "settings", label: "Settings", icon: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" }
]

function Dashboard() {
  const [section, setSection] = useState<Section>("extensions")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { extensions, loading, toggleExtension, uninstallExtension, toggleAll, refresh } = useExtensions()
  const { settings, update: updateSettings } = useSettings()
  const { profiles, addProfile, removeProfile, updateProfile } = useProfiles()
  const { groups, addGroup, removeGroup, toggleGroup } = useGroups()
  const { links, addLink, removeLink, clearLinks } = useLinks()

  return (
    <div className="h-screen flex bg-bg text-fg font-sans">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 border-r border-border flex flex-col transition-all duration-200 ${
          sidebarOpen ? "w-52" : "w-14"
        }`}>
        <div className="p-3 border-b border-border flex items-center justify-between">
          {sidebarOpen && <span className="text-sm font-semibold tracking-tight">Lean Ext</span>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded hover:bg-accent text-fg/60 hover:text-fg transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen ? (
                <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
              ) : (
                <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
              )}
            </svg>
          </button>
        </div>
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                section === item.id
                  ? "bg-accent text-fg"
                  : "text-fg/50 hover:text-fg hover:bg-card/30"
              }`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                <path d={item.icon} />
              </svg>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {section === "extensions" && (
          <ExtensionsSection
            extensions={extensions}
            loading={loading}
            settings={settings}
            onToggle={toggleExtension}
            onUninstall={uninstallExtension}
            onToggleAll={toggleAll}
            onUpdateSettings={updateSettings}
          />
        )}
        {section === "profiles" && (
          <ProfilesSection
            profiles={profiles}
            extensions={extensions}
            settings={settings}
            onAdd={addProfile}
            onRemove={removeProfile}
            onUpdate={updateProfile}
            onUpdateSettings={updateSettings}
          />
        )}
        {section === "groups" && (
          <GroupsSection
            groups={groups}
            extensions={extensions}
            onAdd={addGroup}
            onRemove={removeGroup}
            onToggle={toggleGroup}
          />
        )}
        {section === "links" && (
          <LinksSection
            links={links}
            onAdd={addLink}
            onRemove={removeLink}
            onClear={clearLinks}
            settings={settings}
            onUpdateSettings={updateSettings}
          />
        )}
        {section === "capture" && <CaptureSection />}
        {section === "settings" && (
          <SettingsSection settings={settings} onUpdate={updateSettings} />
        )}
      </main>
    </div>
  )
}

/* ── Extensions Section ── */
function ExtensionsSection({
  extensions, loading, settings, onToggle, onUninstall, onToggleAll, onUpdateSettings
}: {
  extensions: ExtensionInfo[]
  loading: boolean
  settings: any
  onToggle: (id: string, enabled: boolean) => void
  onUninstall: (id: string) => void
  onToggleAll: (enabled: boolean, alwaysEnabled: string[]) => void
  onUpdateSettings: (u: any) => void
}) {
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
                      ? settings.alwaysEnabled.filter((id: string) => id !== ext.id)
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

/* ── Profiles Section ── */
function ProfilesSection({
  profiles, extensions, settings, onAdd, onRemove, onUpdate, onUpdateSettings
}: {
  profiles: any[]; extensions: ExtensionInfo[]; settings: any
  onAdd: (name: string, ids: string[]) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, u: any) => void
  onUpdateSettings: (u: any) => void
}) {
  const [newName, setNewName] = useState("")
  const [selectedExts, setSelectedExts] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const activateProfile = async (profile: any) => {
    chrome.runtime.sendMessage({
      type: "SWITCH_PROFILE",
      extensionIds: profile.extensionIds,
      alwaysEnabled: settings.alwaysEnabled || []
    })
    onUpdateSettings({ activeProfileId: profile.id })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Profiles</h2>
          <p className="text-xs text-fg/40 mt-0.5">Full context switch — disables all, enables profile set</p>
        </div>
        <button onClick={() => setCreating(!creating)} className="text-xs py-1.5 px-3 rounded bg-chart-1/20 text-chart-1 hover:bg-chart-1/30 transition-colors">
          {creating ? "Cancel" : "+ New Profile"}
        </button>
      </div>

      {creating && (
        <div className="p-4 rounded-lg bg-card border border-border mb-4">
          <input
            type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Profile name (e.g., Work, Dev)"
            className="w-full text-sm py-2 px-3 rounded bg-bg border border-border text-fg placeholder-fg/30 outline-none focus:border-primary/50 mb-3"
          />
          <p className="text-xs text-fg/40 mb-2">Select extensions for this profile:</p>
          <div className="max-h-48 overflow-y-auto grid gap-1 mb-3">
            {extensions.map((ext) => (
              <label key={ext.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-bg/50 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={selectedExts.includes(ext.id)}
                  onChange={(e) => {
                    setSelectedExts(e.target.checked ? [...selectedExts, ext.id] : selectedExts.filter((id) => id !== ext.id))
                  }}
                  className="accent-chart-1"
                />
                {ext.name}
              </label>
            ))}
          </div>
          <button
            onClick={() => { if (newName.trim()) { onAdd(newName.trim(), selectedExts); setNewName(""); setSelectedExts([]); setCreating(false) } }}
            className="text-xs py-1.5 px-4 rounded bg-chart-1 text-bg font-medium hover:bg-chart-1/90 transition-colors">
            Create Profile
          </button>
        </div>
      )}

      <div className="grid gap-2">
        {profiles.map((p) => (
          <div key={p.id} className={`p-4 rounded-lg border transition-colors ${settings.activeProfileId === p.id ? "bg-card border-chart-1/40" : "bg-card/30 border-border"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{p.name}</span>
                {settings.activeProfileId === p.id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-chart-1/20 text-chart-1">Active</span>}
                <span className="text-xs text-fg/30">{p.extensionIds.length} extensions</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => activateProfile(p)} className="text-xs py-1 px-3 rounded bg-accent hover:bg-accent/80 transition-colors">Activate</button>
                <button onClick={() => onRemove(p.id)} className="text-xs py-1 px-3 rounded text-destructive hover:bg-destructive/10 transition-colors">Delete</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {p.extensionIds.slice(0, 8).map((id: string) => {
                const ext = extensions.find((e) => e.id === id)
                return ext ? (
                  <span key={id} className="text-[10px] px-2 py-0.5 rounded bg-bg text-fg/50">{ext.name}</span>
                ) : null
              })}
              {p.extensionIds.length > 8 && <span className="text-[10px] px-2 py-0.5 rounded bg-bg text-fg/30">+{p.extensionIds.length - 8} more</span>}
            </div>
          </div>
        ))}
        {profiles.length === 0 && <p className="text-sm text-fg/30">No profiles yet. Create one to get started.</p>}
      </div>
    </div>
  )
}

/* ── Groups Section ── */
function GroupsSection({
  groups, extensions, onAdd, onRemove, onToggle
}: {
  groups: any[]; extensions: ExtensionInfo[]
  onAdd: (name: string, ids: string[]) => void
  onRemove: (id: string) => void
  onToggle: (id: string) => void
}) {
  const [newName, setNewName] = useState("")
  const [selectedExts, setSelectedExts] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Groups</h2>
          <p className="text-xs text-fg/40 mt-0.5">Layered toggles — enable/disable sets independently</p>
        </div>
        <button onClick={() => setCreating(!creating)} className="text-xs py-1.5 px-3 rounded bg-chart-1/20 text-chart-1 hover:bg-chart-1/30 transition-colors">
          {creating ? "Cancel" : "+ New Group"}
        </button>
      </div>

      {creating && (
        <div className="p-4 rounded-lg bg-card border border-border mb-4">
          <input
            type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Group name (e.g., Social, Dev Tools)"
            className="w-full text-sm py-2 px-3 rounded bg-bg border border-border text-fg placeholder-fg/30 outline-none focus:border-primary/50 mb-3"
          />
          <div className="max-h-48 overflow-y-auto grid gap-1 mb-3">
            {extensions.map((ext) => (
              <label key={ext.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-bg/50 cursor-pointer text-sm">
                <input type="checkbox" checked={selectedExts.includes(ext.id)}
                  onChange={(e) => setSelectedExts(e.target.checked ? [...selectedExts, ext.id] : selectedExts.filter((id) => id !== ext.id))}
                  className="accent-chart-1" />
                {ext.name}
              </label>
            ))}
          </div>
          <button
            onClick={() => { if (newName.trim()) { onAdd(newName.trim(), selectedExts); setNewName(""); setSelectedExts([]); setCreating(false) } }}
            className="text-xs py-1.5 px-4 rounded bg-chart-1 text-bg font-medium hover:bg-chart-1/90 transition-colors">
            Create Group
          </button>
        </div>
      )}

      <div className="grid gap-2">
        {groups.map((g) => (
          <div key={g.id} className={`p-4 rounded-lg border transition-colors ${g.enabled ? "bg-card border-chart-2/40" : "bg-card/30 border-border"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{g.name}</span>
                <span className="text-xs text-fg/30">{g.extensionIds.length} extensions</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onToggle(g.id)} className={`text-xs py-1 px-3 rounded transition-colors ${g.enabled ? "bg-chart-2/20 text-chart-2" : "bg-accent text-fg/60 hover:text-fg"}`}>
                  {g.enabled ? "On" : "Off"}
                </button>
                <button onClick={() => onRemove(g.id)} className="text-xs py-1 px-2 rounded text-destructive hover:bg-destructive/10 transition-colors">Delete</button>
              </div>
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="text-sm text-fg/30">No groups yet. Create one to layer extensions on/off.</p>}
      </div>
    </div>
  )
}

/* ── Links Section ── */
function LinksSection({
  links, onAdd, onRemove, onClear, settings, onUpdateSettings
}: {
  links: CollectedLink[]
  onAdd: (url: string, title: string, tags?: string[]) => void
  onRemove: (id: string) => void
  onClear: () => void
  settings: any
  onUpdateSettings: (u: any) => void
}) {
  const [urlInput, setUrlInput] = useState("")
  const [search, setSearch] = useState("")

  const filtered = links.filter((l) =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.url.toLowerCase().includes(search.toLowerCase())
  )

  const sendToNotebook = () => {
    const toSend = filtered.length ? filtered : links
    chrome.runtime.sendMessage({ type: "SEND_TO_NOTEBOOK", links: toSend })
  }

  const addCurrentTab = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.url && tab?.title) {
      onAdd(tab.url, tab.title)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Collected Links</h2>
          <p className="text-xs text-fg/40 mt-0.5">{links.length} links saved</p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-xs text-fg/50">
            <input
              type="checkbox"
              checked={settings.notebookMode === "append"}
              onChange={(e) => onUpdateSettings({ notebookMode: e.target.checked ? "append" : "new" })}
              className="accent-chart-1"
            />
            Append to last notebook
          </label>
          <button onClick={sendToNotebook} className="text-xs py-1.5 px-3 rounded bg-chart-5/20 text-chart-5 hover:bg-chart-5/30 transition-colors">
            Send to NotebookLM
          </button>
          <button onClick={onClear} className="text-xs py-1.5 px-3 rounded text-destructive hover:bg-destructive/10 transition-colors">Clear All</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Paste a URL to save..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && urlInput.trim()) {
              onAdd(urlInput.trim(), urlInput.trim())
              setUrlInput("")
            }
          }}
          className="flex-1 text-sm py-2 px-3 rounded bg-card border border-border text-fg placeholder-fg/30 outline-none focus:border-primary/50"
        />
        <button onClick={addCurrentTab} className="text-xs py-2 px-3 rounded bg-accent hover:bg-accent/80 transition-colors whitespace-nowrap">
          + Current Tab
        </button>
      </div>

      <input
        type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter links..."
        className="w-full text-sm py-2 px-3 rounded bg-card border border-border text-fg placeholder-fg/30 outline-none focus:border-primary/50 mb-4"
      />

      <div className="grid gap-1">
        {filtered.map((link) => (
          <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-card/50 transition-colors group">
            <div className="flex-1 min-w-0">
              <a href={link.url} target="_blank" rel="noopener" className="text-sm text-chart-1 hover:underline truncate block">{link.title}</a>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-fg/30 truncate">{link.url}</span>
                {link.tags.map((t) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-fg/50">{t}</span>
                ))}
              </div>
            </div>
            <span className="text-[10px] text-fg/20">{new Date(link.date).toLocaleDateString()}</span>
            <button onClick={() => onRemove(link.id)} className="p-1 rounded text-fg/20 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-fg/30">No links yet. Save URLs from the popup or paste them above.</p>}
      </div>
    </div>
  )
}

/* ── Capture Section ── */
function CaptureSection() {
  const captureScreenshot = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: "png" })
    const link = document.createElement("a")
    link.href = dataUrl
    link.download = `screenshot-${Date.now()}.png`
    link.click()
  }

  const capturePdf = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    chrome.runtime.sendMessage({ type: "CAPTURE_PDF", tabId: tab.id })
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Page Capture</h2>
      <p className="text-xs text-fg/40 mb-6">Capture the currently active tab</p>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={captureScreenshot}
          className="p-6 rounded-lg bg-card border border-border hover:border-chart-1/40 transition-colors text-center group">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-fg/40 group-hover:text-chart-1 transition-colors">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span className="text-sm font-medium">Screenshot</span>
          <p className="text-[10px] text-fg/30 mt-1">Visible area as PNG</p>
        </button>

        <button
          onClick={capturePdf}
          className="p-6 rounded-lg bg-card border border-border hover:border-chart-5/40 transition-colors text-center group">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-fg/40 group-hover:text-chart-5 transition-colors">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span className="text-sm font-medium">Full Page PDF</span>
          <p className="text-[10px] text-fg/30 mt-1">Complete page via debugger</p>
        </button>
      </div>
    </div>
  )
}

/* ── Settings Section ── */
function SettingsSection({ settings, onUpdate }: { settings: any; onUpdate: (u: any) => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Settings</h2>
      <p className="text-xs text-fg/40 mb-6">Configure Lean Extensions behavior</p>

      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-card border border-border">
          <h3 className="text-sm font-medium mb-3">NotebookLM</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notebookMode === "append"}
              onChange={(e) => onUpdate({ notebookMode: e.target.checked ? "append" : "new" })}
              className="accent-chart-1"
            />
            <div>
              <span className="text-sm">Append to last notebook</span>
              <p className="text-xs text-fg/30">When off, creates a new notebook each time</p>
            </div>
          </label>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border">
          <h3 className="text-sm font-medium mb-3">Always Enabled</h3>
          <p className="text-xs text-fg/30">These extensions survive profile switches. Pin them from the Extensions tab using the star icon.</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(settings.alwaysEnabled || []).length === 0 && <span className="text-xs text-fg/20">None pinned</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
