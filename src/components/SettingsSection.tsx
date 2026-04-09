import type { ExtensionInfo, Settings } from "../types"

interface Props {
  settings: Settings
  extensions: ExtensionInfo[]
  lastUsed: Record<string, string>
  onUpdate: (u: Partial<Settings>) => void
}

const SHORTCUTS = [
  { keys: "Alt+Shift+D", action: "Disable all extensions (except pinned)" },
  { keys: "Alt+Shift+E", action: "Enable all extensions" },
  { keys: "Alt+Shift+S", action: "Save current page link" },
  { keys: "Alt+Shift+L", action: "Open dashboard" },
]

const OFFLOAD_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
]

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function SettingsSection({ settings, extensions, lastUsed, onUpdate }: Props) {
  const pinnedExts = (settings.alwaysEnabled || [])
    .map((id) => extensions.find((e) => e.id === id))
    .filter(Boolean)

  const offloadDays = settings.autoOffloadDays || 0

  // Preview which extensions would be offloaded
  const cutoff = offloadDays > 0 ? Date.now() - offloadDays * 86400000 : 0
  const atRisk = offloadDays > 0
    ? extensions.filter((e) => {
        if (!e.enabled || !e.mayDisable) return false
        if (settings.alwaysEnabled.includes(e.id)) return false
        const lu = lastUsed[e.id]
        return !lu || new Date(lu).getTime() < cutoff
      })
    : []

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Settings</h2>
      <p className="text-xs text-fg/40 mb-6">Configure Lean Extensions behavior</p>

      <div className="space-y-4">
        {/* Auto-offload */}
        <div className="p-4 rounded-lg bg-card border border-border">
          <h3 className="text-sm font-medium mb-1">Auto-Offload Unused Extensions</h3>
          <p className="text-xs text-fg/30 mb-3">Automatically disable extensions that haven't been toggled in a while. Pinned extensions are never offloaded.</p>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-fg/50">Disable after:</span>
            <div className="flex gap-1">
              {OFFLOAD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate({ autoOffloadDays: opt.value })}
                  className={`text-[11px] py-1 px-2.5 rounded transition-colors ${
                    offloadDays === opt.value
                      ? "bg-chart-1/20 text-chart-1"
                      : "bg-accent/50 text-fg/40 hover:text-fg/60"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {offloadDays > 0 && atRisk.length > 0 && (
            <div className="mt-2 p-2.5 rounded bg-bg border border-border">
              <p className="text-[10px] text-fg/30 uppercase tracking-wider mb-1.5">
                Would be offloaded now ({atRisk.length})
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {atRisk.map((ext) => (
                  <div key={ext.id} className="flex items-center justify-between text-xs">
                    <span className="text-fg/60 truncate">{ext.name}</span>
                    <span className="text-[10px] text-fg/20 flex-shrink-0">
                      {lastUsed[ext.id] ? relativeDate(lastUsed[ext.id]) : "never used"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {offloadDays > 0 && atRisk.length === 0 && (
            <p className="text-xs text-fg/20 mt-1">All extensions are within the {offloadDays}-day window.</p>
          )}
        </div>

        {/* NotebookLM */}
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

        {/* Always Enabled */}
        <div className="p-4 rounded-lg bg-card border border-border">
          <h3 className="text-sm font-medium mb-3">Always Enabled</h3>
          <p className="text-xs text-fg/30 mb-2">These extensions survive profile switches and auto-offload. Pin them from the Extensions tab.</p>
          <div className="flex flex-wrap gap-1.5">
            {pinnedExts.length === 0 && <span className="text-xs text-fg/20">None pinned</span>}
            {pinnedExts.map((ext) => (
              <div key={ext!.id} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-bg border border-border">
                <span className="text-fg/70">{ext!.name}</span>
                <button
                  onClick={() => onUpdate({ alwaysEnabled: settings.alwaysEnabled.filter((id) => id !== ext!.id) })}
                  className="text-fg/30 hover:text-destructive transition-colors">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="p-4 rounded-lg bg-card border border-border">
          <h3 className="text-sm font-medium mb-3">Keyboard Shortcuts</h3>
          <p className="text-xs text-fg/30 mb-3">Customize in chrome://extensions/shortcuts</p>
          <div className="grid gap-2">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center justify-between">
                <span className="text-xs text-fg/60">{s.action}</span>
                <kbd className="text-[10px] px-2 py-0.5 rounded bg-bg border border-border text-fg/50 font-mono">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="p-4 rounded-lg bg-card border border-border">
          <h3 className="text-sm font-medium mb-2">About</h3>
          <p className="text-xs text-fg/30">Lean Extensions v0.1.0</p>
          <p className="text-xs text-fg/30 mt-1">Keep your browser lean and fast.</p>
        </div>
      </div>
    </div>
  )
}
